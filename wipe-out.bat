@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo NurSync Environment Reset Utility
echo ========================================
echo.

where "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" >nul 2>&1
if errorlevel 1 (
    echo ERROR: MySQL executable not found at "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe".
    echo Verify your MySQL installation path before continuing.
    echo.
    pause
    exit /b 1
)

echo Resetting MySQL database 'nursync'...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pNursync@11 -e "DROP DATABASE IF EXISTS nursync; CREATE DATABASE nursync;"
if errorlevel 1 (
    echo ERROR: Failed to reset the MySQL database.
    echo Check your MySQL password and ensure the service is running.
    echo.
    pause
    exit /b 1
)
echo MySQL database 'nursync' reset successfully.
echo.

echo Emptying directory .\Database\Students...
if exist ".\Database\Students" (
    rmdir /S /Q ".\Database\Students"
)
mkdir ".\Database\Students"
echo Directory .\Database\Students cleared successfully.
echo.

echo Environment reset completed.
pause