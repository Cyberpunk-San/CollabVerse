import sqlite3

def check_pinning():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()
    
    group_id = "78ac189d-f3f7-44cb-90c6-59be7461a968"
    message_id = "b7b90b3b-35f8-44ee-b9bb-6429c384b4c7"
    user_id = "4b484678-0cd1-434b-84e5-92f967460ed2"
    
    print(f"Checking for Group: {group_id}")
    print(f"Checking for Message: {message_id}")
    print(f"Checking for User: {user_id}")
    
    # Check message
    cur.execute("SELECT id, group_id, sender_id FROM group_messages WHERE id=?", (message_id,))
    msg = cur.fetchone()
    print(f"Message record: {msg}")
    
    # Check user role
    cur.execute("SELECT role FROM group_members WHERE group_id=? AND user_id=?", (group_id, user_id))
    role = cur.fetchone()
    print(f"User role: {role[0] if role else 'Not found'}")
    
    # Check current pins
    cur.execute("SELECT COUNT(*) FROM pinned_messages WHERE group_id=?", (group_id,))
    pin_count = cur.fetchone()[0]
    print(f"Current pin count: {pin_count}")
    
    conn.close()

if __name__ == "__main__":
    check_pinning()
