from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentResponse
from app.services.github_ingest import GitHubIngest
from app.services.repo_ranker import RepoRank
from app.services.feature_builder import build_features
from app.services.skill_estimator import estimate_skills
router = APIRouter(prefix="/students", tags=["students"])

@router.post("/", response_model=StudentResponse)
def create_student(
    student_data: StudentCreate,
    db: Session = Depends(get_db)
):
    email = student_data.email
    github_username = student_data.github_username
    # Check if email already exists
    existing_email = db.query(Student).filter(Student.email == email).first()
    if existing_email:
        raise HTTPException(400, "Student with this email already exists")
    
    # Check if github username already exists
    existing_github = db.query(Student).filter(Student.github_username == github_username).first()
    if existing_github:
        raise HTTPException(400, "Student with this GitHub username already exists")

    # Fetch data from GitHub and calculate skills
    github_service = GitHubIngest()
    
    # Get user's repositories
    repos = github_service.get_normalized_repos(github_username)
    if not repos:
        raise HTTPException(404, f"No repositories found for GitHub user: {github_username}")
    
    # Build features from repositories
    features = build_features(repos)
    
    # Estimate skills from features
    skills = estimate_skills(features)
    
    # Create student record
    student = Student(
        id=str(uuid.uuid4()),
        email=email,
        github_username=github_username,
        skills=skills,
        github_verified=False,
        email_verified=False
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return student


@router.get("/", response_model=list[StudentResponse])
def list_students(db: Session = Depends(get_db)):
    return db.query(Student).all()


@router.get("/skill/{tech}")
def get_students_by_skill(
    tech: str,
    min_level: int = 1,
    db: Session = Depends(get_db)
):
    from sqlalchemy import cast, Integer
    tech = tech.lower()
    
    # Query database directly using JSON fields and cast to Integer
    students = db.query(Student).filter(
        Student.skills[tech].astext.cast(Integer) >= min_level
    ).all()
    
    return students


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    return student

@router.get("/profile/{github_username}")
def get_github_profile(github_username: str):
    github_service = GitHubIngest()
    profile = github_service.github_profile(github_username)
    
    if not profile:
        raise HTTPException(404, f"GitHub user '{github_username}' not found")
    
    return profile