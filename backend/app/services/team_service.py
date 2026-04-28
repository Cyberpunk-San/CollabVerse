import os
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.team import Team
from app.domain.matching_logic import run_cpp_solver


def build_teams_python_fallback(
    students: list,
    projects: list,
    team_size: int = 3
) -> list:
    if not students or not projects:
        return []

    sorted_students = sorted(
        students,
        key=lambda s: sum(s.skills.values()) if s.skills else 0,
        reverse=True
    )

    assignments = []
    project_counts = {p.id: 0 for p in projects}

    for student in sorted_students:
        available = [
            p for p in projects
            if project_counts[p.id] < team_size
        ]
        if not available:

            available = projects

        target_project = min(available, key=lambda p: project_counts[p.id])
        assignments.append({
            "student_id": student.id,
            "project_id": target_project.id
        })
        project_counts[target_project.id] += 1

    return assignments

def build_optimized_teams(
    db: Session, 
    students: list[Student], 
    projects: list[Team], 
    team_size: int = 3,
    target_student_id: str = None
) -> list[dict]:
    """
    Orchestrates the handover to the C++ engine for Global Optimization.
    1. Prepares the standardized input string for C++ stdin.
    2. Calls the C++ Dinic/DP binary.
    3. Parses matched Student:Project pairs.
    """
    # The C++ main.cpp expects: student_count project_count, student data, project data, edge data.
    input_lines = [f"{len(students)} {len(projects)}"]
    
    # Student data section
    for s in students:
        # Summing skill levels (1-4) derived from the skill estimator
        skill_sum = sum(s.skills.values()) if s.skills else 0
        input_lines.append(f"{s.id} {skill_sum}")
        
    # Project data section
    for p in projects:
        # Uses the max_team_size attribute if available, otherwise defaults to requested size
        capacity = getattr(p, 'max_team_size', team_size)
        input_lines.append(f"{p.id} {capacity}")
        
    # Edge generation for the Bipartite Matching graph
    edges = []
    for s in students:
        for p in projects:
            # Currently providing all possible paths for Dinic's Algorithm to optimize
            edges.append(f"{s.id} {p.id}")
            
    input_lines.append(str(len(edges)))
    input_lines.extend(edges)
    
    input_str = "\n".join(input_lines)

    try:
        # Triggers the subprocess call to the compiled binary in /bin/solver
        raw_output = run_cpp_solver(input_str)
    except Exception as e:
        print(f"C++ Solver unavailable, using Python fallback: {e}")
        return build_teams_python_fallback(students, projects, team_size)

    assignments = []
    if raw_output:
        for line in raw_output:
            if not line.strip(): continue
            parts = line.strip().split()
            if len(parts) == 2:
                s_id, p_id = parts
                assignments.append({
                    "student_id": s_id, 
                    "project_id": p_id
                })

    if not assignments:
        print("C++ solver returned no results, using Python fallback.")
        return build_teams_python_fallback(students, projects, team_size)

    return assignments

def commit_optimized_teams(db: Session, assignments: list[dict]):
    created_assignments = []
    
    project_members = {}
    for entry in assignments:
        s_uuid = entry["student_id"]
        p_uuid = entry["project_id"]
        
        db.query(Student).filter(Student.id == s_uuid).update(
            {"current_team_id": p_uuid}, 
            synchronize_session=False
        )
        
        if p_uuid not in project_members:
            project_members[p_uuid] = []
        project_members[p_uuid].append(s_uuid)
        created_assignments.append(entry)

    for p_id, member_ids in project_members.items():
        project = db.query(Team).filter(Team.id == p_id).first()
        if project:
            current_members = list(project.member_ids or [])
            for m_id in member_ids:
                if m_id not in current_members:
                    current_members.append(m_id)
            project.member_ids = current_members

    db.commit()
    return created_assignments

def validate_team_logic(team_members: list[Student]):
    total_skill = sum(sum(s.skills.values()) for s in team_members if s.skills)
    return {
        "is_valid": total_skill > 0,
        "synergy_score": total_skill,
        "member_count": len(team_members)
    }