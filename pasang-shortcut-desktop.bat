@echo off
setlocal
title Pasang Shortcut Desktop - Godot AI Sync
echo ==============================================================
echo    Membuat Shortcut Desktop "Godot AI Sync"...
echo ==============================================================

set "TARGET=%~dp0start-sync.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\Godot AI Sync.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; $s.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo  [BERHASIL] Shortcut "Godot AI Sync" telah dibuat di Desktop laptopmu!
    echo  Kamu bisa langsung mengklik shortcut tersebut di Desktop untuk memulai.
) else (
    echo.
    echo  [Info] Silakan jalankan start-sync.bat langsung dari folder ini.
)
echo ==============================================================
pause
