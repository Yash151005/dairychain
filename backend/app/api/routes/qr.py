from fastapi import APIRouter, HTTPException
from app.services.db_service import get_batch
from app.services.blockchain_service import get_batch_from_chain, store_batch_on_chain
from app.core.database import qr_collection, batch_collection, user_collection
from datetime import datetime

router = APIRouter()

# ─────────────────────────────────────────
# DEMO FARMERS  (upserted alongside batches)
# ─────────────────────────────────────────

DEMO_FARMERS = [
    {
        "user_id":      "farmer-ravi-patil",
        "name":         "Ravi Patil",
        "email":        "ravi.patil@demo.com",
        "role":         "farmer",
        "village":      "Kolhapur",
        "farm_location": "Kolhapur, Maharashtra",
        "specialty":    "Organic feed and cattle health",
        "phone":        "9876543210",
        "created_at":   datetime.utcnow(),
    },
    {
        "user_id":      "farmer-sneha-jadhav",
        "name":         "Sneha Jadhav",
        "email":        "sneha.jadhav@demo.com",
        "role":         "farmer",
        "village":      "Satara",
        "farm_location": "Satara, Maharashtra",
        "specialty":    "Milk quality improvement",
        "phone":        "9876543211",
        "created_at":   datetime.utcnow(),
    },
    {
        "user_id":      "farmer-arjun-shinde",
        "name":         "Arjun Shinde",
        "email":        "arjun.shinde@demo.com",
        "role":         "farmer",
        "village":      "Sangli",
        "farm_location": "Sangli, Maharashtra",
        "specialty":    "Fodder planning and water saving",
        "phone":        "9876543212",
        "created_at":   datetime.utcnow(),
    },
    {
        "user_id":      "farmer-meena-more",
        "name":         "Meena More",
        "email":        "meena.more@demo.com",
        "role":         "farmer",
        "village":      "Pune Rural",
        "farm_location": "Pune Rural, Maharashtra",
        "specialty":    "Dairy bookkeeping and cattle nutrition",
        "phone":        "9876543213",
        "created_at":   datetime.utcnow(),
    },
    {
        "user_id":      "farmer-vikram-desai",
        "name":         "Vikram Desai",
        "email":        "vikram.desai@demo.com",
        "role":         "farmer",
        "village":      "Nashik",
        "farm_location": "Nashik, Maharashtra",
        "specialty":    "Crop rotation and irrigation",
        "phone":        "9876543214",
        "created_at":   datetime.utcnow(),
    },
]

# ─────────────────────────────────────────
# DEMO BATCHES  — one per farmer
# ─────────────────────────────────────────

DEMO_BATCHES = [
    {
        "batch_id":     "MILK-530L",
        "farmer_id":    "farmer-ravi-patil",
        "farmer_name":  "Ravi Patil",
        "farmerId":     "farmer-ravi-patil",
        "fat":          4.2,
        "snf":          8.6,
        "temperature":  6.5,
        "quality":      "Pure",
        "safety_index": "Green",
        "status":       "pending",
        "timestamp":    datetime.utcnow(),
        "blockchain_tx": None,
    },
    {
        "batch_id":     "MILK-DEMO1",
        "farmer_id":    "farmer-sneha-jadhav",
        "farmer_name":  "Sneha Jadhav",
        "farmerId":     "farmer-sneha-jadhav",
        "fat":          3.8,
        "snf":          8.1,
        "temperature":  7.2,
        "quality":      "Suspicious",
        "safety_index": "Yellow",
        "status":       "pending",
        "timestamp":    datetime.utcnow(),
        "blockchain_tx": None,
    },
    {
        "batch_id":     "MILK-ARJ01",
        "farmer_id":    "farmer-arjun-shinde",
        "farmer_name":  "Arjun Shinde",
        "farmerId":     "farmer-arjun-shinde",
        "fat":          4.5,
        "snf":          8.9,
        "temperature":  5.8,
        "quality":      "Pure",
        "safety_index": "Green",
        "status":       "verified",
        "timestamp":    datetime.utcnow(),
        "blockchain_tx": None,
    },
    {
        "batch_id":     "MILK-MEE02",
        "farmer_id":    "farmer-meena-more",
        "farmer_name":  "Meena More",
        "farmerId":     "farmer-meena-more",
        "fat":          3.2,
        "snf":          7.8,
        "temperature":  8.1,
        "quality":      "Adulterated",
        "safety_index": "Red",
        "status":       "flagged",
        "timestamp":    datetime.utcnow(),
        "blockchain_tx": None,
    },
    {
        "batch_id":     "MILK-VIK03",
        "farmer_id":    "farmer-vikram-desai",
        "farmer_name":  "Vikram Desai",
        "farmerId":     "farmer-vikram-desai",
        "fat":          4.0,
        "snf":          8.4,
        "temperature":  6.9,
        "quality":      "Pure",
        "safety_index": "Green",
        "status":       "pending",
        "timestamp":    datetime.utcnow(),
        "blockchain_tx": None,
    },
]


