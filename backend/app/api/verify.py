from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import httpx
import secrets
import string
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.student import Student
from app.schemas.student import StudentResponse

router = APIRouter(prefix="/verify", tags=["verification"])

# Store verification codes temporarily (use Redis in production)
# Verification codes are now stored in the database (Student.github_verify_token)


def generate_verification_code():
    """Generate a random 8-character verification code"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))

@router.post("/github/request")
async def request_github_verification(
    student_id: str,
    github_username: str,
    db: Session = Depends(get_db)
):
    """Request GitHub verification for a student"""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    
    # Check if we already have a code that's less than 15 minutes old
    now = datetime.utcnow()
    if student.github_verify_token:
        # Check time since last update (using updated_at as proxy for token age)
        if student.updated_at and (now - student.updated_at) < timedelta(minutes=15):
            code = student.github_verify_token
        else:
            code = generate_verification_code()
            student.github_verify_token = code
            db.commit()
    else:
        # Generate new verification code
        code = generate_verification_code()
        student.github_verify_token = code
        db.commit()
    
    # Return instructions and code
    return {
        "success": True,
        "message": "Verification code generated",
        "code": code,
        "instructions": {
            "step1": f"Create a public repository named 'CollabVerse-Verification'",
            "step2": f"In that repository, create a file named 'verify.txt'",
            "step3": f"Put this exact code in the file: {code}",
            "step4": "Then click the verify button below"
        },
        "expires_in": 15  # minutes
    }

@router.post("/github/check")
async def check_github_verification(
    student_id: str,
    db: Session = Depends(get_db)
):
    """Check if GitHub verification was successful or already verified"""
    # First check if user is already verified in the database
    student = db.query(Student).filter(Student.id == student_id).first()
    if student and student.github_verified:
        return {
            "success": True,
            "verified": True,
            "message": "GitHub account already verified"
        }

    # Check if we have a token in the database
    if not student.github_verify_token:
        raise HTTPException(400, "No pending verification request. Please request a code first.")
    
    # Check if expired (15 minutes)
    now = datetime.utcnow()
    if student.updated_at and (now - student.updated_at) > timedelta(minutes=15):
        student.github_verify_token = None
        db.commit()
        raise HTTPException(400, "Verification code expired. Please request again.")
    
    github_username = student.github_username
    expected_code = student.github_verify_token
    
    # Use GitHub API instead of raw URL to bypass CDN caching more effectively
    api_url = f"https://api.github.com/repos/{github_username}/CollabVerse-Verification/contents/verify.txt"
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CollabVerse-App"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                import base64
                data = response.json()
                # GitHub API returns content encoded in base64
                content_b64 = data.get("content", "")
                file_content = base64.b64decode(content_b64).decode('utf-8').strip()
                
                print(f"DEBUG: Checking GitHub verification for {github_username}")
                print(f"DEBUG: File content (API): '{file_content}'")
                print(f"DEBUG: Expected code: '{expected_code}'")
                
                if file_content == expected_code:
                    print("DEBUG: Verification MATCHED!")
                    # Verification successful
                    student = db.query(Student).filter(Student.id == student_id).first()
                    if student:
                        student.github_username = github_username
                        student.github_verified = True
                        student.github_verify_token = None # Clear token
                        db.commit()
                    
                    return {
                        "success": True,
                        "verified": True,
                        "message": "GitHub account verified successfully!"
                    }
                else:
                    return {
                        "success": True,
                        "verified": False,
                        "message": "Verification code doesn't match. Please check the file content."
                    }
            elif response.status_code == 404:
                return {
                    "success": True,
                    "verified": False,
                    "message": "Repository or verify.txt file not found. Please make sure the repo is public and named exactly 'CollabVerse-Verification'."
                }
            else:
                return {
                    "success": True,
                    "verified": False,
                    "message": f"GitHub API returned status {response.status_code}."
                }
    except httpx.TimeoutException:
        return {
            "success": True,
            "verified": False,
            "message": "Request timed out. Please try again."
        }
    except Exception as e:
        return {
            "success": True,
            "verified": False,
            "message": f"Error checking verification: {str(e)}"
        }

@router.post("/github/resend")
async def resend_verification_code(
    student_id: str,
    github_username: str,
    db: Session = Depends(get_db)
):
    """Resend/regenerate verification code"""
    # Clear old token to force regeneration
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        student.github_verify_token = None
        db.commit()
    
    # Generate new code
    return await request_github_verification(student_id, github_username, db)