import asyncio
from app.services.db_service import insert_batch

async def test():
    data = {
        "farmerId": "test123",
        "fat": 3.5,
        "snf": 8.0,
        "temperature": 4.0,
        "quality": "Pure"
    }

    result = await insert_batch(data)
    print("Inserted ID:", result)

asyncio.run(test())