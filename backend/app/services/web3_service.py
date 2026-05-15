"""
Web3.py integration for SmartShetakari BlockchainRegistry Contract
Handles interaction with deployed smart contract for batch registration
"""

import os
import json
import hashlib
from typing import Optional, Dict, Any

try:
    from web3 import Web3
except ImportError:
    Web3 = None

from dotenv import load_dotenv

load_dotenv()


class BlockchainRegistry:
    """
    Web3 client for interacting with BatchRegistry smart contract
    """

    def __init__(
        self,
        contract_address: str,
        provider_url: str = None,
        private_key: str = None,
        contract_abi: str = None,
    ):
        """
        Initialize blockchain registry

        Args:
            contract_address: Deployed contract address
            provider_url: Web3 RPC provider URL (default: env PROVIDER_URL)
            private_key: Private key for signing transactions (default: env PRIVATE_KEY)
            contract_abi: Path to ABI JSON file (default: env CONTRACT_ABI_PATH)
        """
        # Initialize Web3
        self.provider_url = provider_url or os.getenv(
            "PROVIDER_URL", "http://localhost:8545"
        )
        self.web3 = Web3(Web3.HTTPProvider(self.provider_url))

        if not self.web3.is_connected():
            raise ConnectionError(f"Failed to connect to {self.provider_url}")

        # Load private key
        self.private_key = private_key or os.getenv("PRIVATE_KEY")
        if not self.private_key:
            raise ValueError("PRIVATE_KEY not provided or set in environment")

        # Get account
        self.account = self.web3.eth.account.from_key(self.private_key)
        self.account_address = self.account.address

        # Load contract ABI
        abi_path = contract_abi or os.getenv(
            "CONTRACT_ABI_PATH", "./abis/BatchRegistry.json"
        )
        with open(abi_path, "r") as f:
            self.contract_abi = json.load(f)

        # Initialize contract
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.contract = self.web3.eth.contract(
            address=self.contract_address, abi=self.contract_abi
        )

    def register_batch(
        self,
        batch_id: str,
        farmer_address: str,
        farm_name: str,
        quality_status: int,  # 0=Pure, 1=Suspicious, 2=Adulterated
        safety_index: int,  # 0=Green, 1=Yellow, 2=Red
        fat_percentage: float,
        snf_percentage: float,
        water_content: float,
        quantity_litres: float,
        confidence_score: float,
        batch_hash: bytes = None,
    ) -> Dict[str, Any]:
        """
        Register a batch on blockchain

        Args:
            batch_id: Unique batch identifier
            farmer_address: Farmer's wallet address
            farm_name: Name of the farm
            quality_status: Quality status code
            safety_index: Safety index code
            fat_percentage: Fat percentage (float, e.g., 3.8)
            snf_percentage: SNF percentage (float, e.g., 8.5)
            water_content: Water content percentage (float)
            quantity_litres: Quantity in litres (float)
            confidence_score: AI confidence score (float 0.0-1.0)
            batch_hash: Pre-computed batch hash (optional)

        Returns:
            Dict with transaction hash and receipt
        """
        # Convert float percentages to uint256 (multiply by 10 for one decimal place)
        fat_pct_uint = int(fat_percentage * 10) if fat_percentage else 0
        snf_pct_uint = int(snf_percentage * 10) if snf_percentage else 0
        water_uint = int(water_content * 10) if water_content else 0
        quantity_uint = int(quantity_litres * 10) if quantity_litres else 0
        # Convert confidence from 0.0-1.0 to 0-100
        confidence_uint = int(confidence_score * 100) if confidence_score else 0
        
        # Generate batch hash if not provided
        if batch_hash is None:
            batch_data = {
                "batch_id": batch_id,
                "farmer_id": farmer_address,
                "farm_name": farm_name,
                "quality": quality_status,
                "fat": fat_percentage,
                "snf": snf_percentage,
                "water": water_content,
                "quantity": quantity_litres,
                "confidence": confidence_score,
            }
            batch_json = json.dumps(batch_data, sort_keys=True)
            batch_hash = Web3.keccak(text=batch_json)
        else:
            batch_hash = bytes(batch_hash)

        # Prepare transaction
        farmer_addr = Web3.to_checksum_address(farmer_address)

        # Build transaction
        tx = self.contract.functions.registerBatch(
            batch_id,
            farmer_addr,
            farm_name,
            batch_hash,
            quality_status,
            safety_index,
            fat_pct_uint,
            snf_pct_uint,
            water_uint,
            quantity_uint,
            confidence_uint,
        ).build_transaction(
            {
                "from": self.account_address,
                "nonce": self.web3.eth.get_transaction_count(self.account_address),
                "gas": 500000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )

        # Sign transaction
        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)

        # Send transaction
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)

        # Wait for receipt
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "tx_hash": tx_hash.hex(),
            "batch_hash": batch_hash.hex(),
            "receipt": receipt,
            "status": "success" if receipt["status"] == 1 else "failed",
        }

    def verify_batch(self, batch_id: str, data_hash: bytes) -> bool:
        """
        Verify batch integrity

        Args:
            batch_id: Batch identifier
            data_hash: Data hash to verify

        Returns:
            True if verified, False otherwise
        """
        # Build transaction
        tx = self.contract.functions.verifyBatch(batch_id, bytes(data_hash)).build_transaction(
            {
                "from": self.account_address,
                "nonce": self.web3.eth.get_transaction_count(self.account_address),
                "gas": 200000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )

        # Sign and send
        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        return receipt["status"] == 1

    def get_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get batch details from blockchain

        Args:
            batch_id: Batch identifier

        Returns:
            Batch record or None if not found
        """
        try:
            batch_data = self.contract.functions.getBatch(batch_id).call()

            return {
                "batch_id": batch_data[0],
                "farmer_address": batch_data[1],
                "farm_name": batch_data[2],
                "batch_hash": batch_data[3].hex(),
                "quality_status": batch_data[4],
                "safety_index": batch_data[5],
                "fat_percentage": batch_data[6],
                "snf_percentage": batch_data[7],
                "water_content": batch_data[8],
                "quantity_litres": batch_data[9],
                "confidence_score": batch_data[10],
                "timestamp": batch_data[11],
                "is_verified": batch_data[12],
                "is_blocked": batch_data[13],
            }
        except Exception as e:
            print(f"Error fetching batch {batch_id}: {e}")
            return None

    def update_safety_status(self, batch_id: str, new_safety_index: int) -> bool:
        """
        Update batch safety status

        Args:
            batch_id: Batch identifier
            new_safety_index: New safety index (0=Green, 1=Yellow, 2=Red)

        Returns:
            True if successful
        """
        tx = self.contract.functions.updateSafetyStatus(
            batch_id, new_safety_index
        ).build_transaction(
            {
                "from": self.account_address,
                "nonce": self.web3.eth.get_transaction_count(self.account_address),
                "gas": 200000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )

        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        return receipt["status"] == 1

    def block_batch(self, batch_id: str, reason: str) -> bool:
        """
        Block a batch (for adulterated/unsafe batches)

        Args:
            batch_id: Batch identifier
            reason: Reason for blocking

        Returns:
            True if successful
        """
        tx = self.contract.functions.blockBatch(batch_id, reason).build_transaction(
            {
                "from": self.account_address,
                "nonce": self.web3.eth.get_transaction_count(self.account_address),
                "gas": 200000,
                "gasPrice": self.web3.eth.gas_price,
            }
        )

        signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)

        return receipt["status"] == 1

    def is_batch_blocked(self, batch_id: str) -> bool:
        """
        Check if batch is blocked

        Args:
            batch_id: Batch identifier

        Returns:
            True if blocked
        """
        try:
            return self.contract.functions.isBatchBlocked(batch_id).call()
        except Exception:
            return False

    def get_farmer_batch_count(self, farmer_address: str) -> int:
        """
        Get farmer's batch count

        Args:
            farmer_address: Farmer's wallet address

        Returns:
            Number of batches registered
        """
        farmer_addr = Web3.to_checksum_address(farmer_address)
        return self.contract.functions.getFarmerBatchCount(farmer_addr).call()

    def get_total_batches(self) -> int:
        """Get total batch count"""
        return self.contract.functions.getTotalBatches().call()

    def does_hash_exist(self, batch_hash: bytes) -> bool:
        """Check if hash already exists"""
        return self.contract.functions.doesHashExist(bytes(batch_hash)).call()
