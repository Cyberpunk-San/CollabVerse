import sqlite3

def sim_get_messages():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    group_id = "78ac189d-f3f7-44cb-90c6-59be7461a968"
    
    # Simulate the query in GroupService.get_group_messages
    cur.execute("SELECT id, group_id, content FROM group_messages WHERE group_id=? AND deleted_for_all=0", (group_id,))
    messages = cur.fetchall()
    print(f"Messages for group {group_id}: {len(messages)}")
    for msg in messages:
        if msg[0] == "b7b90b3b-35f8-44ee-b9bb-6429c384b4c7":
            print(f"!!! FOUND TARGET MESSAGE IN GROUP {group_id} !!!")
        print(msg)
        
    conn.close()

if __name__ == "__main__":
    sim_get_messages()
