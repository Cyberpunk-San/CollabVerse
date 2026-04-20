import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_ml_predict():
    print("Testing ML Predict Skills...")
    # First get a student ID
    students_resp = requests.get(f"{BASE_URL}/students/")
    print(f"Students GET URL: {students_resp.url}")
    print(f"Students GET Status: {students_resp.status_code}")
    if students_resp.status_code != 200:
        print(f"Error fetching students: {students_resp.text}")
        return
    
    students = students_resp.json()
    if not students:
        print("No students found to test prediction.")
        return
    
    student_id = students[0]["id"]
    print(f"Using student ID: {student_id}")

    resp = requests.post(f"{BASE_URL}/ml/predict/skills", json={"student_id": student_id})
    print(f"Response Status: {resp.status_code}")
    print(f"Raw Response: {resp.text}")
    try:
        print(f"Response Data: {json.dumps(resp.json(), indent=2)}")
    except:
        print("Failed to decode JSON.")

if __name__ == "__main__":
    test_ml_predict()
