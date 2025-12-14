#!/bin/bash

echo "========================================"
echo " ARVA - Start Development Environment"
echo "========================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Hardhat Node in background
echo "Starting Hardhat Node..."
cd "$SCRIPT_DIR/blockchain"
npm run node &
HARDHAT_PID=$!

# Wait for node to start
sleep 5

# Deploy Contract
echo "Deploying Contract..."
npx hardhat run scripts/deploy.js --network localhost

# Mint Demo Assets
echo "Minting Demo Assets..."
npx hardhat run scripts/mint-demo-assets.js --network localhost

# Start Backend
echo "Starting Backend Server..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

echo ""
echo "========================================"
echo " ARVA Development Environment Started!"
echo "========================================"
echo ""
echo "Running Services:"
echo "  - Hardhat Node: http://localhost:8545 (PID: $HARDHAT_PID)"
echo "  - Backend API:  http://localhost:3000 (PID: $BACKEND_PID)"
echo ""
echo "API Endpoints:"
echo "  POST http://localhost:3000/api/verify"
echo "  GET  http://localhost:3000/api/demo/assets"
echo "  GET  http://localhost:3000/api/health"
echo ""
echo "Test with:"
echo "  curl -X POST http://localhost:3000/api/verify -H 'Content-Type: application/json' -d '{\"uniqueId\": \"DEGREE-MIT-2024-001\"}'"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $HARDHAT_PID $BACKEND_PID 2>/dev/null" EXIT
wait
