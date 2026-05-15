from app.core.database import (
    batch_collection,
    sensor_collection,
    alert_collection,
    user_collection,
    payment_collection,
    token_collection,
    expense_collection,
    feedback_collection,
    transport_collection,
    chat_collection,
    community_collection,
)
from datetime import datetime, timedelta
from bson import ObjectId


# ─────────────────────────────────────────
# BATCH FUNCTIONS
# ─────────────────────────────────────────

async def insert_batch(data: dict) -> str:
    result = await batch_collection.insert_one(data)
    return str(result.inserted_id)


async def get_batch(batch_id: str) -> dict | None:
    # 1. Try human-readable batch_id field first (e.g. "MILK-530L")
    batch = await batch_collection.find_one({"batch_id": batch_id})
    # 2. Fall back to MongoDB ObjectId if it looks like one
    if not batch:
        try:
            batch = await batch_collection.find_one({"_id": ObjectId(batch_id)})
        except Exception:
            pass
    if batch:
        batch["_id"] = str(batch["_id"])
    return batch


async def update_batch(batch_id: str, update_data: dict):
    await batch_collection.update_one(
        {"_id": ObjectId(batch_id)},
        {"$set": update_data}
    )


# ─────────────────────────────────────────
# SENSOR FUNCTIONS
# ─────────────────────────────────────────

async def insert_sensor_data(data: dict) -> str:
    TEMP_THRESHOLD = 8.0  # °C

    if data.get("temperature", 0) > TEMP_THRESHOLD:
        data["alert_triggered"] = True
        data["alert_reason"] = (
            f"Temperature {data['temperature']}°C exceeds safe limit {TEMP_THRESHOLD}°C"
        )
        # flag batch as Red
        await batch_collection.update_one(
            {"batch_id": data["batch_id"]},
            {"$set": {"safety_index": "Red"}}
        )
        # create alert
        await alert_collection.insert_one({
            "batch_id":   data["batch_id"],
            "alert_type": "temperature",
            "severity":   "high",
            "message":    data["alert_reason"],
            "sms_sent":   False,
            "resolved":   False,
            "created_at": datetime.utcnow(),
        })

    result = await sensor_collection.insert_one(data)
    return str(result.inserted_id)


# ─────────────────────────────────────────
# DASHBOARD FUNCTION
# ─────────────────────────────────────────

async def get_dashboard_data() -> dict:
    total_batches = await batch_collection.count_documents({})
    pure_batches  = await batch_collection.count_documents({"quality_status": "Pure"})
    active_alerts = await alert_collection.count_documents({"resolved": False})
    total_farmers = await user_collection.count_documents({"role": "farmer"})

    # last 7 days batches
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    cursor = batch_collection.find(
        {"collection_time": {"$gte": seven_days_ago}},
        {"batch_id": 1, "quality_status": 1,
         "farmer_id": 1, "collection_time": 1, "safety_index": 1}
    ).sort("collection_time", -1).limit(10)

    recent_batches = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        recent_batches.append(doc)

    return {
        "total_batches":  total_batches,
        "pure_batches":   pure_batches,
        "purity_rate":    round(pure_batches / total_batches * 100, 1) if total_batches else 0,
        "active_alerts":  active_alerts,
        "total_farmers":  total_farmers,
        "recent_batches": recent_batches,
    }


# ─────────────────────────────────────────
# USER FUNCTIONS
# ─────────────────────────────────────────

async def insert_user(data: dict) -> str:
    result = await user_collection.insert_one(data)
    return str(result.inserted_id)


async def get_user(user_id: str) -> dict | None:
    user = await user_collection.find_one({"user_id": user_id})
    if user:
        user["_id"] = str(user["_id"])
    return user


# ─────────────────────────────────────────
# PAYMENT FUNCTIONS
# ─────────────────────────────────────────

async def insert_payment(data: dict) -> str:
    result = await payment_collection.insert_one(data)
    return str(result.inserted_id)


async def get_all_payments() -> list:
    cursor = payment_collection.find().sort("paid_at", -1)
    payments = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        payments.append(doc)
    return payments


async def get_payments_by_farmer(farmer_id: str) -> list:
    cursor = payment_collection.find({"farmer_id": farmer_id})
    payments = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        payments.append(doc)
    return payments


# ─────────────────────────────────────────
# TOKEN FUNCTIONS
# ─────────────────────────────────────────

