import io
import asyncio
import qrcode
from PIL import Image
from datetime import datetime

import cloudinary
import cloudinary.uploader

from app.core.database import qr_collection
from app.core.config import settings


def _cloudinary_config():
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
    )


def _generate_qr_bytes(batch_id: str) -> bytes:
    """Generate a QR code PNG for batch_id and return raw bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(batch_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1b5e20", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def _upload_to_cloudinary(image_bytes: bytes, public_id: str) -> str:
    """Upload raw image bytes to Cloudinary and return the secure URL."""
    _cloudinary_config()
    result = cloudinary.uploader.upload(
        io.BytesIO(image_bytes),
        public_id=public_id,
        overwrite=True,
        resource_type="image",
        folder="smartshetakari/qrcodes",
        format="png",
    )
    return result["secure_url"]


def _upload_profile_to_cloudinary(image_bytes: bytes, user_id: str) -> str:
    """Upload a profile image to Cloudinary and return the secure URL."""
    _cloudinary_config()
    result = cloudinary.uploader.upload(
        io.BytesIO(image_bytes),
        public_id=user_id,
        overwrite=True,
        resource_type="image",
        folder="smartshetakari/profiles",
    )
    return result["secure_url"]


async def generate_and_upload_qr(batch_id: str) -> str:
    """Generate QR code, upload to Cloudinary, persist URL in DB. Returns URL."""
    loop = asyncio.get_event_loop()

    # Run blocking IO in a thread pool
    image_bytes = await loop.run_in_executor(None, _generate_qr_bytes, batch_id)
    public_id = f"qr_{batch_id}"
    qr_url = await loop.run_in_executor(
        None, _upload_to_cloudinary, image_bytes, public_id
    )

    # Persist in qr_collection
    await qr_collection.update_one(
        {"batch_id": batch_id},
        {
            "$set": {
                "qr_id": f"QR{batch_id}",
                "batch_id": batch_id,
                "qr_image_url": qr_url,
                "updated_at": datetime.utcnow(),
            },
            "$setOnInsert": {
                "scan_count": 0,
                "created_at": datetime.utcnow(),
            },
        },
        upsert=True,
    )
    return qr_url


async def upload_profile_image(user_id: str, image_bytes: bytes) -> str:
    """Upload a profile image to Cloudinary. Returns secure URL."""
    loop = asyncio.get_event_loop()
    url = await loop.run_in_executor(
        None, _upload_profile_to_cloudinary, image_bytes, user_id
    )
    return url
