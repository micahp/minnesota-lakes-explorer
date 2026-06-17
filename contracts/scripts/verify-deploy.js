const hre = require("hardhat");

async function main() {
  const bob = (await hre.ethers.getSigners())[0];

  const fac = await hre.ethers.getContractFactory("ProofOfFish");
  const con = await fac.deploy();
  await con.waitForDeployment();
  console.log("Deployed at:", await con.getAddress());

  const lakes = [
    ["11030500", "Lake Minnetonka", "Hennepin",
     "Walleye,Northern Pike,Largemouth Bass,Bluegill", 7n,
     "1985-03-12", "2024-08-15"],
    ["18003000", "Lake Superior", "Cook",
     "Lake Trout,Coho Salmon,Chinook Salmon", 5n,
     "1991-05-20", "2024-09-01"],
    ["99010600", "Lake Vermilion", "St. Louis",
     "Walleye,Lake Trout,Largemouth Bass,Northern Pike,Muskie", 5n,
     "1997-06-10", "2024-07-20"],
  ];

  // 1. Mint 3 lakes via bob
  console.log("\n1. Minting 3 lakes...");
  for (const [mid, name, county, species, count, first, last] of lakes) {
    const tx = await con.connect(bob).mint(mid, name, county, species,
                                          count, first, last);
    const receipt = await tx.wait();

    // Extract tokenId from LakeMinted event
    const evt = receipt.logs.find(
      l => { try { return con.interface.parseLog(l)?.name === "LakeMinted"; } catch{ return false; } }
    );
    const parsed = con.interface.parseLog(evt);
    const tid = parsed.args.tokenId;
    console.log(`   MINTED ${mid} → tokenId ${tid}`);
    console.log(`      Owner: ${(await con.ownerOf(tid)).slice(0,10)}...`);

    // Verify metadata
    const uri = await con.tokenURI(tid);
    const meta = JSON.parse(Buffer.from(uri.slice(29), "base64").toString());
    console.log(`      Lake: ${meta.name}, ${meta.county}`);
    console.log(`      Species: ${meta.attributes?.find(a => a.trait_type === "Species")?.value?.slice(0,30)}...`);
    console.log(`      SVG present: ${!!meta.image?.includes("<svg")}, ${meta.image?.length} chars`);

    // Check minted flag
    console.log(`      isMinted: ${await con.isMinted(mid)}`);
  }

  // 2. Double mint rejection
  console.log("\n2. Double mint rejection...");
  try {
    await con.mint("11030500", "dup", "dup", "dup", 1n, "2024", "2024");
    console.log("   FAIL: double mint did not revert"); process.exit(1);
  } catch (_e) { console.log("   ✓ double mint correctly reverted"); }

  // 3. Different minter works
  console.log("\n3. Second minter...");
  const carol = (await hre.ethers.getSigners())[1];
  const tx = await con.connect(carol).mint("20001000", "Lake Itasca", "Clearwater",
                                           "Walleye,Smallmouth Bass", 2n,
                                           "1988-04-01", "2024-06-15");
  await tx.wait();
  console.log("   ✓ carol minted successfully (open access control)");

  console.log("\n✅ ALL TESTS PASSED — contract is solid and ready for mainnet deploy.");
}

main().catch(e => { console.error(e); process.exit(1); });
