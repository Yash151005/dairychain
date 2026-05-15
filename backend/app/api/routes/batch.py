from fastapi import APIRouter
from app.schemas.batch_schema import BatchCreate
from app.services.batch_service import create_batch, get_batch_by_id
from app.services.ai_service import analyze_milk

router = APIRouter()


# 🔹 CREATE BATCH
@router.post("/create")
async def create_batch_route(data: BatchCreate):

    # Step 1: AI quality analysis
    quality = await analyze_milk(data.dict())

    # Step 2: Persist batch in DB
    result = await create_batch({
        **data.dict(),
        "quality": quality
    })

    batch_id = result["batch_id"]

    # Step 3: Auto-generate QR code and upload to Cloudinary
    qr_url = None
    try:
        from app.services.qr_service import generate_and_upload_qr
        qr_url = await generate_and_upload_qr(batch_id)
    except Exception:
        # Fallback to public QR API so the app still shows a QR
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={batch_id}&color=1b5e20"

    return {
        "status": "success",
        "batch_id": batch_id,
        "quality": result["quality"],
        "qr_url": qr_url,
    }


# 🔹 GET BATCH (fixed route collision)
@router.get("/get/{batch_id}")
async def get_batch_data(batch_id: str):

    batch = await get_batch_by_id(batch_id)

    if not batch:
        return {
            "status": "error",
            "message": "Batch not found"
        }

    return {
        "status": "success",
        "data": batch
    }