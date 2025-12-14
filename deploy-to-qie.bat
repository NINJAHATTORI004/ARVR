@echo off
echo ═══════════════════════════════════════════════════════════════════════════
echo   ARVA - Deploy to QIE Blockchain (Chain ID: 5656)
echo ═══════════════════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0blockchain"

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo.
    echo Please create blockchain\.env with your configuration:
    echo   1. Copy .env.example to .env
    echo   2. Add your DEPLOYER_PRIVATE_KEY
    echo.
    echo Example .env contents:
    echo   DEPLOYER_PRIVATE_KEY=your_private_key_here
    echo   QIE_RPC_URL=https://rpc-main1.qiblockchain.online
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking QIE Network connection...
echo.

echo [2/4] Compiling smart contracts...
call npx hardhat compile
if errorlevel 1 (
    echo [ERROR] Compilation failed!
    pause
    exit /b 1
)
echo.

echo [3/4] Deploying to QIE Blockchain...
echo      Network: QIE (Chain ID: 5656)
echo      RPC: https://rpc-main1.qiblockchain.online
echo.
call npx hardhat run scripts/deploy.js --network qie
if errorlevel 1 (
    echo [ERROR] Deployment failed!
    echo.
    echo Possible issues:
    echo   - Insufficient QIE balance for gas fees
    echo   - Invalid private key
    echo   - Network connectivity issues
    echo.
    pause
    exit /b 1
)
echo.

echo [4/4] Minting demo assets...
call npx hardhat run scripts/mint-demo-assets.js --network qie
echo.

echo ═══════════════════════════════════════════════════════════════════════════
echo   ✅ DEPLOYMENT COMPLETE!
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo   Check your contract on the QIE Block Explorer:
echo   https://mainnet.qiblockchain.online
echo.
echo   Contract address saved to:
echo   blockchain\deployments\localhost-deployment.json
echo.
pause
