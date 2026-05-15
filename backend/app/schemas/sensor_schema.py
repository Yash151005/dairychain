from pydantic import BaseModel

class SensorData(BaseModel):
    device_id: str
    farmerId: str
    fat: float
    snf: float
    temperature: float