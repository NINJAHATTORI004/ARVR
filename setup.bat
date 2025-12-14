@echo off
echo ========================================
echo  ARVA - Complete Setup Script
echo  QIE Blockchain Hackathon
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)
echo [OK] Node.js found

:: Setup Blockchain
echo.
echo [1/3] Setting up Blockchain...
cd blockchain
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install blockchain dependencies
    pause
    exit /b 1
)
echo [OK] Blockchain dependencies installed

:: Copy env file
if not exist .env (
    copy .env.example .env >nul
    echo [OK] Created .env file - Please configure it
)

:: Setup Backend
echo.
echo [2/3] Setting up Backend...
cd ..\backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

:: Copy env file
if not exist .env (
    copy .env.example .env >nul
    echo [OK] Created .env file - Please configure it
)

:: Done
echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo   1. Start Hardhat node:    cd blockchain ^&^& npm run node
echo   2. Deploy contract:       cd blockchain ^&^& npm run deploy:local
echo   3. Mint demo assets:      cd blockchain ^&^& npm run mint:demo
echo   4. Start backend:         cd backend ^&^& npm run dev
echo   5. Open Unity project and build
echo.
echo Demo Test IDs:
echo   Valid:   DEGREE-MIT-2024-001
echo   Invalid: FAKE-DEGREE-2024-XXX
echo.
pause
