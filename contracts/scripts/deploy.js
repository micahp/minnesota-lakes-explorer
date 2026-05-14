/**
 * Deploy ProofOfFish contract to Base L2.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network base
 *
 * Prerequisites:
 *   - PRIVATE_KEY in .env
 *   - BASESCAN_API_KEY in .env (optional, for verification)
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);

  const ProofOfFish = await hre.ethers.getContractFactory("ProofOfFish");
  const contract = await ProofOfFish.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nProofOfFish deployed to: ${address}`);
  console.log(`Network: ${hre.network.name} (chainId: ${hre.network.config.chainId})`);
  console.log(`\nTo verify on Basescan:`);
  console.log(`  npx hardhat verify --network ${hre.network.name} ${address}`);

  // Wait a few blocks for Etherscan to index
  console.log("\nWaiting 30s for block confirmations...");
  await new Promise(r => setTimeout(r, 30000));

  // Attempt verification
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("Contract verified on Basescan!");
  } catch (e) {
    console.log("Verification skipped or failed:", e.message?.slice(0, 200));
  }

  return address;
}

main()
  .then((addr) => {
    console.log(`\nDone! Contract: ${addr}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
