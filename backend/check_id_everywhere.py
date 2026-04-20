import sqlite3

def check_id_everywhere():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    msg_id = "b7b90b3b-35f8-44ee-b9bb-6429c384b4c7"
    
    tables = ['group_messages', 'chat_messages']
    for table in tables:
        cur.execute(f"SELECT * FROM {table} WHERE id=?", (msg_id,))
        res = cur.fetchone()
        if res:
            print(f"Found in {table}: {res}")
            # Get column names
            cur.execute(f"PRAGMA table_info({table})")
            cols = [c[1] for c in cur.fetchall()]
            print(f"Columns: {cols}")
        else:
            print(f"Not found in {table}")
            
    conn.close()

if __name__ == "__main__":
    check_id_everywhere()
