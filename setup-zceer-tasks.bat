@echo off
REM ========================================
REM Setup TafsirKurd Zceer Scheduled Tasks
REM Run this file as Administrator
REM ========================================

echo Setting up TafsirKurd Zceer scheduled tasks...
echo.

REM Delete old tasks if they exist
echo Removing old tasks (if any)...
schtasks /delete /tn "TafsirKurd Zceer Morning" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Zceer Afternoon" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Zceer Evening" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Random Zceer Morning" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Random Zceer Afternoon" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Random Zceer Evening" /f >nul 2>&1

echo.
echo Creating new tasks...
echo.

REM Morning zceer (8 AM)
echo [1/3] Creating Morning Zceer task (8:00 AM)...
powershell -Command "$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'; $trigger = New-ScheduledTaskTrigger -Daily -At 08:00; $principal = New-ScheduledTaskPrincipal -UserId '%USERNAME%' -RunLevel Highest; Register-ScheduledTask -TaskName 'TafsirKurd Zceer Morning' -Action $action -Trigger $trigger -Principal $principal -Force"

REM Afternoon zceer (2 PM)
echo [2/3] Creating Afternoon Zceer task (2:00 PM)...
powershell -Command "$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'; $trigger = New-ScheduledTaskTrigger -Daily -At 14:00; $principal = New-ScheduledTaskPrincipal -UserId '%USERNAME%' -RunLevel Highest; Register-ScheduledTask -TaskName 'TafsirKurd Zceer Afternoon' -Action $action -Trigger $trigger -Principal $principal -Force"

REM Evening zceer (8 PM)
echo [3/3] Creating Evening Zceer task (8:00 PM)...
powershell -Command "$action = New-ScheduledTaskAction -Execute 'C:\TafsirKurd\send-random-zceer.bat' -WorkingDirectory 'C:\TafsirKurd'; $trigger = New-ScheduledTaskTrigger -Daily -At 20:00; $principal = New-ScheduledTaskPrincipal -UserId '%USERNAME%' -RunLevel Highest; Register-ScheduledTask -TaskName 'TafsirKurd Zceer Evening' -Action $action -Trigger $trigger -Principal $principal -Force"

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Tasks created:
schtasks /query /fo LIST /tn "TafsirKurd Zceer Morning" | findstr "TaskName Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Afternoon" | findstr "TaskName Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Evening" | findstr "TaskName Next"

echo.
echo You will receive 3 random zceer notifications daily:
echo   - Morning: 8:00 AM
echo   - Afternoon: 2:00 PM
echo   - Evening: 8:00 PM
echo.
echo Check Discord channel: #🤲-zceer
echo.
pause
