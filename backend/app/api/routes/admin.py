from fastapi import APIRouter
from app.services.db_service import get_dashboard_data
from app.core.database import user_collection, batch_collection

router = APIRouter()

@router.get("/stats")
async def stats():
    data = await get_dashboard_data()
    return {"status": "success", "stats": data}

@router.get("/reports")
async def reports():
    total_batches = await batch_collection.count_documents({})
    pure = await batch_collection.count_documents({"quality_status": "Pure"})
    adulterated = await batch_collection.count_documents({"quality_status": "Adulterated"})
    return {
        "status":      "success",
        "total":       total_batches,
        "pure":        pure,
        "adulterated": adulterated
    }

@router.get("/farmers-performance")
async def performance():
    cursor = batch_collection.aggregate([
        {"$group": {
            "_id":           "$farmer_id",
            "total_batches": {"$sum": 1},
            "avg_quality":   {"$avg": "$confidence_score"}
        }},
        {"$sort": {"avg_quality": -1}},
        {"$limit": 10}
    ])
    result = []
    async for doc in cursor:
        result.append(doc)
    return {"status": "success", "top_farmers": result}