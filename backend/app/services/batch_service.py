import random
import string
from datetime import datetime
from app.services.db_service import insert_batch, get_batch, update_batch
from app.services.blockchain_service import store_batch_on_chain


def _generate_batch_id() -> str:
    """Generate a human-readable batch ID like MILK-A3F9B."""
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"MILK-{suffix}"


# 🔹 CREATE BATCH (with blockchain integration)
async def create_batch(data):
    print("🚀 batch_service running")

    batch_id = _generate_batch_id()

    batch_data = {
        "batch_id":   batch_id,
        "farmerId":   data["farmerId"],
        "farmer_id":  data["farmerId"],
        "fat":        data["fat"],
        "snf":        data["snf"],
        "temperature": data["temperature"],
        "quality":    data["quality"],
        "status":     "pending",
        "timestamp":  datetime.utcnow(),
        "blockchain_tx": None,
    }

    # Step 1: Save to DB
    mongo_id = await insert_batch(batch_data)

    # Step 2: Blockchain call
    try:
        print("👉 Calling blockchain...")

        tx_result = await store_batch_on_chain({
            "batch_id":       batch_id,
            "farmer_id":      data["farmerId"],
            "quality_status": data["quality"],
            "fat_percentage": data["fat"],
            "snf_percentage": data["snf"],
        })

        print("✅ Blockchain TX:", tx_result)

        tx_hash = tx_result.get("tx_hash")

        if tx_hash:
            await update_batch(mongo_id, {"blockchain_tx": tx_hash})

    except Exception as e:
        print("❌ Blockchain ERROR:", str(e))

    return {
        "batch_id": batch_id,
        "quality":  data["quality"],
    }


# 🔹 GET BATCH
async def get_batch_by_id(batch_id: str):
    batch = await get_batch(batch_id)

    if not batch:
        return None

    batch["_id"] = str(batch["_id"])
    return batch
