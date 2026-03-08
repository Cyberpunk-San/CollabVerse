from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
import bcrypt
from app.core.database import get_db
from app.models.student import Student
from pydantic import BaseModel, EmailStr
from app.core.config import settings

# JWT Settings
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_EXPIRE_MINUTES

# ACCESS_TOKEN_EXPIRE_MINUTES = settings.JWT_EXPIRE_MINUTES

# ==================== SCHEMAS ====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    github_username: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict

class MessageResponse(BaseModel):
    message: str

router = APIRouter(prefix="/auth", tags=["authentication"])

# ==================== HELPER FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(authorization: str = Header(..., alias="Authorization")):
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(401, "Invalid token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

# ==================== AUTH ENDPOINTS (4 ONLY) ====================

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    existing = db.query(Student).filter(
        (Student.email == request.email) | 
        (Student.github_username == request.github_username)
    ).first()
    
    if existing:
        raise HTTPException(400, "Email or GitHub username already registered")
    
    # Create new student
    hashed_password = get_password_hash(request.password)
    student = Student(
        email=request.email,
        hashed_password=hashed_password,
        github_username=request.github_username
    )
    
    db.add(student)
    db.commit()
    db.refresh(student)
    
    # Create token
    token = create_access_token({"sub": student.id, "email": student.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(student.id),
            "email": student.email,
            "githubUsername": student.github_username
        }
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login existing user"""
    # Find user
    print(f"Login attempt for: {request.email}")
    student = db.query(Student).filter(Student.email == request.email).first()
    
    if not student:
        print(f"Login failed: User {request.email} not found")
        raise HTTPException(401, "Invalid email or password")
    
    if not verify_password(request.password, student.hashed_password):
        print(f"Login failed: Password mismatch for {request.email}")
        raise HTTPException(401, "Invalid email or password")
    
    print(f"Login successful for: {request.email}")
    
    # Update last login
    student.last_login = datetime.utcnow()
    db.commit()
    
    # Create token
    token = create_access_token({"sub": student.id, "email": student.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(student.id),
            "email": student.email,
            "githubUsername": student.github_username
        }
    }


@router.post("/logout", response_model=MessageResponse)
async def logout(user_id: str = Depends(get_current_user)):
    """Logout user (client-side token removal)"""
    # JWT is stateless, so we just return success
    return {"message": "Logged out successfully"}


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Find user
    student = db.query(Student).filter(Student.id == user_id).first()
    if not student:
        raise HTTPException(404, "User not found")
    
    # Verify old password
    if not verify_password(request.old_password, student.hashed_password):
        raise HTTPException(400, "Incorrect password")
    
    # Update to new password
    student.hashed_password = get_password_hash(request.new_password)
    student.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully"}