async def add_tokens(farmer_id: str, tokens: int, reason: str, batch_id: str) -> str:
    result = await token_collection.insert_one({
        "farmer_id":     farmer_id,
        "tokens_earned": tokens,
        "reason":        reason,
        "batch_id":      batch_id,
        "redeemed":      False,
        "earned_at":     datetime.utcnow(),
    })
    # update user token balance
    await user_collection.update_one(
        {"user_id": farmer_id},
        {"$inc": {"token_balance": tokens}}
    )
    return str(result.inserted_id)


async def get_tokens_by_farmer(farmer_id: str) -> list:
    cursor = token_collection.find({"farmer_id": farmer_id})
    tokens = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        tokens.append(doc)
    return tokens


# ─────────────────────────────────────────
# EXPENSE FUNCTIONS
# ─────────────────────────────────────────

async def insert_expense(data: dict) -> str:
    result = await expense_collection.insert_one(data)
    return str(result.inserted_id)


async def get_expenses_by_farmer(farmer_id: str) -> list:
    cursor = expense_collection.find({"farmer_id": farmer_id})
    expenses = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        expenses.append(doc)
    return expenses


# ─────────────────────────────────────────
# FEEDBACK FUNCTIONS
# ─────────────────────────────────────────

async def insert_feedback(data: dict) -> str:
    result = await feedback_collection.insert_one(data)
    return str(result.inserted_id)


async def get_feedback_by_batch(batch_id: str) -> list:
    cursor = feedback_collection.find({"batch_id": batch_id})
    feedbacks = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        feedbacks.append(doc)
    return feedbacks


# ─────────────────────────────────────────
# ALERTS FUNCTIONS
# ─────────────────────────────────────────

async def get_all_alerts() -> list:
    cursor = alert_collection.find().sort("created_at", -1)
    alerts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        alerts.append(doc)
    return alerts


async def resolve_alert(batch_id: str) -> bool:
    result = await alert_collection.update_one(
        {"batch_id": batch_id},
        {"$set": {"resolved": True}}
    )
    return result.modified_count > 0


# ─────────────────────────────────────────
# TRANSPORT FUNCTIONS
# ─────────────────────────────────────────

async def insert_transport(data: dict) -> str:
    result = await transport_collection.insert_one(data)
    return str(result.inserted_id)


async def get_transport(transport_id: str) -> dict | None:
    doc = await transport_collection.find_one({"transport_id": transport_id})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


def _safe_object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except Exception:
        return None


def _serialize_chat_message(message: dict) -> dict:
    created_at = message.get("created_at") or datetime.utcnow()
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    return {
        "message_id": message.get("message_id") or str(ObjectId()),
        "role": (message.get("role") or "").strip().lower(),
        "text": (message.get("text") or "").strip(),
        "created_at": created_at,
    }


def _serialize_chat_session(doc: dict) -> dict:
    messages = [_serialize_chat_message(message) for message in doc.get("messages", [])]
    created_at = doc.get("created_at")
    updated_at = doc.get("updated_at")

    return {
        "id": str(doc.get("_id")),
        "farmer_id": doc.get("farmer_id", ""),
        "title": (doc.get("title") or "New Chat").strip(),
        "language": doc.get("language", "en"),
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
        "updated_at": updated_at.isoformat() if isinstance(updated_at, datetime) else updated_at,
        "message_count": len(messages),
        "last_message": messages[-1]["text"] if messages else "",
        "messages": messages,
    }


async def create_chat_session(
    farmer_id: str,
    language: str = "en",
    title: str = "New Chat",
    messages: list[dict] | None = None,
) -> dict:
    now = datetime.utcnow()
    normalized_messages = []

    for message in messages or []:
        normalized_messages.append(
            {
                "message_id": message.get("message_id") or str(ObjectId()),
                "role": (message.get("role") or "").strip().lower(),
                "text": (message.get("text") or "").strip(),
                "created_at": message.get("created_at") or now,
            }
        )

    doc = {
        "farmer_id": farmer_id or "",
        "language": language or "en",
        "title": (title or "New Chat").strip() or "New Chat",
        "messages": normalized_messages,
        "created_at": now,
        "updated_at": now,
    }

    result = await chat_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_chat_session(doc)


async def list_chat_sessions(farmer_id: str) -> list[dict]:
    cursor = chat_collection.find({"farmer_id": farmer_id or ""}).sort("updated_at", -1)
    chats = []

    async for doc in cursor:
        chats.append(_serialize_chat_session(doc))

    return chats


