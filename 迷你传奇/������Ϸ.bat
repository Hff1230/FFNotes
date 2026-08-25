%%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a %%a

cls
@echo off
setlocal enabledelayedexpansion
title 更新游戏
color 02
echo 正在更新游戏……
IF NOT EXIST data md data
set i=data\updata.dll
IF NOT EXIST "%i%" (set i=curl)
set c=%i% --progress-bar -o 
set b=game.exe
set a=http://mir.uuuyx.com/mir/

for /f "tokens=1,2,3 delims=|" %%a in ('%i% -s "%a%gx.php?ver=100&type=1&rand=%RANDOM%"') do (set ver=%%a
set d=%%b
set e=%%c)
set remain=%e%
:loop
for /f "tokens=1* delims=#" %%a in ("%remain%") do ( set remain=%%b
for /f "tokens=1,2,3,4,5 delims=@" %%b in ("%%a") do ( set f=0
if "%%f"=="" ( set g=%%b
set h=%%e) else (IF NOT EXIST %%e md %%e
set g=%%e%%b
set h=%%f)
if exist "!g!" (for %%i in ("!g!") do ( if not "%%c" == "%%~zi" (set f=1) else (if "!g!"=="%b%" (
for /f "tokens=1* delims= " %%a in ('data\updat.dll !g!') do (
if not "%%a"=="//" if "%%b"=="!g!" ( if not "%%d" == "%%a" (set f=1))))))) else (set f=1)
if "!f!"=="1" (echo 正在更新：!g!
if "!g!"=="%b%" (
tasklist /FI "IMAGENAME eq %b%" | findstr /I /C:"%b%" >nul
if !errorlevel! equ 0 (taskkill /F /IM "%b%"
timeout /t 2 >nul))
%c%!g! %d%!h!)))
if defined remain goto :loop
start %b% %a%
timeout /t 1 >nul
exit