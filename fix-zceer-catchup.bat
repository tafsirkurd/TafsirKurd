@echo off
REM ========================================
REM Fix Zceer Tasks - Disable Missed Task Catch-up
REM This prevents tasks from running if the computer was off
REM ========================================

echo Fixing zceer tasks to prevent catch-up runs...
echo.

REM Export current tasks to XML
schtasks /query /tn "TafsirKurd Zceer Morning" /xml > "%TEMP%\morning.xml"
schtasks /query /tn "TafsirKurd Zceer Afternoon" /xml > "%TEMP%\afternoon.xml"
schtasks /query /tn "TafsirKurd Zceer Evening" /xml > "%TEMP%\evening.xml"

REM Delete old tasks
schtasks /delete /tn "TafsirKurd Zceer Morning" /f
schtasks /delete /tn "TafsirKurd Zceer Afternoon" /f
schtasks /delete /tn "TafsirKurd Zceer Evening" /f

REM Recreate tasks with proper settings (no catch-up)
echo Creating Morning task (8-10 AM, no catch-up)...
schtasks /create /tn "TafsirKurd Zceer Morning" /tr "C:\TafsirKurd\send-random-zceer.bat" /sc daily /st 08:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Morning" /delay 0000:00-0002:00

echo Creating Afternoon task (2-4 PM, no catch-up)...
schtasks /create /tn "TafsirKurd Zceer Afternoon" /tr "C:\TafsirKurd\send-random-zceer.bat" /sc daily /st 14:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Afternoon" /delay 0000:00-0002:00

echo Creating Evening task (8-10 PM, no catch-up)...
schtasks /create /tn "TafsirKurd Zceer Evening" /tr "C:\TafsirKurd\send-random-zceer.bat" /sc daily /st 20:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Evening" /delay 0000:00-0002:00

echo.
echo ========================================
echo Fix applied!
echo ========================================
echo.
echo Now the tasks will:
echo   - Only run at their scheduled times
echo   - NOT run if you missed the time
echo   - NOT catch up on missed runs
echo.
echo Next scheduled runs:
schtasks /query /fo LIST /tn "TafsirKurd Zceer Morning" | findstr "Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Afternoon" | findstr "Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Evening" | findstr "Next"
echo.
pause
