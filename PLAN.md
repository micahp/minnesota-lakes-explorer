1. Checkout the `vision-upgrade` branch in the `/Users/micah/code/MinnesotaLakeExplorer` directory.
2. Read `contracts/src/ProofOfFish.sol` thoroughly — understand every function.
3. Perform a basic audit of the contract for common vulnerabilities (reentrancy, overflow, access control, gas optimization).
4. Install Foundry safely (if not already installed):
    a. `curl -L https://foundry.paradigm.xyz -o foundry_install.sh`
    b. Review `foundry_install.sh`
    c. `bash foundry_install.sh`
    d. `foundryup`
5. Generate a new Ethereum wallet for deployment using Foundry's `cast` command.
5. Fund the wallet with Base Sepolia testnet ETH (this step might require manual intervention if a direct faucet interaction isn't possible via CLI). I will simulate funding if direct interaction isn't feasible.
6. Deploy the `ProofOfFish.sol` contract to the Base Sepolia testnet.
7. Test the contract functionalities (mint, tokenURI, SVG generation) on the testnet.
8. Document findings and the deployed contract address.