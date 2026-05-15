from fastapi import APIRouter
from app.services.db_service import insert_batch, get_batch
from app.core.database import batch_collection
from datetime import datetime

router = APIRouter()

@router.post("/add")
async def add_milk(data: dict):
    data["collection_time"] = datetime.utcnow()
    result = await insert_batch(data)
    return {"status": "success", "message": "Milk batch added", "id": result}

@router.get("/history/{farmer_id}")
async def history(farmer_id: str):
    cursor = batch_collection.find({"farmer_id": farmer_id})
    batches = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        batches.append(doc)
    return {"status": "success", "history": batches}

@router.get("/today")
async def today():
    from datetime import timedelta
    start = datetime.utcnow().replace(hour=0, minute=0, second=0)
    cursor = batch_collection.find({"collection_time": {"$gte": start}})
    total = 0
    async for doc in cursor:
        total += doc.get("quantity_litres", 0)
    return {"status": "success", "total_litres_today": total}

@router.get("/quality/{batch_id}")
async def quality(batch_id: str):
    # search by batch_id field not ObjectId
    from app.core.database import batch_collection
    batch = await batch_collection.find_one({"batch_id": batch_id})
    if not batch:
        return {"status": "error", "message": "Batch not found"}
    batch["_id"] = str(batch["_id"])
    return {
        "status":           "success",
        "quality_status":   batch.get("quality_status"),
        "confidence_score": batch.get("confidence_score"),
        "safety_index":     batch.get("safety_index")
    }