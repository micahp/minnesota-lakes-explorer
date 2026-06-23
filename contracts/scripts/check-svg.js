const hre = require("hardhat");
const { keccak256, toUtf8Bytes } = require("ethers");

async function main() {
  const fac = await hre.ethers.getContractFactory("ProofOfFish");
  const con = await fac.deploy();
  await con.waitForDeployment();
  
  // Mint one lake
  console.log("Minting...");
  const tx = await con.mint("11030500", "Lake Minnetonka", "Hennepin",
                 "Walleye,Northern Pike,Largemouth Bass,Bluegill", 7n,
                 "1985-03-12", "2024-08-15");
  const receipt = await tx.wait();
  
  // Extract tokenId from event
  const evt = receipt.logs.find(l => {
    try { return con.interface.parseLog(l)?.name === "LakeMinted"; } 
    catch { return false; }
  });
  const parsed = con.interface.parseLog(evt);
  const tid = parsed.args.tokenId;
  console.log("Token:", tid.toString());
  
  const uri = await con.tokenURI(tid);
  const meta = JSON.parse(Buffer.from(uri.slice(29), "base64").toString());
  
  console.log("Top-level keys:", Object.keys(meta).join(", "));
  console.log("name:", meta.name);
  console.log("description:", meta.description?.slice(0, 150));
  console.log("image length:", (meta.image||"").length);
  console.log("attributes count:", meta.attributes?.length || 0);
  
  // Show actual image content
  if (meta.image) {
    // First check if it's a data URI
    console.log("startsWith data:image:", meta.image.startsWith("data:image"));
    if (meta.image.startsWith("data:image/svg+xml")) {
      // It's base64 encoded SVG
      const b64 = meta.image.split(",")[1] || meta.image;
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      console.log("Decoded SVG starts:", decoded.slice(0, 300));
    } else if (meta.image.startsWith("<svg")) {
      console.log("SVG starts:", meta.image.slice(0, 400));
    } else {
      console.log("Image (first 600):", meta.image.slice(0, 600));
    }
  }
  
  // Show attributes
  if (meta.attributes) {
    meta.attributes.forEach(a => {
      console.log(`  attr: ${a.trait_type} = ${String(a.value).slice(0, 60)}`);
    });
  }
}

main().catch(console.error);
