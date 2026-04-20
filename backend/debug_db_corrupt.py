import sqlite3

def debug():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    msg_id = "b7b90b3b-35f8-44ee-b9bb-6429c384b4c7"
    
    cur.execute("SELECT * FROM group_messages WHERE id=?", (msg_id,))
    rows = cur.fetchall()
    print(f"Total rows found for ID {msg_id}: {len(rows)}")
    for row in rows:
        print(row)
        
    conn.close()

if __name__ == "__main__":
    debug()
