from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class RequestCreate(BaseModel):
    receiver_id: str  
    message: Optional[str] = None  

class RequestUpdate(BaseModel):
    status: str  # accepted or rejected

class RequestResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    sender_username: Optional[str] = None
    receiver_username: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)