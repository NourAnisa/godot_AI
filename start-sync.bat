@echo off
setlocal enabledelayedexpansion
title Godot AI Studio - Sync Daemon (Port 32124)

cd /d "%~dp0"

echo ==============================================================
echo    Godot AI Studio - Game Dev Assistant (Sync Daemon)
echo ==============================================================

:: 1. Pemeriksaan Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  [X] Node.js belum terdeteksi di laptop ini!
    echo.
    echo  Aplikasi ini membutuhkan Node.js (gratis & aman) untuk berjalan.
    echo  Silakan unduh dan pasang versi LTS dari:
    echo  👉 https://nodejs.org
    echo.
    echo  Setelah selesai menginstall Node.js, silakan jalankan kembali file ini.
    echo ==============================================================
    echo.
    pause
    exit /b 1
)

:: 2. Info Dinamis Sesuai Laptop Pengguna
echo  Folder Proyek : %~dp0
echo  Port Daemon   : 32124
echo.
echo  Daemon sinkronisasi sedang berjalan di latar belakang...
echo  Buka browser (ChatGPT / Claude / DeepSeek / Gemini) untuk mulai!
echo  Tekan Ctrl+C di jendela ini jika ingin menghentikan.
echo ==============================================================
echo.

node "%~dp0daemon\server.js" "%~dp0"
if %errorlevel% neq 0 (
    echo.
    echo  [Info] Daemon telah berhenti.
    pause
)