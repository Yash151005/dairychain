import hashlib
import json
import os
from datetime import datetime

try:
    from web3 import Web3
except ImportError:
    Web3 = None

from app.core.database import chain_collection, batch_collection

# Initialize Web3 registry if contract address is configured
web3_registry = None
try:
    contract_address = os.getenv("BATCHREGISTRY_CONTRACT_ADDRESS")
    if contract_address:
        from app.services.web3_service import BlockchainRegistry
        web3_registry = BlockchainRegistry(contract_address=contract_address)
except Exception as e:
    print(f"⚠️  Web3 registry not initialized: {e}")


# ─────────────────────────────────────────
# STORE BATCH ON CHAIN (MongoDB + Smart Contract)
# ─────────────────────────────────────────

async def store_batch_on_chain(data: dict) -> dict:
    """
    Store batch hash on both MongoDB ledger and smart contract (if configured)
    
    Returns:
        Dict with tx_hash and optional blockchain_receipt
    """
    block_data = {
        "batch_id":  data.get("batch_id"),
        "farmer_id": data.get("farmer_id"),
        "farm_name": data.get("farm_name", ""),
        "quality":   data.get("quality_status"),
        "fat":       data.get("fat_percentage"),
        "snf":       data.get("snf_percentage"),
        "water":     data.get("water_content"),
        "quantity":  data.get("quantity_litres"),
        "confidence": data.get("confidence_score", 0.0),
        "timestamp": datetime.utcnow().isoformat(),
    }

    # generate transaction hash
    payload_str = json.dumps(block_data, sort_keys=True)
    tx_hash     = hashlib.sha256(payload_str.encode()).hexdigest()

    # Store on MongoDB ledger (local blockchain)
    chain_record = {
        "tx_hash":    tx_hash,
        "block_data": block_data,
        "verified":   True,
        "created_at": datetime.utcnow(),
    }
    await chain_collection.insert_one(chain_record)

    # Update batch with tx_hash
    await batch_collection.update_one(
        {"batch_id": data.get("batch_id")},
        {"$set": {"blockchain_tx_hash": tx_hash}}
    )

    result = {
        "tx_hash": tx_hash,
        "blockchain_receipt": None,
        "smart_contract_tx": None
    }

    # Store on Smart Contract (if Web3 registry is available)
    if web3_registry:
        try:
            # Register batch on smart contract
            batch_hash = Web3.keccak(text=payload_str)
            
            receipt = web3_registry.register_batch(
                batch_id=data.get("batch_id"),
                farmer_address=data.get("farmer_address", "0x0000000000000000000000000000000000000000"),
                farm_name=data.get("farm_name", ""),
                quality_status=_get_quality_code(data.get("quality_status")),
                safety_index=_get_safety_code(data.get("safety_index")),
                fat_percentage=float(data.get("fat_percentage", 0)),
                snf_percentage=float(data.get("snf_percentage", 0)),
                water_content=float(data.get("water_content", 0)),
                quantity_litres=float(data.get("quantity_litres", 0)),
                confidence_score=float(data.get("confidence_score", 0)),
                batch_hash=batch_hash
            )
            
            result["smart_contract_tx"] = receipt.get("tx_hash")
            result["blockchain_receipt"] = receipt
            
            # Update batch with smart contract tx
            await batch_collection.update_one(
                {"batch_id": data.get("batch_id")},
                {"$set": {"smart_contract_tx": receipt.get("tx_hash")}}
            )
            
            print(f"✅ Batch {data.get('batch_id')} registered on smart contract: {receipt.get('tx_hash')}")
        except Exception as e:
            print(f"⚠️  Failed to register batch on smart contract: {e}")

    return result


# ─────────────────────────────────────────
# GET BATCH FROM CHAIN
# ─────────────────────────────────────────

async def get_batch_from_chain(batch_id: str) -> dict | None:
    record = await chain_collection.find_one(
        {"block_data.batch_id": batch_id}
    )
    if not record:
        return None

    # tamper verification
    payload_str = json.dumps(record["block_data"], sort_keys=True)
    recomputed  = hashlib.sha256(payload_str.encode()).hexdigest()
    is_valid    = (recomputed == record["tx_hash"])

    return {
        "tx_hash":    record["tx_hash"],
        "block_data": record["block_data"],
        "verified":   is_valid,
        "created_at": str(record["created_at"]),
    }


# ─────────────────────────────────────────
# GET ALL CHAIN RECORDS
# ─────────────────────────────────────────

async def get_all_chain_records() -> list:
    cursor = chain_collection.find().sort("created_at", -1).limit(20)
    records = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        records.append(doc)
    return records


# ─────────────────────────────────────────
# VERIFY TRANSACTION
# ─────────────────────────────────────────

async def verify_transaction(tx_hash: str) -> dict | None:
    record = await chain_collection.find_one({"tx_hash": tx_hash})
    if not record:
        return None

    payload_str = json.dumps(record["block_data"], sort_keys=True)
    recomputed  = hashlib.sha256(payload_str.encode()).hexdigest()
    is_valid    = (recomputed == record["tx_hash"])

    return {
        "tx_hash":  tx_hash,
        "verified": is_valid,
        "status":   "✅ Valid" if is_valid else "❌ Tampered",
        "data":     record["block_data"],
    }


# ─────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────

def _get_quality_code(quality_status: str) -> int:
    """
    Convert quality status to smart contract code
    0 = Pure, 1 = Suspicious, 2 = Adulterated
    """
    if not quality_status:
        return 0
    
    quality_lower = quality_status.lower()
    if "pure" in quality_lower:
        return 0
    elif "suspicious" in quality_lower:
        return 1
    elif "adulterated" in quality_lower:
        return 2
    return 0


def _get_safety_code(safety_index: str) -> int:
    """
    Convert safety index to smart contract code
    0 = Green, 1 = Yellow, 2 = Red
    """
    if not safety_index:
        return 0
    
    safety_lower = safety_index.lower()
    if "green" in safety_lower:
        return 0
    elif "yellow" in safety_lower:
        return 1
    elif "red" in safety_lower:
        return 2
    return 0


# ─────────────────────────────────────────
# VERIFY BATCH WITH SMART CONTRACT
# ─────────────────────────────────────────

def verify_batch_on_chain(batch_id: str, data_hash: str) -> dict:
    """
    Verify batch on smart contract
    
    Args:
        batch_id: Batch identifier
        data_hash: Data hash to verify
        
    Returns:
        Verification result
    """
    if not web3_registry:
        return {
            "verified": False,
            "error": "Smart contract not configured",
            "contract_tx": None
        }
    
    try:
        # Convert hex string to bytes if needed
        if isinstance(data_hash, str):
            data_hash_bytes = bytes.fromhex(data_hash.replace("0x", ""))
        else:
            data_hash_bytes = data_hash
        
        is_valid = web3_registry.verify_batch(batch_id, data_hash_bytes)
        
        return {
            "verified": is_valid,
            "batch_id": batch_id,
            "contract_address": web3_registry.contract_address,
            "status": "✅ Valid" if is_valid else "❌ Invalid"
        }
    except Exception as e:
        return {
            "verified": False,
            "error": str(e),
            "contract_tx": None
        }
