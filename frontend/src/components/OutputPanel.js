import React from 'react';
import DiagramRenderer from './DiagramRenderer';

const TABS = [
  { id: 'diagram', label: '📊 Diyagram' },
  { id: 'mermaid', label: '💻 Mermaid Kodu' },
  { id: 'drawio', label: '📁 draw.io XML' },
  { id: 'json', label: '{}  JSON' },
];

export default function OutputPanel({ mermaid, drawioXml, diagramData, activeTab, setActiveTab }) {
  const copy = (text) => navigator.clipboard.writeText(text);

  const downloadDrawio = () => {
    const blob = new Blob([drawioXml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diagram.drawio';
    a.click();
  };

  return (
    <div style={s.panel}>
      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Download buttons */}
        {activeTab === 'drawio' && (
          <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', alignSelf: 'center' }} onClick={downloadDrawio}>
            ⬇ .drawio İndir
          </button>
        )}
        {activeTab === 'mermaid' && (
          <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', alignSelf: 'center' }} onClick={() => copy(mermaid)}>
            📋 Kopyala
          </button>
        )}
        {activeTab === 'json' && (
          <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', alignSelf: 'center' }} onClick={() => copy(JSON.stringify(diagramData, null, 2))}>
            📋 Kopyala
          </button>
        )}
        {activeTab === 'drawio' && (
          <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', alignSelf: 'center' }} onClick={() => copy(drawioXml)}>
            📋 Kopyala
          </button>
        )}
      </div>

      {/* Content */}
      <div style={s.content}>
        {activeTab === 'diagram' && <DiagramRenderer mermaidCode={mermaid} />}

        {activeTab === 'mermaid' && (
          <div style={s.codeWrap}>
            <pre style={s.code}>{mermaid}</pre>
          </div>
        )}

        {activeTab === 'drawio' && (
          <div style={s.codeWrap}>
            <div style={s.drawioInfo}>
              <strong>draw.io'da açmak için:</strong> diagrams.net → File → Import from → Device → bu dosyayı seç
            </div>
            <pre style={s.code}>{drawioXml}</pre>
          </div>
        )}

        {activeTab === 'json' && (
          <div style={s.codeWrap}>
            <pre style={s.code}>{JSON.stringify(diagramData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  panel: { display: 'flex', flexDirection: 'column', height: '100%' },
  tabs: {
    display: 'flex', gap: '2px', padding: '0 16px',
    background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  tab: {
    padding: '13px 16px', background: 'transparent', border: 'none',
    borderBottom: '2px solid transparent', cursor: 'pointer',
    color: 'var(--text2)', fontSize: '13px', fontFamily: 'inherit',
    fontWeight: '500', transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  codeWrap: { flex: 1, overflow: 'auto', padding: '20px' },
  code: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '20px', fontSize: '12px',
    color: '#a8dadc', lineHeight: '1.6', whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  drawioInfo: {
    background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
    borderRadius: '8px', padding: '12px 16px', fontSize: '13px',
    color: 'var(--accent2)', marginBottom: '12px',
  },
};
