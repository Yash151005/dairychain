from fastapi import APIRouter
from app.services.db_service import get_all_alerts, resolve_alert
from app.core.database import alert_collection
from datetime import datetime

router = APIRouter()

@router.get("/")
async def get_alerts():
    alerts = await get_all_alerts()
    return {"status": "success", "alerts": alerts}

@router.post("/add")
async def add_alert(data: dict):
    data["created_at"] = datetime.utcnow()
    data["resolved"] = False
    await alert_collection.insert_one(data)
    return {"status": "success", "message": "Alert added"}

@router.put("/mark-read/{batch_id}")
async def mark_read(batch_id: str):
    result = await resolve_alert(batch_id)
    if result:
        return {"status": "success", "message": "Alert marked as read"}
    return {"status": "error", "message": "Alert not found"}