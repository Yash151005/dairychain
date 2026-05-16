import argparse
import asyncio
import hashlib
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import (  # noqa: E402
    alert_collection,
    batch_collection,
    chain_collection,
    expense_collection,
    feedback_collection,
    payment_collection,
    qr_collection,
    sensor_collection,
    token_collection,
    transport_collection,
    user_collection,
)


def utc_now(offset_days: int = 0, offset_hours: int = 0) -> datetime:
    return datetime.utcnow() - timedelta(days=offset_days, hours=offset_hours)


def make_tx_hash(block_data: dict) -> str:
    payload_str = json.dumps(block_data, sort_keys=True)
    return hashlib.sha256(payload_str.encode()).hexdigest()


async def upsert_one(collection, key_query: dict, document: dict) -> None:
    await collection.replace_one(key_query, document, upsert=True)


async def seed_users() -> list[dict]:
    users = [
        {
            "user_id": "admin@smartshetakari.com",
            "name": "Admin User",
            "email": "admin@smartshetakari.com",
            "password": "admin123",
            "role": "admin",
            "phone": "9000000001",
            "location": "Pune",
            "village": "Pune",
            "created_at": utc_now(10),
            "token_balance": 0,
        },
        {
            "user_id": "yash.patil@smartshetakari.com",
            "name": "Yash Patil",
            "email": "yash.patil@smartshetakari.com",
            "password": "farmer123",
            "role": "farmer",
            "phone": "9000000002",
            "location": "Nashik",
            "village": "Nashik",
            "farm_name": "Patil Dairy Farm",
            "created_at": utc_now(9),
            "token_balance": 120,
        },
        {
            "user_id": "ravi.patil@smartshetakari.com",
            "name": "Ravi Patil",
            "email": "ravi.patil@smartshetakari.com",
            "password": "farmer123",
            "role": "farmer",
            "phone": "9000000003",
            "location": "Kolhapur",
            "village": "Kolhapur",
            "farm_name": "Green Valley Dairy",
            "created_at": utc_now(8),
            "token_balance": 95,
        },
        {
            "user_id": "sneha.jadhav@smartshetakari.com",
            "name": "Sneha Jadhav",
            "email": "sneha.jadhav@smartshetakari.com",
            "password": "farmer123",
            "role": "farmer",
            "phone": "9000000004",
            "location": "Satara",
            "village": "Satara",
            "farm_name": "Jadhav Milk Unit",
            "created_at": utc_now(7),
            "token_balance": 75,
        },
    ]

    for user in users:
        await upsert_one(user_collection, {"user_id": user["user_id"]}, user)

    return users


