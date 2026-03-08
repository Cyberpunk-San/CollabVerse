from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey
from app.core.database import Base


class Repo(Base):
    __tablename__ = "repos"
    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id"), index=True)
    name = Column(String)
    url = Column(String)
    stars = Column(Integer)
    forks = Column(Integer)
    is_fork = Column(Boolean)
    languages = Column(JSON)   
