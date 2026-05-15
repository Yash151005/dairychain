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
    batches = [
        {
            "batch_id": "BATCH-1001",
            "farmer_id": "yash.patil@smartshetakari.com",
            "farm_name": "Patil Dairy Farm",
            "quality_status": "Pure",
            "safety_index": "Green",
            "fat_percentage": 3.9,
            "snf_percentage": 8.4,
            "water_content": 0.5,
            "quantity_litres": 540,
            "confidence_score": 96.4,
            "collection_time": utc_now(0, 6),
        },
        {
            "batch_id": "BATCH-1002",
            "farmer_id": "ravi.patil@smartshetakari.com",
            "farm_name": "Green Valley Dairy",
            "quality_status": "Suspicious",
            "safety_index": "Yellow",
            "fat_percentage": 3.4,
            "snf_percentage": 8.0,
            "water_content": 1.2,
            "quantity_litres": 470,
            "confidence_score": 82.1,
            "collection_time": utc_now(1, 3),
        },
        {
            "batch_id": "BATCH-1003",
            "farmer_id": "sneha.jadhav@smartshetakari.com",
            "farm_name": "Jadhav Milk Unit",
            "quality_status": "Pure",
            "safety_index": "Green",
            "fat_percentage": 4.1,
            "snf_percentage": 8.7,
            "water_content": 0.3,
            "quantity_litres": 620,
            "confidence_score": 98.2,
            "collection_time": utc_now(2, 4),
        },
        {
            "batch_id": "BATCH-1004",
            "farmer_id": "yash.patil@smartshetakari.com",
            "farm_name": "Patil Dairy Farm",
            "quality_status": "Adulterated",
            "safety_index": "Red",
            "fat_percentage": 2.9,
            "snf_percentage": 7.4,
            "water_content": 2.8,
            "quantity_litres": 390,
            "confidence_score": 61.7,
            "collection_time": utc_now(3, 2),
        },
    ]

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
    sensor_rows = [
        {
            "sensor_id": "sensor-001",
            "batch_id": "BATCH-1001",
            "temperature": 4.2,
            "humidity": 61,
            "timestamp": utc_now(0, 1),
        },
        {
            "sensor_id": "sensor-002",
            "batch_id": "BATCH-1002",
            "temperature": 7.8,
            "humidity": 66,
            "timestamp": utc_now(1, 1),
        },
        {
            "sensor_id": "sensor-003",
            "batch_id": "BATCH-1003",
            "temperature": 5.1,
            "humidity": 58,
            "timestamp": utc_now(0),
        },
    ]

    for row in sensor_rows:
        await upsert_one(sensor_collection, {"sensor_id": row["sensor_id"]}, row)


async def seed_payments(users: list[dict], batches: list[dict]) -> None:
    payments = [
        {
            "payment_id": "PAY-1001",
            "farmer_id": "yash.patil@smartshetakari.com",
            "batch_id": "BATCH-1001",
            "amount": 5400,
            "status": "Paid",
            "paid_at": utc_now(0, 4),
        },
        {
            "payment_id": "PAY-1002",
            "farmer_id": "ravi.patil@smartshetakari.com",
            "batch_id": "BATCH-1002",
            "amount": 4700,
            "status": "Released",
            "paid_at": utc_now(1, 5),
        },
        {
            "payment_id": "PAY-1003",
            "farmer_id": "sneha.jadhav@smartshetakari.com",
            "batch_id": "BATCH-1003",
            "amount": 6200,
            "status": "Pending",
            "paid_at": utc_now(2),
        },
    ]

    for payment in payments:
        await upsert_one(payment_collection, {"payment_id": payment["payment_id"]}, payment)


