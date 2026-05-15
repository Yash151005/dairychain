from fastapi import APIRouter
from app.schemas.sensor_schema import SensorData
from app.services.sensor_service import process_sensor_data

router = APIRouter()

@router.post("/")
async def ingest_sensor_data(payload: SensorData):

    result = await process_sensor_data(payload.dict())

    return {
        "status": "success",
        "batch_id": result["batch_id"],
        "quality": result["quality"]
    }