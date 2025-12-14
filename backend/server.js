/**
 * ARVA Backend Server
 * Express API for Augmented Reality Verification of Assets
 * Connects Unity AR App to QIE Blockchain
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

const ARVA_ABI = require('./ARVA_AssetNFT_ABI.json');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for demo
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

let provider;
let ARVAContract;
let isBlockchainConnected = false;

function initializeBlockchain() {
    try {
        const rpcUrl = process.env.QIE_RPC_URL || 'http://127.0.0.1:8545';
        const contractAddress = process.env.CONTRACT_ADDRESS;

        if (!contractAddress) {
            logger.warn('CONTRACT_ADDRESS not set. Running in demo mode.');
            return;
        }

        provider = new ethers.JsonRpcProvider(rpcUrl);
        ARVAContract = new ethers.Contract(contractAddress, ARVA_ABI, provider);
        isBlockchainConnected = true;
        
        logger.info(`✅ Connected to blockchain at ${rpcUrl}`);
        logger.info(`📄 Contract address: ${contractAddress}`);
    } catch (error) {
        logger.error('Failed to initialize blockchain connection:', error.message);
        isBlockchainConnected = false;
    }
}

// Initialize on startup
initializeBlockchain();

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY ASSET INDEX (For hackathon demo - use DB in production)
// ═══════════════════════════════════════════════════════════════════════════

const assetIndex = new Map();

// Demo data for testing without blockchain
const DEMO_ASSETS = {
    'DEGREE-MIT-2024-001': {
        tokenId: '1',
        issuerDID: 'did:qie:mit-university-verified',
        owner: '0x1234567890123456789012345678901234567890',
        assetType: 'DEGREE',
        metadata: {
            name: 'Bachelor of Science in Computer Science',
            institution: 'Massachusetts Institute of Technology',
            graduateId: 'STU-2024-001',
            graduationDate: '2024-06-15'
        },
        isVerified: true
    },
    'LUXURY-ROLEX-SUB-2024-ABC123': {
        tokenId: '2',
        issuerDID: 'did:qie:rolex-authorized-dealer',
        owner: '0x2345678901234567890123456789012345678901',
        assetType: 'LUXURY_WATCH',
        metadata: {
            name: 'Rolex Submariner',
            model: '126610LN',
            serialNumber: 'ABC123'
        },
        isVerified: true
    },
    'CERT-AWS-SAA-2024-XYZ789': {
        tokenId: '3',
        issuerDID: 'did:qie:amazon-aws-certification',
        owner: '0x3456789012345678901234567890123456789012',
        assetType: 'CERTIFICATE',
        metadata: {
            name: 'AWS Solutions Architect Associate',
            candidateId: 'XYZ789',
            issueDate: '2024-03-20'
        },
        isVerified: true
    },
    'ART-PICASSO-AUTH-2024-P001': {
        tokenId: '4',
        issuerDID: 'did:qie:christies-auction-house',
        owner: '0x4567890123456789012345678901234567890123',
        assetType: 'ARTWORK',
        metadata: {
            name: 'Authenticated Picasso Print',
            artist: 'Pablo Picasso',
            title: 'La Colombe'
        },
        isVerified: true
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ARVA Backend',
        version: '1.0.0',
        blockchain: isBlockchainConnected ? 'connected' : 'demo-mode',
        timestamp: new Date().toISOString()
    });
});

/**
 * Main Verification Endpoint
 * Called by the Unity AR app when scanning an asset
 */
app.post('/api/verify', async (req, res) => {
    const { uniqueId } = req.body;
    
    if (!uniqueId) {
        return res.status(400).json({
            status: 'Error',
            isVerified: false,
            error: 'Unique identifier is required'
        });
    }

    logger.info(`🔍 Verification request for: ${uniqueId}`);

    try {
        let result;

        if (isBlockchainConnected) {
            // LIVE BLOCKCHAIN VERIFICATION
            result = await verifyOnBlockchain(uniqueId);
        } else {
            // DEMO MODE - Use in-memory data
            result = verifyFromDemoData(uniqueId);
        }

        logger.info(`📋 Verification result: ${result.isVerified ? '✅ VERIFIED' : '❌ NOT VERIFIED'}`);
        return res.json(result);

    } catch (error) {
        logger.error('Verification error:', error);
        return res.status(500).json({
            status: 'Error',
            isVerified: false,
            error: 'Internal server error during verification'
        });
    }
});

