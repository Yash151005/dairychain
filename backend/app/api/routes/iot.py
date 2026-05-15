from fastapi import APIRouter
from app.services.db_service import insert_sensor_data
from app.core.database import sensor_collection

router = APIRouter()

@router.get("/latest")
async def latest():
    doc = await sensor_collection.find_one(sort=[("timestamp", -1)])
    if doc:
        doc["_id"] = str(doc["_id"])
    return {"status": "success", "latest": doc}

@router.post("/add")
async def add(data: dict):
    result = await insert_sensor_data(data)
    return {"status": "success", "message": "Sensor data added", "id": result}

@router.get("/history/{batch_id}")
async def history(batch_id: str):
    cursor = sensor_collection.find({"batch_id": batch_id})
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)
    return {"status": "success", "history": history}