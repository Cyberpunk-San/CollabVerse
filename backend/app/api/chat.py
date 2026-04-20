from fastapi import APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, File, UploadFile, Form, Query, BackgroundTasks, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path
from fastapi.responses import FileResponse
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.models.student import Student
from app.models.request import Request
from app.schemas.chat import ChatMessageResponse
from app.services.chat_service import ChatService
from app.services.file_service import FileUploadService
from app.api.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

from app.api.ws_manager import ws_manager as manager

def is_safe_path(base_path, check_path):
    base_path = Path(base_path).resolve()
    check_path = Path(check_path).resolve()
    return base_path in check_path.parents

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    MAX_FILE_SIZE = 50 * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE//(1024*1024)}MB")
    
    file_info, error = await FileUploadService.save_upload_file(file)
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return {
        "success": True,
        "message": "File uploaded successfully",
        "file_info": file_info
    }

@router.post("/send-file")
async def send_file_message(
    receiver_id: str = Form(...),
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    MAX_FILE_SIZE = 50 * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE//(1024*1024)}MB")
    
    file_info, error = await FileUploadService.save_upload_file(file)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    message, error = ChatService.send_message(
        db=db,
        sender_id=student_id,
        receiver_id=receiver_id,
        content=caption,
        message_type=file_info["message_type"],
        file_url=file_info["file_url"],
        file_name=file_info["file_name"],
        file_size=file_info["file_size"],
        file_mime_type=file_info["file_mime_type"],
        thumbnail_url=file_info["thumbnail_url"]
    )
    
    if error:
        if file_info.get("file_url"):
            FileUploadService.delete_file(file_info["file_url"])
        raise HTTPException(status_code=400, detail=error)
    
    background_tasks.add_task(send_realtime_notification, student_id, receiver_id, message.id)
    return enrich_message_response(db, message)

@router.post("/send-file-url")
def send_file_by_url(
    receiver_id: str = Query(...),
    file_url: str = Query(...),
    file_name: str = Query(...),
    file_size: int = Query(...),
    file_mime_type: str = Query(...),
    caption: Optional[str] = Query(None),
    thumbnail_url: Optional[str] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message_type = FileUploadService.get_file_type(file_mime_type)
    
    message, error = ChatService.send_message(
        db=db,
        sender_id=student_id,
        receiver_id=receiver_id,
        content=caption,
        message_type=message_type,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        file_mime_type=file_mime_type,
        thumbnail_url=thumbnail_url
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return enrich_message_response(db, message)

@router.post("/message", response_model=ChatMessageResponse)#CHECKED
def send_text_message(
    receiver_id: str = Query(..., description="ID of user to send message to"),
    content: str = Query(..., description="Message text"),
    reply_to_id: Optional[str] = Query(None, description="ID of message being replied to"),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    message, error = ChatService.send_message(
        db=db,
        sender_id=student_id,
        receiver_id=receiver_id,
        content=content,
        message_type="text",
        reply_to_id=reply_to_id
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    background_tasks.add_task(send_realtime_notification, student_id, receiver_id, message.id)
    return enrich_message_response(db, message)

@router.get("/conversation/{other_user_id}", response_model=List[ChatMessageResponse])
def get_conversation(
    other_user_id: str,
    limit: int = Query(100, ge=1, le=500),
    before: Optional[str] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    before_time = None
    if before:
        try:
            before_time = datetime.fromisoformat(before.replace('Z', '+00:00'))
        except:
            raise HTTPException(status_code=400, detail="Invalid timestamp format.")
    
    messages = ChatService.get_conversation(
        db=db,
        user1_id=student_id,
        user2_id=other_user_id,
        limit=limit,
        before=before_time
    )
    
    return [enrich_message_response(db, msg) for msg in messages]

@router.get("/chats")
def get_my_chats(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chats = ChatService.get_conversation_previews(db, student_id)
    # Update online status from manager
    for chat in chats:
        chat["is_online"] = manager.is_user_online(chat["user_id"])
        
    return {
        "count": len(chats),
        "chats": chats
    }

@router.get("/connections")
def get_chat_connections(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get accepted requests
    sent_accepted = db.query(Request).filter(
        Request.sender_id == student_id,
        Request.status == "accepted"
    ).all()
    
    received_accepted = db.query(Request).filter(
        Request.receiver_id == student_id,
        Request.status == "accepted"
    ).all()
    
    # 2. Get team members
    current_student = db.query(Student).filter(Student.id == student_id).first()
    teammates = []
    if current_student and current_student.current_team_id:
        teammates = db.query(Student).filter(
            Student.current_team_id == current_student.current_team_id,
            Student.id != student_id
        ).all()

    connections_map = {} # Use a map to avoid duplicates
    
    # Add accepted request partners
    for req in sent_accepted:
        user = db.query(Student).filter(Student.id == req.receiver_id).first()
        if user:
            connections_map[user.id] = {
                "user_id": user.id,
                "username": user.github_username,
                "email": user.email,
                "connected_since": req.updated_at.isoformat() if req.updated_at else req.created_at.isoformat(),
                "is_online": manager.is_user_online(user.id)
            }
    
    for req in received_accepted:
        user = db.query(Student).filter(Student.id == req.sender_id).first()
        if user:
            connections_map[user.id] = {
                "user_id": user.id,
                "username": user.github_username,
                "email": user.email,
                "connected_since": req.updated_at.isoformat() if req.updated_at else req.created_at.isoformat(),
                "is_online": manager.is_user_online(user.id)
            }

    # Add teammates
    for member in teammates:
        if member.id not in connections_map:
            connections_map[member.id] = {
                "user_id": member.id,
                "username": member.github_username,
                "email": member.email,
                "connected_since": member.created_at.isoformat(), # Fallback for team members
                "is_online": manager.is_user_online(member.id)
            }
    
    connections_list = list(connections_map.values())
    
    return {
        "count": len(connections_list),
        "connections": connections_list
    }

@router.get("/unread")
def get_unread_count(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = ChatService.get_unread_count(db, student_id)
    return {
        "unread_count": count,
        "has_unread": count > 0
    }

@router.get("/unread-by-user")
def get_unread_by_user(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    counts = ChatService.get_unread_count_by_user(db, student_id)
    result = {}
    for sender_id, count in counts.items():
        sender = db.query(Student).filter(Student.id == sender_id).first()
        result[sender_id] = {
            "username": sender.github_username if sender else "Unknown",
            "count": count
        }
    
    return result

@router.post("/mark-read/{other_user_id}")
async def mark_as_read(
    other_user_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    count = ChatService.mark_messages_as_read(db, student_id, other_user_id)
    background_tasks.add_task(notify_message_read, student_id, other_user_id)
    return {
        "marked_read": count,
        "message": f"Marked {count} messages as read"
    }

@router.post("/mark-message-read/{message_id}")
async def mark_single_as_read(
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success = ChatService.mark_message_as_read(db, message_id, student_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Message not found or already read")
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if message:
        background_tasks.add_task(manager.send_personal_message, {
            "type": "message_read",
            "message_id": message_id,
            "read_by": student_id
        }, message.sender_id)
    
    return {"success": True, "message": "Message marked as read"}

@router.get("/can-chat/{other_user_id}")
def check_can_chat(
    other_user_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    other_user = db.query(Student).filter(Student.id == other_user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    can_chat = ChatService.can_chat(db, student_id, other_user_id)
    request = db.query(Request).filter(
        (
            (Request.sender_id == student_id) & 
            (Request.receiver_id == other_user_id)
        ) |
        (
            (Request.sender_id == other_user_id) & 
            (Request.receiver_id == student_id)
        )
    ).first()
    
    status = "connected" if can_chat else (request.status if request else "no_connection")
    
    return {
        "can_chat": can_chat,
        "other_user": {
            "id": other_user_id,
            "username": other_user.github_username,
            "email": other_user.email
        },
        "status": status,
        "message": "You can chat!" if can_chat else 
                f"Connection request is {status}" if request else 
                "Send a connection request first"
    }

@router.get("/search")
def search_messages(
    query: str = Query(..., min_length=1),
    message_type: Optional[str] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = ChatService.search_messages(db, student_id, query, message_type)
    return {
        "count": len(messages),
        "query": query,
        "messages": [enrich_message_response(db, msg) for msg in messages]
    }

@router.get("/files/{message_type}")
def get_files_by_type(
    message_type: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = ChatService.get_messages_by_type(db, student_id, message_type)
    
    files = []
    for msg in messages:
        if msg.file_url:
            files.append({
                "id": msg.id,
                "file_url": msg.file_url,
                "file_name": msg.file_name,
                "file_size": msg.file_size,
                "file_type": msg.file_mime_type,
                "thumbnail_url": msg.thumbnail_url,
                "sender_id": msg.sender_id,
                "sender_username": msg.sender.github_username if msg.sender else None,
                "sent_at": msg.created_at.isoformat(),
                "caption": msg.content
            })
    
    return {
        "count": len(files),
        "message_type": message_type,
        "files": files
    }

@router.get("/stats")
def get_chat_stats(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = ChatService.get_chat_statistics(db, student_id)
    return stats

@router.post("/message/{message_id}/react")
async def react_to_message_endpoint(
    message_id: str,
    emoji: str = Body(..., embed=True),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    reaction, error = ChatService.react_to_message(db, message_id, student_id, emoji)
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if message:
        # Notify sender and receiver about the reaction
        notification_data = {
            "type": "message_reacted",
            "message_id": message_id,
            "reactor_id": student_id,
            "emoji": emoji,
            "reaction_id": reaction["id"]
        }
        background_tasks.add_task(manager.send_personal_message, notification_data, message.sender_id)
        if message.receiver_id != message.sender_id:
            background_tasks.add_task(manager.send_personal_message, notification_data, message.receiver_id)
    
    return {"success": True, "reactions": reaction}

@router.post("/message/{message_id}/pin")
async def pin_message_endpoint(
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = ChatService.pin_message(db, message_id, student_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if message:
        notification = {
            "type": "message_pinned",
            "message_id": message_id,
            "pinned_by": student_id
        }
        background_tasks.add_task(manager.send_personal_message, notification, message.sender_id)
        if message.receiver_id != message.sender_id:
            background_tasks.add_task(manager.send_personal_message, notification, message.receiver_id)
            
    return {"success": True}

@router.delete("/message/{message_id}/pin")
async def unpin_message_endpoint(
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = ChatService.unpin_message(db, message_id, student_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if message:
        notification = {
            "type": "message_unpinned",
            "message_id": message_id
        }
        background_tasks.add_task(manager.send_personal_message, notification, message.sender_id)
        if message.receiver_id != message.sender_id:
            background_tasks.add_task(manager.send_personal_message, notification, message.receiver_id)
            
    return {"success": True}

@router.delete("/message/{message_id}")
def delete_message_for_me(
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.sender_id == student_id:
        message.deleted_by_sender = True
    elif message.receiver_id == student_id:
        message.deleted_by_receiver = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if message.deleted_by_sender and message.deleted_by_receiver:
        same_file_count = db.query(ChatMessage).filter(
            ChatMessage.file_url == message.file_url
        ).count()
        
        if same_file_count == 1:
            if message.file_url and os.path.exists(message.file_url.lstrip('/')):
                os.remove(message.file_url.lstrip('/'))
            if message.thumbnail_url and os.path.exists(message.thumbnail_url.lstrip('/')):
                os.remove(message.thumbnail_url.lstrip('/'))
        db.delete(message)
    
    db.commit()
    return {"success": True, "message": "Message deleted from your view"}

@router.delete("/conversation/{other_user_id}")
def clear_conversation_for_me(
    other_user_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(ChatMessage).filter(
        (
            (ChatMessage.sender_id == student_id) &
            (ChatMessage.receiver_id == other_user_id) &
            (ChatMessage.deleted_by_sender == False)
        ) |
        (
            (ChatMessage.sender_id == other_user_id) &
            (ChatMessage.receiver_id == student_id) &
            (ChatMessage.deleted_by_receiver == False)
        )
    ).all()
    
    for msg in messages:
        if msg.sender_id == student_id:
            msg.deleted_by_sender = True
        else:
            msg.deleted_by_receiver = True
    
    db.commit()
    return {"success": True, "deleted_count": len(messages)}



@router.get("/download/{message_id}")
async def download_file(
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if student_id not in [message.sender_id, message.receiver_id]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if not message.file_url or not message.file_name:
        raise HTTPException(status_code=404, detail="No file attached")
    
    file_path = message.file_url.lstrip('/')
    
    if not is_safe_path("uploads", file_path):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=file_path,
        filename=message.file_name,
        media_type=message.file_mime_type
    )

@router.patch("/message/{message_id}")
def edit_message(
    message_id: str,
    new_content: str = Query(...),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message.sender_id != student_id:
        raise HTTPException(status_code=403, detail="Only sender can edit")
    
    time_diff = datetime.now() - message.created_at
    if time_diff.total_seconds() > 900:
        raise HTTPException(status_code=400, detail="Cannot edit after 15 minutes")
    
    if message.message_type != "text":
        raise HTTPException(status_code=400, detail="Only text messages can be edited")
    
    message.content = new_content
    message.edited_at = datetime.now()
    db.commit()
    
    background_tasks.add_task(manager.send_personal_message, {
        "type": "message_edited",
        "message_id": message_id,
        "new_content": new_content,
        "edited_at": message.edited_at.isoformat()
    }, message.receiver_id)
    
    return {"success": True, "message": "Message updated"}

async def handle_chat_message(sender_id: str, data: dict):
    receiver_id = data.get("to")
    text = data.get("text")

    if not receiver_id or not text:
        await manager.send_personal_message({
            "type": "error",
            "message": "Missing 'to' or 'text'"
        }, sender_id)
        return

    db = next(get_db())
    try:
        message, error = ChatService.send_message(
            db=db,
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=text,
            message_type="text"
        )
    finally:
        db.close()

    if error:
        await manager.send_personal_message({
            "type": "error",
            "message": error
        }, sender_id)
        return

    await manager.send_personal_message({
        "type": "message_sent",
        "message_id": message.id
    }, sender_id)

    receiver_msg = {
        "type": "new_message",
        "from": sender_id,
        "text": text,
        "message_id": message.id,
        "time": message.created_at.isoformat(),
        "message_type": "text"
    }
    await manager.send_personal_message(receiver_msg, receiver_id)

async def handle_file_message(sender_id: str, data: dict):
    receiver_id = data.get("to")
    file_url = data.get("file_url")
    file_name = data.get("file_name")
    file_size = data.get("file_size")
    file_type = data.get("file_type")
    caption = data.get("caption")
    thumbnail_url = data.get("thumbnail_url")

    if not receiver_id or not file_url:
        await manager.send_personal_message({
            "type": "error",
            "message": "Missing 'to' or 'file_url'"
        }, sender_id)
        return

    db = next(get_db())
    try:
        message_type = FileUploadService.get_file_type(file_type)
        message, error = ChatService.send_message(
            db=db,
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=caption,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            file_mime_type=file_type,
            thumbnail_url=thumbnail_url
        )
    finally:
        db.close()

    if error:
        await manager.send_personal_message({
            "type": "error",
            "message": error
        }, sender_id)
        return

    await manager.send_personal_message({
        "type": "message_sent",
        "message_id": message.id
    }, sender_id)

    receiver_msg = {
        "type": "new_message",
        "from": sender_id,
        "file_url": file_url,
        "file_name": file_name,
        "file_size": file_size,
        "file_type": file_type,
        "caption": caption,
        "thumbnail_url": thumbnail_url,
        "message_id": message.id,
        "time": message.created_at.isoformat(),
        "message_type": message_type
    }
    await manager.send_personal_message(receiver_msg, receiver_id)

async def handle_read_receipt(user_id: str, message_id: str):
    db = next(get_db())
    try:
        success = ChatService.mark_message_as_read(db, message_id, user_id)
        if success:
            message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
            sender_id = message.sender_id if message else None
    finally:
        db.close()

    if success and sender_id:
        await manager.send_personal_message({
            "type": "message_read",
            "message_id": message_id,
            "read_by": user_id
        }, sender_id)

async def send_realtime_notification(sender_id: str, receiver_id: str, message_id: str):
    db = next(get_db())
    try:
        message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
        if not message:
            return
        
        sender = db.query(Student).filter(Student.id == sender_id).first()
        sender_username = sender.github_username if sender else None
    finally:
        db.close()

    notification = {
        "type": "new_message",
        "from": sender_id,
        "from_username": sender_username,
        "text": message.content,
        "message_id": message.id,
        "time": message.created_at.isoformat(),
        "message_type": message.message_type
    }

    if message.file_url:
        notification.update({
            "file_url": message.file_url,
            "file_name": message.file_name,
            "file_size": message.file_size,
            "file_type": message.file_mime_type,
            "thumbnail_url": message.thumbnail_url,
            "caption": message.content
        })

    await manager.send_personal_message(notification, receiver_id)

async def notify_message_read(reader_id: str, sender_id: str):
    await manager.send_personal_message({
        "type": "messages_read",
        "read_by": reader_id,
        "timestamp": datetime.now().isoformat()
    }, sender_id)

def enrich_message_response(db: Session, message: ChatMessage) -> dict:
    sender = db.query(Student).filter(Student.id == message.sender_id).first()
    receiver = db.query(Student).filter(Student.id == message.receiver_id).first()
    
    response = {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "message_type": message.message_type,
        "is_read": message.is_read,
        "created_at": message.created_at,
        "sender_username": sender.github_username if sender else None,
        "receiver_username": receiver.github_username if receiver else None,
        "is_pinned": message.is_pinned,
        "pinned_at": message.pinned_at,
        "reply_to_id": message.reply_to_id,
        "reactions": message.reactions or {}
    }

    if message.reply_to_id:
        reply_msg = db.query(ChatMessage).filter(ChatMessage.id == message.reply_to_id).first()
        if reply_msg:
            # Recursively enrich but limit depth to avoid infinite loops if any (shouldn't happen with IDs)
            # Actually, just provide a simple version to avoid recursion complexity
            reply_sender = db.query(Student).filter(Student.id == reply_msg.sender_id).first()
            response["reply_to"] = {
                "id": reply_msg.id,
                "sender_id": reply_msg.sender_id,
                "receiver_id": reply_msg.receiver_id,
                "content": reply_msg.content,
                "message_type": reply_msg.message_type,
                "is_read": reply_msg.is_read,
                "created_at": reply_msg.created_at,
                "sender_username": reply_sender.github_username if reply_sender else "Unknown"
            }
    
    if message.file_url:
        response.update({
            "file_url": message.file_url,
            "file_name": message.file_name,
            "file_size": message.file_size,
            "file_mime_type": message.file_mime_type,
            "thumbnail_url": message.thumbnail_url
        })
    
    if message.edited_at:
        response["edited_at"] = message.edited_at
    
    return response