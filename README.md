# Minnesota Lakes Explorer — Proof of Fish 🎣

An interactive web application for exploring Minnesota lakes and their fish populations, with on-chain "Proof of Fish" NFT verification.

## Proof of Fish Concept

**Each Minnesota lake gets its own NFT — immutable on-chain proof that the lake has verified fish populations.**

The Proof of Fish ERC-721 contract on Base L2 stores verified DNR fish survey data on-chain:
- Lake name, county, and DNR map ID
- Complete list of fish species found
- Number of surveys conducted (proof of effort)
- Date range of surveys (proof of recency)
- Average CPUE and total catch per species
- On-chain generated SVG artwork

Once minted, a lake's Proof of Fish cannot be altered. It serves as a permanent, verifiable record that the lake has been surveyed and has documented fish populations. Anyone can mint any lake — no permissions, no fees beyond gas.

### Why On-Chain?

- **Immutability**: Survey data cannot be altered or deleted once recorded on-chain
- **Verifiability**: Anyone can verify a lake's fish data by querying the contract
- **Discoverability**: NFTs appear on OpenSea and other marketplaces, bringing attention to Minnesota's lakes
- **Permanence**: Even if DNR databases go offline, the on-chain record persists

## Features

### Lake Explorer (Original)
- Interactive Leaflet map with clustered lake markers
- Filter lakes by county
- Search lakes by name
- View detailed lake information including:
  - Lake metadata (area, depth, shoreline length)
  - Fish species and catch data
  - Fish length data
  - Fish consumption advisories
- Responsive design for desktop and mobile devices

### Vision Upgrade (New)
- Dark premium theme with deep-water glassmorphism aesthetic
- Wallet connection via MetaMask (ethers.js v6)
- On-chain Proof of Fish status for every lake
- One-click minting of Proof of Fish NFTs
- View on OpenSea integration
- Toast notifications for transactions

## Project Structure

```
├── index.html                    # Original static site
├── index-vision.html             # Vision upgrade with wallet + minting
├── css/
│   ├── style.css                 # Original styles
│   ├── fish-styles.css           # Fish data display styles
│   └── vision-theme.css          # Dark vision theme (new)
├── js/
│   ├── app.js                    # Main app controller
│   ├── map.js                    # Map initialization (Leaflet vector tiles)
│   ├── data-loader.js            # Data loading (updated for fish_summary.json)
│   ├── wallet.js                 # Wallet connection module (new)
│   └── proof-of-fish.js          # Contract interaction module (new)
├── data/
│   ├── lakes.json                # 17K+ lake metadata
│   ├── fish_summary.json         # Per-lake fish survey summaries (12K+ lakes)
│   ├── fish_species.json         # 151 fish species reference
│   └── fish_data.db              # SQLite database (full raw data)
├── contracts/
│   ├── ProofOfFish.sol           # ERC-721 smart contract (new)
│   ├── hardhat.config.js         # Hardhat config for Base L2
│   ├── scripts/deploy.js         # Deployment script
│   └── package.json              # Node dependencies
├── attached_assets/              # Raw DNR data files
└── *.py                          # Data preprocessing scripts
```

## Quick Start

### View the site
1. Open `index.html` for the original version
2. Open `index-vision.html` for the vision upgrade with Proof of Fish

### Deploy the smart contract
```bash
cd contracts
npm install
cp .env.example .env  # Edit with your PRIVATE_KEY
npx hardhat compile
npx hardhat run scripts/deploy.js --network baseSepolia  # Test first
npx hardhat run scripts/deploy.js --network base          # Mainnet
```

After deployment, update the contract address in `js/proof-of-fish.js`:
```javascript
ProofOfFish.setContractAddress('0x_YOUR_DEPLOYED_ADDRESS');
```

### Regenerate data
```bash
python3 preprocess_all_data.py
```

## Data Sources

Minnesota Department of Natural Resources (DNR) fish survey data including:
- Lake metadata (17,000+ lakes)
- Fish catch data (370,000+ survey records)
- Fish length data (124,000+ records)
- 151 distinct fish species documented

## Smart Contract

**Network**: Base L2 (chainId: 8453)
**Standard**: ERC-721
**Symbol**: POF
**License**: MIT

See `contracts/ProofOfFish.sol` for the full implementation with NatSpec documentation.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- MetaMask browser extension required for minting

## License

See the LICENSE file for details.
