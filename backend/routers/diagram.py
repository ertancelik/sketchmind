from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import Optional
import httpx
import base64
import json
import os
import re

router = APIRouter()
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
VISION_MODEL = os.getenv("VISION_MODEL", "llama3.2-vision:11b")
TEXT_MODEL = os.getenv("TEXT_MODEL", "llama3.1:8b")

# ─── Prompts ────────────────────────────────────────────────────────────────

VISION_PROMPT = """You are an expert at analyzing hand-drawn or rough architecture/network diagrams.
Analyze this image and extract all components and their relationships.
Return ONLY valid JSON in this exact format:
{
  "title": "diagram title",
  "components": [
    {"id": "c1", "type": "server|database|loadbalancer|cache|queue|service|user|cloud|router|switch|firewall|api|storage", "label": "name", "layer": "presentation|application|data|infrastructure"}
  ],
  "connections": [
    {"from": "c1", "to": "c2", "label": "optional label", "style": "solid|dashed|bidirectional"}
  ],
  "layout": "horizontal|vertical|layered"
}
Detect all boxes, circles, arrows, text labels. Be thorough."""

TEXT_PROMPT = """You are an expert system architect. Convert the following description into a structured diagram.
Description: {description}

Return ONLY valid JSON in this exact format:
{{
  "title": "diagram title",
  "components": [
    {{"id": "c1", "type": "server|database|loadbalancer|cache|queue|service|user|cloud|router|switch|firewall|api|storage", "label": "name", "layer": "presentation|application|data|infrastructure"}}
  ],
  "connections": [
    {{"from": "c1", "to": "c2", "label": "optional label", "style": "solid|dashed|bidirectional"}}
  ],
  "layout": "layered"
}}
Be thorough and include all mentioned components."""

EDIT_PROMPT = """You are an expert system architect. You have an existing diagram and need to modify it based on instructions.
Current diagram JSON:
{current_json}

Modification request: {instruction}

Apply the changes and return ONLY the updated valid JSON with the same format:
{{
  "title": "diagram title",
  "components": [{{"id": "c1", "type": "...", "label": "name", "layer": "..."}}],
  "connections": [{{"from": "c1", "to": "c2", "label": "", "style": "solid"}}],
  "layout": "layered"
}}
Do not add explanations."""

# ─── Helpers ────────────────────────────────────────────────────────────────

def extract_json(text: str) -> dict:
    """Extract JSON from LLM response robustly."""
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Try to find JSON block
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    raise ValueError("Could not extract valid JSON from LLM response")

async def call_ollama_text(prompt: str, model: str = None) -> str:
    model = model or TEXT_MODEL
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 2000}
    }
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "")

async def call_ollama_vision(prompt: str, image_b64: str, model: str = None) -> str:
    model = model or VISION_MODEL
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt, "images": [image_b64]}],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 2000}
    }
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "")

# ─── Converters ─────────────────────────────────────────────────────────────

def to_mermaid(data: dict) -> str:
    lines = ["graph TD"]
    type_icons = {
        "database": "[({})]", "loadbalancer": "{{{}}}",
        "cache": "[({})]", "queue": "[/{}\\]",
        "user": "([{}])", "cloud": "([{}])",
        "firewall": "{{{{}}}}", "api": "[{}]",
    }
    for c in data.get("components", []):
        cid = c["id"]
        label = c["label"]
        ctype = c.get("type", "service")
        fmt = type_icons.get(ctype, "[{}]")
        lines.append(f'    {cid}{fmt.format(label)}')
    for conn in data.get("connections", []):
        f, t = conn["from"], conn["to"]
        lbl = conn.get("label", "")
        style = conn.get("style", "solid")
        arrow = "-.->|{}|" if style == "dashed" else "-->|{}|" if lbl else "-->"
        if lbl:
            lines.append(f"    {f} {arrow.format(lbl)} {t}")
        else:
            lines.append(f"    {f} --> {t}")
    return "\n".join(lines)

def to_drawio_xml(data: dict) -> str:
    cells = []
    coords = {}
    components = data.get("components", [])
    total = len(components)

    # Simple grid layout
    cols = max(3, int(total ** 0.5) + 1)
    for i, c in enumerate(components):
        row, col = divmod(i, cols)
        x, y = 100 + col * 200, 80 + row * 150
        coords[c["id"]] = (x, y)
        style_map = {
            "database": "shape=mxgraph.flowchart.database;",
            "loadbalancer": "shape=mxgraph.cisco.routers.router;",
            "user": "shape=mxgraph.flowchart.start_2;",
            "cloud": "shape=mxgraph.cisco.sites.generic_building;",
            "server": "shape=mxgraph.cisco.servers.standard_server;",
            "firewall": "shape=mxgraph.cisco.firewalls.firewall;",
            "api": "rounded=1;",
            "cache": "shape=mxgraph.flowchart.database;fillColor=#dae8fc;",
            "queue": "shape=mxgraph.flowchart.parallel_mode;",
        }
        style = style_map.get(c.get("type", "service"), "rounded=1;")
        cells.append(
            f'<mxCell id="{c["id"]}" value="{c["label"]}" style="{style}strokeColor=#666;fillColor=#f5f5f5;fontColor=#333;fontSize=12;" '
            f'vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="120" height="60" as="geometry"/></mxCell>'
        )

    for i, conn in enumerate(data.get("connections", [])):
        src, tgt = conn["from"], conn["to"]
        lbl = conn.get("label", "")
        style = "dashed=1;" if conn.get("style") == "dashed" else ""
        cells.append(
            f'<mxCell id="e{i}" value="{lbl}" style="endArrow=block;{style}strokeColor=#333;" '
            f'edge="1" source="{src}" target="{tgt}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>'
        )

    cells_xml = "\n".join(cells)
    title = data.get("title", "Diagram")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<mxfile><diagram name="{title}">
<mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
{cells_xml}
</root></mxGraphModel>
</diagram></mxfile>"""

# ─── Endpoints ──────────────────────────────────────────────────────────────

class TextRequest(BaseModel):
    description: str
    model: Optional[str] = None

class EditRequest(BaseModel):
    current_diagram: dict
    instruction: str
    model: Optional[str] = None

@router.post("/from-image")
async def from_image(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None)
):
    contents = await file.read()
    image_b64 = base64.b64encode(contents).decode()
    try:
        raw = await call_ollama_vision(VISION_PROMPT, image_b64, model)
        data = extract_json(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

    return {
        "diagram_data": data,
        "mermaid": to_mermaid(data),
        "drawio_xml": to_drawio_xml(data),
        "source": "image"
    }

@router.post("/from-text")
async def from_text(req: TextRequest):
    prompt = TEXT_PROMPT.format(description=req.description)
    try:
        raw = await call_ollama_text(prompt, req.model)
        data = extract_json(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

    return {
        "diagram_data": data,
        "mermaid": to_mermaid(data),
        "drawio_xml": to_drawio_xml(data),
        "source": "text"
    }

@router.post("/edit")
async def edit_diagram(req: EditRequest):
    prompt = EDIT_PROMPT.format(
        current_json=json.dumps(req.current_diagram, ensure_ascii=False, indent=2),
        instruction=req.instruction
    )
    try:
        raw = await call_ollama_text(prompt, req.model)
        data = extract_json(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

    return {
        "diagram_data": data,
        "mermaid": to_mermaid(data),
        "drawio_xml": to_drawio_xml(data),
        "source": "edit"
    }
