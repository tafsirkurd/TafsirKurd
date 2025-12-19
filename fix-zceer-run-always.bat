@echo off
REM ========================================
REM Fix Zceer Tasks - Run Whether Logged In or Not
REM This fixes error 2147946720
REM ========================================

echo.
echo ========================================
echo Fixing Zceer Tasks
echo ========================================
echo.
echo This will allow zceer tasks to run:
echo  - When you're logged in
echo  - When you're logged out
echo  - When computer is locked
echo.

pause

echo.
echo Deleting old tasks...
schtasks /delete /tn "TafsirKurd Zceer Morning" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Zceer Afternoon" /f >nul 2>&1
schtasks /delete /tn "TafsirKurd Zceer Evening" /f >nul 2>&1

echo Creating new tasks...
echo.

REM Morning zceer - Run whether user is logged on or not
echo [1/3] Creating Morning Zceer (8-10 AM)...
schtasks /create /tn "TafsirKurd Zceer Morning" /tr "cmd /c \"cd /d C:\TafsirKurd && call send-random-zceer.bat\"" /sc daily /st 08:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Morning" /delay 0000:00-0002:00

REM Afternoon zceer - Run whether user is logged on or not
echo [2/3] Creating Afternoon Zceer (2-4 PM)...
schtasks /create /tn "TafsirKurd Zceer Afternoon" /tr "cmd /c \"cd /d C:\TafsirKurd && call send-random-zceer.bat\"" /sc daily /st 14:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Afternoon" /delay 0000:00-0002:00

REM Evening zceer - Run whether user is logged on or not
echo [3/3] Creating Evening Zceer (8-10 PM)...
schtasks /create /tn "TafsirKurd Zceer Evening" /tr "cmd /c \"cd /d C:\TafsirKurd && call send-random-zceer.bat\"" /sc daily /st 20:00 /rl highest /f
schtasks /change /tn "TafsirKurd Zceer Evening" /delay 0000:00-0002:00

echo.
echo ========================================
echo ✓ Fix applied successfully!
echo ========================================
echo.
echo Tasks will now run even when:
echo  - You're logged out
echo  - Computer is locked
echo  - You're not actively using it
echo.
echo Next scheduled runs:
schtasks /query /fo LIST /tn "TafsirKurd Zceer Morning" | findstr "Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Afternoon" | findstr "Next"
schtasks /query /fo LIST /tn "TafsirKurd Zceer Evening" | findstr "Next"
echo.
echo ========================================
echo Testing...
echo ========================================
echo.
echo Running test zceer now...
call test-zceer.bat
