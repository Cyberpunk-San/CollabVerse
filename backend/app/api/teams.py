from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.student import Student
from app.models.team import Team
from app.services.team_service import build_optimized_teams, commit_optimized_teams, validate_team_logic
from app.api.auth import get_current_user
from app.models.request import Request
from app.services.request_service import RequestService
from pydantic import BaseModel
import uuid

class TeamManualForm(BaseModel):
    student_ids: List[str]
    project_id: str = None

class ProjectCreate(BaseModel):
    name: str
    tech_stack: List[str] = []
    max_team_size: int = 3

class PersonalTeamRequest(BaseModel):
    project_id: str
    team_size: int = 3  # total including self

router = APIRouter(prefix="/teams", tags=["teams"])

@router.post("/build/optimize")
def build_optimized_teams_api(
    team_size: int = 3,
    db: Session = Depends(get_db)
):
    students = db.query(Student).all()
    projects = db.query(Team).all()
    
    # Auto-seed some projects if empty to allow testing
    if not projects:
        default_projects = [
            {"id": "p1", "name": "AI Collaboration platform", "tech_stack": ["Python", "React", "FastAPI"]},
            {"id": "p2", "name": "Open Source Repo Analyzer", "tech_stack": ["TypeScript", "Next.js", "Node.js"]},
            {"id": "p3", "name": "Blockchain Identity System", "tech_stack": ["Rust", "Go", "Solidity"]},
            {"id": "p4", "name": "Cloud Native Monitoring", "tech_stack": ["Go", "Kubernetes", "Prometheus"]}
        ]
        for p_data in default_projects:
            p = Team(id=p_data["id"], name=p_data["name"], tech_stack=p_data["tech_stack"], member_ids=[])
            db.add(p)
        db.commit()
        projects = db.query(Team).all()

    if not students:
        raise HTTPException(status_code=400, detail="Insufficient students to form teams")
        
    assignments = build_optimized_teams(db, students, projects, team_size)
    if not assignments:
        raise HTTPException(
            status_code=500, 
            detail="Optimization engine failed to generate valid matches (check if bin/solver exists and is executable)"
        )

    final_results = commit_optimized_teams(db, assignments)
    
    # Enrich with project names and student usernames
    project_map = {p.id: p.name for p in projects}
    student_map = {s.id: s.github_username for s in students}
    enriched_matches = []
    for match in final_results:
        enriched_matches.append({
            **match,
            "project_name": project_map.get(match["project_id"], "Unknown Project"),
            "student_username": student_map.get(match["student_id"], match["student_id"])
        })

    return {
        "status": "success",
        "total_assignments": len(final_results),
        "matches": enriched_matches
    }

