// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ARVA_AssetNFT
 * @dev ERC721 token representing a real-world asset (degree, luxury item, etc.)
 * Deployed on the QIE Blockchain for low fees and fast finality.
 * Part of the ARVA (Augmented Reality Verification of Assets) project.
 */
contract ARVA_AssetNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Structure to hold asset-specific, verifiable data
    struct AssetRecord {
        string issuerDID;       // Decentralized Identifier of the Issuing Entity
        bytes32 assetHash;      // Keccak256 hash of the physical asset's unique ID/data
        uint256 expiryDate;     // Verification expiry timestamp (0 for no expiry)
        uint256 mintedAt;       // Timestamp when the asset was minted
        string assetType;       // Type of asset (e.g., "DEGREE", "LUXURY_ITEM", "CERTIFICATE")
        bool isRevoked;         // Whether the asset has been revoked by issuer
    }

    // Mapping from token ID to asset record
    mapping(uint256 => AssetRecord) public assetRecords;
    
    // Mapping from asset hash to token ID for quick lookups
    mapping(bytes32 => uint256) public hashToTokenId;
    
    // Mapping of authorized issuers (DIDs that can mint)
    mapping(string => bool) public authorizedIssuers;
    
    // Events for indexing
    event AssetMinted(
        uint256 indexed tokenId, 
        address indexed owner, 
        string issuerDID, 
        bytes32 assetHash,
        string assetType,
        uint256 expiryDate
    );
    
    event AssetVerified(
        uint256 indexed tokenId, 
        address indexed verifier, 
        bool isVerified,
        uint256 timestamp
    );
    
    event AssetRevoked(
        uint256 indexed tokenId, 
        string issuerDID, 
        uint256 timestamp
    );
    
    event IssuerAuthorized(string issuerDID, bool authorized);

    // Constructor: Sets the name and symbol
    constructor() ERC721("ARVerifiedAsset", "ARVA") {
        _tokenIdCounter.increment(); // Start from token ID 1
    }

    /**
     * @dev Authorize an issuer to mint assets
     * @param _issuerDID The DID of the issuer to authorize
     */
    function authorizeIssuer(string memory _issuerDID) public onlyOwner {
        authorizedIssuers[_issuerDID] = true;
        emit IssuerAuthorized(_issuerDID, true);
    }
    
    /**
     * @dev Revoke issuer authorization
     * @param _issuerDID The DID of the issuer to revoke
     */
    function revokeIssuer(string memory _issuerDID) public onlyOwner {
        authorizedIssuers[_issuerDID] = false;
        emit IssuerAuthorized(_issuerDID, false);
    }

    /**
     * @dev Mints a new NFT representing a real-world asset.
     * @param to The address of the asset owner (e.g., student, buyer).
     * @param _uniqueIdentifier The unique physical identifier (e.g., serial number, certificate ID).
     * @param _issuerDID The Decentralized Identifier of the issuing authority.
     * @param _expiryDate The optional expiration timestamp (0 for no expiry).
     * @param _tokenURI The IPFS URI for extended metadata.
     * @param _assetType The type/category of the asset.
     */
    function mintAsset(
        address to, 
        string memory _uniqueIdentifier, 
        string memory _issuerDID, 
        uint256 _expiryDate,
        string memory _tokenURI,
        string memory _assetType
    ) public onlyOwner returns (uint256) {
        require(bytes(_issuerDID).length > 0, "ARVA: Invalid Issuer DID");
        require(bytes(_uniqueIdentifier).length > 0, "ARVA: Invalid unique identifier");
        require(to != address(0), "ARVA: Cannot mint to zero address");
        
        bytes32 assetHash = keccak256(abi.encodePacked(_uniqueIdentifier));
        require(hashToTokenId[assetHash] == 0, "ARVA: Asset already registered");
        
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        assetRecords[newTokenId] = AssetRecord({
            issuerDID: _issuerDID,
            assetHash: assetHash,
            expiryDate: _expiryDate,
            mintedAt: block.timestamp,
            assetType: _assetType,
            isRevoked: false
        });
        
        hashToTokenId[assetHash] = newTokenId;
        
        emit AssetMinted(
            newTokenId, 
            to, 
            _issuerDID, 
            assetHash, 
            _assetType, 
            _expiryDate
        );
        
        return newTokenId;
    }
    
    /**
     * @dev Batch mint multiple assets at once
     * @param recipients Array of recipient addresses
     * @param uniqueIdentifiers Array of unique identifiers
     * @param issuerDID The common issuer DID for all assets
     * @param expiryDates Array of expiry dates
     * @param tokenURIs Array of token URIs
     * @param assetType The common asset type for all assets
     */
    function batchMintAssets(
        address[] memory recipients,
        string[] memory uniqueIdentifiers,
        string memory issuerDID,
        uint256[] memory expiryDates,
        string[] memory tokenURIs,
        string memory assetType
    ) public onlyOwner returns (uint256[] memory) {
        require(recipients.length == uniqueIdentifiers.length, "ARVA: Array length mismatch");
        require(recipients.length == expiryDates.length, "ARVA: Array length mismatch");
        require(recipients.length == tokenURIs.length, "ARVA: Array length mismatch");
        
        uint256[] memory tokenIds = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = mintAsset(
                recipients[i],
                uniqueIdentifiers[i],
                issuerDID,
                expiryDates[i],
                tokenURIs[i],
                assetType
            );
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Revoke an asset (mark as invalid)
     * @param tokenId The token ID to revoke
     */
    function revokeAsset(uint256 tokenId) public onlyOwner {
        require(_exists(tokenId), "ARVA: Token does not exist");
        require(!assetRecords[tokenId].isRevoked, "ARVA: Asset already revoked");
        
        assetRecords[tokenId].isRevoked = true;
        
        emit AssetRevoked(tokenId, assetRecords[tokenId].issuerDID, block.timestamp);
    }
    
    /**
     * @dev Core verification function called by the ARVA API.
     * @param _uniqueIdentifier The ID scanned by the user (e.g., serial number).
     * @return tokenId The ID of the found NFT (0 if not found).
     * @return issuerDID The DID of the issuer.
     * @return isVerified True if the asset is active and the hash matches.
     */
    function verifyAsset(string memory _uniqueIdentifier) 
        public view returns (
            uint256 tokenId, 
            string memory issuerDID, 
            bool isVerified
        ) 
    {
        bytes32 expectedHash = keccak256(abi.encodePacked(_uniqueIdentifier));
        tokenId = hashToTokenId[expectedHash];
        
        if (tokenId == 0) {
            return (0, "", false);
        }
        
        AssetRecord storage record = assetRecords[tokenId];
        
        bool notExpired = record.expiryDate == 0 || record.expiryDate > block.timestamp;
        bool notRevoked = !record.isRevoked;
        bool exists = _exists(tokenId);
        
        isVerified = exists && notExpired && notRevoked;
        
        return (tokenId, record.issuerDID, isVerified);
    }
    
    /**
     * @dev Get detailed verification status
     * @param _uniqueIdentifier The unique identifier to check
     */
    function getDetailedVerification(string memory _uniqueIdentifier) 
        public view returns (
            uint256 tokenId,
            string memory issuerDID,
            bool isVerified,
            bool isExpired,
            bool isRevoked,
            uint256 expiryDate,
            uint256 mintedAt,
            string memory assetType,
            address currentOwner
        ) 
    {
        bytes32 expectedHash = keccak256(abi.encodePacked(_uniqueIdentifier));
        tokenId = hashToTokenId[expectedHash];
        
        if (tokenId == 0) {
            return (0, "", false, false, false, 0, 0, "", address(0));
        }
        
        AssetRecord storage record = assetRecords[tokenId];
        
        isExpired = record.expiryDate != 0 && record.expiryDate <= block.timestamp;
        isRevoked = record.isRevoked;
        isVerified = _exists(tokenId) && !isExpired && !isRevoked;
        
        return (
            tokenId,
            record.issuerDID,
            isVerified,
            isExpired,
            isRevoked,
            record.expiryDate,
            record.mintedAt,
            record.assetType,
            ownerOf(tokenId)
        );
    }
    
    /**
     * @dev Get the asset record for a token
     * @param tokenId The token ID to query
     */
    function getAssetRecord(uint256 tokenId) 
        public view returns (AssetRecord memory) 
    {
        require(_exists(tokenId), "ARVA: Token does not exist");
        return assetRecords[tokenId];
    }
    
    /**
     * @dev Get total number of minted assets
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }
    
    /**
     * @dev Check if a unique identifier is already registered
     * @param _uniqueIdentifier The identifier to check
     */
    function isIdentifierRegistered(string memory _uniqueIdentifier) 
        public view returns (bool) 
    {
        bytes32 hash = keccak256(abi.encodePacked(_uniqueIdentifier));
        return hashToTokenId[hash] != 0;
    }

    // Required overrides for ERC721URIStorage
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        
        // Clean up the hash mapping
        bytes32 hash = assetRecords[tokenId].assetHash;
        delete hashToTokenId[hash];
        delete assetRecords[tokenId];
    }

    function tokenURI(uint256 tokenId) 
        public view override(ERC721, ERC721URIStorage) returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Helper function to check if token exists (for compatibility)
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
