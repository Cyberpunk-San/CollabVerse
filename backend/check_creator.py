import sqlite3

def check_creator():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    group_id = "78ac189d-f3f7-44cb-90c6-59be7461a968"
    
    cur.execute("SELECT creator_id FROM groups WHERE id=?", (group_id,))
    creator = cur.fetchone()
    print(f"Group creator: {creator[0] if creator else 'Not found'}")
    
    cur.execute("SELECT user_id, role FROM group_members WHERE group_id=?", (group_id,))
    members = cur.fetchall()
    print(f"Group members: {members}")
    
    conn.close()

if __name__ == "__main__":
    check_creator()
