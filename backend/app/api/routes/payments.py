from fastapi import APIRouter
from app.services.db_service import (
    insert_payment,
    get_all_payments,
    get_payments_by_farmer
)
from app.core.database import payment_collection
from datetime import datetime

router = APIRouter()

@router.get("/pending")
async def pending():
    cursor = payment_collection.find({"status": "Pending"})
    payments = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        payments.append(doc)
    return {"status": "success", "pending_payments": payments}

@router.get("/{farmer_id}")
async def payment_history(farmer_id: str):
    payments = await get_payments_by_farmer(farmer_id)
    return {"status": "success", "payments": payments}

@router.post("/add")
async def add_payment(data: dict):
    data["paid_at"] = datetime.utcnow()
    data["status"] = "Released"
    await insert_payment(data)
    return {"status": "success", "message": "Payment added"}

@router.put("/update/{payment_id}")
async def update_payment(payment_id: str, data: dict):
    await payment_collection.update_one(
        {"payment_id": payment_id},
        {"$set": data}
    )
    return {"status": "success", "message": "Payment updated"}