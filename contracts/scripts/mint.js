/**
 * Mint a ProofOfFish NFT for a lake.
 * 
 * Usage:
 *   npx hardhat run scripts/mint.js --network baseSepolia
 * 
 * Prerequisites:
 *   - Contract deployed to Base Sepolia
 *   - PRIVATE_KEY in .env with some Base Sepolia ETH
 *   - Update LAKE_DATA constant with real lake data
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Minting from account: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  // Update this address after deployment
  const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  
  const ProofOfFish = await hre.ethers.getContractAt("ProofOfFish", CONTRACT_ADDRESS);

  // Lake Data for testing (replace with real data)
  const LAKE_DATA = {
    mapId: "11030500",  // DNR map ID for Lake Superior - example
    name: "Demo Lake",
    county: "Hennepin",
    speciesList: "Walleye, Northern Pike, Bass",
    speciesCount: 3,
    firstSurveyDate: "2025-01-15",
    lastSurveyDate: "2026-05-20"
  };

  console.log("\nMinting Proof of Fish for:");
  console.log(`  Lake: ${LAKE_DATA.name}`);
  console.log(`  County: ${LAKE_DATA.county}`);
  console.log(`  Map ID: ${LAKE_DATA.mapId}`);
  console.log(`  Species: ${LAKE_DATA.speciesList}`);
  console.log(`  Count: ${LAKE_DATA.speciesCount}`);

  // Try to mint (it will fail if already minted)
  try {
    await ProofOfFish.isMinted(LAKE_DATA.mapId);
  } catch (e) {
    console.log("\nℹ️  This lake may already be minted.");
  }

  // Estimate gas
  const tx = ProofOfFish.populateTransaction.mint(
    LAKE_DATA.mapId,
    LAKE_DATA.name,
    LAKE_DATA.county,
    LAKE_DATA.speciesList,
    LAKE_DATA.speciesCount,
    LAKE_DATA.firstSurveyDate,
    LAKE_DATA.lastSurveyDate
  );
  const gasEstimate = await deployer.estimateGas(tx);
  console.log(`\nEstimated gas: ${gasEstimate.toString()} gas`);
  console.log(`Estimated gas price: ${hre.ethers.formatUnits(await hre.ethers.provider.getGasPrice(), 'gwei')} gwei`);
  console.log(`Estimated cost: ${hre.ethers.formatEther(gasEstimate * await hre.ethers.provider.getGasPrice())} ETH`);

  const txResponse = await ProofOfFish.mint(
    LAKE_DATA.mapId,
    LAKE_DATA.name,
    LAKE_DATA.county,
    LAKE_DATA.speciesList,
    LAKE_DATA.speciesCount,
    LAKE_DATA.firstSurveyDate,
    LAKE_DATA.lastSurveyDate
  );

  console.log(`\nTransaction sent: ${txResponse.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await txResponse.wait();
  console.log(`\n✅ Mint successful!`);
  console.log(`Transaction Hash: ${receipt.transactionHash}`);
  console.log(`Block: ${receipt.blockNumber}`);

  // Extract token ID from event
  const event = receipt.events.find(e => e.event === "LakeMinted");
  if (event) {
    const tokenId = event.args.tokenId.toString();
    console.log(`Token ID: ${tokenId}`);
    console.log(`\n🔍 View on Basescan:`);
    console.log(`  https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}#tokens`);
    console.log(`\n🖼️  View token metadata:`);
    console.log(`  https://sepolia.basescan.org/token/${CONTRACT_ADDRESS}?a=${tokenId}`);
  }

  // Test tokenURI
  const tokenUri = await ProofOfFish.tokenURI(tokenId);
  console.log(`\n📄 Token URI (truncated): ${tokenUri.substring(0, 200)}...`);
}

// Helper to get existing token ID
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