/**
 * Detailed Verification Endpoint
 * Returns extended information about an asset
 */
app.post('/api/verify/detailed', async (req, res) => {
    const { uniqueId } = req.body;

    if (!uniqueId) {
        return res.status(400).json({
            status: 'Error',
            isVerified: false,
            error: 'Unique identifier is required'
        });
    }

    logger.info(`🔍 Detailed verification request for: ${uniqueId}`);

    try {
        if (isBlockchainConnected) {
            const result = await getDetailedVerification(uniqueId);
            return res.json(result);
        } else {
            const demoAsset = DEMO_ASSETS[uniqueId];
            if (demoAsset) {
                return res.json({
                    status: 'Verified',
                    isVerified: true,
                    ...demoAsset,
                    verificationTimestamp: new Date().toISOString(),
                    blockchainNetwork: 'demo-mode'
                });
            }
            return res.json({
                status: 'Not Found',
                isVerified: false,
                message: 'Asset not registered on blockchain'
            });
        }
    } catch (error) {
        logger.error('Detailed verification error:', error);
        return res.status(500).json({
            status: 'Error',
            isVerified: false,
            error: 'Internal server error'
        });
    }
});

/**
 * Get Asset by Token ID
 */
app.get('/api/asset/:tokenId', async (req, res) => {
    const { tokenId } = req.params;

    try {
        if (isBlockchainConnected) {
            const record = await ARVAContract.getAssetRecord(tokenId);
            const owner = await ARVAContract.ownerOf(tokenId);
            const tokenURI = await ARVAContract.tokenURI(tokenId);

            return res.json({
                tokenId,
                owner,
                issuerDID: record.issuerDID,
                assetType: record.assetType,
                expiryDate: record.expiryDate.toString(),
                mintedAt: record.mintedAt.toString(),
                isRevoked: record.isRevoked,
                tokenURI
            });
        } else {
            // Find in demo data by tokenId
            const asset = Object.values(DEMO_ASSETS).find(a => a.tokenId === tokenId);
            if (asset) {
                return res.json({ tokenId, ...asset });
            }
            return res.status(404).json({ error: 'Asset not found' });
        }
    } catch (error) {
        logger.error('Get asset error:', error);
        return res.status(500).json({ error: 'Failed to fetch asset' });
    }
});

/**
 * List Demo Assets (for testing)
 */
app.get('/api/demo/assets', (req, res) => {
    const assets = Object.entries(DEMO_ASSETS).map(([uniqueId, data]) => ({
        uniqueId,
        ...data
    }));
    
    res.json({
        message: 'Demo assets for testing verification',
        validAssets: assets.map(a => a.uniqueId),
        invalidExamples: [
            'FAKE-DEGREE-2024-XXX',
            'COUNTERFEIT-WATCH-123',
            'INVALID-CERT-000'
        ],
        assets
    });
});

/**
 * Issuer Info Endpoint
 */
app.get('/api/issuer/:did', (req, res) => {
    const { did } = req.params;
    
    // Mock issuer data (in production, this would query a DID registry)
    const issuers = {
        'did:qie:mit-university-verified': {
            name: 'Massachusetts Institute of Technology',
            type: 'Educational Institution',
            verified: true,
            website: 'https://mit.edu'
        },
        'did:qie:rolex-authorized-dealer': {
            name: 'Rolex Authorized Dealer Network',
            type: 'Luxury Goods',
            verified: true,
            website: 'https://rolex.com'
        },
        'did:qie:amazon-aws-certification': {
            name: 'Amazon Web Services',
            type: 'Technology Certification',
            verified: true,
            website: 'https://aws.amazon.com'
        },
        'did:qie:christies-auction-house': {
            name: "Christie's Auction House",
            type: 'Art & Collectibles',
            verified: true,
            website: 'https://christies.com'
        }
    };

    const issuer = issuers[did];
    if (issuer) {
        return res.json({ did, ...issuer });
    }
    return res.status(404).json({ error: 'Issuer not found' });
});

