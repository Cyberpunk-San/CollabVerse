from sqlalchemy import Column, String, Boolean, JSON, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base


class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    email_verified = Column(Boolean, default=False)
    github_username = Column(String, unique=True, index=True, nullable=False)
    github_verified = Column(Boolean, default=False)
    github_verify_token = Column(String, nullable=True)
    
    # Activity Stats for ML
    github_commits = Column(Integer, default=0)
    github_prs = Column(Integer, default=0)
    github_reviews = Column(Integer, default=0)
    teams_count = Column(Integer, default=0)
    projects_count = Column(Integer, default=0)
    courses_count = Column(Integer, default=0)
    tutorials_count = Column(Integer, default=0)
    
    skills = Column(JSON, nullable=True)
    current_team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="students")
