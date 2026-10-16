@echo off
chcp 65001 > nul
rem Find whatever is LISTENING on PORT and kill it.
rem (The old version hardcoded a dead PID, so it did nothing.)
set PORT=8081
set FOUND=0
echo Looking for a process listening on port %PORT% ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":%PORT% " ^| findstr "LISTENING"') do (
    echo Killing PID %%a
    taskkill /F /PID %%a
    set FOUND=1
)
if "%FOUND%"=="0" echo Port %PORT% is not in use.
if "%FOUND%"=="1" echo Done.
pause
