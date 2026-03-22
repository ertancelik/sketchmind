import asyncio
import sys
sys.path.insert(0, '.')

from routers.diagram import call_ollama_text, TEXT_PROMPT, extract_json, to_mermaid, to_drawio_xml

async def test():
    description = "2 cluster DB, ortaya load balancer"
    prompt = TEXT_PROMPT.format(description=description)
    print("Prompt OK, Ollama cagiriliyor...")
    try:
        raw = await call_ollama_text(prompt)
        print("Ham cevap:", raw[:200])
        data = extract_json(raw)
        print("JSON OK:", data.get("title"))
        print("Mermaid:", to_mermaid(data)[:100])
    except Exception as e:
        print("HATA:", type(e).__name__, str(e))

asyncio.run(test())
