const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ARVA_AssetNFT", function () {
  let arva;
  let owner;
  let user1;
  let user2;

  const sampleAsset = {
    uniqueId: "TEST-DEGREE-2024-001",
    issuerDID: "did:qie:test-university",
    expiryDate: 0, // No expiry
    tokenURI: "ipfs://QmTestHash123",
    assetType: "DEGREE"
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const ARVA = await ethers.getContractFactory("ARVA_AssetNFT");
    arva = await ARVA.deploy();
    await arva.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await arva.name()).to.equal("ARVerifiedAsset");
      expect(await arva.symbol()).to.equal("ARVA");
    });

    it("Should set the correct owner", async function () {
      expect(await arva.owner()).to.equal(owner.address);
    });

    it("Should start with zero total supply", async function () {
      expect(await arva.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint an asset NFT successfully", async function () {
      const tx = await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );

      await expect(tx)
        .to.emit(arva, "AssetMinted")
        .withArgs(
          1, // tokenId
          user1.address,
          sampleAsset.issuerDID,
          ethers.keccak256(ethers.toUtf8Bytes(sampleAsset.uniqueId)),
          sampleAsset.assetType,
          sampleAsset.expiryDate
        );

      expect(await arva.ownerOf(1)).to.equal(user1.address);
      expect(await arva.totalSupply()).to.equal(1);
    });

    it("Should reject minting from non-owner", async function () {
      await expect(
        arva.connect(user1).mintAsset(
          user1.address,
          sampleAsset.uniqueId,
          sampleAsset.issuerDID,
          sampleAsset.expiryDate,
          sampleAsset.tokenURI,
          sampleAsset.assetType
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject duplicate unique identifiers", async function () {
      await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );

      await expect(
        arva.mintAsset(
          user2.address,
          sampleAsset.uniqueId, // Same ID
          sampleAsset.issuerDID,
          sampleAsset.expiryDate,
          sampleAsset.tokenURI,
          sampleAsset.assetType
        )
      ).to.be.revertedWith("ARVA: Asset already registered");
    });

    it("Should reject empty issuer DID", async function () {
      await expect(
        arva.mintAsset(
          user1.address,
          sampleAsset.uniqueId,
          "", // Empty DID
          sampleAsset.expiryDate,
          sampleAsset.tokenURI,
          sampleAsset.assetType
        )
      ).to.be.revertedWith("ARVA: Invalid Issuer DID");
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );
    });

    it("Should verify a valid asset", async function () {
      const [tokenId, issuerDID, isVerified] = await arva.verifyAsset(sampleAsset.uniqueId);
      
      expect(tokenId).to.equal(1);
      expect(issuerDID).to.equal(sampleAsset.issuerDID);
      expect(isVerified).to.equal(true);
    });

    it("Should return false for non-existent asset", async function () {
      const [tokenId, issuerDID, isVerified] = await arva.verifyAsset("FAKE-ID-123");
      
      expect(tokenId).to.equal(0);
      expect(issuerDID).to.equal("");
      expect(isVerified).to.equal(false);
    });

    it("Should return false for expired asset", async function () {
      // Mint with past expiry date
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await arva.mintAsset(
        user1.address,
        "EXPIRED-CERT-001",
        sampleAsset.issuerDID,
        pastExpiry,
        sampleAsset.tokenURI,
        "CERTIFICATE"
      );

      const [, , isVerified] = await arva.verifyAsset("EXPIRED-CERT-001");
      expect(isVerified).to.equal(false);
    });

    it("Should return false for revoked asset", async function () {
      await arva.revokeAsset(1);
      
      const [, , isVerified] = await arva.verifyAsset(sampleAsset.uniqueId);
      expect(isVerified).to.equal(false);
    });
  });

  describe("Detailed Verification", function () {
    it("Should return detailed verification info", async function () {
      await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );

      const result = await arva.getDetailedVerification(sampleAsset.uniqueId);
      
      expect(result.tokenId).to.equal(1);
      expect(result.issuerDID).to.equal(sampleAsset.issuerDID);
      expect(result.isVerified).to.equal(true);
      expect(result.isExpired).to.equal(false);
      expect(result.isRevoked).to.equal(false);
      expect(result.assetType).to.equal(sampleAsset.assetType);
      expect(result.currentOwner).to.equal(user1.address);
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );
    });

    it("Should revoke an asset", async function () {
      await expect(arva.revokeAsset(1))
        .to.emit(arva, "AssetRevoked")
        .withArgs(1, sampleAsset.issuerDID, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
      
      const record = await arva.getAssetRecord(1);
      expect(record.isRevoked).to.equal(true);
    });

    it("Should reject double revocation", async function () {
      await arva.revokeAsset(1);
      await expect(arva.revokeAsset(1)).to.be.revertedWith("ARVA: Asset already revoked");
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint multiple assets", async function () {
      const recipients = [user1.address, user2.address];
      const uniqueIds = ["BATCH-001", "BATCH-002"];
      const expiryDates = [0, 0];
      const tokenURIs = ["ipfs://hash1", "ipfs://hash2"];

      await arva.batchMintAssets(
        recipients,
        uniqueIds,
        sampleAsset.issuerDID,
        expiryDates,
        tokenURIs,
        "BATCH_TEST"
      );

      expect(await arva.totalSupply()).to.equal(2);
      expect(await arva.ownerOf(1)).to.equal(user1.address);
      expect(await arva.ownerOf(2)).to.equal(user2.address);
    });
  });

  describe("Utility Functions", function () {
    it("Should check if identifier is registered", async function () {
      expect(await arva.isIdentifierRegistered(sampleAsset.uniqueId)).to.equal(false);
      
      await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );
      
      expect(await arva.isIdentifierRegistered(sampleAsset.uniqueId)).to.equal(true);
    });

    it("Should return correct token URI", async function () {
      await arva.mintAsset(
        user1.address,
        sampleAsset.uniqueId,
        sampleAsset.issuerDID,
        sampleAsset.expiryDate,
        sampleAsset.tokenURI,
        sampleAsset.assetType
      );

      expect(await arva.tokenURI(1)).to.equal(sampleAsset.tokenURI);
    });
  });
});
