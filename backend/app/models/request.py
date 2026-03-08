from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Request(Base):
    __tablename__ = "requests"
    
    id = Column(String, primary_key=True, index=True)
    sender_id = Column(String, ForeignKey("students.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("students.id"), nullable=False)
    message = Column(Text, nullable=True)
    #status: pending,accepted,rejected,cancelled
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    sender = relationship("Student", foreign_keys=[sender_id])
    receiver = relationship("Student", foreign_keys=[receiver_id])