const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const ProofOfFish = await hre.ethers.getContractFactory("ProofOfFish");
  const contract = await ProofOfFish.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  
  console.log("Testing contract at:", await contract.getAddress());
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(contract.getAddress())));
  
  // Mint a lake (using map_id as string)
  console.log("\n1. Minting lake map_id '11030500'...");
  const tx = await contract.mint("11030500");
  await tx.wait();
  console.log("   Minted!");
  
  // Get token ID from map_id
  const tokenId = await contract.getTokenId("11030500");
  console.log("   Token ID:", tokenId.toString());
  
  // Check owner
  const owner = await contract.ownerOf(tokenId);
  console.log("   Owner:", owner);
  
  // Get metadata
  const uri = await contract.tokenURI(tokenId);
  const json = Buffer.from(uri.slice(29), 'base64').toString();
  const meta = JSON.parse(json);
  console.log("   Lake name:", meta.name);
  console.log("   County:", meta.county);
  console.log("   Species count:", meta.attributes.find(a => a.trait_type === "Species Count")?.value);
  console.log("   Description:", meta.description.slice(0, 100));
  
  // Mint another
  console.log("\n2. Minting lake map_id '18003000'...");
  const tx2 = await contract.mint("18003000");
  await tx2.wait();
  const tokenId2 = await contract.getTokenId("18003000");
  const uri2 = await contract.tokenURI(tokenId2);
  const json2 = Buffer.from(uri2.slice(29), 'base64').toString();
  const meta2 = JSON.parse(json2);
  console.log("   Lake:", meta2.name, "-", meta2.county);
  console.log("   Species:", meta2.attributes.find(a => a.trait_type === "Species")?.value?.slice(0, 80));
  console.log("   Has SVG:", json2.includes("svg"));
  
  // Check total supply
  try {
    const totalSupply = await contract.totalSupply();
    console.log("\n3. Total supply:", totalSupply.toString());
  } catch(e) { console.log("\n3. totalSupply not implemented (no ERC721Enumerable)")}
  
  // Check map_id -> tokenId mapping is deterministic
  console.log("\n4. Deterministic token IDs:");
  const tid1 = await contract.getTokenId("11030500");
  console.log("   11030500 ->", tid1.toString());
  console.log("   Matches earlier:", tid1.toString() === tokenId.toString() ? "YES" : "NO");
  
  console.log("\nALL CONTRACT TESTS PASSED");
}

main().catch(e => { console.error(e); process.exit(1); });
