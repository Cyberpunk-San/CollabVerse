from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database import get_db
from app.models import Student, TeamRecommendation
from app.schemas import TeamRequest, TeamResponse, TeamMember
from app.services.team_matcher import TeamMatcher

router = APIRouter()
team_matcher = TeamMatcher()

@router.post("/ai/team-suggestions", response_model=TeamResponse)
async def get_team_suggestions(
    request: TeamRequest,
    db: Session = Depends(get_db)
):
    """Get AI-powered team suggestions for specific skills"""
    try:
        # Get main student
        main_student = db.query(Student).filter(
            Student.id == request.main_student_id,
            Student.is_active == True
        ).first()
        
        if not main_student:
            raise HTTPException(status_code=404, detail="Main student not found")
        
        # Get all other active students
        other_students = db.query(Student).filter(
            Student.id != request.main_student_id,
            Student.is_active == True
        ).all()
        
        if len(other_students) < request.team_size - 1:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough students available. Need {request.team_size - 1}, have {len(other_students)}"
            )
        
        # Convert to dictionaries for processing
        main_student_dict = {
            'id': main_student.id,
            'name': main_student.name,
            'github_username': main_student.github_username,
            'avatar_url': main_student.avatar_url,
            'bio': main_student.bio,
            'public_repos': main_student.public_repos,
            'followers': main_student.followers,
            'total_stars': main_student.total_stars,
            'tech_stack': main_student.tech_stack or [],
            'languages': main_student.languages or {},
            'projects': main_student.projects or [],
            'seeking': main_student.seeking or [],
            'ai_analysis': main_student.ai_analysis or {}
        }
        
        other_students_dict = [{
            'id': student.id,
            'name': student.name,
            'github_username': student.github_username,
            'avatar_url': student.avatar_url,
            'bio': student.bio,
            'public_repos': student.public_repos,
            'followers': student.followers,
            'total_stars': student.total_stars,
            'tech_stack': student.tech_stack or [],
            'languages': student.languages or {},
            'projects': student.projects or [],
            'seeking': student.seeking or [],
            'ai_analysis': student.ai_analysis or {}
        } for student in other_students]
        
        # Find optimal team
        team_result = await team_matcher.find_optimal_team(
            main_student_dict,
            other_students_dict,
            request.required_skills,
            request.team_size
        )
        
        # Save team recommendation to database
        team_recommendation = TeamRecommendation(
            main_student_id=request.main_student_id,
            required_skills=request.required_skills,
            team_members=[member['student']['id'] for member in team_result['members']],
            reasoning=team_result['reasoning'],
            total_score=team_result['total_score']
        )
        db.add(team_recommendation)
        db.commit()
        
        # Convert student IDs back to full student objects for response
        team_members_response = []
        for member in team_result['members']:
            if member['student']['id'] == main_student.id:
                student_obj = main_student
            else:
                student_obj = next(
                    (s for s in other_students if s.id == member['student']['id']),
                    None
                )
            
            if student_obj:
                team_members_response.append(TeamMember(
                    student=student_obj,
                    compatibility_score=member['compatibility_score'],
                    role=member['role'],
                    strengths=member['strengths']
                ))
        
        return TeamResponse(
            members=team_members_response,
            reasoning=team_result['reasoning'],
            required_skills=request.required_skills,
            total_score=team_result['total_score']
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/skills/analyze-gaps")
async def analyze_skill_gaps(
    student_id: str,
    required_skills: List[str],
    db: Session = Depends(get_db)
):
    """Analyze skill gaps for a student against required skills"""
    try:
        student = db.query(Student).filter(
            Student.id == student_id,
            Student.is_active == True
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_dict = {
            'id': student.id,
            'name': student.name,
            'tech_stack': student.tech_stack or []
        }
        
        gap_analysis = await team_matcher.analyze_skill_gaps(student_dict, required_skills)
        
        return gap_analysis
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/teams/recommendations")
async def get_team_recommendations(
    student_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get previous team recommendations"""
    query = db.query(TeamRecommendation)
    
    if student_id:
        query = query.filter(TeamRecommendation.main_student_id == student_id)
    
    recommendations = query.order_by(TeamRecommendation.created_at.desc()).offset(skip).limit(limit).all()
    
    return recommendations

@router.get("/skills/popular")
async def get_popular_skills():
    """Get list of popular skills for suggestions"""
    return {
        "skills": [
            # Programming Languages
            "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby",
            "Swift", "Kotlin", "Dart", "Scala", "R", "MATLAB",
            
            # Frontend Technologies
            "React", "Vue.js", "Angular", "Svelte", "Next.js", "Nuxt.js", "Gatsby",
            "HTML5", "CSS3", "SASS", "LESS", "Tailwind CSS", "Bootstrap",
            
            # Backend Technologies
            "Node.js", "Express.js", "Django", "Flask", "FastAPI", "Spring Boot",
            "Ruby on Rails", "Laravel", "ASP.NET", "GraphQL", "REST API",
            
            # Mobile Development
            "React Native", "Flutter", "iOS Development", "Android Development",
            
            # Databases
            "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "Oracle", "SQL Server",
            
            # DevOps & Cloud
            "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Digital Ocean",
            "CI/CD", "Git", "Linux", "Bash", "Terraform", "Ansible",
            
            # AI/ML
            "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn",
            "Natural Language Processing", "Computer Vision", "Data Science",
            
            # Other Technologies
            "Blockchain", "Web3", "Unity", "Unreal Engine", "Arduino", "Raspberry Pi"
        ]
    }

@router.get("/teams/optimal-roles")
async def get_optimal_roles(required_skills: List[str] = Query(...)):
    """Get optimal team roles based on required skills"""
    role_mappings = {
        "Frontend Developer": ["React", "Vue.js", "Angular", "JavaScript", "TypeScript", "HTML5", "CSS3"],
        "Backend Developer": ["Node.js", "Python", "Java", "C++", "Django", "Flask", "Spring Boot", "Database"],
        "Full Stack Developer": ["React", "Node.js", "Python", "JavaScript", "TypeScript", "Database"],
        "Mobile Developer": ["React Native", "Flutter", "iOS", "Android", "Swift", "Kotlin"],
        "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "Linux"],
        "Data Scientist": ["Python", "Machine Learning", "Data Science", "TensorFlow", "PyTorch"],
        "UI/UX Designer": ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research"],
        "Product Manager": ["Product Strategy", "User Stories", "Agile", "Scrum"],
        "QA Engineer": ["Testing", "Automation", "Selenium", "Jest", "Cypress"]
    }
    
    suggested_roles = []
    for role, skills in role_mappings.items():
        matching_skills = [skill for skill in required_skills if any(s in skill for s in skills)]
        if matching_skills:
            suggested_roles.append({
                "role": role,
                "matching_skills": matching_skills,
                "match_score": len(matching_skills) / len(skills) * 100
            })
    
    # Sort by match score
    suggested_roles.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "required_skills": required_skills,
        "suggested_roles": suggested_roles[:4]  # Top 4 roles
    }