// ═══════════════════════════════════════════════════════════════════════════
// WALLET INTEGRATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Network Configuration (for wallet connection)
 * Provides QIE network details for MetaMask/wallet integration
 */
app.get('/api/wallet/network', (req, res) => {
    res.json({
        networkName: 'QIE Blockchain',
        chainId: 5656,
        chainIdHex: '0x1618',
        rpcUrl: process.env.QIE_RPC_URL || 'https://rpc-main1.qiblockchain.online',
        blockExplorer: 'https://mainnet.qiblockchain.online',
        nativeCurrency: {
            name: 'QIE',
            symbol: 'QIE',
            decimals: 18
        },
        // MetaMask add network parameters
        addNetworkParams: {
            chainId: '0x1618',
            chainName: 'QIE Blockchain',
            nativeCurrency: {
                name: 'QIE',
                symbol: 'QIE',
                decimals: 18
            },
            rpcUrls: ['https://rpc-main1.qiblockchain.online'],
            blockExplorerUrls: ['https://mainnet.qiblockchain.online']
        }
    });
});

/**
 * Validate Wallet Address
 */
app.post('/api/wallet/validate', (req, res) => {
    const { address } = req.body;
    
    if (!address) {
        return res.status(400).json({ valid: false, error: 'Address required' });
    }
    
    const isValid = ethers.isAddress(address);
    res.json({
        valid: isValid,
        address: isValid ? ethers.getAddress(address) : null,
        message: isValid ? 'Valid Ethereum/QIE address' : 'Invalid address format'
    });
});

/**
 * Get Wallet Balance on QIE Network
 */
