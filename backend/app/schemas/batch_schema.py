from pydantic import BaseModel

class BatchCreate(BaseModel):
    farmerId: str
    fat: float
    snf: float
    temperature: float