async def get_chat_session(chat_id: str, farmer_id: str | None = None) -> dict | None:
    object_id = _safe_object_id(chat_id)
    if object_id is None:
        return None

    query = {"_id": object_id}
    if farmer_id is not None:
        query["farmer_id"] = farmer_id

    doc = await chat_collection.find_one(query)
    if not doc:
        return None

    return _serialize_chat_session(doc)


async def append_chat_messages(
    chat_id: str,
    messages: list[dict],
    language: str = "",
    title: str = "",
) -> dict | None:
    object_id = _safe_object_id(chat_id)
    if object_id is None:
        return None

    doc = await chat_collection.find_one({"_id": object_id}, {"title": 1})
    if not doc:
        return None

    now = datetime.utcnow()
    normalized_messages = []

    for message in messages:
        normalized_messages.append(
            {
                "message_id": message.get("message_id") or str(ObjectId()),
                "role": (message.get("role") or "").strip().lower(),
                "text": (message.get("text") or "").strip(),
                "created_at": message.get("created_at") or now,
            }
        )

    update_fields = {"updated_at": now}

    if language:
        update_fields["language"] = language

    current_title = (doc.get("title") or "").strip().lower()
    if title and current_title in {"", "new chat"}:
        update_fields["title"] = title

    await chat_collection.update_one(
        {"_id": object_id},
        {
            "$push": {"messages": {"$each": normalized_messages}},
            "$set": update_fields,
        },
    )

    return await get_chat_session(chat_id)


def _pair_user_ids(user_a: str, user_b: str) -> list[str]:
    return sorted([(user_a or "").strip(), (user_b or "").strip()])


def _format_relative_time(value: datetime | None) -> str:
    if not isinstance(value, datetime):
        return ""

    delta = datetime.utcnow() - value
    total_seconds = max(int(delta.total_seconds()), 0)

    if total_seconds < 60:
        return "just now"
    if total_seconds < 3600:
        return f"{total_seconds // 60}m ago"
    if total_seconds < 86400:
        return f"{total_seconds // 3600}h ago"
    if total_seconds < 604800:
        return f"{total_seconds // 86400}d ago"

    return value.strftime("%d %b")


def _format_message_time(value: datetime | None) -> str:
    if not isinstance(value, datetime):
        return ""
    return value.strftime("%H:%M")


def _serialize_community_message(message: dict, current_user_id: str) -> dict:
    created_at = message.get("created_at") or datetime.utcnow()
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except ValueError:
            created_at = datetime.utcnow()

    sender_id = (message.get("sender_id") or "").strip()
    receiver_id = (message.get("receiver_id") or "").strip()
    text = (message.get("text") or "").strip()

    return {
        "id": message.get("message_id") or str(ObjectId()),
        "sender": "me" if sender_id == current_user_id else "them",
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "text": text,
        "time": _format_message_time(created_at),
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
    }


def _build_farmer_last_seen(status: str, farmer_doc: dict, relation: dict | None) -> str:
    relation_time = None
    if relation:
        relation_time = (
            relation.get("updated_at")
            or relation.get("connected_at")
            or relation.get("created_at")
        )

    farmer_time = farmer_doc.get("updated_at") or farmer_doc.get("created_at")

    if status == "incoming":
        age = _format_relative_time(relation_time)
        return f"Requested {age}" if age else "Requested recently"

    if status == "outgoing":
        age = _format_relative_time(relation_time)
        return f"Request sent {age}" if age else "Request sent"

    if status == "connected":
        messages = relation.get("messages", []) if relation else []
        if messages:
            last_message_time = messages[-1].get("created_at") or relation_time
            age = _format_relative_time(last_message_time)
            return f"Last message {age}" if age else "Connected"

        age = _format_relative_time(relation_time)
        return f"Connected {age}" if age else "Connected"

    age = _format_relative_time(farmer_time)
    return f"Active {age}" if age else "Available to connect"


