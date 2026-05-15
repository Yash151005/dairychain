from fastapi import APIRouter
from app.services.db_service import get_tokens_by_farmer, add_tokens

router = APIRouter()

@router.get("/api/tokens/{farmer_id}")
async def get_tokens(farmer_id: str):
    tokens = await get_tokens_by_farmer(farmer_id)
    return {"status": "success", "tokens": tokens}

@router.post("/api/tokens/add")
async def earn_tokens(data: dict):
    await add_tokens(
        data.get("farmer_id"),
        data.get("tokens"),
        data.get("reason"),
        data.get("batch_id")
    )
    return {"status": "success", "message": "Tokens added"}