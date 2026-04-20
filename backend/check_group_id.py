import sqlite3

def check_group_id():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    group_id = "78ac189d-f3f7-44cb-90c6-59be7461a968"
    user_id = "4b484678-0cd1-434b-84e5-92f967460ed2"
    
    cur.execute("SELECT id, name FROM groups WHERE id=?", (group_id,))
    group = cur.fetchone()
    print(f"Group 78ac189d: {group}")
    
    cur.execute("SELECT user_id, role FROM group_members WHERE group_id=?", (group_id,))
    members = cur.fetchall()
    print(f"Members of 78ac189d: {members}")
    
    cur.execute("SELECT id, name FROM groups WHERE id='c116d44d-f95d-4f05-86c1-89be-be4ca3d97ea8'")
    other_group = cur.fetchone()
    print(f"Group c116d44d: {other_group}")
    
    cur.execute("SELECT user_id, role FROM group_members WHERE group_id='c116d44d-f95d-4f05-86c1-89be-be4ca3d97ea8'")
    other_members = cur.fetchall()
    print(f"Members of c116d44d: {other_members}")

    conn.close()

if __name__ == "__main__":
    check_group_id()
