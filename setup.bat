@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
title SketchMind Setup

:: Colors (works in Windows 10+)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "RESET=[0m"

if "%1"=="" goto help
if "%1"=="install" goto install
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="status" goto status
if "%1"=="open" goto open
if "%1"=="logs" goto logs
if "%1"=="pull-models" goto pull_models
goto help

:help
echo.
echo  %CYAN%╔══════════════════════════════════════╗
echo  ║    SketchMind — AI Diagram Studio    ║
echo  ╚══════════════════════════════════════╝%RESET%
echo.
echo  Kullanim: setup.bat [komut]
echo.
echo  Komutlar:
echo    install      — Tam kurulum (ilk kez)
echo    start        — Servisleri baslat
echo    stop         — Servisleri durdur
echo    status       — Durum kontrol
echo    open         — Tarayicida ac
echo    logs         — Canlı log izle
echo    pull-models  — AI modellerini indir
echo.
goto end

:install
echo.
echo  %CYAN%[SketchMind] Kurulum basliyor...%RESET%
echo.

:: Check Python
python --version > nul 2>&1
if errorlevel 1 (
    echo  %RED%[HATA] Python bulunamadi!%RESET%
    echo  Lutfen https://python.org adresinden Python 3.11+ indirin
    echo  Kurulumda "Add Python to PATH" secenegini isaretleyin!
    pause & goto end
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo  %GREEN%[OK]%RESET% %%i

:: Check Node.js
node --version > nul 2>&1
if errorlevel 1 (
    echo  %RED%[HATA] Node.js bulunamadi!%RESET%
    echo  Lutfen https://nodejs.org adresinden Node.js LTS indirin
    pause & goto end
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo  %GREEN%[OK]%RESET% Node.js %%i

:: Check/Install Ollama
echo.
echo  %CYAN%[1/4] Ollama kontrol ediliyor...%RESET%
ollama --version > nul 2>&1
if errorlevel 1 (
    echo  %YELLOW%Ollama bulunamadi. Indiriliyor...%RESET%
    echo  Tarayici aciliyor: https://ollama.com/download
    start https://ollama.com/download
    echo.
    echo  Ollama'yi kurun, sonra bu pencereye gelin ve Enter'a basin.
    pause
)
echo  %GREEN%[OK]%RESET% Ollama mevcut

:: Create .env if not exists
if not exist .env (
    echo  %CYAN%[2/4] .env dosyasi olusturuluyor...%RESET%
    copy .env.example .env > nul 2>&1
    echo  %GREEN%[OK]%RESET% .env olusturuldu
) else (
    echo  %GREEN%[OK]%RESET% .env mevcut
)

:: Install Python backend deps
echo.
echo  %CYAN%[3/4] Backend bagımlılıkları kuruluyor...%RESET%
cd backend
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo  %RED%[HATA] pip install basarisiz oldu!%RESET%
    pause & goto end
)
cd ..
echo  %GREEN%[OK]%RESET% Backend bagımlılıkları kuruldu

:: Install frontend deps
echo.
echo  %CYAN%[4/4] Frontend bagımlılıkları kuruluyor...%RESET%
cd frontend
call npm install --silent
if errorlevel 1 (
    echo  %RED%[HATA] npm install basarisiz oldu!%RESET%
    pause & goto end
)
cd ..
echo  %GREEN%[OK]%RESET% Frontend bagımlılıkları kuruldu

echo.
echo  %GREEN%╔══════════════════════════════════════════╗
echo  ║   Kurulum tamamlandi!                   ║
echo  ╚══════════════════════════════════════════╝%RESET%
echo.
echo  Simdi AI modelleri indirilecek (~15 GB):
echo  setup.bat pull-models
echo.
echo  Veya direkt baslatın (modeller otomatik indirilir):
echo  setup.bat start
echo.
goto end

:pull_models
echo.
echo  %CYAN%[SketchMind] AI Modelleri indiriliyor...%RESET%
echo  Bu işlem internet hizina gore 15-30 dakika surebilir.
echo.
echo  Metin modeli indiriliyor: llama3.1:8b (~5 GB)
start "Ollama Service" /min ollama serve
timeout /t 3 > nul
ollama pull llama3.1:8b
echo.
echo  Gorsel modeli indiriliyor: llama3.2-vision:11b (~8 GB)
ollama pull llama3.2-vision:11b
echo.
echo  %GREEN%[OK]%RESET% Modeller hazir!
goto end

:start
echo.
echo  %CYAN%[SketchMind] Baslatiliyor...%RESET%
echo.

:: Start Ollama
echo  Ollama servisi baslatiliyor...
start "Ollama" /min cmd /c "ollama serve"
timeout /t 2 > nul

:: Start Backend
echo  Backend API baslatiliyor (port 8000)...
start "SketchMind Backend" /min cmd /c "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 > nul

:: Start Frontend
echo  Frontend baslatiliyor (port 3000)...
start "SketchMind Frontend" /min cmd /c "cd /d %~dp0frontend && npm start"
timeout /t 5 > nul

echo.
echo  %GREEN%Tum servisler baslatildi!%RESET%
echo.
echo  Uygulama: http://localhost:3000
echo  API Docs: http://localhost:8000/docs
echo  Giris:    admin / admin123
echo.
echo  Tarayici aciliyor...
timeout /t 5 > nul
start http://localhost:3000
goto end

:stop
echo.
echo  %CYAN%[SketchMind] Durduruluyor...%RESET%
taskkill /f /fi "WindowTitle eq Ollama*" > nul 2>&1
taskkill /f /fi "WindowTitle eq SketchMind*" > nul 2>&1
taskkill /f /im "node.exe" > nul 2>&1
taskkill /f /im "python.exe" > nul 2>&1
echo  %GREEN%[OK]%RESET% Tum servisler durduruldu
goto end

:status
echo.
echo  %CYAN%[SketchMind] Durum Kontrolu%RESET%
echo.
:: Check Ollama
curl -s http://localhost:11434/api/tags > nul 2>&1
if errorlevel 1 (echo  %RED%[X]%RESET% Ollama - Calismiyor) else (echo  %GREEN%[OK]%RESET% Ollama - http://localhost:11434)
:: Check Backend
curl -s http://localhost:8000/api/health > nul 2>&1
if errorlevel 1 (echo  %RED%[X]%RESET% Backend - Calismiyor) else (echo  %GREEN%[OK]%RESET% Backend  - http://localhost:8000)
:: Check Frontend
curl -s http://localhost:3000 > nul 2>&1
if errorlevel 1 (echo  %RED%[X]%RESET% Frontend - Calismiyor) else (echo  %GREEN%[OK]%RESET% Frontend - http://localhost:3000)
echo.
goto end

:open
start http://localhost:3000
goto end

:logs
echo  Canlı log izleniyor... (Ctrl+C ile cik)
echo.
powershell -command "Get-Content -Path '%~dp0logs\backend.log' -Wait -ErrorAction SilentlyContinue"
goto end

:end
endlocal
