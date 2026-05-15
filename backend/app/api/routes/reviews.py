from fastapi import APIRouter
from app.services.db_service import insert_feedback, get_feedback_by_batch
from app.core.database import feedback_collection
from datetime import datetime

router = APIRouter()

@router.post("/add")
async def add_review(data: dict):
    data["submitted_at"] = datetime.utcnow()
    await insert_feedback(data)
    return {"status": "success", "message": "Review added"}

@router.get("/")
async def get_reviews():
    cursor = feedback_collection.find().sort("submitted_at", -1)
    reviews = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        reviews.append(doc)
    return {"status": "success", "reviews": reviews}

@router.get("/{batch_id}")
async def get_review(batch_id: str):
    reviews = await get_feedback_by_batch(batch_id)
    return {"status": "success", "reviews": reviews}