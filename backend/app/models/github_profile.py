from sqlalchemy import Column, String, Integer, JSON, ForeignKey
from app.core.database import Base

class GitHubProfile(Base):
    __tablename__ = "github_profiles"
    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id"), index=True)
    username = Column(String, index=True)
    raw_profile = Column(JSON)    
    fetched_at = Column(String)
