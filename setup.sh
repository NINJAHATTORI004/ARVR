#!/bin/bash

echo "========================================"
echo " ARVA - Complete Setup Script"
echo " QIE Blockchain Hackathon"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js first."
    exit 1
fi
echo "[OK] Node.js found"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Setup Blockchain
echo ""
echo "[1/3] Setting up Blockchain..."
cd "$SCRIPT_DIR/blockchain"
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install blockchain dependencies"
    exit 1
fi
echo "[OK] Blockchain dependencies installed"

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env file - Please configure it"
fi

# Setup Backend
echo ""
echo "[2/3] Setting up Backend..."
cd "$SCRIPT_DIR/backend"
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install backend dependencies"
    exit 1
fi
echo "[OK] Backend dependencies installed

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env file - Please configure it"
fi

# Done
echo ""
echo "========================================"
echo " Setup Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "  1. Start Hardhat node:    cd blockchain && npm run node"
echo "  2. Deploy contract:       cd blockchain && npm run deploy:local"
echo "  3. Mint demo assets:      cd blockchain && npm run mint:demo"
echo "  4. Start backend:         cd backend && npm run dev"
echo "  5. Open Unity project and build"
echo ""
echo "Demo Test IDs:"
echo "  Valid:   DEGREE-MIT-2024-001"
echo "  Invalid: FAKE-DEGREE-2024-XXX"
echo ""