async def seed_expenses() -> None:
    expenses = [
        {
            "expense_id": "EXP-1001",
            "farmer_id": "yash.patil@smartshetakari.com",
            "amount": 900,
            "category": "Feed",
            "note": "Cattle feed and supplements",
            "created_at": utc_now(0, 8),
        },
        {
            "expense_id": "EXP-1002",
            "farmer_id": "ravi.patil@smartshetakari.com",
            "amount": 1200,
            "category": "Transport",
            "note": "Milk transport and storage",
            "created_at": utc_now(1, 7),
        },
        {
            "expense_id": "EXP-1003",
            "farmer_id": "sneha.jadhav@smartshetakari.com",
            "amount": 750,
            "category": "Medicine",
            "note": "Veterinary care and health check",
            "created_at": utc_now(2, 9),
        },
    ]

    for expense in expenses:
        await upsert_one(expense_collection, {"expense_id": expense["expense_id"]}, expense)


async def seed_alerts() -> None:
    alerts = [
        {
            "alert_id": "ALERT-1001",
            "batch_id": "BATCH-1004",
            "alert_type": "quality",
            "severity": "high",
            "message": "Adulteration detected in batch BATCH-1004",
            "sms_sent": False,
            "resolved": False,
            "created_at": utc_now(0, 2),
        },
        {
            "alert_id": "ALERT-1002",
            "batch_id": "BATCH-1002",
            "alert_type": "temperature",
            "severity": "medium",
            "message": "Temperature slightly above the ideal range",
            "sms_sent": True,
            "resolved": True,
            "created_at": utc_now(1, 4),
        },
    ]

    for alert in alerts:
        await upsert_one(alert_collection, {"alert_id": alert["alert_id"]}, alert)


async def seed_tokens(batches: list[dict]) -> None:
    tokens = [
        {
            "token_id": "TOK-1001",
            "farmer_id": "yash.patil@smartshetakari.com",
            "tokens_earned": 35,
            "reason": "Pure milk batch bonus",
            "batch_id": "BATCH-1001",
            "redeemed": False,
            "earned_at": utc_now(0, 3),
        },
        {
            "token_id": "TOK-1002",
            "farmer_id": "sneha.jadhav@smartshetakari.com",
            "tokens_earned": 28,
            "reason": "Consistent quality score",
            "batch_id": "BATCH-1003",
            "redeemed": True,
            "earned_at": utc_now(2, 5),
        },
    ]

    for token in tokens:
        await upsert_one(token_collection, {"token_id": token["token_id"]}, token)


async def seed_feedback() -> None:
    feedback_rows = [
        {
            "feedback_id": "FB-1001",
            "batch_id": "BATCH-1001",
            "user_id": "admin@smartshetakari.com",
            "rating": 5,
            "comment": "Excellent quality and fast delivery.",
            "submitted_at": utc_now(0, 5),
        },
        {
            "feedback_id": "FB-1002",
            "batch_id": "BATCH-1002",
            "user_id": "yash.patil@smartshetakari.com",
            "rating": 4,
            "comment": "Good monitoring, keep the temperature lower.",
            "submitted_at": utc_now(1, 8),
        },
    ]

    for feedback in feedback_rows:
        await upsert_one(feedback_collection, {"feedback_id": feedback["feedback_id"]}, feedback)


async def seed_transport() -> None:
    transport_rows = [
        {
            "transport_id": "TR-1001",
            "vehicle_number": "MH12AB1234",
            "batch_id": "BATCH-1001",
            "driver_name": "Suresh Patil",
            "status": "In Transit",
            "current_location": "Pune Depot",
            "last_updated": utc_now(0, 1),
        },
        {
            "transport_id": "TR-1002",
            "vehicle_number": "MH14CD5678",
            "batch_id": "BATCH-1003",
            "driver_name": "Ramesh Jadhav",
            "status": "Delivered",
            "current_location": "Mumbai Processing Plant",
            "last_updated": utc_now(1, 2),
        },
    ]

    for transport in transport_rows:
        await upsert_one(transport_collection, {"transport_id": transport["transport_id"]}, transport)


async def seed_qr_codes(batches: list[dict]) -> None:
    for batch in batches:
        qr_record = {
            "qr_id": f"QR-{batch['batch_id']}",
            "batch_id": batch["batch_id"],
            "qr_image_url": f"/qr/{batch['batch_id']}.png",
            "scan_count": 4 if batch["batch_id"] == "BATCH-1001" else 1,
            "last_scanned": utc_now(0, 1),
            "created_at": utc_now(0, 6),
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
