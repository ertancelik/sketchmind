# SketchMind — On-Premise AI Diagram Studio

> El çizimlerini ve metin tariflerini profesyonel diyagramlara dönüştüren, tamamen yerel çalışan AI sistemi.

## Özellikler

- 🖼️ **Görsel Analiz** — Kağıt çizimi, whiteboard veya ekran görüntüsü yükle → AI diyagrama çevirsin
- ✍️ **Metin ile Tarif** — Türkçe tarif et → anında diyagram
- ✏️ **Konuşarak Düzenle** — "WAF ekle", "Redis ekle" gibi komutlarla diyagramı geliştir
- 📁 **Çoklu Format** — Mermaid, draw.io XML, SVG çıktısı
- 🔒 **Tamamen Yerel** — Hiçbir veri dışarı çıkmaz, internet gerektirmez (kurulum sonrası)

## Gereksinimler

- Windows 10/11
- Python 3.11+ → https://python.org (kurulumda "Add Python to PATH" seç!)
- Node.js 18+ LTS → https://nodejs.org
- Ollama → https://ollama.com/download
- 16 GB RAM önerilir
- 20 GB boş disk (modeller için)

## Kurulum

```cmd
cd C:\Users\%USERNAME%\Desktop\sketchmind

:: Tam kurulum (ilk kez — 20-30 dk sürer)
setup.bat install

:: AI modellerini indir (~15 GB)
setup.bat pull-models

:: Başlat
setup.bat start
```

Tarayıcı otomatik açılır: http://localhost:3000  
Giriş: **admin** / **admin123**

## Günlük Kullanım

```cmd
setup.bat start     ← Başlat
setup.bat stop      ← Kapat
setup.bat status    ← Durum kontrol
setup.bat open      ← Tarayıcıda aç
```

## Şifre Değiştirme

`.env` dosyasını Notepad ile aç, `ADMIN_PASSWORD` satırını değiştir, sonra `setup.bat start`.

## Mimari

```
Tarayıcı (React :3000)
    ↓
Backend API (FastAPI :8000)
    ↓
Ollama (:11434)
  ├── llama3.2-vision:11b  ← Görsel analiz
  └── llama3.1:8b          ← Metin analiz / düzenleme
```

## Lisans

MIT