async def seed_batches(users: list[dict]) -> list[dict]:
    farmer_map = {u["user_id"]: u for u in users if u["role"] == "farmer"}
    
    # Create 25+ batches for realistic farmer dashboard data (past 7-14 days)
    batches = []
    batch_counter = 1001
    
    # Yash Patil - 8 batches (2 per day for 4 days)
    yash_batches = [
        ("morning", 0, 6, 540, 3.9, 8.4, 0.5, "Pure", "Green", 96.4),
        ("evening", 0, 18, 520, 3.8, 8.3, 0.6, "Pure", "Green", 95.2),
        ("morning", 1, 6, 550, 3.7, 8.2, 0.7, "Pure", "Green", 94.1),
        ("evening", 1, 18, 530, 3.8, 8.3, 0.5, "Pure", "Green", 96.0),
        ("morning", 2, 6, 560, 4.0, 8.5, 0.4, "Pure", "Green", 97.5),
        ("evening", 2, 18, 540, 3.9, 8.4, 0.5, "Pure", "Green", 96.2),
        ("morning", 3, 6, 590, 3.6, 8.1, 0.8, "Pure", "Green", 93.8),
        ("evening", 3, 18, 510, 3.9, 8.4, 0.5, "Pure", "Green", 96.1),
    ]
    for shift, day, hour, qty, fat, snf, water, status, safety, confidence in yash_batches:
        batch_id = f"BATCH-{batch_counter}"
        collection_time = utc_now(day, 24 - hour)
        batches.append({
            "batch_id": batch_id,
            "farmer_id": "yash.patil@smartshetakari.com",
            "farm_name": "Patil Dairy Farm",
            "quality_status": status,
            "safety_index": safety,
            "fat_percentage": fat,
            "snf_percentage": snf,
            "water_content": water,
            "quantity_litres": qty,
            "confidence_score": confidence,
            "collection_time": collection_time,
            "shift": shift,
        })
        batch_counter += 1
    
    # Ravi Patil - 7 batches
    ravi_batches = [
        (0, 6, 470, 3.4, 8.0, 1.2, "Suspicious", "Yellow", 82.1),
        (0, 18, 480, 3.5, 8.1, 1.0, "Pure", "Green", 91.3),
        (1, 6, 460, 3.6, 8.2, 0.8, "Pure", "Green", 93.5),
        (1, 18, 490, 3.5, 8.0, 1.1, "Pure", "Green", 90.8),
        (2, 6, 475, 3.7, 8.3, 0.7, "Pure", "Green", 94.2),
        (3, 6, 465, 3.6, 8.1, 0.9, "Pure", "Green", 92.1),
        (3, 18, 485, 3.5, 8.0, 1.0, "Pure", "Green", 91.5),
    ]
    for day, hour, qty, fat, snf, water, status, safety, confidence in ravi_batches:
        batch_id = f"BATCH-{batch_counter}"
        collection_time = utc_now(day, 24 - hour)
        batches.append({
            "batch_id": batch_id,
            "farmer_id": "ravi.patil@smartshetakari.com",
            "farm_name": "Green Valley Dairy",
            "quality_status": status,
            "safety_index": safety,
            "fat_percentage": fat,
            "snf_percentage": snf,
            "water_content": water,
            "quantity_litres": qty,
            "confidence_score": confidence,
            "collection_time": collection_time,
        })
        batch_counter += 1
    
    # Sneha Jadhav - 10 batches (excellent quality)
    sneha_batches = [
        (0, 6, 620, 4.1, 8.7, 0.3, "Pure", "Green", 98.2),
        (0, 18, 610, 4.2, 8.8, 0.2, "Pure", "Green", 99.1),
        (1, 6, 630, 4.0, 8.6, 0.4, "Pure", "Green", 97.8),
        (1, 18, 615, 4.1, 8.7, 0.3, "Pure", "Green", 98.5),
        (2, 6, 625, 4.3, 8.9, 0.2, "Pure", "Green", 99.3),
        (2, 18, 620, 4.1, 8.7, 0.3, "Pure", "Green", 98.4),
        (3, 6, 635, 4.2, 8.8, 0.2, "Pure", "Green", 99.0),
        (3, 18, 618, 4.0, 8.6, 0.4, "Pure", "Green", 97.6),
        (4, 6, 628, 4.1, 8.7, 0.3, "Pure", "Green", 98.3),
        (4, 18, 622, 4.0, 8.6, 0.4, "Pure", "Green", 97.9),
    ]
    for day, hour, qty, fat, snf, water, status, safety, confidence in sneha_batches:
        batch_id = f"BATCH-{batch_counter}"
        collection_time = utc_now(day, 24 - hour)
        batches.append({
            "batch_id": batch_id,
            "farmer_id": "sneha.jadhav@smartshetakari.com",
            "farm_name": "Jadhav Milk Unit",
            "quality_status": status,
            "safety_index": safety,
            "fat_percentage": fat,
            "snf_percentage": snf,
            "water_content": water,
            "quantity_litres": qty,
            "confidence_score": confidence,
            "collection_time": collection_time,
        })
        batch_counter += 1

    for batch in batches:
        block_data = {
            "batch_id": batch["batch_id"],
            "farmer_id": batch["farmer_id"],
            "farm_name": batch.get("farm_name", ""),
            "quality": batch.get("quality_status"),
            "fat": batch.get("fat_percentage"),
            "snf": batch.get("snf_percentage"),
            "water": batch.get("water_content"),
            "quantity": batch.get("quantity_litres"),
            "confidence": batch.get("confidence_score", 0.0),
            "timestamp": batch["collection_time"].isoformat(),
        }
        batch["blockchain_tx_hash"] = make_tx_hash(block_data)
        batch["farmer_name"] = farmer_map.get(batch["farmer_id"], {}).get("name")
        await upsert_one(batch_collection, {"batch_id": batch["batch_id"]}, batch)

        chain_record = {
            "tx_hash": batch["blockchain_tx_hash"],
            "block_data": block_data,
            "verified": True,
            "created_at": batch["collection_time"],
        }
        await upsert_one(chain_collection, {"tx_hash": batch["blockchain_tx_hash"]}, chain_record)

    return batches


