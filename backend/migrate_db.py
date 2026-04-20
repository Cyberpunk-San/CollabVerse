import sqlite3
import os

db_path = "collabverse.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
columns = [
    "github_commits INTEGER DEFAULT 0",
    "github_prs INTEGER DEFAULT 0",
    "github_reviews INTEGER DEFAULT 0",
    "teams_count INTEGER DEFAULT 0",
    "projects_count INTEGER DEFAULT 0",
    "courses_count INTEGER DEFAULT 0",
    "tutorials_count INTEGER DEFAULT 0"
]
for col in columns:
    try:
        print(f"Adding column {col}...")
        cursor.execute(f"ALTER TABLE students ADD COLUMN {col}")
    except sqlite3.OperationalError as e:
        print(f"Column already exists or error: {e}")

conn.commit()
conn.close()
print("Migration complete.")
