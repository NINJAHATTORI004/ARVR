const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Demo assets for hackathon demonstration
const DEMO_ASSETS = [
  {
    uniqueId: "DEGREE-MIT-2024-001",
    issuerDID: "did:qie:mit-university-verified",
    assetType: "DEGREE",
    metadata: {
      name: "Bachelor of Science in Computer Science",
      institution: "Massachusetts Institute of Technology",
      graduateId: "STU-2024-001",
      graduationDate: "2024-06-15",
      gpa: "3.85"
    }
  },
  {
    uniqueId: "LUXURY-ROLEX-SUB-2024-ABC123",
    issuerDID: "did:qie:rolex-authorized-dealer",
    assetType: "LUXURY_WATCH",
    metadata: {
      name: "Rolex Submariner",
      model: "126610LN",
      serialNumber: "ABC123",
      purchaseDate: "2024-01-15",
      warranty: "5 years"
    }
  },
  {
    uniqueId: "CERT-AWS-SAA-2024-XYZ789",
    issuerDID: "did:qie:amazon-aws-certification",
    assetType: "CERTIFICATE",
    metadata: {
      name: "AWS Solutions Architect Associate",
      candidateId: "XYZ789",
      issueDate: "2024-03-20",
      expiryDate: "2027-03-20",
      score: "850/1000"
    }
  },
  {
    uniqueId: "ART-PICASSO-AUTH-2024-P001",
    issuerDID: "did:qie:christies-auction-house",
    assetType: "ARTWORK",
    metadata: {
      name: "Authenticated Picasso Print",
      artist: "Pablo Picasso",
      title: "La Colombe",
      year: "1949",
      edition: "Limited Edition 45/500"
    }
  },
  {
    uniqueId: "FAKE-DEGREE-NOTREAL-2024",
    issuerDID: "",
    assetType: "FAKE",
    skip: true, // This one won't be minted - used for testing "not found"
    metadata: {
      name: "Fake Degree - For Demo",
      note: "This ID is intentionally NOT minted to demonstrate verification failure"
    }
  }
];

async function main() {
  console.log("🎨 Minting Demo Assets for ARVA Hackathon...\n");

  // Load deployment info
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}-deployment.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment info not found. Please deploy the contract first.");
    console.log("Run: npm run deploy:local");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("📍 Using contract at:", deployment.contractAddress);

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Minting with account:", deployer.address, "\n");

  // Connect to contract
  const ARVA = await hre.ethers.getContractFactory("ARVA_AssetNFT");
  const arva = ARVA.attach(deployment.contractAddress);

  // Store minted assets info
  const mintedAssets = [];

  for (const asset of DEMO_ASSETS) {
    if (asset.skip) {
      console.log(`⏭️  Skipping ${asset.uniqueId} (demo fake asset)`);
      mintedAssets.push({
        ...asset,
        status: "NOT_MINTED",
        note: "Intentionally not minted for demo verification failure"
      });
      continue;
    }

    console.log(`📦 Minting: ${asset.metadata.name}`);
    console.log(`   ID: ${asset.uniqueId}`);

    try {
      // Calculate expiry (0 for no expiry, or 1 year from now)
      const expiryDate = asset.assetType === "CERTIFICATE" 
        ? Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
        : 0; // No expiry

      // Create mock IPFS URI (in production, upload to IPFS first)
      const tokenURI = `ipfs://QmDemo${asset.uniqueId.replace(/[^a-zA-Z0-9]/g, "")}`;

      const tx = await arva.mintAsset(
        deployer.address,
        asset.uniqueId,
        asset.issuerDID,
        expiryDate,
        tokenURI,
        asset.assetType
      );

      const receipt = await tx.wait();
      
      // Get token ID from events
      const mintEvent = receipt.logs.find(log => {
        try {
          const parsed = arva.interface.parseLog(log);
          return parsed?.name === "AssetMinted";
        } catch {
          return false;
        }
      });

      let tokenId = "unknown";
      if (mintEvent) {
        const parsed = arva.interface.parseLog(mintEvent);
        tokenId = parsed.args.tokenId.toString();
      }

      console.log(`   ✅ Minted! Token ID: ${tokenId}`);
      console.log(`   📝 TX: ${tx.hash}\n`);

      mintedAssets.push({
        ...asset,
        tokenId,
        txHash: tx.hash,
        status: "MINTED",
        tokenURI
      });

    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      mintedAssets.push({
        ...asset,
        status: "FAILED",
        error: error.message
      });
    }
  }

  // Save minted assets info
  const demoAssetsFile = path.join(
    __dirname,
    "..",
    "deployments",
    "demo-assets.json"
  );
  fs.writeFileSync(demoAssetsFile, JSON.stringify(mintedAssets, null, 2));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💾 Demo assets info saved to:", demoAssetsFile);

  // Print summary
  console.log("\n📊 Minting Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  mintedAssets.forEach(asset => {
    const status = asset.status === "MINTED" ? "✅" : 
                   asset.status === "NOT_MINTED" ? "⏭️" : "❌";
    console.log(`${status} ${asset.uniqueId} - ${asset.status}`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Print test IDs for demo
  console.log("🧪 Test IDs for Demo:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ VALID (should verify):");
  mintedAssets
    .filter(a => a.status === "MINTED")
    .forEach(a => console.log(`   ${a.uniqueId}`));
  console.log("\n❌ INVALID (should fail verification):");
  mintedAssets
    .filter(a => a.status === "NOT_MINTED")
    .forEach(a => console.log(`   ${a.uniqueId}`));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Minting failed:", error);
    process.exit(1);
  });
