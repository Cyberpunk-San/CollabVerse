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
verification_codes = {}

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
    
    # Generate verification code
    code = generate_verification_code()
    
    # Store code with expiry (15 minutes)
    verification_codes[student_id] = {
        "code": code,
        "github_username": github_username,
        "expires_at": datetime.utcnow() + timedelta(minutes=15)
    }
    
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
    """Check if GitHub verification was successful"""
    # Get verification data
    verify_data = verification_codes.get(student_id)
    if not verify_data:
        raise HTTPException(400, "No pending verification request")
    
    # Check if expired
    if datetime.utcnow() > verify_data["expires_at"]:
        del verification_codes[student_id]
        raise HTTPException(400, "Verification code expired. Please request again.")
    
    github_username = verify_data["github_username"]
    expected_code = verify_data["code"]
    
    # Construct the raw GitHub URL
    raw_url = f"https://raw.githubusercontent.com/{github_username}/CollabVerse-Verification/main/verify.txt"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(raw_url, timeout=10.0)
            
            if response.status_code == 200:
                file_content = response.text.strip()
                
                if file_content == expected_code:
                    # Verification successful
                    student = db.query(Student).filter(Student.id == student_id).first()
                    if student:
                        student.github_username = github_username
                        student.github_verified = True
                        db.commit()
                    
                    # Clear verification data
                    del verification_codes[student_id]
                    
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
                    "message": "Repository or file not found. Please follow the instructions carefully."
                }
            else:
                return {
                    "success": True,
                    "verified": False,
                    "message": f"GitHub returned status {response.status_code}. Please make sure the repository is public."
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
    # Remove old verification if exists
    if student_id in verification_codes:
        del verification_codes[student_id]
    
    # Generate new code
    return await request_github_verification(student_id, github_username, db)