async def seed_sensors(batches: list[dict]) -> None:
    sensor_rows = []
    
    # Add sensors for a sampling of batches (every 3rd batch)
    for i, batch in enumerate(batches):
        if i % 3 == 0:
            sensor_id = f"sensor-{batch['batch_id']}"
            # Realistic temperature based on batch date and time
            base_temp = 4.0 if "morning" in batch.get("shift", "morning") else 6.0
            temp_variance = (i % 5) * 0.2  # Small variation
            sensor_rows.append({
                "sensor_id": sensor_id,
                "batch_id": batch["batch_id"],
                "temperature": base_temp + temp_variance,
                "humidity": 55 + (i % 15),
                "timestamp": batch["collection_time"],
            })
    
    for row in sensor_rows:
        await upsert_one(sensor_collection, {"sensor_id": row["sensor_id"]}, row)


async def seed_payments(users: list[dict], batches: list[dict]) -> None:
    payments = []
    payment_counter = 1001
    
    # Create payments for batches (every 2-3 batches = one payment)
    payment_statuses = ["Paid", "Released", "Pending", "Processing"]
    
    for i, batch in enumerate(batches):
        if i % 2 == 0:  # Every 2 batches
            payment_id = f"PAY-{payment_counter}"
            payment_counter += 1
            
            # Calculate payment amount based on quantity and quality
            base_rate = 10  # ₹ per liter
            quality_multiplier = {
                "Pure": 1.0,
                "Suspicious": 0.8,
                "Adulterated": 0.5,
            }
            
            qty = batch.get("quantity_litres", 500)
            quality = batch.get("quality_status", "Pure")
            amount = int(qty * base_rate * quality_multiplier.get(quality, 1.0))
            
            # Status distribution
            status_idx = i % len(payment_statuses)
            status = payment_statuses[status_idx]
            
            # Payment date varies by batch date
            day_offset = int(batch["collection_time"].strftime("%d")) if hasattr(batch["collection_time"], "strftime") else 0
            paid_at = batch["collection_time"] + timedelta(days=1)
            
            payments.append({
                "payment_id": payment_id,
                "farmer_id": batch["farmer_id"],
                "batch_id": batch["batch_id"],
                "amount": amount,
                "status": status,
                "paid_at": paid_at,
                "created_at": batch["collection_time"],
            })
    
    for payment in payments:
        await upsert_one(payment_collection, {"payment_id": payment["payment_id"]}, payment)


