import sqlite3

def check_schema():
    conn = sqlite3.connect('collabverse.db')
    cursor = conn.cursor()
    
    print("Checking 'students' table columns...")
    cursor.execute("PRAGMA table_info(students)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"Column: {col[1]}, Type: {col[2]}")
    
    conn.close()

if __name__ == "__main__":
    check_schema()
