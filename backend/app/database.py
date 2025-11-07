# app/database.py
from sqlalchemy import create_engine, Column, String, Integer, Float, JSON, DateTime, Boolean, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

# Environment-based DB configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./peerlens_new.db")

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# ---------- MODELS ---------- #

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=generate_uuid)
    enrollment_number = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    github_username = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    email = Column(String, nullable=True)
    college = Column(String, nullable=True)

    # GitHub stats
    public_repos = Column(Integer, default=0)
    followers = Column(Integer, default=0)
    following = Column(Integer, default=0)
    total_stars = Column(Integer, default=0)
    total_forks = Column(Integer, default=0)

    # Technical data - Provide default empty values
    tech_stack = Column(JSON, default=lambda: [])
    languages = Column(JSON, default=lambda: {})
    projects = Column(JSON, default=lambda: [])
    seeking = Column(JSON, default=lambda: [])

    # Analysis metadata
    github_analysis = Column(JSON, default=lambda: {})
    ai_analysis = Column(JSON, default=lambda: {})
    compatibility_scores = Column(JSON, default=lambda: {})

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)


class TeamRecommendation(Base):
    __tablename__ = "team_recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    main_student_id = Column(String, index=True)
    required_skills = Column(JSON, default=lambda: [])
    team_members = Column(JSON, default=lambda: [])
    reasoning = Column(Text, nullable=True)
    total_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------- ENGINE & SESSION ---------- #

# SQLite specific setting: check_same_thread must be False for async contexts
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Create tables
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependency for FastAPI routes — yields a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()