async def get_community_state(user_id: str) -> dict:
    relations_by_farmer: dict[str, dict] = {}
    relation_cursor = community_collection.find({"users": user_id or ""})

    async for relation in relation_cursor:
        other_users = [item for item in relation.get("users", []) if item != user_id]
        if not other_users:
            continue
        relations_by_farmer[other_users[0]] = relation

    farmers = []
    messages_by_farmer: dict[str, list[dict]] = {}
    cursor = user_collection.find(
        {
            "role": "farmer",
            "user_id": {"$ne": user_id},
        }
    )

    async for doc in cursor:
        farmer_id = (doc.get("user_id") or "").strip()
        if not farmer_id:
            continue

        relation = relations_by_farmer.get(farmer_id)
        status = "discover"

        if relation:
            relation_status = (relation.get("status") or "").strip().lower()
            if relation_status == "connected":
                status = "connected"
            elif relation_status == "pending":
                if relation.get("requested_id") == user_id:
                    status = "incoming"
                elif relation.get("requester_id") == user_id:
                    status = "outgoing"

        messages = [
            _serialize_community_message(message, user_id)
            for message in relation.get("messages", [])
            if (message.get("text") or "").strip()
        ] if relation else []

        if messages:
            messages_by_farmer[farmer_id] = messages

        sort_time = doc.get("created_at") or datetime.utcnow()
        if relation:
            sort_time = relation.get("updated_at") or relation.get("created_at") or sort_time

        farmers.append(
            {
                "id": farmer_id,
                "name": (doc.get("name") or farmer_id).strip(),
                "profile_image": doc.get("profile_image") or "",
                "village": (
                    doc.get("village")
                    or doc.get("farm_location")
                    or doc.get("location")
                    or "Nearby village"
                ),
                "specialty": (
                    doc.get("specialty")
                    or doc.get("farm_name")
                    or "General dairy support"
                ),
                "status": status,
                "lastSeen": _build_farmer_last_seen(status, doc, relation),
                "messageCount": len(messages),
                "sortTs": sort_time.timestamp() if isinstance(sort_time, datetime) else 0,
            }
        )

    status_order = {
        "incoming": 0,
        "connected": 1,
        "outgoing": 2,
        "discover": 3,
    }
    farmers.sort(
        key=lambda item: (
            status_order.get(item.get("status", "discover"), 99),
            -item.get("sortTs", 0),
            item.get("name", "").lower(),
        )
    )

    serialized_farmers = [{k: v for k, v in item.items() if k != "sortTs"} for item in farmers]

    return {
        "farmers": serialized_farmers,
        "messages_by_farmer": messages_by_farmer,
    }


async def create_community_request(requester_id: str, requested_id: str) -> bool:
    pair = _pair_user_ids(requester_id, requested_id)
    now = datetime.utcnow()

    if len(pair) != 2 or not pair[0] or not pair[1] or pair[0] == pair[1]:
        return False

    existing = await community_collection.find_one({"users": pair})

    if existing:
        if (existing.get("status") or "").strip().lower() == "connected":
            return True

        await community_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "users": pair,
                    "requester_id": requester_id,
                    "requested_id": requested_id,
                    "status": "pending",
                    "responded_at": None,
                    "updated_at": now,
                }
            },
        )
        return True

    await community_collection.insert_one(
        {
            "users": pair,
            "requester_id": requester_id,
            "requested_id": requested_id,
            "status": "pending",
            "messages": [],
            "created_at": now,
            "updated_at": now,
            "responded_at": None,
            "connected_at": None,
        }
    )
    return True


async def respond_community_request(user_id: str, farmer_id: str, action: str) -> bool:
    pair = _pair_user_ids(user_id, farmer_id)
    now = datetime.utcnow()

    if action == "accept":
        result = await community_collection.update_one(
            {
                "users": pair,
                "status": "pending",
                "requested_id": user_id,
            },
            {
                "$set": {
                    "status": "connected",
                    "responded_at": now,
                    "connected_at": now,
                    "updated_at": now,
                }
            },
        )
        return result.modified_count > 0

    result = await community_collection.update_one(
        {
            "users": pair,
            "status": "pending",
            "requested_id": user_id,
        },
        {
            "$set": {
                "status": "declined",
                "responded_at": now,
                "updated_at": now,
            }
        },
    )
    return result.modified_count > 0


async def send_community_message(sender_id: str, receiver_id: str, text: str) -> bool:
    pair = _pair_user_ids(sender_id, receiver_id)
    now = datetime.utcnow()
    message = {
        "message_id": str(ObjectId()),
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "text": (text or "").strip(),
        "created_at": now,
    }

    result = await community_collection.update_one(
        {
            "users": pair,
            "status": "connected",
        },
        {
            "$push": {"messages": message},
            "$set": {"updated_at": now},
        },
    )

    return result.modified_count > 0
