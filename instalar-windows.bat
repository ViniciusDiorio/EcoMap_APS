@echo off
REM EcoMap Jundiai - instalacao no Windows 10/11.
REM Clique duas vezes neste arquivo. Ele executa instalar-windows.ps1, que
REM copia o projeto para C:\EcoMap, instala as dependencias e configura o IP.
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-windows.ps1"
echo.
pause
