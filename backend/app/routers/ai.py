# app/routers/ai.py
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Student
from app.services.ollama_service import OllamaService
from app.services.team_matcher import TeamMatcher

router = APIRouter()
ollama_service = OllamaService()
team_matcher = TeamMatcher()


@router.post("/analyze-student")
async def analyze_student(student_id: str, db: Session = Depends(get_db)):
    """
    Run AI analysis (Ollama) on a student's GitHub profile and update database.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        student_data = {
            "name": student.name,
            "github_username": student.github_username,
            "bio": student.bio,
            "languages": student.languages or {},
            "tech_stack": student.tech_stack or [],
            "projects": student.projects or [],
            "followers": student.followers or 0,
            "public_repos": student.public_repos or 0,
            "total_stars": student.total_stars or 0,
            "total_forks": student.total_forks or 0,
            "seeking": student.seeking or [],
        }

        analysis = await ollama_service.analyze_student_profile(student_data)
        student.ai_analysis = analysis
        db.commit()
        db.refresh(student)

        return {
            "message": f"AI analysis completed for {student.github_username}",
            "ai_analysis": analysis,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


@router.post("/team-suggestions")
async def get_ai_team_suggestions(
    main_student_id: str,
    required_skills: List[str] = Query(...),
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered team recommendation using Ollama + TeamMatcher.
    """
    main_student = db.query(Student).filter(Student.id == main_student_id).first()
    if not main_student:
        raise HTTPException(status_code=404, detail="Main student not found")

    other_students = db.query(Student).filter(
        Student.id != main_student_id, Student.is_active == True
    ).all()

    if not other_students:
        raise HTTPException(status_code=400, detail="No other students available for team formation")

    # Convert ORM objects to plain dicts
    main_student_dict = {
        "id": main_student.id,
        "name": main_student.name,
        "github_username": main_student.github_username,
        "tech_stack": main_student.tech_stack or [],
        "languages": main_student.languages or {},
        "projects": main_student.projects or [],
        "followers": main_student.followers or 0,
        "public_repos": main_student.public_repos or 0,
        "total_stars": main_student.total_stars or 0,
        "total_forks": main_student.total_forks or 0,
        "ai_analysis": main_student.ai_analysis or {},
        "seeking": main_student.seeking or [],
    }

    other_students_dict = [
        {
            "id": s.id,
            "name": s.name,
            "github_username": s.github_username,
            "tech_stack": s.tech_stack or [],
            "languages": s.languages or {},
            "projects": s.projects or [],
            "followers": s.followers or 0,
            "public_repos": s.public_repos or 0,
            "total_stars": s.total_stars or 0,
            "total_forks": s.total_forks or 0,
            "ai_analysis": s.ai_analysis or {},
            "seeking": s.seeking or [],
        }
        for s in other_students
    ]

    try:
        team = await team_matcher.find_optimal_team(
            main_student_dict, other_students_dict, required_skills
        )
        return {
            "message": "AI-powered team generated successfully",
            "team": team,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI team: {str(e)}")


@router.get("/skills/recommendations")
async def get_skill_recommendations():
    """
    Get popular or AI-recommended skills for students to learn.
    """
    return {
        "recommended_skills": [
            "React",
            "Python",
            "FastAPI",
            "Docker",
            "Machine Learning",
            "TypeScript",
            "Node.js",
            "PostgreSQL",
            "TensorFlow",
            "AWS",
        ]
    }
