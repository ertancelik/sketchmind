import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    background: '#151820',
    primaryColor: '#1e2130',
    primaryTextColor: '#e8eaf0',
    primaryBorderColor: '#6c63ff',
    lineColor: '#6c63ff',
    secondaryColor: '#252840',
    tertiaryColor: '#2a2d3e',
    edgeLabelBackground: '#151820',
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
  },
  flowchart: { htmlLabels: true, curve: 'basis' },
});

let counter = 0;

export default function DiagramRenderer({ mermaidCode }) {
  const ref = useRef();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mermaidCode) return;
    const id = `mermaid-${++counter}`;
    mermaid.render(id, mermaidCode)
      .then(({ svg }) => { setSvg(svg); setError(''); })
      .catch(err => setError(err.message || 'Render hatası'));
  }, [mermaidCode]);

  const downloadSvg = () => {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'diagram.svg';
    a.click();
  };

  if (error) return (
    <div style={{ padding: '24px', color: 'var(--error)', fontSize: '13px' }}>
      <strong>Render hatası:</strong> {error}
    </div>
  );

  if (!svg) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
      Diyagram bekleniyor...
    </div>
  );

  return (
    <div style={s.wrapper}>
      <div style={s.toolbar}>
        <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={downloadSvg}>
          ⬇ SVG İndir
        </button>
      </div>
      <div ref={ref} style={s.canvas} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100%' },
  toolbar: {
    display: 'flex', gap: '8px', padding: '12px 16px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
  },
  canvas: {
    flex: 1, overflow: 'auto', padding: '32px', display: 'flex',
    alignItems: 'flex-start', justifyContent: 'center',
  },
};