async def seed_expenses() -> None:
    expenses = []
    expense_counter = 1001
    
    expense_data = {
        "yash.patil@smartshetakari.com": [
            ("Feed", 900, "Cattle feed and supplements", 0),
            ("Medicine", 500, "Veterinary antibiotic injection", 1),
            ("Feed", 1200, "Green fodder purchase", 2),
            ("Transport", 300, "Milk collection transport", 3),
            ("Equipment", 2500, "Milking machine maintenance", 4),
            ("Labor", 800, "Farm helper wages", 5),
            ("Electricity", 400, "Monthly electricity bill", 6),
        ],
        "ravi.patil@smartshetakari.com": [
            ("Transport", 1200, "Milk transport and storage", 1),
            ("Feed", 1100, "Concentrate feed", 2),
            ("Medicine", 750, "Veterinary checkup", 3),
            ("Equipment", 600, "Bucket and utensil repair", 4),
            ("Labor", 900, "Farm worker wages", 5),
        ],
        "sneha.jadhav@smartshetakari.com": [
            ("Medicine", 750, "Veterinary care and health check", 2),
            ("Feed", 1500, "Premium cattle feed", 3),
            ("Equipment", 1800, "Cold storage repair", 4),
            ("Labor", 1000, "Farm helper wages", 5),
            ("Transport", 400, "Milk transport", 6),
            ("Feed", 800, "Mineral and vitamin supplements", 7),
        ],
    }
    
    for farmer_id, items in expense_data.items():
        for category, amount, note, day_offset in items:
            expense_id = f"EXP-{expense_counter}"
            expense_counter += 1
            expenses.append({
                "expense_id": expense_id,
                "farmer_id": farmer_id,
                "amount": amount,
                "category": category,
                "note": note,
                "created_at": utc_now(day_offset, 10),
            })
    
    for expense in expenses:
        await upsert_one(expense_collection, {"expense_id": expense["expense_id"]}, expense)


async def seed_alerts() -> None:
    alerts = [
        {
            "alert_id": "ALERT-1001",
            "batch_id": "BATCH-1002",
            "farmer_id": "ravi.patil@smartshetakari.com",
            "alert_type": "quality",
            "severity": "high",
            "message": "Suspicious quality detected - water content above 1%",
            "sms_sent": False,
            "resolved": False,
            "created_at": utc_now(0, 2),
        },
        {
            "alert_id": "ALERT-1002",
            "batch_id": "BATCH-1002",
            "farmer_id": "ravi.patil@smartshetakari.com",
            "alert_type": "temperature",
            "severity": "medium",
            "message": "Temperature slightly above the ideal range (7.8°C)",
            "sms_sent": True,
            "resolved": True,
            "created_at": utc_now(1, 4),
        },
        {
            "alert_id": "ALERT-1003",
            "batch_id": None,
            "farmer_id": "yash.patil@smartshetakari.com",
            "alert_type": "payment",
            "severity": "medium",
            "message": "Payment pending for 2 batches - total ₹5,920",
            "sms_sent": True,
            "resolved": False,
            "created_at": utc_now(1, 8),
        },
        {
            "alert_id": "ALERT-1004",
            "batch_id": None,
            "farmer_id": "sneha.jadhav@smartshetakari.com",
            "alert_type": "equipment",
            "severity": "low",
            "message": "Scheduled maintenance for cold storage unit",
            "sms_sent": False,
            "resolved": False,
            "created_at": utc_now(2, 10),
        },
        {
            "alert_id": "ALERT-1005",
            "batch_id": None,
            "farmer_id": "ravi.patil@smartshetakari.com",
            "alert_type": "quality_trend",
            "severity": "medium",
            "message": "Quality improving - 3 consecutive pure batches detected",
            "sms_sent": True,
            "resolved": True,
            "created_at": utc_now(2, 12),
        },
    ]

    for alert in alerts:
        await upsert_one(alert_collection, {"alert_id": alert["alert_id"]}, alert)


async def seed_tokens(batches: list[dict]) -> None:
    tokens = []
    token_counter = 1001
    
    # Award tokens for high-quality batches (quality >= 95%)
    for batch in batches:
        confidence = batch.get("confidence_score", 0)
        quality = batch.get("quality_status", "Pure")
        
        if quality == "Pure" and confidence >= 95:
            tokens_earned = int(confidence / 5)  # ~20 tokens for 95% confidence
            token_id = f"TOK-{token_counter}"
            token_counter += 1
            
            tokens.append({
                "token_id": token_id,
                "farmer_id": batch["farmer_id"],
                "tokens_earned": tokens_earned,
                "reason": f"High quality batch bonus (confidence: {confidence}%)",
                "batch_id": batch["batch_id"],
                "redeemed": token_counter % 3 == 0,  # Some redeemed, some not
                "earned_at": batch["collection_time"],
            })
    
    for token in tokens:
        await upsert_one(token_collection, {"token_id": token["token_id"]}, token)


