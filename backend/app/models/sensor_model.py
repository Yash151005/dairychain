from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SensorDataModel(BaseModel):
    batch_id:        str
    temperature:     float
    humidity:        float
    fat_content:     float
    snf_level:       float
    location:        str
    timestamp:       datetime = Field(default_factory=datetime.utcnow)
    alert_triggered: bool = False
    alert_reason:    Optional[str] = None