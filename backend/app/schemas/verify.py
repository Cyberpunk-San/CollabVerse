from pydantic import BaseModel
from typing import Optional

class VerificationRequest(BaseModel):
    student_id: str
    github_username: str

class VerificationResponse(BaseModel):
    success: bool
    message: str
    code: Optional[str] = None
    expires_in: Optional[int] = None

class VerificationCheckResponse(BaseModel):
    success: bool
    verified: bool
    message: str