async def seed_feedback() -> None:
    feedback_rows = []
    feedback_counter = 1001
    
    feedback_data = [
        ("BATCH-1001", "admin@smartshetakari.com", 5, "Excellent quality and fast delivery."),
        ("BATCH-1002", "yash.patil@smartshetakari.com", 4, "Good monitoring, keep the temperature lower."),
        ("BATCH-1003", "admin@smartshetakari.com", 5, "Outstanding consistency and purity."),
        ("BATCH-1004", "yash.patil@smartshetakari.com", 3, "Need to improve quality control."),
        ("BATCH-1006", "ravi.patil@smartshetakari.com", 4, "Good service, timely collection."),
        ("BATCH-1010", "sneha.jadhav@smartshetakari.com", 5, "Perfect milk quality every time."),
    ]
    
    for batch_id, user_id, rating, comment in feedback_data:
        feedback_id = f"FB-{feedback_counter}"
        feedback_counter += 1
        feedback_rows.append({
            "feedback_id": feedback_id,
            "batch_id": batch_id,
            "user_id": user_id,
            "rating": rating,
            "comment": comment,
            "submitted_at": utc_now(feedback_counter % 5, 8),
        })

    for feedback in feedback_rows:
        await upsert_one(feedback_collection, {"feedback_id": feedback["feedback_id"]}, feedback)


async def seed_transport() -> None:
    transport_rows = []
    transport_counter = 1001
    
    vehicle_data = [
        ("MH12AB1234", "Suresh Patil", "yash.patil@smartshetakari.com"),
        ("MH14CD5678", "Ramesh Jadhav", "sneha.jadhav@smartshetakari.com"),
        ("MH15EF9012", "Vikram Sharma", "ravi.patil@smartshetakari.com"),
    ]
    
    statuses = ["In Transit", "Delivered", "Picked Up", "At Depot"]
    locations = ["Pune Depot", "Nashik Collection", "Mumbai Processing Plant", "Kolhapur Station"]
    
    for idx, (vehicle, driver, farmer_id) in enumerate(vehicle_data):
        transport_id = f"TR-{transport_counter}"
        transport_counter += 1
        
        status = statuses[idx % len(statuses)]
        location = locations[idx % len(locations)]
        
        transport_rows.append({
            "transport_id": transport_id,
            "vehicle_number": vehicle,
            "farmer_id": farmer_id,
            "driver_name": driver,
            "status": status,
            "current_location": location,
            "last_updated": utc_now(idx, idx + 6),
        })
    
    for transport in transport_rows:
        await upsert_one(transport_collection, {"transport_id": transport["transport_id"]}, transport)


async def seed_qr_codes(batches: list[dict]) -> None:
    for i, batch in enumerate(batches):
        qr_record = {
            "qr_id": f"QR-{batch['batch_id']}",
            "batch_id": batch["batch_id"],
            "qr_image_url": f"/qr/{batch['batch_id']}.png",
            "scan_count": (i % 8) + 1,  # 1-8 scans per QR code
            "last_scanned": utc_now(i % 4, (i * 3) % 24),
            "created_at": batch["collection_time"],
        }
        await upsert_one(qr_collection, {"qr_id": qr_record["qr_id"]}, qr_record)


async def seed_dummy_data() -> None:
    users = await seed_users()
    batches = await seed_batches(users)
    await seed_sensors(batches)
    await seed_payments(users, batches)
    await seed_expenses()
    await seed_alerts()
    await seed_tokens(batches)
    await seed_feedback()
    await seed_transport()
    await seed_qr_codes(batches)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed SmartShetakari with dummy data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear the demo collections before inserting sample records.",
    )
    args = parser.parse_args()

    if args.reset:
        for collection in [
            user_collection,
            batch_collection,
            sensor_collection,
            alert_collection,
            chain_collection,
            payment_collection,
            transport_collection,
            qr_collection,
            feedback_collection,
            token_collection,
            expense_collection,
        ]:
            await collection.delete_many({})

    await seed_dummy_data()
    print("Dummy data seeded successfully.")


if __name__ == "__main__":
    asyncio.run(main())
