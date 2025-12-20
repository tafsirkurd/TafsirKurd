@echo off
echo Fixing zceer tasks - Run this as ADMINISTRATOR
echo.
echo Checking for admin rights...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo Deleting old broken tasks...
schtasks /delete /tn "TafsirKurd Zceer Morning" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Zceer Afternoon" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Zceer Evening" /f >nul 2>&1
schtasks /delete /tn "Tafsir Kurd - Random Zceer Morning" /f >nul 2>&1
schtasks /delete /tn "Tafsir Kurd - Random Zceer Afternoon" /f >nul 2>&1
schtasks /delete /tn "Tafsir Kurd - Random Zceer Evening" /f >nul 2>&1

echo Creating new working tasks...
echo.

powershell -ExecutionPolicy Bypass -Command "$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'; $trigger = New-ScheduledTaskTrigger -Daily -At 08:00; $principal = New-ScheduledTaskPrincipal -UserId '%USERNAME%' -RunLevel Highest; Register-ScheduledTask -TaskName 'TafsirKurd Zceer Morning' -Action $action -Trigger $trigger -Principal $principal -Force"
echo [1/3] Morning task created at 8:00 AM

powershell -ExecutionPolicy Bypass -Command "$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'; $trigger = New-ScheduledTaskTrigger -Daily -At 14:00; $principal = New-ScheduledTaskPrincipal -UserId '%USERNAME%' -RunLevel Highest; Register-ScheduledTask -TaskName 'TafsirKurd Zceer Afternoon' -Action $action -Trigger $trigger -Principal $principal -Force"
echo [2/3] Afternoon task created at 2:00 PM

powershell -ExecutionPolicy Bypass -Command "$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'; $trigger = New-ScheduledTaskTrigger -Daily -At 20:00; $principal = New-ScheduledTaskPrincipal -UserId '%USERNAME%' -RunLevel Highest; Register-ScheduledTask -TaskName 'TafsirKurd Zceer Evening' -Action $action -Trigger $trigger -Principal $principal -Force"
echo [3/3] Evening task created at 8:00 PM

echo.
echo ========================================
echo SUCCESS! Automatic zceer is now enabled
echo ========================================
echo.
echo You will receive zceer at:
echo   - 8:00 AM daily
echo   - 2:00 PM daily
echo   - 8:00 PM daily
echo.
echo Next zceer times:
schtasks /query /fo LIST /tn "TafsirKurd Zceer Morning" | findstr "Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Afternoon" | findstr "Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Evening" | findstr "Next"
echo.
pause
