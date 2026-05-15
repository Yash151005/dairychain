from fastapi import APIRouter
from app.services.db_service import insert_transport, get_transport
from datetime import datetime

router = APIRouter()

@router.post("/api/transport/")
async def create_transport(data: dict):
    data["started_at"] = datetime.utcnow()
    await insert_transport(data)
    return {"status": "success", "message": "Transport started"}

@router.get("/api/transport/{transport_id}")
async def get_transport_status(transport_id: str):
    transport = await get_transport(transport_id)
    if not transport:
        return {"status": "error", "message": "Transport not found"}
    return {"status": "success", "transport": transport}