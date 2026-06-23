import os
import json
from web3 import Web3
from solcx import compile_standard, install_solc

# --- Configuration ---
# You need a Base Sepolia RPC URL. Alchemy, Infura, or QuickNode are good options.
# Replace with your actual RPC URL (e.g., from Alchemy: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY)
# For security, do not hardcode private keys in production. Use environment variables.
BASE_SEPOLIA_RPC_URL = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org") # Using a public RPC for Base Sepolia
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "3c2153d7ce0b6d31b81fbbc8043d4f4d201e20890e5b52f4790a85884fd1e8dc") # Your 0x-prefixed private key

# Path to your Solidity contract file
CONTRACT_FILE = "/Users/micah/code/MinnesotaLakeExplorer/contracts/src/ProofOfFish.sol"
CONTRACT_NAME = "ProofOfFish"

# --- 0. Install Solidity Compiler if not already present ---
print("Checking for solc compiler...")
try:
    install_solc("0.8.25") # Ensure this matches the pragma in your contract
    print("solc compiler (v0.8.25) is installed or already present.")
except Exception as e:
    print(f"Error installing solc: {e}. It might already be installed.")

# --- 1. Compile the Solidity contract ---
print(f"Compiling {CONTRACT_FILE}...")
with open(CONTRACT_FILE, "r") as f:
    contract_source_code = f.read()

try:
    compiled_sol = compile_standard(
        {
            "language": "Solidity",
            "sources": {CONTRACT_FILE: {"content": contract_source_code}},
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
                    }
                }
            },
        },
        solc_version="0.8.25", # Must match the pragmas in your contract
    )
    print("Contract compiled successfully.")
except Exception as e:
    print(f"Error compiling contract: {e}")
    exit()

# Extract ABI and Bytecode
bytecode = compiled_sol["contracts"][CONTRACT_FILE][CONTRACT_NAME]["evm"]["bytecode"]["object"]
abi = compiled_sol["contracts"][CONTRACT_FILE][CONTRACT_NAME]["abi"]

# --- 2. Connect to Base Sepolia Testnet ---
if not BASE_SEPOLIA_RPC_URL.startswith("http"):
    print("ERROR: Please replace 'YOUR_BASE_SEPOLIA_RPC_URL_HERE' with a valid RPC URL.")
    exit()
if not PRIVATE_KEY:
    print("ERROR: Please provide a valid 0x-prefixed private key.")
    exit()


print(f"Connecting to Base Sepolia RPC: {BASE_SEPOLIA_RPC_URL}...")
w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC_URL))

if not w3.is_connected():
    print("Failed to connect to Base Sepolia RPC. Please check your URL and network connectivity.")
    exit()
print("Connected to Base Sepolia.")

# --- 3. Set up Sender Account ---
try:
    account = w3.eth.account.from_key(PRIVATE_KEY)
    sender_address = account.address
    print(f"Deployment will be from address: {sender_address}")
except Exception as e:
    print(f"Error deriving account from private key: {e}")
    exit()

# Set current account for easier transaction building
w3.eth.default_account = sender_address

# --- 4. Prepare and Send Deployment Transaction ---
print("Preparing contract deployment transaction...")
ProofOfFish = w3.eth.contract(abi=abi, bytecode=bytecode)

# Get current nonce for the sender account
nonce = w3.eth.get_transaction_count(sender_address)

# Build the transaction
# Constructor arguments go into contract.constructor() if your contract has any.
# Our example contract does not, so it's empty.
transaction = ProofOfFish.constructor().build_transaction(
    {
        "chainId": w3.eth.chain_id,
        "gasPrice": w3.eth.gas_price, # You might need to adjust gasPrice manually if network is congested
        "from": sender_address,
        "nonce": nonce,
    }
)

# Sign the transaction
signed_txn = w3.eth.account.sign_transaction(transaction, private_key=PRIVATE_KEY)
print("Transaction signed.")

# Send the transaction
print("Sending deployment transaction...")
tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
print(f"Deployment Transaction Hash: {tx_hash.hex()}")

# --- 5. Wait for Transaction to be Mined ---
print("Waiting for transaction to be mined...")
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print("Transaction mined.")

# Get the deployed contract address
deployed_contract_address = tx_receipt.contractAddress

if deployed_contract_address:
    print(f"\n--- Contract Deployed Successfully! ---\n")
    print(f"Contract Address: {deployed_contract_address}")
    print(f"Transaction Receipt: {json.dumps(dict(tx_receipt), indent=2)}")

    # You can now interact with the deployed contract
    # deployed_contract = w3.eth.contract(address=deployed_contract_address, abi=abi)
    # print(f"Contract name: {deployed_contract.functions.getName().call()}")
else:
    print("Error: Contract deployment failed, no contract address in receipt.")

# Save ABI to a file for future interactions
output_abi_file = os.path.join(os.path.dirname(CONTRACT_FILE), f"{CONTRACT_NAME}_abi.json")
with open(output_abi_file, "w") as f:
    json.dump(abi, f, indent=2)
print(f"ABI saved to {output_abi_file}")
