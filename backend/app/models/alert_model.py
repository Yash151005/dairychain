from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AlertModel(BaseModel):
    batch_id:     str
    alert_type:   str            # "temperature" / "adulteration" / "route_deviation"
    severity:     str            # "low" / "medium" / "high"
    message:      str
    notified_to:  List[str] = [] # list of user_ids
    sms_sent:     bool = False
    resolved:     bool = False
    created_at:   datetime = Field(default_factory=datetime.utcnow)
    resolved_at:  Optional[datetime] = None