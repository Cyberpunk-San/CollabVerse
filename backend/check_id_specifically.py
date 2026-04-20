import sqlite3

def check_id_specifically():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    group_id = "c116d44d-f95d-4f05-86c1-89be-be4ca3d97ea8"
    user_id = "4b484678-0cd1-434b-84e5-92f967460ed2"
    
    cur.execute("SELECT id, name FROM groups WHERE id=?", (group_id,))
    res = cur.fetchone()
    print(f"Group {group_id} exists: {res if res else 'No'}")
    
    cur.execute("SELECT * FROM group_members WHERE group_id=? AND user_id=?", (group_id, user_id))
    res_m = cur.fetchone()
    print(f"User in group: {res_m if res_m else 'No'}")
    
    conn.close()

if __name__ == "__main__":
    check_id_specifically()
