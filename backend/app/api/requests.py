from fastapi import APIRouter, HTTPException, Depends, Header, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.request import Request
from app.models.student import Student
from app.schemas.request import RequestCreate, RequestResponse, RequestUpdate
from app.services.request_service import RequestService

router = APIRouter(prefix="/requests", tags=["requests"])

from app.api.auth import get_current_user

@router.post("/", response_model=RequestResponse)
def send_request(
    request_data: RequestCreate,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a connection request to another student"""
    request, error = RequestService.send_request(
        db=db,
        sender_id=student_id,
        receiver_id=request_data.receiver_id,
        message=request_data.message
    )
    
    if error:
        raise HTTPException(400, detail=error)
    
    return enrich_request_response(db, request)

@router.get("/sent", response_model=List[RequestResponse])
def get_sent_requests(
    student_id: str = Depends(get_current_user),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all requests you sent"""
    query = db.query(Request).filter(Request.sender_id == student_id)
    
    if status:
        query = query.filter(Request.status == status)
    
    requests = query.order_by(Request.created_at.desc()).all()
    
    return [enrich_request_response(db, req) for req in requests]

@router.get("/received", response_model=List[RequestResponse])
def get_received_requests(
    student_id: str = Depends(get_current_user),
    status: str = "pending",  # Default to pending only
    db: Session = Depends(get_db)
):
    """Get all requests you received"""
    query = db.query(Request).filter(Request.receiver_id == student_id)
    
    if status:
        query = query.filter(Request.status == status)
    
    requests = query.order_by(Request.created_at.desc()).all()
    
    return [enrich_request_response(db, req) for req in requests]

@router.put("/{request_id}", response_model=RequestResponse)
def respond_to_request(
    request_id: str,
    response: RequestUpdate,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept or reject a request you received"""
    request, error = RequestService.respond_to_request(
        db=db,
        request_id=request_id,
        receiver_id=student_id,
        status=response.status
    )
    
    if error:
        raise HTTPException(400, detail=error)
    
    return enrich_request_response(db, request)

@router.delete("/{request_id}")
def cancel_request(
    request_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a request you sent"""
    request = db.query(Request).filter(
        Request.id == request_id,
        Request.sender_id == student_id,
        Request.status == "pending"
    ).first()
    
    if not request:
        raise HTTPException(404, "Request not found or already processed")
    
    request.status = "cancelled"
    db.commit()
    
    return {"message": "Request cancelled successfully"}

@router.get("/connections")
def get_connections(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all your accepted connections"""
    connections = RequestService.get_connections(db, student_id)
    
    # Enrich with user details
    enriched_connections = []
    for conn in connections:
        student = db.query(Student).filter(Student.id == conn["student_id"]).first()
        if student:
            enriched_connections.append({
                "student_id": conn["student_id"],
                "github_username": student.github_username,
                "email": student.email,
                "skills": student.skills,
                "connected_since": conn["connected_since"],
                "direction": conn["direction"]
            })
    
    return enriched_connections

@router.get("/check/{other_student_id}")
def check_connection_status(
    other_student_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check connection status with another student"""
    sent_request = db.query(Request).filter(
        Request.sender_id == student_id,
        Request.receiver_id == other_student_id
    ).first()
    
    received_request = db.query(Request).filter(
        Request.sender_id == other_student_id,
        Request.receiver_id == student_id
    ).first()
    
    status = "no_connection"
    request_id = None
    
    if sent_request:
        status = f"you_sent_{sent_request.status}"
        request_id = sent_request.id
    elif received_request:
        status = f"they_sent_{received_request.status}"
        request_id = received_request.id
    
    # Check if they exist
    other_student = db.query(Student).filter(Student.id == other_student_id).first()
    
    return {
        "other_student_id": other_student_id,
        "other_username": other_student.github_username if other_student else None,
        "status": status,
        "request_id": request_id,
        "can_send_request": status == "no_connection"
    }

# Helper function
def enrich_request_response(db: Session, request: Request) -> dict:
    """Add usernames to request response"""
    sender = db.query(Student).filter(Student.id == request.sender_id).first()
    receiver = db.query(Student).filter(Student.id == request.receiver_id).first()
    
    return {
        "id": request.id,
        "sender_id": request.sender_id,
        "receiver_id": request.receiver_id,
        "message": request.message,
        "status": request.status,
        "created_at": request.created_at,
        "updated_at": request.updated_at,
        "sender_username": sender.github_username if sender else None,
        "sender_email": sender.email if sender else None,
        "receiver_username": receiver.github_username if receiver else None,
        "receiver_email": receiver.email if receiver else None
    }