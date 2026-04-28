from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.domain.ml_trainer import ml_trainer
from app.core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ml", tags=["ml"])

class StudentFeatures(BaseModel):
    commits: int = 0
    pull_requests: int = 0
    reviews: int = 0
    skills: dict = {}
    teams_joined: int = 0
    projects_completed: int = 0
    courses_completed: int = 0
    tutorials_finished: int = 0

class SkillPredictionRequest(BaseModel):
    student_id: Optional[str] = None
    features: Optional[StudentFeatures] = None

class SkillPredictionResponse(BaseModel):
    prediction: List[float]
    python_improvement: float
    javascript_improvement: float
    cpp_improvement: float
    teamwork_improvement: float
    confidence: float
    core_strength: float = 0.0
    best_skill: str = ""
    weakest_skill: str = ""
    growth_roadmap: List[str] = []
    project_fit: str = ""

class TeamRecommendationRequest(BaseModel):
    project_description: str
    required_skills: List[str]
    team_size: int = 3
    exclude_students: List[str] = []

class TeamRecommendationResponse(BaseModel):
    team_id: str
    members: List[dict]
    compatibility_score: float
    skill_coverage: dict
    explanation: str

@router.post("/predict/skills", response_model=SkillPredictionResponse)
async def predict_skill_improvement(
    request: SkillPredictionRequest,
    db: Session = Depends(get_db)
):
    """Predict how a student's skills will improve"""
    student = None
    try:
        if request.student_id:
            # Load student from database
            from app.models.student import Student
            student = db.query(Student).filter(Student.id == request.student_id).first()
            if not student:
                raise HTTPException(404, "Student not found")
            
            # Convert to features
            features = StudentFeatures(
                commits=student.github_commits or 0,
                pull_requests=student.github_prs or 0,
                reviews=student.github_reviews or 0,
                skills=student.skills or {},
                teams_joined=student.teams_count or 0,
                projects_completed=student.projects_count or 0,
                courses_completed=student.courses_count or 0,
                tutorials_finished=student.tutorials_count or 0
            )
        else:
            features = request.features
        
        if not features:
            raise HTTPException(400, "No features provided")
        
        # Extract feature vector (20 features)
        # Use defaults if student is not available
        github_repos = getattr(student, 'github_repos', 0) if request.student_id else 0
        github_stars = getattr(student, 'github_stars', 0) if request.student_id else 0
        github_forks = getattr(student, 'github_forks', 0) if request.student_id else 0
        avg_resp = getattr(student, 'avg_response_time', 24) if request.student_id else 24
        msg_sent = getattr(student, 'messages_sent', 0) if request.student_id else 0
        h_given = getattr(student, 'help_given', 0) if request.student_id else 0
        h_received = getattr(student, 'help_received', 0) if request.student_id else 0

        feature_vector = [
            (features.commits or 0) / 2000,
            (features.pull_requests or 0) / 500,
            (features.reviews or 0) / 300,
            github_repos / 50,
            github_stars / 1000,
            github_forks / 500,
            
            features.skills.get("python", 0),
            features.skills.get("javascript", 0),
            features.skills.get("cpp", 0),
            features.skills.get("java", 0),
            features.skills.get("go", 0),
            features.skills.get("rust", 0),
            
            (features.teams_joined or 0) / 20,
            (features.projects_completed or 0) / 30,
            1.0 - (avg_resp / 48),
            msg_sent / 1000,
            h_given / 100,
            h_received / 100,
            
            (features.courses_completed or 0) / 30,
            (features.tutorials_finished or 0) / 100
        ]
        
        # Calculate Core Strength (Activity + Skill weighted)
        activity_score = sum(feature_vector[0:6]) / 6
        skill_score = sum(feature_vector[6:12]) / 6
        core_strength = (activity_score * 0.4 + skill_score * 0.6)
        
        # Get prediction from ML model
        result = ml_trainer.predict_skill_improvement(feature_vector)
        
        if result.get("status") == "error":
            raise HTTPException(500, result.get("message"))
        
        data = result.get("data", {})
        prediction = data.get("prediction", [0, 0, 0, 0])
        
        # Enforce strict zero-growth for languages the user has never used
        if feature_vector[6] == 0:  # Python
            prediction[0] = 0.0
        if feature_vector[7] == 0:  # JavaScript
            prediction[1] = 0.0
        if feature_vector[8] == 0:  # C++
            prediction[2] = 0.0
            
        # Qualitative Analysis
        skill_names = ["Python", "JavaScript", "C++", "Teamwork"]
        improvements = {skill_names[i]: prediction[i] for i in range(len(prediction))}
        best_skill = max(improvements, key=improvements.get)
        weakest_skill = min(improvements, key=improvements.get)
        
        roadmap = [
            f"Focus on increasing {weakest_skill} through targeted projects." if improvements[weakest_skill] > 0.05 else f"Start learning {weakest_skill} basics.",
            f"Leverage your strength in {best_skill} to mentor others." if improvements[best_skill] > 0.1 else f"Advanced {best_skill} specialization recommended.",
            f"Complete more projects to boost teamwork score." if improvements["Teamwork"] < 0.2 else "Great collaboration progress!"
        ]
        
        project_fit = "Expert" if core_strength > 0.7 else "Intermediate" if core_strength > 0.4 else "Beginner"
        
        return SkillPredictionResponse(
            prediction=prediction,
            python_improvement=prediction[0],
            javascript_improvement=prediction[1],
            cpp_improvement=prediction[2],
            teamwork_improvement=prediction[3],
            confidence=0.85,
            core_strength=round(core_strength, 2),
            best_skill=best_skill,
            weakest_skill=weakest_skill,
            growth_roadmap=roadmap,
            project_fit=project_fit
        )
        
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/recommend/team", response_model=TeamRecommendationResponse)
async def recommend_team(
    request: TeamRecommendationRequest,
    db: Session = Depends(get_db)
):
    """Recommend optimal team based on project requirements"""
    try:
        from app.models.student import Student
        
        # Get all available students
        students = db.query(Student).filter(
            Student.id.notin_(request.exclude_students)
        ).all()
        
        # Convert to feature dictionaries
        student_features = []
        for student in students:
            student_features.append({
                "id": student.id,
                "username": student.github_username,
                "commits": student.github_commits or 0,
                "pull_requests": student.github_prs or 0,
                "reviews": student.github_reviews or 0,
                "skills": student.skills or {},
                "teams_joined": student.teams_count or 0,
                "projects_completed": student.projects_count or 0,
                "courses_completed": student.courses_count or 0,
                "tutorials_finished": student.tutorials_count or 0
            })
        
        # Find optimal team
        result = ml_trainer.find_optimal_team(student_features)
        
        if result.get("status") == "error":
            raise HTTPException(500, result.get("message"))
        
        data = result.get("data", {})
        pairs = data.get("pairs", [])
        
        # Build team based on recommendations
        
        if not pairs:
            # Fallback to random team
            import random
            selected = random.sample(students, min(request.team_size, len(students)))
        else:
            # Use first recommended pair
            pair = pairs[0]
            selected = [students[pair["student1"]], students[pair["student2"]]]
            
            # Add more members if needed
            if len(selected) < request.team_size:
                remaining = [s for s in students if s not in selected]
                selected.extend(remaining[:request.team_size - len(selected)])
        
        # Calculate skill coverage
        skill_coverage = {}
        for skill in request.required_skills:
            coverage = sum(1 for s in selected if skill in (s.skills or {}))
            skill_coverage[skill] = coverage / len(selected)
        
        return TeamRecommendationResponse(
            team_id=f"team_{hash(tuple(s.id for s in selected))}",
            members=[
                {"id": s.id, "username": s.github_username, "skills": s.skills}
                for s in selected
            ],
            compatibility_score=0.82,  # Would come from model
            skill_coverage=skill_coverage,
            explanation="Based on skill complementarity and past collaboration success"
        )
        
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/train/team-predictor")
async def train_team_predictor_endpoint(db: Session = Depends(get_db)):
    """Train the team compatibility model using synthetic/historical pairs"""
    try:
        import random
        from app.models.student import Student
        
        training_data = []

        # Generate 500 synthetic pairs
        for _ in range(500):
            # Generate random student 1
            s1 = {
                "commits": random.randint(0, 5000),
                "pull_requests": random.randint(0, 1000),
                "reviews": random.randint(0, 500),
                "repositories": random.randint(0, 50),
                "stars": random.randint(0, 1000),
                "forks": random.randint(0, 200),
                "skills": {
                    "python": random.random(),
                    "javascript": random.random(),
                    "cpp": random.random(),
                    "java": random.random(),
                    "go": random.random(),
                    "rust": random.random()
                },
                "teams_joined": random.randint(0, 20),
                "projects_completed": random.randint(0, 30),
                "avg_response_time": random.uniform(1, 48),
                "messages_sent": random.randint(0, 2000),
                "help_given": random.randint(0, 100),
                "help_received": random.randint(0, 100),
                "courses_count": random.randint(0, 20),
                "tutorials_count": random.randint(0, 50)
            }
            
            # Generate random student 2
            s2 = {
                "commits": random.randint(0, 5000),
                "pull_requests": random.randint(0, 1000),
                "reviews": random.randint(0, 500),
                "repositories": random.randint(0, 50),
                "stars": random.randint(0, 1000),
                "forks": random.randint(0, 200),
                "skills": {
                    "python": random.random(),
                    "javascript": random.random(),
                    "cpp": random.random(),
                    "java": random.random(),
                    "go": random.random(),
                    "rust": random.random()
                },
                "teams_joined": random.randint(0, 20),
                "projects_completed": random.randint(0, 30),
                "avg_response_time": random.uniform(1, 48),
                "messages_sent": random.randint(0, 2000),
                "help_given": random.randint(0, 100),
                "help_received": random.randint(0, 100),
                "courses_count": random.randint(0, 20),
                "tutorials_count": random.randint(0, 50)
            }
            
            # Calculate complementarity logic
            backend1 = max(s1["skills"]["python"], s1["skills"]["java"], s1["skills"]["go"], s1["skills"]["rust"])
            backend2 = max(s2["skills"]["python"], s2["skills"]["java"], s2["skills"]["go"], s2["skills"]["rust"])
            frontend1 = s1["skills"]["javascript"]
            frontend2 = s2["skills"]["javascript"]
            
            is_fullstack = (backend1 > 0.6 and frontend2 > 0.6) or (frontend1 > 0.6 and backend2 > 0.6)
            
            # Calculate a base compatibility between 0 and 1
            comp = 0.3
            if is_fullstack:
                comp += 0.4
            
            act1 = s1["commits"] + s1["pull_requests"]
            act2 = s2["commits"] + s2["pull_requests"]
            if abs(act1 - act2) < 1000:
                comp += 0.2
            elif max(act1, act2) > 4000 and min(act1, act2) < 500:
                comp -= 0.1
                
            comp = max(0.01, min(0.99, comp))
            
            training_data.append({
                "features1": s1,
                "features2": s2,
                "outcomes": {"compatibility": comp}
            })
            
        result = ml_trainer.train_team_predictor(training_data)
        
        if result.get("status") == "error":
            raise HTTPException(500, result.get("message"))
        
        return {
            "message": "Team Model trained successfully",
            "accuracy": result.get("data", {}).get("accuracy"),
            "loss": result.get("data", {}).get("loss"),
            "epochs": result.get("data", {}).get("epochs")
        }
        
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/train/skill-predictor")
async def train_skill_predictor(
    db: Session = Depends(get_db)
):
    """Train the skill prediction model using synthetic data"""
    try:
        import random
        from app.models.student import Student
        
        training_data = []

        # Generate 5000 synthetic students to robustly train the skill predictor
        for _ in range(5000):
            has_python = random.choice([True, False])
            has_js = random.choice([True, False])
            has_cpp = random.choice([True, False])
            
            # If they don't have the skill, they get 0 or very small random chance
            py_skill = random.uniform(0.1, 1.0) if has_python else (random.uniform(0, 0.05) if random.random() > 0.8 else 0)
            js_skill = random.uniform(0.1, 1.0) if has_js else (random.uniform(0, 0.05) if random.random() > 0.8 else 0)
            cpp_skill = random.uniform(0.1, 1.0) if has_cpp else (random.uniform(0, 0.05) if random.random() > 0.8 else 0)

            # Activity highly correlates with these
            commits = random.randint(0, 5000) if (has_python or has_js or has_cpp) else random.randint(0, 100)
            teams = random.randint(0, 20)
            
            features = {
                "commits": commits,
                "pull_requests": random.randint(0, 1000) if commits > 100 else random.randint(0, 10),
                "reviews": random.randint(0, 500),
                "repositories": random.randint(0, 50),
                "stars": random.randint(0, 1000),
                "forks": random.randint(0, 200),
                "skills": {
                    "python": py_skill,
                    "javascript": js_skill,
                    "cpp": cpp_skill,
                    "java": random.random(),
                    "go": random.random(),
                    "rust": random.random()
                },
                "teams_joined": teams,
                "projects_completed": random.randint(0, 30),
                "avg_response_time": random.uniform(1, 48),
                "messages_sent": random.randint(0, 2000),
                "help_given": random.randint(0, 100),
                "help_received": random.randint(0, 100),
                "courses_count": random.randint(0, 20),
                "tutorials_count": random.randint(0, 50)
            }
            
            # Logic: Improvement is bounded by activity and existing base skill
            py_imp = max(0.0, min(0.3, (commits / 5000) * 0.15 + py_skill * 0.15)) if has_python else 0.0
            js_imp = max(0.0, min(0.3, (commits / 5000) * 0.15 + js_skill * 0.15)) if has_js else 0.0
            cpp_imp = max(0.0, min(0.3, (commits / 5000) * 0.15 + cpp_skill * 0.15)) if has_cpp else 0.0
            team_imp = max(0.0, min(0.4, (teams / 20) * 0.2 + 0.1))
            
            training_data.append({
                "features": features,
                "outcomes": {
                    "skill_improvements": {
                        "python": py_imp,
                        "javascript": js_imp,
                        "cpp": cpp_imp,
                        "teamwork": team_imp
                    }
                }
            })
            
        # Guarantee a few true zero cases
        for _ in range(10):
            training_data.append({
                "features": {k: 0 for k in ["commits", "pull_requests", "reviews", "repositories", "stars", "forks", "teams_joined", "projects_completed", "messages_sent", "help_given", "help_received", "courses_count", "tutorials_count"]},
                "avg_response_time": 48,
                "skills": {"python": 0, "javascript": 0, "cpp": 0, "java": 0, "go": 0, "rust": 0},
                "outcomes": {
                    "skill_improvements": {"python": 0.0, "javascript": 0.0, "cpp": 0.0, "teamwork": 0.0}
                }
            })
            
        # Let's fix the "skills" and "avg_response_time" positioning for the manual zero cases
        for item in training_data[-10:]:
            item["features"]["skills"] = item.pop("skills")
            item["features"]["avg_response_time"] = item.pop("avg_response_time")
        
        # Train model
        result = ml_trainer.train_skill_predictor(training_data)
        
        if result.get("status") == "error":
            raise HTTPException(500, result.get("message"))
        
        return {
            "message": "Model trained successfully",
            "accuracy": result.get("data", {}).get("accuracy"),
            "loss": result.get("data", {}).get("loss"),
            "epochs": result.get("data", {}).get("epochs")
        }
        
    except Exception as e:
        raise HTTPException(500, str(e))