/**
 * Derive wallet address from private key
 * Usage: npx hardhat run scripts/wallet.js
 */
const hre = require("hardhat");

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
  if (!PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const wallet = hre.ethers.Wallet.fromPrivateKey(PRIVATE_KEY);
  console.log(`Account: ${wallet.address}`);
  console.log(`Chain ID: ${hre.network.config.chainId}`);
  
  // Check if connected
  try {
    const balance = await hre.ethers.provider.getBalance(wallet.address);
    console.log(`Base Sepolia Balance: ${hre.ethers.formatEther(balance)} ETH`);
  } catch (e) {
    console.log(`Could not fetch balance: ${e.message}`);
  }
}

main().catch(console.error);
