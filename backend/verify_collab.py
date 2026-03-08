import sqlite3
import json
import uuid

def verify_collaborative_form():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()

    # IDs for testing
    sender_id = "4b484678-0cd1-434b-84e5-92f967460ed2" # Cyberpunk-San
    receiver_id = "6a1cc46b-8065-42ac-83bf-cd20289a021c" # rudnibh
    project_id = "p1"

    # Reset state for clean test
    cur.execute("UPDATE students SET current_team_id = NULL WHERE id = ?", (sender_id,))
    cur.execute("DELETE FROM requests WHERE sender_id = ? AND receiver_id = ?", (sender_id, receiver_id))
    conn.commit()

    # Simulate the /teams/form logic
    print("Simulating team formation...")
    
    # 1. Assign sender
    cur.execute("UPDATE students SET current_team_id = ? WHERE id = ?", (project_id, sender_id))
    
    # 2. Update project member_ids (simplified)
    cur.execute("SELECT member_ids FROM teams WHERE id = ?", (project_id,))
    row = cur.fetchone()
    member_ids = json.loads(row[0]) if row and row[0] else []
    if sender_id not in member_ids:
        member_ids.append(sender_id)
    cur.execute("UPDATE teams SET member_ids = ? WHERE id = ?", (json.dumps(member_ids), project_id))

    # 3. Send request
    req_id = str(uuid.uuid4())
    msg = "I've formed a team for the project 'AI Collaboration platform' and would like you to join!"
    cur.execute(
        "INSERT INTO requests (id, sender_id, receiver_id, message, status, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        (req_id, sender_id, receiver_id, msg, "pending")
    )
    
    conn.commit()

    # Verification
    cur.execute("SELECT current_team_id FROM students WHERE id = ?", (sender_id,))
    assigned_team = cur.fetchone()[0]
    print(f"Sender assigned team: {assigned_team}")

    cur.execute("SELECT status, message FROM requests WHERE sender_id = ? AND receiver_id = ?", (sender_id, receiver_id))
    request = cur.fetchone()
    if request:
        print(f"Request status: {request[0]}")
        print(f"Request message: {request[1]}")
    else:
        print("Request NOT found!")

    conn.close()

if __name__ == "__main__":
    verify_collaborative_form()
