import sqlite3

def check_role():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    group_id = "c116d44d-f95d-4f05-86c1-89be-be4ca3d97ea8"
    user_id = "4b484678-0cd1-434b-84e5-92f967460ed2"
    
    cur.execute("SELECT role FROM group_members WHERE group_id=? AND user_id=?", (group_id, user_id))
    role = cur.fetchone()
    print(f"User role in {group_id}: {role[0] if role else 'Not found'}")
    
    conn.close()

if __name__ == "__main__":
    check_role()
