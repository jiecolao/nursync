@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo NurSync setup and development startup
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found on PATH.
    echo Install Node.js 20 or newer, then run this file again.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm was not found on PATH.
    echo Reinstall Node.js with npm included, then run this file again.
    echo.
    pause
    exit /b 1
)

if not exist ".env" (
    if not exist ".env.example" (
        echo ERROR: Neither .env nor .env.example exists.
        echo.
        pause
        exit /b 1
    )

    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example.
    echo Update .env with your database, JWT, and SMTP settings before continuing.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing project dependencies...
    call npm.cmd ci
    if errorlevel 1 (
        echo ERROR: Dependency installation failed.
        echo.
        pause
        exit /b 1
    )
    echo.
)

echo Generating Prisma Client...
call npm.cmd exec -- prisma generate
if errorlevel 1 (
    echo ERROR: Prisma Client generation failed.
    echo Check that DATABASE_URL is configured in .env.
    echo.
    pause
    exit /b 1
)

echo Applying database migrations...
call npm.cmd exec -- prisma migrate deploy
if errorlevel 1 (
    echo ERROR: Database migration failed.
    echo Check that the database is running and DATABASE_URL is correct in .env.
    echo.
    pause
    exit /b 1
)

echo Seeding database...
call npm.cmd exec -- prisma db seed
if errorlevel 1 (
    echo ERROR: Database seeding failed.
    echo Check your database in the Prisma Studio or MySQL workbench
    echo.
    pause
    exit /b 1
)

echo.
echo Starting the backend and frontend...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5151
echo Press Ctrl+C to stop the development servers.
echo.

call npm.cmd run dev
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Development servers exited with code %EXIT_CODE%.
)

echo.
pause
exit /b %EXIT_CODE%