@router.post("/build/for-me")
def build_team_for_current_user(
    req: PersonalTeamRequest,
    current_student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Build a team around the logged-in user.
    Picks the best (team_size - 1) teammates based on skill complementarity,
    assigns everyone to the chosen project, and returns the team.
    """
    # Validate project
    project = db.query(Team).filter(Team.id == req.project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    # Get current user
    me = db.query(Student).filter(Student.id == current_student_id).first()
    if not me:
        raise HTTPException(404, "Your account was not found")

    my_skills = me.skills or {}

    # Get other students
    others = db.query(Student).filter(Student.id != current_student_id).all()
    if not others:
        raise HTTPException(400, "No other students available to form a team")

    # Score each candidate by complementarity:
    def complementarity_score(candidate: Student) -> float:
        if not candidate.skills:
            return 0.0
        score = 0.0
        for skill, level in candidate.skills.items():
            my_level = my_skills.get(skill, 0)
            # Reward skills where candidate is stronger than current user
            score += max(0, level - my_level)
        # Also reward breadth (unique skills user doesn't have at all)
        unique_skills = [s for s in candidate.skills if s not in my_skills]
        score += sum(candidate.skills[s] for s in unique_skills) * 0.5
        return score

    # Sort by complementarity, pick top (team_size - 1)
    sorted_others = sorted(others, key=complementarity_score, reverse=True)
    teammates = sorted_others[:max(1, req.team_size - 1)]

    # Build member list: me + teammates
    all_member_ids = [current_student_id] + [t.id for t in teammates]

    # Assign everyone to the project
    for member_id in all_member_ids:
        db.query(Student).filter(Student.id == member_id).update(
            {"current_team_id": req.project_id},
            synchronize_session=False
        )

    # Update project member_ids
    existing_members = list(project.member_ids or [])
    for mid in all_member_ids:
        if mid not in existing_members:
            existing_members.append(mid)
    project.member_ids = existing_members
    db.commit()

    # Create a chat group for the team
    from app.services.group_service import GroupService
    group_name = project.name
    GroupService.create_group(
        db=db,
        creator_id=current_student_id,
        name=group_name,
        description=f"Automated group for project: {project.name}",
        member_ids=all_member_ids,
        is_private=True
    )

    # Build response
    all_members_obj = [me] + teammates
    student_map = {s.id: s.github_username for s in all_members_obj}

    # ── Per-member skill profiles ──────────────────────────────────────────────
    member_profiles = []
    for s in all_members_obj:
        skills = s.skills or {}
        member_profiles.append({
            "student_id": s.id,
            "username": s.github_username,
            "skills": skills,
            "total_skill_score": sum(skills.values()),
            "top_skills": sorted(skills.items(), key=lambda x: x[1], reverse=True)[:5],
            "is_me": s.id == current_student_id
        })

    # ── Team-wide coverage and analysis ───────────────────────────────────────
    coverage: dict = {}
    for s in all_members_obj:
        for skill, level in (s.skills or {}).items():
            coverage[skill] = max(coverage.get(skill, 0), level)

    all_skill_names = set(coverage.keys())
    raw = sum(sum((s.skills or {}).values()) for s in all_members_obj)
    max_possible = len(all_members_obj) * 5 * max(len(all_skill_names), 1)
    team_strength = round(min(raw / max(max_possible, 1), 1.0), 3)

    # Complementarity
    skill_sets = [set((s.skills or {}).keys()) for s in all_members_obj]
    pairwise_overlaps = []
    for i in range(len(skill_sets)):
        for j in range(i+1, len(skill_sets)):
            u = skill_sets[i] | skill_sets[j]
            n = skill_sets[i] & skill_sets[j]
            pairwise_overlaps.append(len(n) / max(len(u), 1))
    avg_overlap = sum(pairwise_overlaps) / max(len(pairwise_overlaps), 1)
    complementarity = round((1 - avg_overlap) * 100, 1)

    uncovered_common = [s for s in ["python", "javascript", "typescript", "sql", "react", "docker"]
                        if s not in [sk.lower() for sk in coverage]]
    weak_skills = {sk: lvl for sk, lvl in coverage.items() if lvl < 2}

    team_members_list = [
        {
            "student_id": mid,
            "student_username": student_map.get(mid, mid),
            "project_id": req.project_id,
            "project_name": project.name,
            "is_me": mid == current_student_id
        }
        for mid in all_member_ids
    ]

    return {
        "status": "success",
        "project_id": req.project_id,
        "project_name": project.name,
        "team_size": len(team_members_list),
        "members": team_members_list,
        # Full analysis
        "analysis": {
            "team_strength": team_strength,
            "complementarity_score": complementarity,
            "diversity_score": len(all_skill_names),
            "member_profiles": member_profiles,
            "skill_coverage": {sk: round(min(lvl / 5.0, 1.0), 2) for sk, lvl in coverage.items()},
            "skill_coverage_raw": coverage,
            "weak_skills": weak_skills,
            "uncovered_common_skills": uncovered_common,
            "recommendations": (
                [f"Missing: {', '.join(uncovered_common[:3])}"] if uncovered_common else []
            ) + (
                ["Excellent complementarity!"] if complementarity > 70 else
                ["Similar skills — consider diversifying"] if complementarity < 30 else []
            ) or ["Team is well-balanced!"]
        }
    }

@router.post("/build/{student_id}")
def build_team_around_student_api(
    student_id: str,
    team_size: int = 3,
    db: Session = Depends(get_db)
):
    required_student = db.query(Student).filter(Student.id == student_id).first()
    if not required_student:
        raise HTTPException(status_code=404, detail="Student not found")
    all_students = db.query(Student).all()
    projects = db.query(Team).all()
    assignments = build_optimized_teams(db, all_students, projects, team_size, target_student_id=student_id)
    student_match = next((a for a in assignments if a["student_id"] == student_id), None)
    if not student_match:
        raise HTTPException(status_code=400, detail="Could not find an optimal team for this student")
    
    project = db.query(Team).filter(Team.id == student_match["project_id"]).first()
    
    return {
        "student_id": student_id,
        "assigned_project": project.name if project else student_match["project_id"]
    }

@router.post("/validate")
def validate_team_api(
    student_ids: List[str],
    db: Session = Depends(get_db)
):
    team_members = db.query(Student).filter(Student.id.in_(student_ids)).all()
    if len(team_members) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 students for validation")

    # ── Per-member skill profiles ──────────────────────────────────────────────
    member_profiles = []
    for s in team_members:
        skills = s.skills or {}
        total = sum(skills.values())
        member_profiles.append({
            "student_id": s.id,
            "username": s.github_username,
            "skills": skills,
            "total_skill_score": total,
            "top_skills": sorted(skills.items(), key=lambda x: x[1], reverse=True)[:5]
        })

    # ── Team-wide skill coverage (best level for each skill across all members) ─
    coverage: dict[str, float] = {}
    for s in team_members:
        for skill, level in (s.skills or {}).items():
            coverage[skill] = max(coverage.get(skill, 0), level)

    total_coverage_score = sum(coverage.values())

    # ── Skill gap: skills where the WHOLE team scores low ──────────────────────
    weak_threshold = 2
    weak_skills = {sk: lvl for sk, lvl in coverage.items() if lvl < weak_threshold}
    uncovered_common = [s for s in ["python", "javascript", "typescript", "sql", "react", "docker"]
                        if s not in [sk.lower() for sk in coverage]]

    # ── Complementarity: do members contribute different skills? ──────────────
    # High if members have different top skills (low overlap)
    if len(team_members) >= 2:
        skill_sets = [set((s.skills or {}).keys()) for s in team_members]
        pairwise_overlaps = []
        for i in range(len(skill_sets)):
            for j in range(i+1, len(skill_sets)):
                u = skill_sets[i] | skill_sets[j]
                n = skill_sets[i] & skill_sets[j]
                pairwise_overlaps.append(len(n) / max(len(u), 1))
        avg_overlap = sum(pairwise_overlaps) / max(len(pairwise_overlaps), 1)
        complementarity = round((1 - avg_overlap) * 100, 1)
    else:
        complementarity = 0.0

    # ── Diversity: number of unique skills across the whole team ──────────────
    all_skills = set()
    for s in team_members:
        all_skills.update((s.skills or {}).keys())
    diversity_score = len(all_skills)

    # ── Overall team strength (normalized 0→1) ────────────────────────────────
    max_possible = len(team_members) * 5 * max(len(all_skills), 1)
    raw = sum(sum((s.skills or {}).values()) for s in team_members)
    team_strength = round(min(raw / max(max_possible, 1), 1.0), 3)

    # ── Recommendations ───────────────────────────────────────────────────────
    recs = []
    if uncovered_common:
        recs.append(f"Missing common skills: {', '.join(uncovered_common[:3])}. Consider adding a member with these.")
    if weak_skills:
        top_weak = sorted(weak_skills.items(), key=lambda x: x[1])[:3]
        recs.append(f"Team is weak in: {', '.join(sk for sk, _ in top_weak)}. Could be improved.")
    if complementarity < 30:
        recs.append("Members have highly similar skills — consider diversifying.")
    elif complementarity > 70:
        recs.append("Excellent skill complementarity! Members cover different areas.")
    if not recs:
        recs.append("Team is well-balanced across skills.")

    return {
        "valid": raw > 0,
        "team_strength": team_strength,
        "member_profiles": member_profiles,
        "skill_coverage": {sk: round(min(lvl / 5.0, 1.0), 2) for sk, lvl in coverage.items()},
        "skill_coverage_raw": coverage,
        "weak_skills": weak_skills,
        "uncovered_common_skills": uncovered_common,
        "complementarity_score": complementarity,
        "diversity_score": diversity_score,
        "total_coverage_score": total_coverage_score,
        "recommendations": recs
    }

@router.get("/me")
def get_my_team(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student or not student.current_team_id:
        return None
    
    project = db.query(Team).filter(Team.id == student.current_team_id).first()
    if not project:
        return None
        
    return {
        "id": project.id,
        "name": project.name,
        "assigned_project": project.name,
        "member_ids": project.member_ids,
        "tech_stack": project.tech_stack
    }

@router.post("/form")
def form_team_manually_api(
    form_data: TeamManualForm,
    current_student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student_ids = form_data.student_ids
    project_id = form_data.project_id
    
    if not student_ids:
        raise HTTPException(status_code=400, detail="No students selected")
        
    # Ensure current student is in the list
    if current_student_id not in student_ids:
        student_ids.append(current_student_id)

    # Find project
    if not project_id:
        project = db.query(Team).first()
        if not project:
            raise HTTPException(status_code=404, detail="No projects available")
        project_id = project.id
    else:
        project = db.query(Team).filter(Team.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    # 1. Assign current student (sender) immediately
    current_student = db.query(Student).filter(Student.id == current_student_id).first()
    current_student.current_team_id = project_id
    
    # Update team member_ids for consistency (add sender immediately)
    if not project.member_ids:
        project.member_ids = [current_student_id]
    elif current_student_id not in project.member_ids:
        project.member_ids = list(project.member_ids) + [current_student_id]
    
    # 2. Send requests to others
    other_student_ids = [s_id for s_id in student_ids if s_id != current_student_id]
    for receiver_id in other_student_ids:
        RequestService.send_request(
            db=db,
            sender_id=current_student_id,
            receiver_id=receiver_id,
            message=f"I've formed a team for the project '{project.name}' and would like you to join!"
        )
    
    db.commit()

    # Create a chat group for the team
    from app.services.group_service import GroupService
    GroupService.create_group(
        db=db,
        creator_id=current_student_id,
        name=project.name,
        description=f"Automated group for manual team formation on project: {project.name}",
        member_ids=student_ids,
        is_private=True
    )
    
    return {
        "status": "success",
        "message": f"Formed team for '{project.name}'. Requests sent to {len(other_student_ids)} members.",
        "project_id": project_id,
        "requests_sent": len(other_student_ids)
    }

@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    """List all available projects"""
    projects = db.query(Team).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "tech_stack": p.tech_stack or [],
            "member_ids": p.member_ids or [],
            "max_team_size": getattr(p, "max_team_size", 3)
        }
        for p in projects
    ]

@router.post("/projects")
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db)
):
    """Create a new project / team slot"""
    new_id = str(uuid.uuid4())
    project = Team(
        id=new_id,
        name=data.name,
        tech_stack=data.tech_stack,
        member_ids=[]
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "tech_stack": project.tech_stack or [],
        "member_ids": [],
        "max_team_size": data.max_team_size
    }