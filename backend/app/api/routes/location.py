from fastapi import APIRouter
from app.core.database import transport_collection
from datetime import datetime

router = APIRouter()

@router.post("/add")
async def add_location(data: dict):
    data["timestamp"] = datetime.utcnow()
    await transport_collection.update_one(
        {"transport_id": data.get("transport_id")},
        {"$set": {
            "current_location": {
                "lat": data.get("lat"),
                "lng": data.get("lng")
            },
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    return {"status": "success", "message": "Location updated"}

@router.get("/latest/{vehicle_id}")
async def get_latest(vehicle_id: str):
    doc = await transport_collection.find_one({"vehicle_number": vehicle_id})
    if not doc:
        return {"status": "error", "message": "Vehicle not found"}
    doc["_id"] = str(doc["_id"])
    return {"status": "success", "location": doc.get("current_location"), "status_info": doc.get("status")}

@router.get("/history/{vehicle_id}")
async def history(vehicle_id: str):
    cursor = transport_collection.find({"vehicle_number": vehicle_id})
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        history.append(doc)
    return {"status": "success", "history": history}