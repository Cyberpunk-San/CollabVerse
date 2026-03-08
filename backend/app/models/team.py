from sqlalchemy import Column, String, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    member_ids = Column(JSON)   
    mean_skill = Column(String)
    tech_stack = Column(JSON)

    # Relationships
    students = relationship("Student", back_populates="team")