# ─────────────────────────────────────────
# SCAN  — look up by batch_id string or ObjectId
# ─────────────────────────────────────────

@router.get("/{batch_id}")
async def scan(batch_id: str):
    if batch_id in ("generate", "seed-demo", "recent"):
        raise HTTPException(status_code=404, detail="Not found")

    batch = await get_batch(batch_id)
    chain = await get_batch_from_chain(batch_id)

    if not batch and not chain:
        raise HTTPException(
            status_code=404,
            detail=f"No batch or chain record found for '{batch_id}'"
        )

    # Enrich with farmer name + profile image if not already present
    if batch:
        fid = batch.get("farmer_id") or batch.get("farmerId")
        if fid:
            farmer_doc = await user_collection.find_one(
                {"user_id": fid}, {"name": 1, "profile_image": 1}
            )
            if farmer_doc:
                if not batch.get("farmer_name") and farmer_doc.get("name"):
                    batch["farmer_name"] = farmer_doc["name"]
                if farmer_doc.get("profile_image"):
                    batch["farmer_profile_image"] = farmer_doc["profile_image"]

    # Attach stored QR image URL if available
    qr_doc = await qr_collection.find_one({"batch_id": batch_id}, {"qr_image_url": 1})
    qr_image_url = None
    if qr_doc and qr_doc.get("qr_image_url"):
        qr_image_url = qr_doc["qr_image_url"]
    else:
        qr_image_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={batch_id}&color=1b5e20"

    await qr_collection.update_one(
        {"batch_id": batch_id},
        {"$inc": {"scan_count": 1}, "$set": {"last_scanned": datetime.utcnow()}},
        upsert=True,
    )

    return {"status": "success", "batch": batch, "chain": chain, "qr_image_url": qr_image_url}


# ─────────────────────────────────────────
# GENERATE QR record — real image uploaded to Cloudinary
# ─────────────────────────────────────────

@router.post("/generate")
async def generate(data: dict):
    batch_id = data.get("batch_id")
    if not batch_id:
        raise HTTPException(status_code=400, detail="batch_id is required")

    try:
        from app.services.qr_service import generate_and_upload_qr
        qr_url = await generate_and_upload_qr(batch_id)
    except Exception as exc:
        # Fallback: return a public QR API URL so the app still works
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={batch_id}&color=1b5e20"

    return {"status": "success", "qr": qr_url, "batch_id": batch_id}


# ─────────────────────────────────────────
# SEED DEMO  — upsert demo farmers + 5 batches
# ─────────────────────────────────────────

@router.post("/seed-demo")
async def seed_demo():
    # 1. Upsert demo farmers into users collection
    for farmer in DEMO_FARMERS:
        await user_collection.update_one(
            {"user_id": farmer["user_id"]},
            {"$setOnInsert": farmer},
            upsert=True,
        )

    # 2. Upsert demo batches + blockchain records
    seeded = []
    for demo in DEMO_BATCHES:
        bid = demo["batch_id"]
        existing = await batch_collection.find_one({"batch_id": bid})
        if not existing:
            await batch_collection.insert_one(dict(demo))

            try:
                tx = await store_batch_on_chain({
                    "batch_id":       bid,
                    "farmer_id":      demo["farmer_id"],
                    "quality_status": demo["quality"],
                    "fat_percentage": demo["fat"],
                    "snf_percentage": demo["snf"],
                })
                if tx.get("tx_hash"):
                    await batch_collection.update_one(
                        {"batch_id": bid},
                        {"$set": {"blockchain_tx": tx["tx_hash"]}},
                    )
            except Exception:
                pass

            seeded.append(bid)

    return {"status": "ok", "seeded": seeded, "farmers": [f["user_id"] for f in DEMO_FARMERS]}


# ─────────────────────────────────────────
# RECENT BATCHES — up to 10 most recent, with farmer name
# ─────────────────────────────────────────

@router.get("/recent/list")
async def recent_batches():
    cursor = batch_collection.find(
        {"batch_id": {"$exists": True}},
        {"batch_id": 1, "quality": 1, "farmer_id": 1, "farmerId": 1, "farmer_name": 1, "timestamp": 1},
    ).sort("timestamp", -1).limit(10)

    results = []
    async for doc in cursor:
        farmer_id = doc.get("farmer_id") or doc.get("farmerId") or "—"
        farmer_name = doc.get("farmer_name")

        # Fetch name from users if not denormalised on the batch
        if not farmer_name and farmer_id != "—":
            farmer_doc = await user_collection.find_one(
                {"user_id": farmer_id}, {"name": 1}
            )
            farmer_name = farmer_doc.get("name") if farmer_doc else None

        results.append({
            "batch_id":    doc.get("batch_id"),
            "quality":     doc.get("quality", "—"),
            "farmer_id":   farmer_id,
            "farmer_name": farmer_name or farmer_id,
        })

    return {"status": "ok", "batches": results}
