@echo off
echo ========================================
echo  ARVA - Start Development Environment
echo ========================================
echo.

:: Start Hardhat Node in background
echo Starting Hardhat Node...
start "Hardhat Node" cmd /k "cd /d %~dp0blockchain && npm run node"

:: Wait for node to start
timeout /t 5 /nobreak >nul

:: Deploy Contract
echo Deploying Contract...
cd /d %~dp0blockchain
call npx hardhat run scripts/deploy.js --network localhost

:: Mint Demo Assets
echo Minting Demo Assets...
call npx hardhat run scripts/mint-demo-assets.js --network localhost

:: Start Backend
echo Starting Backend Server...
start "ARVA Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo ========================================
echo  ARVA Development Environment Started!
echo ========================================
echo.
echo Running Services:
echo   - Hardhat Node: http://localhost:8545
echo   - Backend API:  http://localhost:3000
echo.
echo API Endpoints:
echo   POST http://localhost:3000/api/verify
echo   GET  http://localhost:3000/api/demo/assets
echo   GET  http://localhost:3000/api/health
echo.
echo Test with:
echo   curl -X POST http://localhost:3000/api/verify -H "Content-Type: application/json" -d "{\"uniqueId\": \"DEGREE-MIT-2024-001\"}"
echo.
pause
