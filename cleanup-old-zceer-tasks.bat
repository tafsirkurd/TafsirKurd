@echo off
REM ========================================
REM Cleanup Old Zceer Tasks
REM Run this file as Administrator
REM ========================================

echo Cleaning up old zceer tasks...
echo.

REM Delete the old tasks with spaces in the name
echo Deleting old tasks...
schtasks /delete /tn "Tafsir Kurd - Random Zceer Morning" /f
schtasks /delete /tn "Tafsir Kurd - Random Zceer Afternoon" /f
schtasks /delete /tn "Tafsir Kurd - Random Zceer Evening" /f

echo.
echo ========================================
echo Cleanup complete!
echo ========================================
echo.
echo Remaining tasks:
schtasks /query /fo LIST /tn "TafsirKurd Zceer Morning" | findstr "TaskName Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Afternoon" | findstr "TaskName Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Evening" | findstr "TaskName Next"
echo.
pause
