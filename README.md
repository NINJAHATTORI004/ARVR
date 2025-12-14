# ARVA - Augmented Reality Verification of Assets

## 🎯 QIE Blockchain Hackathon Submission

**ARVA** is a complete end-to-end solution for authenticating real-world assets using AR technology and the QIE Blockchain. Point your phone at a product, degree, or certificate - and instantly verify its authenticity on-chain.

---

## 📁 Project Structure

```
ARVA/
├── blockchain/                 # Smart Contracts (Solidity)
│   ├── contracts/
│   │   └── ARVA_AssetNFT.sol   # Main ERC721 contract
│   ├── scripts/
│   │   ├── deploy.js           # Deployment script
│   │   └── mint-demo-assets.js # Demo asset minting
│   ├── test/
│   │   └── ARVA_AssetNFT.test.js
│   ├── hardhat.config.js
│   └── package.json
│
├── backend/                    # Node.js API Server
│   ├── server.js               # Express API
│   ├── utils/
│   │   └── logger.js           # Winston logger
│   ├── ARVA_AssetNFT_ABI.json  # Contract ABI
│   └── package.json
│
├── unity/                      # Unity AR Application
│   ├── Assets/
│   │   └── Scripts/
│   │       ├── ARVAManager.cs       # Main verification controller
│   │       ├── QRCodeScanner.cs     # QR/barcode scanning
│   │       ├── AROverlayController.cs # AR overlay display
│   │       ├── DemoController.cs    # Demo mode controller
│   │       └── ARVAConfig.cs        # Configuration
│   └── Packages/
│
└── docs/                       # Documentation
    └── metadata-schema.json    # NFT metadata standard
```

---

## 🚀 Quick Start

### 1. Blockchain Setup

```bash
cd blockchain

# Install dependencies
npm install

# Start local Hardhat node
npm run node

# In new terminal, deploy contract
npm run deploy:local

# Mint demo assets
npm run mint:demo
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your contract address

# Start server
npm run dev
```

### 3. Unity Setup

1. Open Unity Hub
2. Add project from `unity/` folder
3. Install required packages (AR Foundation, TextMeshPro)
4. Open sample scene
5. Configure API URL in ARVAManager
6. Build for Android/iOS

---

## 🔗 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/verify` | POST | Verify asset by unique ID |
| `/api/verify/detailed` | POST | Get detailed verification info |
| `/api/asset/:tokenId` | GET | Get asset by token ID |
| `/api/demo/assets` | GET | List demo assets |
| `/api/health` | GET | Health check |

### Example Verification Request

```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"uniqueId": "DEGREE-MIT-2024-001"}'
```

### Response (Verified)

```json
{
  "status": "Verified",
  "isVerified": true,
  "tokenId": "1",
  "issuerDID": "did:qie:mit-university-verified",
  "owner": "0x1234...",
  "assetType": "DEGREE",
  "verificationTimestamp": "2024-12-14T10:30:00.000Z",
  "blockchainNetwork": "QIE Testnet"
}
```

---

## 🧪 Demo Test IDs

### ✅ Valid Assets (Will Verify)
- `DEGREE-MIT-2024-001` - MIT Computer Science Degree
- `LUXURY-ROLEX-SUB-2024-ABC123` - Rolex Submariner Watch
- `CERT-AWS-SAA-2024-XYZ789` - AWS Certification
- `ART-PICASSO-AUTH-2024-P001` - Picasso Art Print

### ❌ Invalid Assets (Will Fail)
- `FAKE-DEGREE-2024-XXX`
- `COUNTERFEIT-WATCH-123`
- `INVALID-CERT-000`

---

## 🏗️ Smart Contract Functions

### Core Functions

```solidity
// Mint new asset NFT
function mintAsset(
    address to,
    string memory uniqueIdentifier,
    string memory issuerDID,
    uint256 expiryDate,
    string memory tokenURI,
    string memory assetType
) returns (uint256)

// Verify asset by identifier
function verifyAsset(string memory uniqueIdentifier)
    returns (uint256 tokenId, string memory issuerDID, bool isVerified)

// Get detailed verification
function getDetailedVerification(string memory uniqueIdentifier)
    returns (tokenId, issuerDID, isVerified, isExpired, isRevoked, ...)

// Revoke an asset
function revokeAsset(uint256 tokenId)
```

---

## 📱 Unity Controls (Demo Mode)

| Key | Action |
|-----|--------|
| `V` | Verify valid asset |
| `I` | Verify invalid asset |
| `R` | Reset UI |
| `D` | Toggle demo panel |
| `Space` | Run automated demo |

---

## 🔧 Configuration

### Environment Variables (Backend)

```env
PORT=3000
QIE_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...
```

### Unity Configuration

Edit `ARVAConfig` ScriptableObject or modify `ARVAManager` inspector values:
- `apiBaseUrl`: Backend server URL
- `requestTimeout`: API timeout in seconds
- `overlayDistance`: AR overlay distance from camera

---

## 🌐 Deployment to QIE Testnet

1. Get QIE testnet tokens from faucet
2. Update `.env` with:
   - `QIE_RPC_URL`: QIE testnet RPC endpoint
   - `DEPLOYER_PRIVATE_KEY`: Your wallet private key
3. Deploy:
   ```bash
   npm run deploy:qie-testnet
   ```

---

## 🛡️ Security Features

- **On-Chain Verification**: All verifications hit the blockchain
- **Asset Revocation**: Issuers can revoke compromised assets
- **Expiry Dates**: Support for time-limited certificates
- **DID Integration**: Decentralized identifiers for issuers

---

## 📋 Hackathon Checklist

- [x] Smart Contract Development (Solidity)
- [x] Deployment scripts for QIE
- [x] Backend API (Node.js/Express)
- [x] Unity AR Application scripts
- [x] Demo mode for presentation
- [x] Documentation
- [x] Test cases

---

## 🤝 Team

**ARVA Team** - QIE Blockchain Hackathon 2024

---

## 📄 License

MIT License - See LICENSE file for details
