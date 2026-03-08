import sqlite3
import json

def seed_skills():
    conn = sqlite3.connect('collabverse.db')
    cur = conn.cursor()

    # Define some realistic skills for existing students
    skills_data = {
        'Cyberpunk-San': {
            'python': 4,
            'github': 5,
            'javascript': 3,
            'fastapi': 4,
            'react': 2
        },
        'rudnibh': {
            'javascript': 5,
            'react': 4,
            'css': 4,
            'html': 5,
            'node.js': 3
        },
        'jelly13bean': {
            'python': 3,
            'sql': 4,
            'data analysis': 4,
            'pandas': 3,
            'tensorflow': 2
        },
        'prollypavani': {
            'java': 4,
            'springboot': 3,
            'sql': 4,
            'javascript': 3,
            'docker': 2
        },
        'testgroup': {
            'go': 4,
            'kubernetes': 3,
            'docker': 4,
            'cloud native': 4
        },
        'testgroup2': {
            'rust': 4,
            'c++': 5,
            'embedded': 4,
            'python': 3
        }
    }

    for username, skills in skills_data.items():
        skills_json = json.dumps(skills)
        cur.execute(
            "UPDATE students SET skills = ? WHERE github_username = ?",
            (skills_json, username)
        )
        if cur.rowcount > 0:
            print(f"Updated skills for {username}")
        else:
            print(f"User {username} not found")

    conn.commit()
    conn.close()
    print("Database seeding complete!")

if __name__ == "__main__":
    seed_skills()
