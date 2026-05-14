/**
 * proof-of-fish.js — Proof of Fish Contract Interaction Module
 *
 * Interacts with the ProofOfFish NFT contract on Base chain.
 * Uses ethers.js v6 via Wallet module.
 *
 * Contract: /contracts/ProofOfFish.sol
 * Key functions: mint(), isMinted(), getLakeData(), getMapId(), tokenURI()
 * Token ID = uint256(keccak256(abi.encodePacked(mapId))) — computed client-side
 */

import Wallet from './wallet.js';

const ProofOfFish = (() => {
  // ---- Configuration ----
  let CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

  // ---- Contract ABI (matching ProofOfFish.sol) ----
  const CONTRACT_ABI = [
    // ERC-721
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function ownerOf(uint256 tokenId) view returns (address)',

    // Minting
    'function mint(string mapId, string name, string county, string speciesList, uint256 speciesCount, string firstSurveyDate, string lastSurveyDate)',

    // Queries
    'function isMinted(string mapId) view returns (bool)',
    'function getLakeData(uint256 tokenId) view returns (tuple(string mapId, string name, string county, string speciesList, uint256 speciesCount, string firstSurveyDate, string lastSurveyDate))',
    'function getMapId(uint256 tokenId) view returns (string)',

    // Events
    'event LakeMinted(uint256 indexed tokenId, string indexed mapId, string name, string county, uint256 speciesCount)',
  ];

  // ---- Internal state ----
  const _mintedCache = new Map();

  /** Compute token ID from map_id (matches Solidity: uint256(keccak256(abi.encodePacked(mapId)))) */
  function _computeTokenId(mapId) {
    if (!window.ethers) throw new Error('ethers.js not loaded.');
    return ethers.keccak256(ethers.toUtf8Bytes(mapId));
  }

  function _getReadContract() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }

  async function _getWriteContract() {
    const signer = await Wallet.getSigner();
    if (!signer) throw new Error('Wallet not connected.');
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  // ---- Public API ----

  async function isLakeMinted(mapId) {
    if (!mapId) return false;
    if (_mintedCache.has(mapId)) return _mintedCache.get(mapId);
    if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      _mintedCache.set(mapId, false);
      return false;
    }
    try {
      const contract = _getReadContract();
      const minted = await contract.isMinted(mapId);
      _mintedCache.set(mapId, minted);
      return minted;
    } catch (err) {
      console.error(`Error checking mint status for ${mapId}:`, err);
      return false;
    }
  }

  async function mintProofOfFish(mapId, lakeName, county, speciesList, speciesCount, firstSurvey, lastSurvey) {
    if (!mapId) throw new Error('mapId is required');
    if (!lakeName) throw new Error('lakeName is required');

    const contract = await _getWriteContract();

    // speciesList can be an array or comma-separated string — normalize to string
    const speciesStr = Array.isArray(speciesList) ? speciesList.join(', ') : (speciesList || 'Unknown');
    const safeCounty = county || 'Unknown';
    const safeSpeciesCount = speciesCount || (Array.isArray(speciesList) ? speciesList.length : 0);
    const safeFirstSurvey = firstSurvey || 'Unknown';
    const safeLastSurvey = lastSurvey || 'Unknown';

    console.log('Minting Proof of Fish:', { mapId, lakeName, county: safeCounty, speciesStr, speciesCount: safeSpeciesCount });

    const tx = await contract.mint(
      mapId, lakeName, safeCounty, speciesStr, safeSpeciesCount, safeFirstSurvey, safeLastSurvey
    );

    console.log(`TX submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Confirmed in block ${receipt.blockNumber}`);

    // Parse LakeMinted event for tokenId
    let tokenId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed && parsed.name === 'LakeMinted') {
          tokenId = parsed.args.tokenId.toString();
          break;
        }
      } catch (_) { /* not our event */ }
    }

    _mintedCache.set(mapId, true);
    return { txHash: tx.hash, tokenId: tokenId || _computeTokenId(mapId) };
  }

  async function getTokenURI(tokenId) {
    const contract = _getReadContract();
    return await contract.tokenURI(tokenId);
  }

  function setContractAddress(address) {
    CONTRACT_ADDRESS = address;
    _mintedCache.clear();
  }

  function getContractAddress() { return CONTRACT_ADDRESS; }
  function clearCache() { _mintedCache.clear(); }
  function computeTokenId(mapId) { return _computeTokenId(mapId); }

  return {
    isLakeMinted, mintProofOfFish, getTokenURI,
    setContractAddress, getContractAddress, clearCache, computeTokenId,
  };
})();

export default ProofOfFish;
