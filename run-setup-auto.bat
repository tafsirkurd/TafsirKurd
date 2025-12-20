@echo off
echo Running automatic zceer setup...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0setup-zceer-automatic.ps1"
pause
