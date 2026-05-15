from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserModel(BaseModel):
    user_id:       str
    name:          str
    role:          str            # "farmer" / "supervisor" / "admin"
    phone:         str
    farm_name:     Optional[str] = None
    farm_location: Optional[str] = None
    token_balance: float = 0.0
    trust_score:   float = 100.0
    created_at:    datetime = Field(default_factory=datetime.utcnow)