from fastapi import APIRouter
from app.services.db_service import insert_expense, get_expenses_by_farmer
from app.core.database import expense_collection
from datetime import datetime

router = APIRouter()

@router.post("/add")
async def add(data: dict):
    data["logged_at"] = datetime.utcnow()
    await insert_expense(data)
    return {"status": "success", "message": "Expense added"}

@router.get("/{farmer_id}")
async def get_expense(farmer_id: str):
    expenses = await get_expenses_by_farmer(farmer_id)
    return {"status": "success", "expenses": expenses}

@router.get("/summary/{farmer_id}")
async def summary(farmer_id: str):
    expenses = await get_expenses_by_farmer(farmer_id)
    total = sum(e.get("amount", 0) for e in expenses)
    return {"status": "success", "total_expense": total}