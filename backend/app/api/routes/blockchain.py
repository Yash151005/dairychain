from fastapi import APIRouter
from app.services.blockchain_service import verify_transaction, get_all_chain_records

router = APIRouter()

@router.get("/api/blockchain/verify/{tx_hash}")
async def verify(tx_hash: str):
    result = await verify_transaction(tx_hash)
    if not result:
        return {"status": "error", "message": "Transaction not found"}
    return {"status": "success", "result": result}

@router.get("/api/blockchain/records")
async def all_records():
    records = await get_all_chain_records()
    return {"status": "success", "records": records}