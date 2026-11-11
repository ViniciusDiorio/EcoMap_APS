@echo off
REM EcoMap Jundiai - inicia a API e o Expo (depois de instalar-windows.bat).
REM Abra o app no CELULAR pelo Expo Go. Nao use o navegador.
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-windows.ps1"
echo.
pause
