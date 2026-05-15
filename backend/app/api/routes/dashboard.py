from fastapi import APIRouter
from app.services.db_service import get_dashboard_data
from app.core.database import batch_collection, sensor_collection

router = APIRouter()

@router.get("/farmer/{farmer_id}")
async def farmer_dashboard(farmer_id: str):
    cursor = batch_collection.find(
        {"farmer_id": farmer_id}
    ).sort("collection_time", -1).limit(1)
    last_batch = None
    async for doc in cursor:
        last_batch = doc

    sensor = await sensor_collection.find_one(
        sort=[("timestamp", -1)]
    )

    return {
        "status":      "success",
        "temperature": sensor.get("temperature") if sensor else None,
        "humidity":    sensor.get("humidity") if sensor else None,
        "quality":     last_batch.get("confidence_score") if last_batch else None,
        "safety_index": last_batch.get("safety_index") if last_batch else None,
    }

@router.get("/admin")
async def admin_dashboard():
    data = await get_dashboard_data()
    return {"status": "success", "dashboard": data}