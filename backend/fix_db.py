import sqlite3
from datetime import datetime

def fix_database():
    conn = sqlite3.connect('collabverse.db')
    cursor = conn.cursor()
    
    print("Adding missing columns to 'students' table...")
    
    # Check if created_at exists
    cursor.execute("PRAGMA table_info(students)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'created_at' not in columns:
        print("Adding 'created_at' column...")
        cursor.execute("ALTER TABLE students ADD COLUMN created_at DATETIME")
        # Set a default value for existing rows
        now = datetime.utcnow().isoformat()
        cursor.execute("UPDATE students SET created_at = ?", (now,))
    else:
        print("'created_at' already exists.")
        
    if 'updated_at' not in columns:
        print("Adding 'updated_at' column...")
        cursor.execute("ALTER TABLE students ADD COLUMN updated_at DATETIME")
        # Set a default value for existing rows
        now = datetime.utcnow().isoformat()
        cursor.execute("UPDATE students SET updated_at = ?", (now,))
    else:
        print("'updated_at' already exists.")
        
    conn.commit()
    conn.close()
    print("Database fix complete.")

if __name__ == "__main__":
    fix_database()
