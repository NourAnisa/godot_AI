@echo off
echo Menghentikan daemon Godot AI di port 32124...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":32124" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a
)
echo Daemon berhenti.
pause