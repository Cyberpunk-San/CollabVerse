from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.student import Student
from app.services.github_ingest import GitHubIngest
from app.services.feature_builder import build_features
from app.services.skill_estimator import estimate_skills
from app.services.repo_ranker import RepoRank

from app.api.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])

def _get_student_profile(student, db: Session):
    github_service = GitHubIngest()
    profile = github_service.github_profile(student.github_username)
    if not profile:
        raise HTTPException(404, f"GitHub profile for '{student.github_username}' not found or cannot be accessed")
    
    repos = github_service.get_normalized_repos(student.github_username)
    features = build_features(repos) if repos else {}
    skills = estimate_skills(features) if features else {}
    ranker = RepoRank()
    top_repos = ranker.get_top_ranked_repos(repos, 5) if repos else []
    
    total_stars = sum(repo.get("stars", 0) for repo in repos) if repos else 0
    total_forks = sum(repo.get("forks", 0) for repo in repos) if repos else 0
    
    return {
        "student_id": student.id,
        "exists_in_database": True,
        "github_profile": profile,
        "repository_analysis": {
            "total_repositories": len(repos) if repos else 0,
            "total_stars": total_stars,
            "total_forks": total_forks,
            "top_languages": list(features.keys())[:10] if features else []
        },
        "estimated_skills": skills,
        "top_repositories": top_repos,
        "database_record": {
            "id": student.id,
            "email": student.email,
            "github_username": student.github_username,
            "email_verified": student.email_verified,
            "github_verified": student.github_verified,
            "stored_skills": student.skills,
            "created": True
        },
        "skill_comparison": {
            "database_skills": student.skills,
            "freshly_estimated_skills": skills,
            "skills_match": student.skills == skills if student.skills else False
        }
    }

@router.get("/me")
def get_my_profile(student_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    return _get_student_profile(student, db)

@router.get("/{student_id}")
def get_user_profile(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, f"Student with ID '{student_id}' not found")
    return _get_student_profile(student, db)

@router.get("/by-github/{github_username}")
def get_user_profile_by_github(github_username: str, db: Session = Depends(get_db)):
    """
    Alternative endpoint to get profile by GitHub username
    Useful when you don't know the student ID
    """
    # Find student by GitHub username
    student = db.query(Student).filter(Student.github_username == github_username).first()
    
    if not student:
        # If not in database, still try to fetch GitHub data
        github_service = GitHubIngest()
        profile = github_service.github_profile(github_username)
        
        if not profile:
            raise HTTPException(404, f"GitHub user '{github_username}' not found")
        
        repos = github_service.get_normalized_repos(github_username)
        features = build_features(repos) if repos else {}
        skills = estimate_skills(features) if features else {}
        
        ranker = RepoRank()
        top_repos = ranker.get_top_ranked_repos(repos, 5) if repos else []
        
        total_stars = sum(repo.get("stars", 0) for repo in repos) if repos else 0
        total_forks = sum(repo.get("forks", 0) for repo in repos) if repos else 0
        
        return {
            "github_username": github_username,
            "exists_in_database": False,
            "message": "User found on GitHub but not registered in database",
            "github_profile": profile,
            "estimated_skills": skills,
            "top_repositories": top_repos,
            "repository_stats": {
                "total_repos": len(repos) if repos else 0,
                "total_stars": total_stars,
                "total_forks": total_forks
            }
        }
    return {
        "message": f"Student found in database. Use /profile/{student.id} for full details",
        "student_id": student.id,
        "email": student.email,
        "github_username": student.github_username
    }
@router.delete("/{student_id}")
def delete_student_by_id(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, f"Student with ID '{student_id}' not found")
    deleted_info = {
        "id": student.id,
        "email": student.email,
        "github_username": student.github_username,
        "skills": student.skills,
        "email_verified": student.email_verified,
        "github_verified": student.github_verified
    }
    db.delete(student)
    db.commit()
    return {
        "message": "Student deleted successfully",
        "deleted_student": deleted_info
    }