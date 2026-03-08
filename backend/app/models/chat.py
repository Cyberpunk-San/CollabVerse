from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, index=True)
    sender_id = Column(String, ForeignKey("students.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("students.id"), nullable=False)
    content = Column(Text, nullable=True)  
    message_type = Column(String, default="text")
    file_url = Column(String, nullable=True)       
    file_name = Column(String, nullable=True)      
    file_size = Column(Integer, nullable=True)     
    file_mime_type = Column(String, nullable=True)  
    thumbnail_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_by_sender = Column(Boolean, default=False)
    deleted_by_receiver = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    sender = relationship("Student", foreign_keys=[sender_id])
    receiver = relationship("Student", foreign_keys=[receiver_id])

class ChatFile(Base):
    __tablename__ = "chat_files"
    id = Column(String, primary_key=True, index=True)
    message_id = Column(String, ForeignKey("chat_messages.id"), nullable=False)
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_mime_type = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    message = relationship("ChatMessage", foreign_keys=[message_id])