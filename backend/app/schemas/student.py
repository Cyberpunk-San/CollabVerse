from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional

class StudentCreate(BaseModel):
    email: str
    github_username: str


class StudentResponse(BaseModel):
    id: str
    email: str
    github_username: str
    skills: Optional[Dict[str, int]] = None
    email_verified: bool
    github_verified: bool

    model_config = ConfigDict(from_attributes=True)