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

REM Morning zceer (8 AM with random delay up to 2 hours)
echo [1/3] Creating Morning Zceer task (8-10 AM)...
schtasks /create /tn "TafsirKurd Zceer Morning" /tr "C:\TafsirKurd\send-random-zceer.bat" /sc daily /st 08:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Morning" /delay 0000:00-0002:00

REM Afternoon zceer (2 PM with random delay up to 2 hours)
echo [2/3] Creating Afternoon Zceer task (2-4 PM)...
schtasks /create /tn "TafsirKurd Zceer Afternoon" /tr "C:\TafsirKurd\send-random-zceer.bat" /sc daily /st 14:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Afternoon" /delay 0000:00-0002:00

REM Evening zceer (8 PM with random delay up to 2 hours)
echo [3/3] Creating Evening Zceer task (8-10 PM)...
schtasks /create /tn "TafsirKurd Zceer Evening" /tr "C:\TafsirKurd\send-random-zceer.bat" /sc daily /st 20:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Evening" /delay 0000:00-0002:00

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
echo   - Morning: 8:00-10:00 AM
echo   - Afternoon: 2:00-4:00 PM
echo   - Evening: 8:00-10:00 PM
echo.
echo Check Discord channel: #🤲-zceer
echo.
pause
