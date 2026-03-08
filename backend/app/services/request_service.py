from sqlalchemy.orm import Session
from app.models.request import Request
from app.models.student import Student
import uuid

class RequestService:
    
    @staticmethod
    def send_request(
        db: Session,
        sender_id: str,
        receiver_id: str,
        message: str = None
    ):
        sender = db.query(Student).filter(Student.id == sender_id).first()
        receiver = db.query(Student).filter(Student.id == receiver_id).first()
        
        if not sender:
            return None, "Sender not found"
        if not receiver:
            return None, "Receiver not found"
        
        if sender_id == receiver_id:
            return None, "Cannot send request to yourself"
        
        existing = db.query(Request).filter(
            Request.sender_id == sender_id,
            Request.receiver_id == receiver_id,
            Request.status == "pending"
        ).first()
        
        if existing:
            return None, "You already have a pending request with this user"
        
        request = Request(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            status="pending"
        )
        
        db.add(request)
        db.commit()
        db.refresh(request)
        
        return request, None
    
    @staticmethod
    def respond_to_request(
        db: Session,
        request_id: str,
        receiver_id: str,
        status: str  #accepted or rejected
    ):

        request = db.query(Request).filter(
            Request.id == request_id,
            Request.receiver_id == receiver_id,
            Request.status == "pending"
        ).first()
        
        if not request:
            return None, "Request not found or already processed"
        
        # Update status
        request.status = status
        db.commit()
        
        return request, None
    
    @staticmethod
    def get_connections(db: Session, student_id: str):
        sent_accepted = db.query(Request).filter(
            Request.sender_id == student_id,
            Request.status == "accepted"
        ).all()
        received_accepted = db.query(Request).filter(
            Request.receiver_id == student_id,
            Request.status == "accepted"
        ).all()
        connections = []
        for req in sent_accepted:
            connections.append({
                "student_id": req.receiver_id,
                "connected_since": req.updated_at or req.created_at,
                "direction": "you_sent"
            })
        for req in received_accepted:
            connections.append({
                "student_id": req.sender_id,
                "connected_since": req.updated_at or req.created_at,
                "direction": "they_sent"
            })
        return connections