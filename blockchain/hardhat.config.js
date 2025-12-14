require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Hardhat's built-in network
    hardhat: {
      chainId: 31337,
    },
    // QIE Blockchain Mainnet (Chain ID: 5656)
    qie: {
      url: process.env.QIE_RPC_URL || "https://rpc-main1.qiblockchain.online",
      chainId: 5656,
      accounts: process.env.DEPLOYER_PRIVATE_KEY 
        ? [process.env.DEPLOYER_PRIVATE_KEY] 
        : [],
      gasPrice: 20000000000, // 20 gwei
    },
    // QIE Mainnet Alt Configuration
    qie_mainnet: {
      url: "https://rpc-main1.qiblockchain.online",
      chainId: 5656,
      accounts: process.env.DEPLOYER_PRIVATE_KEY 
        ? [process.env.DEPLOYER_PRIVATE_KEY] 
        : [],
      gasPrice: 20000000000,
    },
    // Sepolia Testnet (for testing with standard EVM)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY 
        ? [process.env.DEPLOYER_PRIVATE_KEY] 
        : [],
    },
  },
  etherscan: {
    apiKey: {
      qie_testnet: process.env.QIE_EXPLORER_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "qie_testnet",
        chainId: parseInt(process.env.QIE_CHAIN_ID) || 5656,
        urls: {
          apiURL: "https://testnet-explorer.qie.network/api",
          browserURL: "https://testnet-explorer.qie.network",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
