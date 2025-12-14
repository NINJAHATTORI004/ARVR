const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting ARVA_AssetNFT deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy the contract
  console.log("📦 Deploying ARVA_AssetNFT contract...");
  const ARVA = await hre.ethers.getContractFactory("ARVA_AssetNFT");
  const arva = await ARVA.deploy();
  
  await arva.waitForDeployment();
  
  const contractAddress = await arva.getAddress();
  console.log("✅ ARVA_AssetNFT deployed to:", contractAddress);

  // Get deployment transaction details
  const deploymentTx = arva.deploymentTransaction();
  console.log("📝 Transaction hash:", deploymentTx.hash);
  
  // Wait for confirmations (skip on localhost for speed)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n⏳ Waiting for block confirmations...");
    await deploymentTx.wait(2);
    console.log("✅ Deployment confirmed!\n");
  } else {
    console.log("✅ Deployment confirmed (localhost)!\n");
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    transactionHash: deploymentTx.hash,
    timestamp: new Date().toISOString(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
  };

  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${hre.network.name}-deployment.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile);

  // Copy ABI for backend
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts", "ARVA_AssetNFT.sol");
  const abiPath = path.join(artifactsDir, "ARVA_AssetNFT.json");
  
  if (fs.existsSync(abiPath)) {
    const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abiOnlyPath = path.join(deploymentsDir, "ARVA_AssetNFT_ABI.json");
    fs.writeFileSync(abiOnlyPath, JSON.stringify(artifact.abi, null, 2));
    console.log("📋 ABI exported to:", abiOnlyPath);
    
    // Also copy to backend folder
    const backendAbiPath = path.join(__dirname, "..", "..", "backend", "ARVA_AssetNFT_ABI.json");
    fs.writeFileSync(backendAbiPath, JSON.stringify(artifact.abi, null, 2));
    console.log("📋 ABI copied to backend folder");
  }

  console.log("\n🎉 Deployment complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verify on explorer if not local
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on explorer!");
    } catch (error) {
      console.log("⚠️  Verification failed or not supported:", error.message);
    }
  }

  return { address: contractAddress, deployer: deployer.address };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
