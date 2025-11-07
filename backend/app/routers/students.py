from fastapi import APIRouter, HTTPException

router = APIRouter()

# In-memory database for students
students_db = {}

@router.get("/")
async def get_all_students():
    """Get all students in the network"""
    return list(students_db.values())

@router.get("/{student_id}")
async def get_student(student_id: str):
    """Get a specific student by ID"""
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student not found")
    return students_db[student_id]

@router.post("/")
async def create_student(student: dict):
    """Add a new student to the network"""
    students_db[student["id"]] = student
    return student

@router.delete("/{student_id}")
async def delete_student(student_id: str):
    """Remove a student from the network"""
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student not found")
    del students_db[student_id]
    return {"message": "Student deleted successfully"}

@router.get("/search/{skill}")
async def search_by_skill(skill: str):
    """Find students with specific skills"""
    matching_students = []
    
    for student in students_db.values():
        student_skills = [tech["name"].lower() for tech in student.get("tech_stack", [])]
        if skill.lower() in student_skills:
            matching_students.append(student)
    
    return {
        "skill": skill,
        "count": len(matching_students),
        "students": matching_students
    }

@router.get("/stats/count")
async def get_student_count():
    """Get total number of students"""
    return {"total_students": len(students_db)}