app.get('/api/wallet/balance/:address', async (req, res) => {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    try {
        if (!isBlockchainConnected) {
            return res.status(503).json({ error: 'Blockchain not connected' });
        }
        
        const balance = await provider.getBalance(address);
        const formattedBalance = ethers.formatEther(balance);
        
        res.json({
            address: ethers.getAddress(address),
            balance: formattedBalance,
            balanceWei: balance.toString(),
            currency: 'QIE',
            network: 'QIE Blockchain (Chain ID: 5656)'
        });
    } catch (error) {
        logger.error('Balance check error:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

/**
 * Get Assets Owned by Wallet
 */
app.get('/api/wallet/assets/:address', async (req, res) => {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    try {
        if (!isBlockchainConnected) {
            return res.json({ 
                address,
                assets: [],
                message: 'Running in demo mode' 
            });
        }
        
        // Get the balance of NFTs owned by this address
        const balance = await ARVAContract.balanceOf(address);
        const assets = [];
        
        // This is a simplified approach - in production you'd use events or indexer
        logger.info(`Wallet ${address} has ${balance} assets`);
        
        res.json({
            address: ethers.getAddress(address),
            totalAssets: balance.toString(),
            assets,
            network: 'QIE Blockchain'
        });
    } catch (error) {
        logger.error('Fetch wallet assets error:', error);
        res.status(500).json({ error: 'Failed to fetch wallet assets' });
    }
});

/**
 * Prepare Transaction for Signing (Wallet Integration)
 * Returns unsigned transaction data for client-side wallet signing
 */
app.post('/api/wallet/prepare-mint', async (req, res) => {
    const { walletAddress, uniqueId, issuerDID, assetType, metadataURI, expiryDate } = req.body;
    
    if (!walletAddress || !uniqueId || !issuerDID || !assetType || !metadataURI) {
        return res.status(400).json({ 
            error: 'Missing required fields: walletAddress, uniqueId, issuerDID, assetType, metadataURI' 
        });
    }
    
    if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    try {
        // Encode the function call
        const iface = new ethers.Interface(ARVA_ABI);
        const data = iface.encodeFunctionData('mintAsset', [
            walletAddress,
            uniqueId,
            issuerDID,
            assetType,
            metadataURI,
            expiryDate || 0
        ]);
        
        res.json({
            to: process.env.CONTRACT_ADDRESS,
            data,
            chainId: 5656,
            // Client will add gas estimation and nonce
            prepared: true,
            message: 'Sign this transaction with your wallet'
        });
    } catch (error) {
        logger.error('Prepare mint error:', error);
        res.status(500).json({ error: 'Failed to prepare transaction' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function verifyOnBlockchain(uniqueId) {
    const [tokenId, issuerDID, isVerified] = await ARVAContract.verifyAsset(uniqueId);
    
    if (tokenId === 0n || !isVerified) {
        return {
            status: 'Not Verified',
            isVerified: false,
            message: tokenId === 0n ? 'Asset not found' : 'Asset is expired or revoked'
        };
    }

    const owner = await ARVAContract.ownerOf(tokenId);
    const record = await ARVAContract.getAssetRecord(tokenId);
    
    return {
        status: 'Verified',
        isVerified: true,
        tokenId: tokenId.toString(),
        issuerDID,
        owner,
        assetType: record.assetType,
        mintedAt: new Date(Number(record.mintedAt) * 1000).toISOString(),
        expiryDate: record.expiryDate > 0 
            ? new Date(Number(record.expiryDate) * 1000).toISOString() 
            : 'No Expiry',
        verificationTimestamp: new Date().toISOString(),
        blockchainNetwork: process.env.NETWORK_NAME || 'QIE Testnet'
    };
}

async function getDetailedVerification(uniqueId) {
    const result = await ARVAContract.getDetailedVerification(uniqueId);
    
    if (result.tokenId === 0n) {
        return {
            status: 'Not Found',
            isVerified: false,
            message: 'Asset not registered on blockchain'
        };
    }

    return {
        status: result.isVerified ? 'Verified' : 'Invalid',
        isVerified: result.isVerified,
        tokenId: result.tokenId.toString(),
        issuerDID: result.issuerDID,
        isExpired: result.isExpired,
        isRevoked: result.isRevoked,
        expiryDate: result.expiryDate > 0
            ? new Date(Number(result.expiryDate) * 1000).toISOString()
            : 'No Expiry',
        mintedAt: new Date(Number(result.mintedAt) * 1000).toISOString(),
        assetType: result.assetType,
        currentOwner: result.currentOwner,
        verificationTimestamp: new Date().toISOString()
    };
}

function verifyFromDemoData(uniqueId) {
    const asset = DEMO_ASSETS[uniqueId];
    
    if (!asset) {
        return {
            status: 'Not Verified',
            isVerified: false,
            message: 'Asset not found in registry'
        };
    }

    return {
        status: 'Verified',
        isVerified: true,
        tokenId: asset.tokenId,
        issuerDID: asset.issuerDID,
        owner: asset.owner,
        assetType: asset.assetType,
        metadata: asset.metadata,
        verificationTimestamp: new Date().toISOString(),
        blockchainNetwork: 'Demo Mode'
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  🚀 ARVA Backend Server Started');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`  📍 URL: http://localhost:${PORT}`);
    logger.info(`  🔗 Blockchain: ${isBlockchainConnected ? 'Connected' : 'Demo Mode'}`);
    logger.info(`  📋 Contract: ${process.env.CONTRACT_ADDRESS || 'Not configured'}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  API Endpoints:');
    logger.info('    POST /api/verify          - Verify asset by unique ID');
    logger.info('    POST /api/verify/detailed - Detailed verification');
    logger.info('    GET  /api/asset/:tokenId  - Get asset by token ID');
    logger.info('    GET  /api/demo/assets     - List demo assets');
    logger.info('    GET  /api/health          - Health check');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;
