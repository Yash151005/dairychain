import base64
from fastapi import APIRouter, HTTPException
from app.core.database import user_collection
from app.services.qr_service import upload_profile_image

router = APIRouter()


@router.post("/profile")
async def upload_profile(data: dict):
    """
    Upload a base64-encoded profile image to Cloudinary.
    Body: { user_id: str, image_base64: str }
    Returns: { status, url }
    """
    user_id = data.get("user_id", "").strip()
    image_b64 = data.get("image_base64", "").strip()

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not image_b64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    # Strip data-URI prefix if present (e.g. "data:image/jpeg;base64,...")
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    try:
        url = await upload_profile_image(user_id, image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {exc}")

    # Persist URL on the user document
    await user_collection.update_one(
        {"user_id": user_id},
        {"$set": {"profile_image": url}},
    )

    return {"status": "success", "url": url}
