@echo off
title Godot AI Mahasiswa - Git Sync Daemon (Port 32124)
echo ==============================================================
echo    Godot AI - Asisten Mahasiswa (Git Sync Daemon)
echo ==============================================================
echo Folder Proyek: C:\Users\Nor Anisa\godot_AI
echo Repo GitHub:   https://github.com/NourAnisa/godot_AI
echo Port Daemon:   32124
echo.
echo Daemon sedang berjalan...
echo Buka browser (ChatGPT / Claude / DeepSeek / Gemini) untuk menggunakan!
echo Tekan Ctrl+C untuk menghentikan.
echo ==============================================================
node "%~dp0daemon\server.js"
pause