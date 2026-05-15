from app.services.ai_service import analyze_milk
from app.services.batch_service import create_batch


async def process_sensor_data(data):
    print("🔥 sensor_service running")

    # Step 1: AI
    quality = await analyze_milk(data)

    print("👉 calling batch_service")

    # Step 2: Batch Service (IMPORTANT)
    result = await create_batch({
        **data,
        "quality": quality
    })

    return result
