import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import DiagramRenderer from '../components/DiagramRenderer';
import OutputPanel from '../components/OutputPanel';

const EXAMPLE_PROMPTS = [
  "2 cluster PostgreSQL DB, ortaya load balancer koy, önüne 3 uygulama sunucusu, en önde API Gateway",
  "Kullanıcı → CDN → WAF → API Gateway → Auth ve Product servis → Redis cache → MongoDB cluster",
  "Kubernetes cluster: ingress controller, 3 pod deployment, HPA, persistent volume, ConfigMap",
  "Microservice mimarisi: Order, Payment, Notification, User servisleri, aralarında RabbitMQ",
  "3 katmanlı web mimarisi: React frontend, Node.js API, PostgreSQL DB, Redis session",
];

export default function MainPage({ onLogout }) {
  const [mode, setMode] = useState('text'); // 'text' | 'image' | 'edit'
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [diagramData, setDiagramData] = useState(null);
  const [mermaid, setMermaid] = useState('');
  const [drawioXml, setDrawioXml] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('diagram');
  const [ollamaOk, setOllamaOk] = useState(null);
  const fileRef = useRef();
  const dropRef = useRef();

  useEffect(() => {
    api.get('/health').then(r => setOllamaOk(r.data.ollama === 'connected')).catch(() => setOllamaOk(false));
  }, []);

  // Drag & drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  }, []);

  const loadImage = (file) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setMode('image');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
  };

  const analyze = async () => {
    setLoading(true); setStatus('AI analiz ediyor...');
    try {
      let res;
      if (mode === 'image' && imageFile) {
        setStatus('Görsel işleniyor...');
        const fd = new FormData();
        fd.append('file', imageFile);
        res = await api.post('/diagram/from-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (mode === 'text' && textInput.trim()) {
        setStatus('Mimari analiz ediliyor...');
        res = await api.post('/diagram/from-text', { description: textInput });
      } else if (mode === 'edit' && diagramData && editInstruction.trim()) {
        setStatus('Diyagram güncelleniyor...');
        res = await api.post('/diagram/edit', { current_diagram: diagramData, instruction: editInstruction });
      }
      if (res) {
        const d = res.data;
        setDiagramData(d.diagram_data);
        setMermaid(d.mermaid);
        setDrawioXml(d.drawio_xml);
        setActiveTab('diagram');
        setHistory(h => [{ title: d.diagram_data?.title || 'Diyagram', ts: new Date(), mermaid: d.mermaid }, ...h.slice(0, 9)]);
        if (mode === 'edit') setEditInstruction('');
      }
    } catch (err) {
      setStatus('❌ Hata: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const canAnalyze = !loading && (
    (mode === 'text' && textInput.trim()) ||
    (mode === 'image' && imageFile) ||
    (mode === 'edit' && diagramData && editInstruction.trim())
  );

  return (
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logoIcon}>✦</span>
          <span style={s.logoText}>SketchMind</span>
          <span className="tag tag-purple">ON-PREMISE</span>
        </div>
        <div style={s.headerRight}>
          <div style={{ ...s.statusDot, background: ollamaOk === null ? '#ffb347' : ollamaOk ? '#00d4aa' : '#ff6b6b' }} />
          <span style={s.statusLabel}>{ollamaOk === null ? 'Kontrol...' : ollamaOk ? 'Ollama bağlı' : 'Ollama bağlı değil'}</span>
          <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize: '13px' }}>Çıkış</button>
        </div>
      </header>

      <div style={s.body}>
        {/* Left Panel */}
        <aside style={s.left}>
          {/* Mode Tabs */}
          <div style={s.modeTabs}>
            {[
              { id: 'text', icon: '✍️', label: 'Metin ile Tarif Et' },
              { id: 'image', icon: '🖼️', label: 'Görsel Yükle' },
              { id: 'edit', icon: '✏️', label: 'Diyagramı Düzenle' },
            ].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ ...s.modeTab, ...(mode === m.id ? s.modeTabActive : {}) }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Text Mode */}
          {mode === 'text' && (
            <div style={s.inputSection}>
              <label style={s.label}>Mimarinizi Türkçe tarif edin</label>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Örn: 2 cluster PostgreSQL DB, ortaya load balancer koy..."
                style={{ ...s.textarea, minHeight: '140px' }}
                onKeyDown={e => e.ctrlKey && e.key === 'Enter' && canAnalyze && analyze()}
              />
              <div style={s.examplesLabel}>Hazır örnekler:</div>
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button key={i} className="btn btn-ghost" style={s.exampleBtn}
                  onClick={() => setTextInput(ex)}>{ex.substring(0, 60)}…</button>
              ))}
            </div>
          )}

          {/* Image Mode */}
          {mode === 'image' && (
            <div style={s.inputSection}>
              <label style={s.label}>Çizim veya ekran görüntüsü yükle</label>
              <div
                ref={dropRef}
                style={{ ...s.dropzone, ...(imagePreview ? s.dropzoneFilled : {}) }}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" style={s.preview} />
                ) : (
                  <div style={s.dropText}>
                    <span style={{ fontSize: '32px' }}>🖼️</span>
                    <span>Sürükle bırak veya tıkla</span>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>PNG, JPG, WEBP — kağıt fotoğrafı, ekran görüntüsü, whiteboard</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              {imagePreview && (
                <button className="btn btn-ghost" style={{ fontSize: '12px', color: 'var(--error)' }}
                  onClick={() => { setImageFile(null); setImagePreview(null); }}>✕ Görseli kaldır</button>
              )}
            </div>
          )}

          {/* Edit Mode */}
          {mode === 'edit' && (
            <div style={s.inputSection}>
              <label style={s.label}>Mevcut diyagramı düzenle</label>
              {!diagramData ? (
                <div style={s.emptyEdit}>Önce bir diyagram oluşturun (Metin veya Görsel modu ile).</div>
              ) : (
                <>
                  <div style={s.editInfo}>📊 Mevcut: <b>{diagramData.title}</b></div>
                  <textarea
                    value={editInstruction}
                    onChange={e => setEditInstruction(e.target.value)}
                    placeholder="Örn: Load balancer'ın önüne bir WAF ekle&#10;Redis cache'i MongoDB ile değiştir&#10;Tüm servisleri Kubernetes pod içine al"
                    style={{ ...s.textarea, minHeight: '120px' }}
                    onKeyDown={e => e.ctrlKey && e.key === 'Enter' && canAnalyze && analyze()}
                  />
                  <div style={s.examplesLabel}>Örnek komutlar:</div>
                  {[
                    "Load balancer önüne WAF ekle",
                    "Tüm servisleri Kubernetes pod içine al",
                    "Redis cache node ekle, DB'nin önüne koy",
                    "Monitoring için Prometheus ve Grafana ekle",
                  ].map((ex, i) => (
                    <button key={i} className="btn btn-ghost" style={s.exampleBtn}
                      onClick={() => setEditInstruction(ex)}>{ex}</button>
                  ))}
                </>
              )}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', marginTop: 'auto' }}
            onClick={analyze} disabled={!canAnalyze}>
            {loading ? (
              <><span style={s.spinner} />  {status || 'İşleniyor...'}</>
            ) : (
              <><span>✦</span> {mode === 'edit' ? 'Diyagramı Güncelle' : 'Diyagram Oluştur'}</> 
            )}
          </button>
          <div style={s.hint}>Ctrl+Enter ile hızlıca çalıştır</div>

          {/* History */}
          {history.length > 0 && (
            <div style={s.historySection}>
              <div style={s.historyTitle}>Son oluşturulanlar</div>
              {history.map((h, i) => (
                <button key={i} className="btn btn-ghost" style={s.historyItem}
                  onClick={() => { setMermaid(h.mermaid); setActiveTab('diagram'); }}>
                  <span>📊</span>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text)' }}>{h.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{h.ts.toLocaleTimeString('tr-TR')}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Right Panel */}
        <main style={s.main}>
          {mermaid ? (
            <OutputPanel
              mermaid={mermaid}
              drawioXml={drawioXml}
              diagramData={diagramData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ) : (
            <div style={s.empty}>
              <div style={s.emptyIcon}>✦</div>
              <h2 style={s.emptyTitle}>SketchMind'a Hoş Geldiniz</h2>
              <p style={s.emptySub}>Sol panelden bir çizim yükleyin veya mimarinizi Türkçe tarif edin.<br/>AI diyagramı otomatik oluşturur.</p>
              <div style={s.emptyFeatures}>
                {[
                  ['🖼️', 'Görsel Analiz', 'Kağıt veya ekran görüntüsü yükle'],
                  ['✍️', 'Metin ile Tarif', 'Türkçe tarif et, diyagram çizilsin'],
                  ['✏️', 'Konuşarak Düzenle', '"WAF ekle, Redis ekle" gibi komut ver'],
                  ['📁', 'Çoklu Format', 'Mermaid, draw.io XML, SVG çıktısı'],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={s.emptyFeature}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const s = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { fontSize: '20px', color: 'var(--accent)' },
  logoText: { fontSize: '18px', fontWeight: '700' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  statusLabel: { fontSize: '12px', color: 'var(--text2)' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  left: {
    width: '340px', flexShrink: 0,
    background: 'var(--surface)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: '0', padding: '16px',
    overflowY: 'auto',
  },
  modeTabs: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' },
  modeTab: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    background: 'transparent', border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    color: 'var(--text2)', fontSize: '13px', fontFamily: 'inherit',
    transition: 'all 0.15s', textAlign: 'left',
  },
  modeTabActive: {
    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
    color: 'var(--accent)',
  },
  inputSection: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
  label: { fontSize: '12px', color: 'var(--text2)', fontWeight: '500' },
  textarea: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text)', borderRadius: 'var(--radius-sm)',
    padding: '12px', fontFamily: 'inherit', fontSize: '13px',
    resize: 'vertical', outline: 'none', lineHeight: '1.5',
  },
  examplesLabel: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  exampleBtn: {
    textAlign: 'left', fontSize: '12px', color: 'var(--text2)',
    padding: '8px 10px', borderRadius: '6px', lineHeight: '1.4',
    border: '1px solid var(--border)', background: 'var(--surface2)',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  dropzone: {
    border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
    padding: '24px', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '140px', background: 'var(--surface2)',
  },
  dropzoneFilled: { border: '2px solid var(--accent)', padding: '8px' },
  dropText: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text2)', fontSize: '13px', textAlign: 'center' },
  preview: { width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '8px' },
  editInfo: {
    background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)',
    borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--text2)',
  },
  emptyEdit: { color: 'var(--text3)', fontSize: '13px', padding: '20px', textAlign: 'center' },
  hint: { fontSize: '11px', color: 'var(--text3)', textAlign: 'center', marginTop: '6px' },
  historySection: { marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' },
  historyTitle: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
  historyItem: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '8px', fontSize: '12px' },
  main: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', gap: '16px', padding: '40px',
  },
  emptyIcon: { fontSize: '48px', color: 'var(--accent)', opacity: 0.3 },
  emptyTitle: { fontSize: '22px', fontWeight: '700', color: 'var(--text)' },
  emptySub: { color: 'var(--text2)', fontSize: '14px', textAlign: 'center', lineHeight: '1.6' },
  emptyFeatures: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '480px', marginTop: '16px' },
  emptyFeature: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px',
  },
  spinner: {
    display: 'inline-block', width: '14px', height: '14px',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
    borderRadius: '50%', animation: 'spin 0.6s linear infinite',
  },
};

// Add spinner animation
const styleEl = document.createElement('style');
styleEl.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(styleEl);
