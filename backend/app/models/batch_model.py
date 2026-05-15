from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BatchModel(BaseModel):
    batch_id:           str
    farmer_id:          str
    farm_name:          str
    fat_percentage:     float
    snf_percentage:     float
    water_content:      float
    quantity_litres:    float
    quality_status:     str            # "Pure" / "Adulterated" / "Suspicious"
    confidence_score:   float          # 0.0 - 1.0 from AI
    safety_index:       str = "Green"  # "Green" / "Yellow" / "Red"
    collection_time:    datetime = Field(default_factory=datetime.utcnow)
    blockchain_tx_hash: Optional[str] = None
    payment_status:     str = "Pending"
    payment_amount:     float = 0.0