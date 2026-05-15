from fastapi import APIRouter
from app.services.db_service import insert_user, get_user
from datetime import datetime

router = APIRouter()

@router.post("/register")
async def register(data: dict):
    if not data.get("user_id"):
        data["user_id"] = data.get("email") or data.get("name")

    if not data.get("role"):
        data["role"] = "farmer"

    existing = await get_user(data.get("user_id"))
    if existing:
        return {"status": "error", "message": "User already exists"}
    data["created_at"] = datetime.utcnow()
    await insert_user(data)
    return {"status": "success", "message": "User registered successfully"}

@router.post("/login")
async def login(data: dict):
    user = await get_user(data.get("user_id"))
    if not user:
        return {"status": "error", "message": "User not found"}

    if data.get("password") is not None and user.get("password") != data.get("password"):
        return {"status": "error", "message": "Invalid credentials"}

    return {"status": "success", "user": user}

@router.get("/profile/{user_id}")
async def profile(user_id: str):
    user = await get_user(user_id)
    if not user:
        return {"status": "error", "message": "User not found"}
    return {"status": "success", "user": user}

@router.put("/update-profile/{user_id}")
async def update_profile(user_id: str, data: dict):
    from app.core.database import user_collection
    await user_collection.update_one(
        {"user_id": user_id},
        {"$set": data}
    )
    return {"status": "success", "message": "Profile updated"}
