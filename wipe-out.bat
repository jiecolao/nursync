@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo NurSync Environment Reset Utility
echo ========================================
echo.

:: 1. Search for mysql.exe dynamically relative to system roots
set "MYSQL_CMD="

if exist "%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set "MYSQL_CMD=%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "%ProgramFiles(x86)%\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set "MYSQL_CMD=%ProgramFiles(x86)%\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "%SystemDrive%\MySQL\bin\mysql.exe" (
    set "MYSQL_CMD=%SystemDrive%\MySQL\bin\mysql.exe"
) else (
    where mysql >nul 2>&1
    if not errorlevel 1 set "MYSQL_CMD=mysql"
)

:: 2. Fallback error check if mysql.exe wasn't located
if "%MYSQL_CMD%"=="" (
    echo ERROR: mysql.exe could not be found automatically.
    echo Please ensure MySQL is installed or added to PATH.
    echo.
    pause
    exit /b 1
)

echo Resetting MySQL database 'nursync'...
"%MYSQL_CMD%" -u root -pNursync@11 -e "DROP DATABASE IF EXISTS nursync; CREATE DATABASE nursync;"
if errorlevel 1 (
    echo ERROR: Failed to reset the MySQL database.
    echo Check your MySQL password and ensure the service is running.
    echo.
    pause
    exit /b 1
)
echo MySQL database 'nursync' reset successfully.
echo.

echo Cleaning up target database directories...

:: Wipe .\Database\Students
if exist ".\Database\Students" (
    rmdir /S /Q ".\Database\Students"
)
mkdir ".\Database\Students"
echo  - Cleared .\Database\Students

:: Wipe .\Database\Trash
if exist ".\Database\Trash" (
    rmdir /S /Q ".\Database\Trash"
)
mkdir ".\Database\Trash"
echo  - Cleared .\Database\Trash

:: Wipe .\Database\Admin\Pictures
if exist ".\Database\Admin\Pictures" (
    rmdir /S /Q ".\Database\Admin\Pictures"
)
mkdir ".\Database\Admin\Pictures"
echo  - Cleared .\Database\Admin\Pictures

echo.
echo Environment reset completed.
pause