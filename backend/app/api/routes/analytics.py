from fastapi import APIRouter
from app.core.database import batch_collection, payment_collection, expense_collection

router = APIRouter()

@router.get("/milk-trend")
async def milk_trend():
    cursor = batch_collection.find(
        {},
        {"quantity_litres": 1, "collection_time": 1}
    ).sort("collection_time", -1).limit(30)
    trend = []
    async for doc in cursor:
        trend.append({
            "litres": doc.get("quantity_litres"),
            "date":   str(doc.get("collection_time"))
        })
    return {"status": "success", "trend": trend}

@router.get("/quality-trend")
async def quality_trend():
    cursor = batch_collection.find(
        {},
        {"confidence_score": 1, "collection_time": 1}
    ).sort("collection_time", -1).limit(30)
    trend = []
    async for doc in cursor:
        trend.append({
            "score": doc.get("confidence_score"),
            "date":  str(doc.get("collection_time"))
        })
    return {"status": "success", "trend": trend}

@router.get("/profit/{farmer_id}")
async def profit(farmer_id: str):
    # total payments
    cursor = payment_collection.find({"farmer_id": farmer_id})
    total_income = 0
    async for doc in cursor:
        total_income += doc.get("amount", 0)

    # total expenses
    cursor = expense_collection.find({"farmer_id": farmer_id})
    total_expense = 0
    async for doc in cursor:
        total_expense += doc.get("amount", 0)

    return {
        "status":        "success",
        "total_income":  total_income,
        "total_expense": total_expense,
        "net_profit":    total_income - total_expense
    }