from app.core.database import SessionLocal
from app.models.student import Student
db = SessionLocal()
try:
    print("Querying student...")
    s = db.query(Student).all()
    print(f"Found {len(s)} students.")
    if s:
        print(f"First student: {s[0].github_username}")
except Exception as e:
    print(f"DB Error: {e}")
finally:
    db.close()
