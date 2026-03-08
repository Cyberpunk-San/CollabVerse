from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    LINK = "link"

class ChatMessageBase(BaseModel):
    receiver_id: str
    content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: Optional[str] = None
    message_type: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    sender_username: Optional[str] = None
    receiver_username: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class FileUploadResponse(BaseModel):
    file_id: str
    file_url: str
    file_name: str
    file_size: int
    file_mime_type: str
    thumbnail_url: Optional[str] = None