from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.chat import ChatMessage
from app.models.student import Student
from app.models.request import Request
import uuid
from typing import List, Tuple, Optional, Dict
from datetime import datetime
class ChatService:
    @staticmethod
    def can_chat(db: Session, user1_id: str, user2_id: str) -> bool:
        # Allow chat if there's an accepted connection request
        accepted_request = db.query(Request).filter(
            (
                (Request.sender_id == user1_id) & 
                (Request.receiver_id == user2_id) &
                (Request.status == "accepted")
            ) |
            (
                (Request.sender_id == user2_id) & 
                (Request.receiver_id == user1_id) &
                (Request.status == "accepted")
            )
        ).first()
        if accepted_request:
            return True

        # Also allow chat between team members (same current_team_id)
        user1 = db.query(Student).filter(Student.id == user1_id).first()
        user2 = db.query(Student).filter(Student.id == user2_id).first()
        if user1 and user2 and user1.current_team_id and user2.current_team_id:
            if user1.current_team_id == user2.current_team_id:
                return True

        return False
    
    @staticmethod
    def send_message(
        db: Session, 
        sender_id: str, 
        receiver_id: str, 
        content: str = None,
        message_type: str = "text",
        file_url: str = None,
        file_name: str = None,
        file_size: int = None,
        file_mime_type: str = None,
        thumbnail_url: str = None
    ) -> Tuple[Optional[ChatMessage], Optional[str]]:
        
        sender = db.query(Student).filter(Student.id == sender_id).first()
        receiver = db.query(Student).filter(Student.id == receiver_id).first()
        
        if not sender:
            return None, "Sender not found"
        if not receiver:
            return None, "Receiver not found"
        
        if not ChatService.can_chat(db, sender_id, receiver_id):
            return None, "You must be connected to send messages"
        
        if not content and not file_url:
            return None, "Message must have content or file"
        
        MAX_FILE_SIZE = 50 * 1024 * 1024
        if file_url and file_size and file_size > MAX_FILE_SIZE:
            return None, f"File too large. Max size: {MAX_FILE_SIZE/1024/1024}MB"
        
        if file_url and message_type == "text":
            if file_mime_type:
                if file_mime_type.startswith("image/"):
                    message_type = "image"
                elif file_mime_type.startswith("video/"):
                    message_type = "video"
                elif file_mime_type.startswith("audio/"):
                    message_type = "audio"
                else:
                    message_type = "document"
        
        message = ChatMessage(
            id=str(uuid.uuid4()),
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            file_mime_type=file_mime_type,
            thumbnail_url=thumbnail_url,
            is_read=False,
            deleted_by_sender=False,
            deleted_by_receiver=False
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        return message, None
    
    @staticmethod
    def get_conversation(
        db: Session, 
        user1_id: str, 
        user2_id: str, 
        limit: int = 100,
        before: datetime = None
    ) -> List[ChatMessage]:
        
        if not ChatService.can_chat(db, user1_id, user2_id):
            return []
        
        query = db.query(ChatMessage).filter(
            (
                (ChatMessage.sender_id == user1_id) & 
                (ChatMessage.receiver_id == user2_id) &
                (ChatMessage.deleted_by_sender == False)
            ) |
            (
                (ChatMessage.sender_id == user2_id) & 
                (ChatMessage.receiver_id == user1_id) &
                (ChatMessage.deleted_by_receiver == False)
            )
        )
        
        if before:
            query = query.filter(ChatMessage.created_at < before)
        
        messages = query.order_by(ChatMessage.created_at.desc()).limit(limit).all()
        ChatService.mark_messages_as_read(db, user1_id, user2_id)
        
        return list(reversed(messages))
    
    @staticmethod
    def mark_messages_as_read(db: Session, user_id: str, other_user_id: str) -> int:
        unread_messages = db.query(ChatMessage).filter(
            ChatMessage.sender_id == other_user_id,
            ChatMessage.receiver_id == user_id,
            ChatMessage.is_read == False
        ).all()
        
        for msg in unread_messages:
            msg.is_read = True
        
        db.commit()
        return len(unread_messages)
    
    @staticmethod
    def mark_message_as_read(db: Session, message_id: str, user_id: str) -> bool:
        message = db.query(ChatMessage).filter(
            ChatMessage.id == message_id,
            ChatMessage.receiver_id == user_id
        ).first()
        
        if message and not message.is_read:
            message.is_read = True
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def get_unread_count(db: Session, user_id: str) -> int:
        return db.query(ChatMessage).filter(
            ChatMessage.receiver_id == user_id,
            ChatMessage.is_read == False,
            ChatMessage.deleted_by_receiver == False
        ).count()
    
    @staticmethod
    def get_unread_messages(db: Session, user_id: str) -> List[ChatMessage]:
        return db.query(ChatMessage).filter(
            ChatMessage.receiver_id == user_id,
            ChatMessage.is_read == False,
            ChatMessage.deleted_by_receiver == False
        ).order_by(ChatMessage.created_at.desc()).all()
    
    @staticmethod
    def get_unread_count_by_user(db: Session, user_id: str) -> Dict[str, int]:
        result = db.query(
            ChatMessage.sender_id,
            func.count(ChatMessage.id).label('count')
        ).filter(
            ChatMessage.receiver_id == user_id,
            ChatMessage.is_read == False,
            ChatMessage.deleted_by_receiver == False
        ).group_by(ChatMessage.sender_id).all()
        
        return {row[0]: row[1] for row in result}
    
    @staticmethod
    def get_chat_partners(db: Session, user_id: str) -> List[str]:
        sent_to = db.query(ChatMessage.receiver_id).filter(
            ChatMessage.sender_id == user_id,
            ChatMessage.deleted_by_sender == False
        ).distinct().all()
        
        received_from = db.query(ChatMessage.sender_id).filter(
            ChatMessage.receiver_id == user_id,
            ChatMessage.deleted_by_receiver == False
        ).distinct().all()
        
        partners = set()
        for result in sent_to:
            partners.add(result[0])
        for result in received_from:
            partners.add(result[0])
        
        return list(partners)
    
    @staticmethod
    def get_conversation_previews(db: Session, user_id: str) -> List[dict]:
        partners = ChatService.get_chat_partners(db, user_id)
        conversations = []
        
        for partner_id in partners:
            last_message = db.query(ChatMessage).filter(
                (
                    (ChatMessage.sender_id == user_id) & 
                    (ChatMessage.receiver_id == partner_id) &
                    (ChatMessage.deleted_by_sender == False)
                ) |
                (
                    (ChatMessage.sender_id == partner_id) & 
                    (ChatMessage.receiver_id == user_id) &
                    (ChatMessage.deleted_by_receiver == False)
                )
            ).order_by(ChatMessage.created_at.desc()).first()
            
            unread_count = db.query(ChatMessage).filter(
                ChatMessage.sender_id == partner_id,
                ChatMessage.receiver_id == user_id,
                ChatMessage.is_read == False,
                ChatMessage.deleted_by_receiver == False
            ).count()
            
            partner = db.query(Student).filter(Student.id == partner_id).first()
            
            last_message_preview = ""
            if last_message:
                if last_message.message_type == "text":
                    last_message_preview = last_message.content[:50]
                    if len(last_message.content) > 50:
                        last_message_preview += "..."
                elif last_message.message_type == "image":
                    last_message_preview = "📷 Image"
                elif last_message.message_type == "video":
                    last_message_preview = "🎥 Video"
                elif last_message.message_type == "audio":
                    last_message_preview = "🎵 Audio"
                elif last_message.message_type == "document":
                    last_message_preview = f"📄 {last_message.file_name or 'Document'}"
                else:
                    last_message_preview = "Message"
            
            conversations.append({
                "user_id": partner_id,
                "username": partner.github_username if partner else "Unknown",
                "partner_email": partner.email if partner else None,
                "last_message": last_message_preview,
                "last_message_type": last_message.message_type if last_message else None,
                "last_message_time": last_message.created_at if last_message else None,
                "unread_count": unread_count,
                "is_online": False
            })
        
        conversations.sort(
            key=lambda x: x["last_message_time"] or datetime.min, 
            reverse=True
        )
        
        return conversations
    
    @staticmethod
    def delete_message(db: Session, message_id: str, user_id: str) -> Tuple[bool, Optional[str]]:
        message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        
        if not message:
            return False, "Message not found"
        
        if message.sender_id == user_id:
            message.deleted_by_sender = True
        elif message.receiver_id == user_id:
            message.deleted_by_receiver = True
        else:
            return False, "You don't have permission to delete this message"
        
        if message.deleted_by_sender and message.deleted_by_receiver:
            db.delete(message)
        
        db.commit()
        return True, None
    
    @staticmethod
    def clear_conversation(db: Session, user_id: str, other_user_id: str) -> Tuple[int, Optional[str]]:
        if not ChatService.can_chat(db, user_id, other_user_id):
            return 0, "You are not connected with this user"
        
        messages = db.query(ChatMessage).filter(
            (
                (ChatMessage.sender_id == user_id) & 
                (ChatMessage.receiver_id == other_user_id) &
                (ChatMessage.deleted_by_sender == False)
            ) |
            (
                (ChatMessage.sender_id == other_user_id) & 
                (ChatMessage.receiver_id == user_id) &
                (ChatMessage.deleted_by_receiver == False)
            )
        ).all()
        
        count = len(messages)
        
        for msg in messages:
            if msg.sender_id == user_id:
                msg.deleted_by_sender = True
            else:
                msg.deleted_by_receiver = True
            
            if msg.deleted_by_sender and msg.deleted_by_receiver:
                db.delete(msg)
        
        db.commit()
        return count, None
    
    @staticmethod
    def search_messages(db: Session, user_id: str, search_text: str, 
                    message_type: str = None) -> List[ChatMessage]:
        query = db.query(ChatMessage).filter(
            (
                (ChatMessage.sender_id == user_id) &
                (ChatMessage.deleted_by_sender == False)
            ) |
            (
                (ChatMessage.receiver_id == user_id) &
                (ChatMessage.deleted_by_receiver == False)
            ),
            ChatMessage.content.ilike(f"%{search_text}%")
        )
        
        if message_type:
            query = query.filter(ChatMessage.message_type == message_type)
        
        return query.order_by(ChatMessage.created_at.desc()).all()
    
    @staticmethod
    def get_messages_by_type(db: Session, user_id: str, message_type: str) -> List[ChatMessage]:
        return db.query(ChatMessage).filter(
            (
                (ChatMessage.sender_id == user_id) &
                (ChatMessage.deleted_by_sender == False)
            ) |
            (
                (ChatMessage.receiver_id == user_id) &
                (ChatMessage.deleted_by_receiver == False)
            ),
            ChatMessage.message_type == message_type
        ).order_by(ChatMessage.created_at.desc()).all()
    
    @staticmethod
    def get_chat_statistics(db: Session, user_id: str) -> dict:
        sent_count = db.query(ChatMessage).filter(
            ChatMessage.sender_id == user_id,
            ChatMessage.deleted_by_sender == False
        ).count()
        
        received_count = db.query(ChatMessage).filter(
            ChatMessage.receiver_id == user_id,
            ChatMessage.deleted_by_receiver == False
        ).count()
        
        types = db.query(
            ChatMessage.message_type,
            func.count(ChatMessage.id).label('count')
        ).filter(
            (
                (ChatMessage.sender_id == user_id) &
                (ChatMessage.deleted_by_sender == False)
            ) |
            (
                (ChatMessage.receiver_id == user_id) &
                (ChatMessage.deleted_by_receiver == False)
            )
        ).group_by(ChatMessage.message_type).all()
        
        type_counts = {msg_type: count for msg_type, count in types}
        
        partners = ChatService.get_chat_partners(db, user_id)
        active_chats = []
        
        for partner_id in partners[:5]:
            msg_count = db.query(ChatMessage).filter(
                (
                    (ChatMessage.sender_id == user_id) & 
                    (ChatMessage.receiver_id == partner_id) &
                    (ChatMessage.deleted_by_sender == False)
                ) |
                (
                    (ChatMessage.sender_id == partner_id) & 
                    (ChatMessage.receiver_id == user_id) &
                    (ChatMessage.deleted_by_receiver == False)
                )
            ).count()
            
            partner = db.query(Student).filter(Student.id == partner_id).first()
            active_chats.append({
                "partner_id": partner_id,
                "partner_username": partner.github_username if partner else None,
                "message_count": msg_count
            })
        
        return {
            "total_sent": sent_count,
            "total_received": received_count,
            "total_messages": sent_count + received_count,
            "message_types": type_counts,
            "active_chats": active_chats,
            "unread_count": ChatService.get_unread_count(db, user_id)
        }