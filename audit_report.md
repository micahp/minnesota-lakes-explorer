# ProofOfFish.sol Audit Report

## Contract Overview
**ProofOfFish** is an ERC-721 NFT contract that mints immutable on-chain proof that Minnesota lakes have verified fish populations. Each lake (identified by its DNR `map_id`) can be minted exactly once.

- **Compiler Version:** `solc ^0.8.25` with optimizer enabled
- **Standard:** ERC-721 (OpenZeppelin)
- **Primary Functions:** `mint`, `isMinted`, `getLakeData`, `getMapId`, `tokenURI`
- **Deployment Target:** Base L2 testnet (Base Sepolia)

---

## Security Audit Findings

### 1. Reentrancy Protection
**Status: PASS** ✓

- The `mint()` function does not make external calls before completing state changes
- `_mintedMapIds[mapId] = true` is set BEFORE `_safeMint()` is called
- No callbacks or external calls are made after minting
- **Recommendation:** No changes needed

### 2. Arithmetic Under/Overflow
**Status: PASS** ✓

- Contract uses Solidity 0.8.25 which has built-in overflow/underflow checks
- All arithmetic operations (`speciesCount`, tokenId derivation) are safe
- **Recommendation:** No changes needed

### 3. Access Control
**Status: LOW RISK** ✓

- `mint()` is open to anyone (public mint functionality - intentional design)
- No owner/administrative functions exist
- Only restriction: each lake can only be minted once (`_mintedMapIds` check)
- **Recommendation:** Document that open mint is intentional; no access control needed

### 4. Input Validation
**Status: Mostly GOOD** ✓

**✅ Validated Inputs:**
- `mapId` must be non-empty
- `name` must be non-empty
- Duplicate check prevents double-minting

**⚠️ Missing Validation:**
- `county`, `speciesList`, `firstSurveyDate`, `lastSurveyDate` are NOT validated
- These fields could be empty strings
- **Recommendation:** Add validation for all non-null strings:
  ```solidity
  require(bytes(county).length > 0,  "ProofOfFish: empty county");
  require(bytes(speciesList).length > 0, "ProofOfFish: empty species list");
  require(bytes(firstSurveyDate).length > 0, "ProofOfFish: empty survey date");
  require(bytes(lastSurveyDate).length > 0, "ProofOfFish: empty survey date");
  ```

### 5. Gas Optimization
**Status: GOOD** ✓

**Efficient Patterns:**
- Deterministic tokenId using `keccak256(mapId)` saves mapping space
- State is stored efficiently using mappings instead of arrays
- SVG generation is on-chain (no IPFS cost), but this is intentional for permanence

**Potential Optimizations:**
- The XML/JSON escaping loops use two passes (first to count, second to write). For typical lake names this is fine.
- `Strings.uint256ToStr()` is imported but not used (removed to reduce gas)
- `getLakeData()` and `getMapId()` use `_requireOwned()` which checks ownership - this is fine but consider if public read access is desired (could use `view` without `_requireOwned` if needed)

### 6. Front-Running / MEV Risk
**Status: LOW RISK** ✓

- `mint()` is open and non-censorable, so front-running is not a security issue
- Each lake is tied to its map_id deterministically, so front-running doesn't give advantage
- **Recommendation:** No changes needed

### 7. DoS / Gas Limit Risk
**Status: MEDIUM** ⚠️

**SVG Generation Gas Estimation:**
- The `_generateSVG()` function builds a large string with multiple elements
- SVG contains ~30 circles, 7 paths, and text elements
- On-chain SVG can be expensive (~100-300k gas per mint for SVG generation)
- If many tokens are minted at once, gas for minting could exceed block limit

**Risk Assessment:**
- Each individual mint should succeed (gas is proportional to SVG size, not scale)
- Batch minting 2+ lakes in one tx would likely fail
- **Recommendation:** Document that minting must be done one at a time; gas cost per mint should be tested on testnet

**Data Size:**
- `speciesList` is stored as a single string; if it contains hundreds of species, metadata cost grows
- `tokenURI()` must be able to fit the entire JSON with SVG in one call
- For large species lists, consider pagination or limiting species count in data
- **Recommendation:** Consider a limit on speciesList length (e.g., `require(bytes(speciesList).length < 1000)`)

### 8. Storage Layout & Upgradability
**Status: PASS** ✓

- No upgrade pattern used (immutable metadata design - intentional)
- Storage is minimal: 3 mappings (each 20 bytes per entry = 60 bytes per lake)
- No delegatePattern; contracts cannot be upgraded (design choice is clear)
- **Recommendation:** Add `immutable` for config values if they exist (none in this contract)

### 9. Emergency / Recovery
**Status: NOT APPLICABLE** ✓

- No owner functions, no pause, no emergency withdraws
- Metadata cannot be modified after mint (immutability by design)
- If a lake is minted incorrectly, there is NO recovery mechanism
- This is intentional - it's "proof" that a lake has verified fish populations
- **Recommendation:** Clearly document that mint is permanent and non-reversible

### 10. ERC-721 Compliance
**Status: PASS** ✓

- Inherits from OpenZeppelin's ERC721
- Implements required functions: `mint`, `tokenURI`, `ownerOf`, `balanceOf`
- ERC-721 compliant metadata with on-chain SVG
- **Recommendation:** Consider adding ERC-721A for gas-efficient batch mints if needed later

---

## Critical Issues (0)
❌ None found

## High Priority Issues (0)
❌ None found

## Medium Priority Issues (2)
1. **Missing input validation** on `county`, `speciesList`, `firstSurveyDate`, `lastSurveyDate`
2. **Gas cost** for on-chain SVG could be high for complex lakes

## Low Priority Issues (1)
1. `Strings` import unused (can be removed to reduce deployment size)

---

## Recommendations Summary

### Must Fix Before Mainnet:
1. Add validation for all string inputs (county, speciesList, survey dates)
2. Document expected gas cost per mint and test on testnet
3. Consider speciesList length limit (e.g., 500-1000 chars)

### Optional Improvements:
1. Add `ERC721A` for batch mint optimization
2. Consider exposing `getLakeData()` and `getMapId()` as public view (without ownership check)
3. Add events for metadata queries (`LakeDataUpdated`, if metadata is ever updated)
4. Add `supportsInterface` override for custom interfaces if needed

---

## Deployment Checklist for Mainnet

- [ ] Add input validation for all required fields
- [ ] Test gas costs on Base Sepolia testnet
- [ ] Get contract verified on Basescan
- [ ] Set up monitoring/alerts for mint events
- [ ] Decide on mainnet deployment address (create new wallet, not reused)
- [ ] Write user documentation for end users minting lake NFTs

---

## Network Deployment Notes

### Base Sepolia Testnet
- **Network ID:** 84532
- **RPC URL:** `https://sepolia.base.org` (public, no auth needed)
- **Block Explorer:** https://sepolia.basescan.org
- **Chain ID in contract:** No hardcoded values (good)

### Mainnet Base
- **Network ID:** 8453
- **Chain ID in contract:** No hardcoded values (good)

---

## Conclusion

**ProofOfFish** is a well-architected contract with a clean design. The main concerns are:

1. **Input validation:** Add validation for all required string fields
2. **Gas costs:** Test SVG generation on testnet (expect 100-300k gas per mint)
3. **Documentation:** Clearly communicate that mint is permanent and non-reversible

**Overall Rating:** **A- (Ready for testnet with minor fixes)**

---

*Audit Date:* 2026-05-25
*Auditor:* Agency Worker
*Contract Version:* 0.8.25 (vision-upgrade branch)
