from fastapi import APIRouter
from app.services.db_service import insert_feedback, get_feedback_by_batch
from datetime import datetime

router = APIRouter()

@router.post("/api/feedback/")
async def submit_feedback(data: dict):
    data["submitted_at"] = datetime.utcnow()
    await insert_feedback(data)
    return {"status": "success", "message": "Feedback submitted"}

@router.get("/api/feedback/{batch_id}")
async def get_feedback(batch_id: str):
    feedbacks = await get_feedback_by_batch(batch_id)
    return {"status": "success", "feedbacks": feedbacks}