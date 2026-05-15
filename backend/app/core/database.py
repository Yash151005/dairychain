from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

# All 11 Collections
user_collection         = db["users"]
batch_collection        = db["batches"]
sensor_collection       = db["sensor_data"]
alert_collection        = db["alerts"]
chain_collection        = db["blockchain_ledger"]
payment_collection      = db["payments"]
transport_collection    = db["transport"]
qr_collection           = db["qr_codes"]
feedback_collection     = db["customer_feedback"]
token_collection        = db["tokens"]
expense_collection      = db["expenses"]
chat_collection         = db["chat_sessions"]
community_collection    = db["community_connections"]
