from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Student(Base):
    __tablename__ = "students"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    enrollment_number = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    github_username = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String)
    bio = Column(Text)
    email = Column(String)
    college = Column(String)
    
    # GitHub stats
    public_repos = Column(Integer, default=0)
    followers = Column(Integer, default=0)
    following = Column(Integer, default=0)
    total_stars = Column(Integer, default=0)
    total_forks = Column(Integer, default=0)
    
    # Technical data
    tech_stack = Column(JSON)  # List of {name, level, confidence}
    languages = Column(JSON)   # {language: percentage}
    projects = Column(JSON)    # List of project names
    seeking = Column(JSON)     # List of goals
    
    # Analysis metadata
    github_analysis = Column(JSON)  # Raw GitHub analysis
    ai_analysis = Column(JSON)      # Ollama analysis
    compatibility_scores = Column(JSON)  # {skill: score}
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class TeamRecommendation(Base):
    __tablename__ = "team_recommendations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    main_student_id = Column(String, index=True)
    required_skills = Column(JSON)  # List of skills
    team_members = Column(JSON)     # List of student IDs with scores
    reasoning = Column(Text)
    total_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())