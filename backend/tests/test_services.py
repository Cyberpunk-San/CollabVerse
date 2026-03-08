# create check_db.py
from app.core.database import engine
import sqlite3

# Connect to database
conn = sqlite3.connect('peerlens.db')
cursor = conn.cursor()

# Check what tables exist
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("Tables in database:")
for table in tables:
    print(f"- {table[0]}")

conn.close()