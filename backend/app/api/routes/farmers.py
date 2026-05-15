from fastapi import APIRouter
from app.services.db_service import insert_user, get_user
from app.core.database import user_collection
from datetime import datetime

router = APIRouter()

@router.get("/")
async def get_farmers():
    cursor = user_collection.find({"role": "farmer"})
    farmers = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        farmers.append(doc)
    return {"status": "success", "farmers": farmers}

@router.get("/{user_id}")
async def get_farmer(user_id: str):
    farmer = await get_user(user_id)
    if not farmer:
        return {"status": "error", "message": "Farmer not found"}
    return {"status": "success", "farmer": farmer}

@router.post("/")
async def add_farmer(data: dict):
    data["role"] = "farmer"
    data["created_at"] = datetime.utcnow()
    await insert_user(data)
    return {"status": "success", "message": "Farmer added"}

@router.put("/{user_id}")
async def update_farmer(user_id: str, data: dict):
    await user_collection.update_one(
        {"user_id": user_id},
        {"$set": data}
    )
    return {"status": "success", "message": "Farmer updated"}

@router.delete("/{user_id}")
async def delete_farmer(user_id: str):
    await user_collection.delete_one({"user_id": user_id})
    return {"status": "success", "message": "Farmer deleted"}