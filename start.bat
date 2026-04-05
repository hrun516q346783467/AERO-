@echo off
echo --- AERO Editor Baslatiliyor ---
echo.
echo [1/2] Sunucu Baslatiliyor...
start /b node server.js
echo [2/2] Tarayici Aciliyor...
start "" "editor/index.html"
echo.
echo --- AERO Editor Hazir! ---
echo Editor'den cikinca bu pencereyi kapatabilirsiniz.
pause
