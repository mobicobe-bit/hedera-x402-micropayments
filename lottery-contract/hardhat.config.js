require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const HEDERA_TESTNET_RPC = process.env.HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api";
const HEDERA_MAINNET_RPC = process.env.HEDERA_MAINNET_RPC || "https://mainnet.hashio.io/api";
const HASHSCAN_API_KEY = process.env.HASHSCAN_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hederaTestnet: {
      url: HEDERA_TESTNET_RPC,
      chainId: 296,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
    hederaMainnet: {
      url: HEDERA_MAINNET_RPC,
      chainId: 295,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      hederaTestnet: HASHSCAN_API_KEY,
      hederaMainnet: HASHSCAN_API_KEY,
    },
    customChains: [
      {
        network: "hederaTestnet",
        chainId: 296,
        urls: {
          apiURL: "https://testnet.hashscan.io/api",
          browserURL: "https://hashscan.io/testnet",
        },
      },
      {
        network: "hederaMainnet",
        chainId: 295,
        urls: {
          apiURL: "https://mainnet.hashscan.io/api",
          browserURL: "https://hashscan.io/mainnet",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000,
  },
};