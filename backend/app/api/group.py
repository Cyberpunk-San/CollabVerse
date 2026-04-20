from fastapi import APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, File, UploadFile, Form, Query, BackgroundTasks, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import asyncio
import json
import uuid
from datetime import datetime, timedelta
import os
from fastapi.responses import FileResponse

from app.core.database import get_db
from app.models.group import Group, GroupMember, GroupMessage, GroupMessageRead, GroupInvite, MessageReaction, MessageMention, UserMentionSettings, PinnedMessage, GroupPoll, PollVote
from app.models.student import Student
from app.schemas.group import (
    GroupCreate, GroupResponse, GroupMemberResponse, GroupMessageCreate, 
    GroupMessageResponse, GroupInviteResponse, MessageReactionResponse,
    PinnedMessageResponse, PollCreate, PollResponse, MentionCreate,
    UserMentionSettingsResponse, UserMentionStats
)
from app.services.group_service import GroupService
from app.services.file_service import FileUploadService

router = APIRouter(prefix="/groups", tags=["groups"])

class GroupConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.group_connections: Dict[str, List[str]] = {}
        self.user_status: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, accept: bool = True):
        if accept:
            await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_status[user_id] = {"online": True, "last_seen": datetime.utcnow()}
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_status:
            self.user_status[user_id]["online"] = False
        
        for group_id, users in self.group_connections.items():
            if user_id in users:
                users.remove(user_id)
    
    async def join_group(self, user_id: str, group_id: str):
        if group_id not in self.group_connections:
            self.group_connections[group_id] = []
        
        if user_id not in self.group_connections[group_id]:
            self.group_connections[group_id].append(user_id)
        
        await self.send_to_group(group_id, {
            "type": "user_online",
            "user_id": user_id,
            "group_id": group_id
        }, exclude_user=user_id)
    
    async def leave_group(self, user_id: str, group_id: str):
        if group_id in self.group_connections and user_id in self.group_connections[group_id]:
            self.group_connections[group_id].remove(user_id)
        
        await self.send_to_group(group_id, {
            "type": "user_offline",
            "user_id": user_id,
            "group_id": group_id
        }, exclude_user=user_id)
    
    async def send_to_group(self, group_id: str, message: dict, exclude_user: str = None):
        if group_id in self.group_connections:
            for user_id in self.group_connections[group_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_json(message)
                    except:
                        pass
    
    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                pass
    
    async def send_to_users(self, user_ids: List[str], message: dict):
        for user_id in user_ids:
            await self.send_to_user(user_id, message)
    
    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.user_status and self.user_status[user_id]["online"]
    
    def get_online_users(self, group_id: str) -> List[str]:
        if group_id not in self.group_connections:
            return []
        
        online_users = []
        for user_id in self.group_connections[group_id]:
            if self.is_user_online(user_id):
                online_users.append(user_id)
        
        return online_users

group_manager = GroupConnectionManager()

from app.api.auth import get_current_user


@router.post("/create", response_model=GroupResponse)
async def create_group(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    member_ids: str = Form("[]"),
    is_private: bool = Form(True),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: create_group called with name={name}, member_ids={member_ids}, is_private={is_private}")
    try:
        if isinstance(member_ids, str):
            member_list = json.loads(member_ids)
        else:
            member_list = member_ids
            
        if not isinstance(member_list, list):
            member_list = [member_list] if member_list else []
    except Exception as e:
        print(f"DEBUG: Failed to parse member_ids: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid member_ids format: {str(e)}")
    
    group, error = GroupService.create_group(
        db=db,
        creator_id=student_id,
        name=name,
        description=description,
        member_ids=member_list,
        is_private=is_private
    )

    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Notify new members
    for member_id in member_list:
        background_tasks.add_task(group_manager.send_to_user, member_id, {
            "type": "group_invite",
            "group_id": group.id,
            "group_name": group.name,
            "inviter_id": student_id
        })

    
    return enrich_group_response(db, group, student_id)

@router.get("/my-groups", response_model=List[GroupResponse])
def get_my_groups(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    groups = GroupService.get_user_groups(db, student_id)
    return [enrich_group_response(db, group, student_id) for group in groups]

@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group, error = GroupService.get_group_details(db, group_id, student_id)
    if error:
        raise HTTPException(status_code=404, detail=error)
    
    return enrich_group_response(db, group, student_id)

@router.get("/{group_id}/members", response_model=List[GroupMemberResponse])
def get_group_members(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group, error = GroupService.get_group_details(db, group_id, student_id)
    if error:
        raise HTTPException(status_code=404, detail=error)
    
    members = GroupService.get_group_members(db, group_id)
    return members

@router.delete("/{group_id}")
def delete_group(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group.creator_id != student_id:
        raise HTTPException(status_code=403, detail="Only group creator can delete group")
    
    db.delete(group)
    db.commit()
    
    # Notify all members
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    for member in members:
        asyncio.create_task(group_manager.send_to_user(member.user_id, {
            "type": "group_deleted",
            "group_id": group_id,
            "group_name": group.name
        }))
    
    return {"success": True, "message": "Group deleted"}

@router.patch("/{group_id}")
def update_group(
    group_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member or member.role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Only admins can update group")
    
    if name is not None:
        group.name = name
    if description is not None:
        group.description = description
    
    group.updated_at = datetime.utcnow()
    db.commit()
    
    # Notify group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "group_updated",
        "group_id": group_id,
        "updated_by": student_id,
        "changes": {"name": name, "description": description}
    })
    
    return enrich_group_response(db, group, student_id)


@router.post("/{group_id}/members/add")
def add_members_to_group(
    group_id: str,
    user_ids: str = Form("[]"),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    try:
        user_list = json.loads(user_ids)
        if not isinstance(user_list, list):
            raise ValueError
    except:
        raise HTTPException(status_code=400, detail="Invalid user_ids format")
    
    added, error = GroupService.add_members(
        db=db,
        group_id=group_id,
        inviter_id=student_id,
        user_ids=user_list
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Notify new members
    group = db.query(Group).filter(Group.id == group_id).first()
    for user_id in user_list:
        background_tasks.add_task(group_manager.send_to_user, user_id, {
            "type": "group_invite",
            "group_id": group_id,
            "group_name": group.name if group else "Group",
            "inviter_id": student_id
        })
    
    # Notify group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "members_added",
        "group_id": group_id,
        "added_by": student_id,
        "added_count": added
    })
    
    return {"success": True, "added_count": added}

@router.delete("/{group_id}/members/{user_id}")
def remove_group_member(
    group_id: str,
    user_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = GroupService.remove_member(
        db=db,
        group_id=group_id,
        remover_id=student_id,
        user_id=user_id
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Notify removed user
    group = db.query(Group).filter(Group.id == group_id).first()
    background_tasks.add_task(group_manager.send_to_user, user_id, {
        "type": "group_removed",
        "group_id": group_id,
        "group_name": group.name if group else "Group"
    })
    
    # Notify group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "member_removed",
        "group_id": group_id,
        "removed_user": user_id,
        "removed_by": student_id
    })
    
    return {"success": True, "message": "Member removed"}

@router.post("/{group_id}/members/{user_id}/promote")
def promote_to_admin(
    group_id: str,
    user_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = GroupService.update_member_role(
        db=db,
        group_id=group_id,
        admin_id=student_id,
        user_id=user_id,
        new_role="admin"
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Notify promoted user
    group = db.query(Group).filter(Group.id == group_id).first()
    background_tasks.add_task(group_manager.send_to_user, user_id, {
        "type": "group_promoted",
        "group_id": group_id,
        "group_name": group.name if group else "Group"
    })
    
    # Notify group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "member_promoted",
        "group_id": group_id,
        "user_id": user_id,
        "promoted_by": student_id,
        "new_role": "admin"
    })
    
    return {"success": True, "message": "User promoted to admin"}

@router.post("/{group_id}/members/{user_id}/demote")
def demote_to_member(
    group_id: str,
    user_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = GroupService.update_member_role(
        db=db,
        group_id=group_id,
        admin_id=student_id,
        user_id=user_id,
        new_role="member"
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Notify group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "member_demoted",
        "group_id": group_id,
        "user_id": user_id,
        "demoted_by": student_id,
        "new_role": "member"
    })
    
    return {"success": True, "message": "User demoted to member"}

@router.post("/{group_id}/leave")
def leave_group(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = GroupService.remove_member(
        db=db,
        group_id=group_id,
        remover_id=student_id,
        user_id=student_id
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Leave WebSocket group
    background_tasks.add_task(group_manager.leave_group, student_id, group_id)
    
    # Notify group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "member_left",
        "group_id": group_id,
        "user_id": student_id
    })
    
    return {"success": True, "message": "Left group"}


@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
def send_group_message(
    group_id: str,
    content: Optional[str] = Form(None),
    message_type: str = Form("text"),
    file: Optional[UploadFile] = File(None),
    reply_to_id: Optional[str] = Form(None),
    mention_type: str = Form("none"),
    mentioned_users: Optional[str] = Form("[]"),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Parse mentioned users
    try:
        mentioned_users_list = json.loads(mentioned_users) if mentioned_users else []
    except:
        mentioned_users_list = []
    
    # Check if group exists and user is a member
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    # Check slow mode
    slow_mode = group.settings.get("slow_mode", 0) if group.settings else 0
    if slow_mode > 0:
        last_message = db.query(GroupMessage).filter(
            GroupMessage.group_id == group_id,
            GroupMessage.sender_id == student_id
        ).order_by(GroupMessage.created_at.desc()).first()
        
        if last_message:
            time_diff = (datetime.utcnow() - last_message.created_at).total_seconds()
            if time_diff < group.settings["slow_mode"]:
                wait_time = group.settings["slow_mode"] - time_diff
                raise HTTPException(
                    status_code=429,
                    detail=f"Slow mode active. Please wait {wait_time:.0f} seconds."
                )
    
    file_url = None
    file_name = None
    file_size = None
    file_mime_type = None
    thumbnail_url = None
    
    if file:
        file_info, error = FileUploadService.save_upload_file(file)
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        file_url = file_info["file_url"]
        file_name = file_info["file_name"]
        file_size = file_info["file_size"]
        file_mime_type = file_info["file_mime_type"]
        thumbnail_url = file_info["thumbnail_url"]
        
        if message_type == "text":
            message_type = file_info["message_type"]
    
    message, error = GroupService.send_group_message(
        db=db,
        group_id=group_id,
        sender_id=student_id,
        content=content,
        message_type=message_type,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        file_mime_type=file_mime_type,
        thumbnail_url=thumbnail_url,
        reply_to_id=reply_to_id,
        mention_type=mention_type,
        specific_user_ids=mentioned_users_list
    )
    
    if error:
        if file_url:
            FileUploadService.delete_file(file_url)
        raise HTTPException(status_code=400, detail=error)
    
    enriched_message = GroupService.enrich_message_response(db, message, student_id)
    
    # Broadcast to group
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "group_message",
        "group_id": group_id,
        "message": enriched_message
    }, student_id)
    
    # Send mention notifications
    if message.mentions:
        mentioned_user_ids = [m.mentioned_user_id for m in message.mentions]
        sender = db.query(Student).filter(Student.id == student_id).first()
        
        for user_id in mentioned_user_ids:
            settings = GroupService.get_mention_settings(db, user_id, group_id)
            
            if settings.get("notify_on_mention", True):
                background_tasks.add_task(group_manager.send_to_user, user_id, {
                    "type": "mention_notification",
                    "group_id": group_id,
                    "group_name": group.name if group else "",
                    "message_id": message.id,
                    "message_preview": content[:100] if content else "",
                    "mentioner_id": student_id,
                    "mentioner_username": sender.github_username if sender else "",
                    "mention_type": mention_type
                })
    
    return enriched_message

@router.get("/{group_id}/messages", response_model=List[Dict])
def get_group_messages(
    group_id: str,
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
            raise HTTPException(status_code=400, detail="Invalid timestamp format")
    
    messages, error = GroupService.get_group_messages(
        db=db,
        group_id=group_id,
        user_id=student_id,
        limit=limit,
        before=before_time
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    enriched_messages = []
    for msg in messages:
        enriched = GroupService.enrich_message_response(db, msg, student_id)
        enriched_messages.append(enriched)
    
    return enriched_messages

@router.delete("/{group_id}/messages/{message_id}")
def delete_group_message(
    group_id: str,
    message_id: str,
    delete_for_all: bool = Query(False),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = GroupService.delete_group_message(
        db=db,
        message_id=message_id,
        user_id=student_id,
        delete_for_all=delete_for_all
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    if delete_for_all:
        background_tasks.add_task(group_manager.send_to_group, group_id, {
            "type": "message_deleted",
            "group_id": group_id,
            "message_id": message_id,
            "deleted_by": student_id
        })
    
    return {"success": True, "message": "Message deleted"}

@router.post("/{group_id}/messages/batch/read")
def batch_mark_messages_read(
    group_id: str,
    message_ids: List[str] = Body(..., embed=True),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify group membership
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
        
    count = GroupService.batch_mark_as_read(db, student_id, message_ids)
    return {"success": True, "message": f"Marked {count} messages as read", "count": count}

@router.post("/{group_id}/messages/batch/delete")
def batch_delete_messages(
    group_id: str,
    message_ids: List[str] = Body(..., embed=True),
    delete_for_all: bool = Query(False),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Verify group membership
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
        
    count = GroupService.batch_delete_messages(db, student_id, message_ids, delete_for_all)
    
    if delete_for_all and count > 0:
        background_tasks.add_task(group_manager.send_to_group, group_id, {
            "type": "messages_deleted",
            "group_id": group_id,
            "message_ids": message_ids,
            "deleted_by": student_id
        })
        
    return {"success": True, "message": f"Deleted {count} messages", "count": count}

@router.post("/{group_id}/messages/batch/react")
def batch_react_to_messages(
    group_id: str,
    message_ids: List[str] = Body(..., embed=True),
    emoji: str = Query(...),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # Verify group membership
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
        
    count = GroupService.batch_add_reaction(db, student_id, message_ids, emoji)
    
    if count > 0:
        background_tasks.add_task(group_manager.send_to_group, group_id, {
            "type": "messages_reacted",
            "group_id": group_id,
            "message_ids": message_ids,
            "emoji": emoji,
            "user_id": student_id
        })
        
    return {"success": True, "message": f"Added reaction to {count} messages", "count": count}


@router.patch("/{group_id}/messages/{message_id}")
def edit_group_message(
    group_id: str,
    message_id: str,
    new_content: str = Query(...),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    message, error = GroupService.edit_message(
        db=db,
        message_id=message_id,
        user_id=student_id,
        new_content=new_content
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "message_edited",
        "message_id": message_id,
        "group_id": group_id,
        "new_content": new_content,
        "edited_at": message.edited_at.isoformat(),
        "edited_by": student_id
    })
    
    return {
        "success": True,
        "message": "Message updated",
        "edited_at": message.edited_at,
        "content": new_content
    }

@router.get("/{group_id}/messages/{message_id}/history")
def get_message_edit_history(
    group_id: str,
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history, error = GroupService.get_edit_history(
        db=db,
        message_id=message_id,
        user_id=student_id
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return {
        "message_id": message_id,
        "history": history
    }


@router.post("/{group_id}/messages/{message_id}/react")
def react_to_message(
    group_id: str,
    message_id: str,
    emoji: str = Query(..., min_length=1, max_length=10),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    reaction, error = GroupService.add_reaction(
        db=db,
        message_id=message_id,
        user_id=student_id,
        emoji=emoji
    )
    
    if error and "removed" not in error:
        raise HTTPException(status_code=400, detail=error)
    
    message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
    reactions = {}
    if message:
        for r in message.reactions:
            if r.emoji not in reactions:
                reactions[r.emoji] = {"count": 0, "users": []}
            reactions[r.emoji]["count"] += 1
            reactions[r.emoji]["users"].append(r.user_id)
    
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "message_reaction",
        "message_id": message_id,
        "emoji": emoji,
        "user_id": student_id,
        "action": "added" if reaction else "removed",
        "reactions": reactions
    })
    
    return {
        "success": True,
        "message": error if "removed" in error else "Reaction added",
        "reactions": reactions
    }

@router.get("/{group_id}/messages/{message_id}/reactions")
def get_message_reactions(
    group_id: str,
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    reactions = {}
    for reaction in message.reactions:
        if reaction.emoji not in reactions:
            reactions[reaction.emoji] = []
        
        user = db.query(Student).filter(Student.id == reaction.user_id).first()
        reactions[reaction.emoji].append({
            "user_id": reaction.user_id,
            "username": user.github_username if user else None,
            "reacted_at": reaction.created_at
        })
    
    result = {}
    for emoji, users in reactions.items():
        result[emoji] = {
            "count": len(users),
            "users": users[:3],
            "you_reacted": any(user["user_id"] == student_id for user in users)
        }
    
    return {
        "message_id": message_id,
        "reactions": result
    }


@router.get("/mentions", response_model=List[Dict])
def get_my_mentions(
    unread_only: bool = Query(False),
    group_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mentions = GroupService.get_user_mentions(
        db=db,
        user_id=student_id,
        group_id=group_id,
        unread_only=unread_only,
        limit=limit
    )
    return mentions

@router.get("/mentions/unread-count")
def get_unread_mention_count(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unread_count = db.query(MessageMention).filter(
        MessageMention.mentioned_user_id == student_id,
        MessageMention.read_at.is_(None)
    ).count()
    
    return {"unread_mentions": unread_count}

@router.post("/mentions/{mention_id}/read")
def mark_mention_as_read(
    mention_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success, error = GroupService.mark_mention_as_read(
        db=db,
        mention_id=mention_id,
        user_id=student_id
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return {"success": True, "message": "Mention marked as read"}

@router.post("/mentions/mark-all-read")
def mark_all_mentions_as_read(
    group_id: Optional[str] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = GroupService.mark_all_mentions_as_read(
        db=db,
        user_id=student_id,
        group_id=group_id
    )
    
    return {
        "success": True,
        "message": f"Marked {count} mentions as read",
        "count": count
    }

@router.get("/mentions/settings", response_model=UserMentionSettingsResponse)
def get_mention_settings(
    group_id: Optional[str] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = GroupService.get_mention_settings(
        db=db,
        user_id=student_id,
        group_id=group_id
    )
    return settings

@router.put("/mentions/settings")
def update_mention_settings(
    group_id: Optional[str] = Query(None),
    notify_on_mention: Optional[bool] = Query(None),
    highlight_mentions: Optional[bool] = Query(None),
    sound_notification: Optional[bool] = Query(None),
    desktop_notification: Optional[bool] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings, error = GroupService.update_mention_settings(
        db=db,
        user_id=student_id,
        group_id=group_id,
        notify_on_mention=notify_on_mention,
        highlight_mentions=highlight_mentions,
        sound_notification=sound_notification,
        desktop_notification=desktop_notification
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return {
        "success": True,
        "message": "Settings updated",
        "settings": {
            "id": settings.id,
            "user_id": settings.user_id,
            "group_id": settings.group_id,
            "notify_on_mention": settings.notify_on_mention,
            "highlight_mentions": settings.highlight_mentions,
            "sound_notification": settings.sound_notification,
            "desktop_notification": settings.desktop_notification
        }
    }

@router.get("/mentions/stats", response_model=UserMentionStats)
def get_mention_statistics(
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = GroupService.get_mention_statistics(db, student_id)
    return stats


@router.post("/{group_id}/messages/{message_id}/pin")
def pin_message(
    group_id: str,
    message_id: str,
    note: Optional[str] = Query(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    pinned, error = GroupService.pin_message(
        db=db,
        group_id=group_id,
        message_id=message_id,
        user_id=student_id,
        note=note
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "message_pinned",
        "group_id": group_id,
        "message_id": message_id,
        "pinned_by": student_id,
        "note": note
    })
    
    return {
        "success": True,
        "message": "Message pinned",
        "pinned_message": {
            "id": pinned.id,
            "message_id": message_id,
            "pinned_by": student_id,
            "pinned_at": pinned.pinned_at,
            "note": note
        }
    }

@router.delete("/{group_id}/messages/{message_id}/pin")
def unpin_message(
    group_id: str,
    message_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    success, error = GroupService.unpin_message(
        db=db,
        group_id=group_id,
        message_id=message_id,
        user_id=student_id
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "message_unpinned",
        "group_id": group_id,
        "message_id": message_id,
        "unpinned_by": student_id
    })
    
    return {"success": True, "message": "Message unpinned"}

@router.get("/{group_id}/pins", response_model=List[PinnedMessageResponse])
def get_pinned_messages(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    pins = GroupService.get_pinned_messages(db, group_id)
    return pins


@router.post("/{group_id}/polls")
def create_poll(
    group_id: str,
    question: str = Form(...),
    options: str = Form(...),
    is_multiple: bool = Form(False),
    is_anonymous: bool = Form(False),
    ends_at: Optional[str] = Form(None),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    try:
        options_list = json.loads(options)
        if not isinstance(options_list, list) or len(options_list) < 2:
            raise ValueError
    except:
        raise HTTPException(status_code=400, detail="Options must be a JSON array with at least 2 items")
    
    ends_at_dt = None
    if ends_at:
        try:
            ends_at_dt = datetime.fromisoformat(ends_at.replace('Z', '+00:00'))
        except:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    poll, error = GroupService.create_poll(
        db=db,
        group_id=group_id,
        sender_id=student_id,
        question=question,
        options=options_list,
        is_multiple=is_multiple,
        is_anonymous=is_anonymous,
        ends_at=ends_at_dt
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    message = db.query(GroupMessage).filter(GroupMessage.id == poll.message_id).first()
    if message:
        enriched_message = GroupService.enrich_message_response(db, message, student_id)
        
        background_tasks.add_task(group_manager.send_to_group, group_id, {
            "type": "poll_created",
            "group_id": group_id,
            "poll": enriched_message["poll"],
            "message": enriched_message
        })
    
    return {
        "success": True,
        "message": "Poll created",
        "poll_id": poll.id,
        "message_id": poll.message_id
    }

@router.post("/polls/{poll_id}/vote")
def vote_in_poll(
    poll_id: str,
    option_ids: str = Form("[]"),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    try:
        option_ids_list = json.loads(option_ids)
        if not isinstance(option_ids_list, list):
            raise ValueError
    except:
        raise HTTPException(status_code=400, detail="option_ids must be a JSON array")
    
    poll, error = GroupService.vote_in_poll(
        db=db,
        poll_id=poll_id,
        user_id=student_id,
        option_ids=option_ids_list
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    results = GroupService.get_poll_results(db, poll_id, student_id)
    
    if poll.is_anonymous:
        background_tasks.add_task(group_manager.send_to_user, student_id, {
            "type": "poll_vote_updated",
            "poll_id": poll_id,
            "message_id": poll.message_id,
            "your_votes": option_ids_list
        })
    else:
        background_tasks.add_task(group_manager.send_to_group, poll.group_id, {
            "type": "poll_vote_updated",
            "poll_id": poll_id,
            "message_id": poll.message_id,
            "voter_id": student_id,
            "results": results
        })
    
    return {
        "success": True,
        "message": "Vote recorded",
        "results": results
    }

@router.get("/polls/{poll_id}/results")
def get_poll_results(
    poll_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = GroupService.get_poll_results(db, poll_id, student_id)
    
    if not results:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    return results


@router.post("/{group_id}/invites", response_model=GroupInviteResponse)
def create_group_invite(
    group_id: str,
    expires_hours: Optional[int] = Query(24, ge=1, le=720),
    max_uses: int = Query(1, ge=1, le=100),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invite, error = GroupService.create_invite(
        db=db,
        group_id=group_id,
        inviter_id=student_id,
        expires_hours=expires_hours,
        max_uses=max_uses
    )
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return enrich_invite_response(db, invite)

@router.post("/join/{invite_code}", response_model=GroupResponse)
def join_group_via_invite(
    invite_code: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    group, error = GroupService.join_via_invite(db, invite_code, student_id)
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    # Notify group about new member
    user = db.query(Student).filter(Student.id == student_id).first()
    background_tasks.add_task(group_manager.send_to_group, group.id, {
        "type": "new_member",
        "group_id": group.id,
        "user_id": student_id,
        "username": user.github_username if user else "New member"
    }, exclude_user=student_id)
    
    return enrich_group_response(db, group, student_id)

@router.get("/{group_id}/invites", response_model=List[GroupInviteResponse])
def get_group_invites(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group, error = GroupService.get_group_details(db, group_id, student_id)
    if error:
        raise HTTPException(status_code=404, detail=error)
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member or member.role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Only admins can view invites")
    
    invites = db.query(GroupInvite).filter(
        GroupInvite.group_id == group_id
    ).all()
    
    return [enrich_invite_response(db, invite) for invite in invites]

@router.delete("/{group_id}/invites/{invite_id}")
def revoke_invite(
    group_id: str,
    invite_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invite = db.query(GroupInvite).filter(
        GroupInvite.id == invite_id,
        GroupInvite.group_id == group_id
    ).first()
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member or member.role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Only admins can revoke invites")
    
    db.delete(invite)
    db.commit()
    
    return {"success": True, "message": "Invite revoked"}


@router.get("/{group_id}/settings")
def get_group_settings(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group, error = GroupService.get_group_details(db, group_id, student_id)
    if error:
        raise HTTPException(status_code=404, detail=error)
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member or member.role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Only admins can view settings")
    
    return {
        "group_id": group_id,
        "settings": group.settings,
        "can_edit": member.role in ["admin", "creator"]
    }

@router.patch("/{group_id}/settings")
def update_group_settings(
    group_id: str,
    settings: str = Form("{}"),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    try:
        new_settings = json.loads(settings)
        if not isinstance(new_settings, dict):
            raise ValueError
    except:
        raise HTTPException(status_code=400, detail="Settings must be a JSON object")
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member or member.role not in ["admin", "creator"]:
        raise HTTPException(status_code=403, detail="Only admins can update settings")
    
    current_settings = group.settings or {}
    current_settings.update(new_settings)
    group.settings = current_settings
    group.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Notify group about settings change
    background_tasks.add_task(group_manager.send_to_group, group_id, {
        "type": "group_settings_updated",
        "group_id": group_id,
        "updated_by": student_id,
        "settings": group.settings
    })
    
    return {
        "success": True,
        "message": "Settings updated",
        "settings": group.settings
    }


@router.get("/{group_id}/member-settings")
def get_member_settings(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    return {
        "group_id": group_id,
        "settings": member.settings,
        "muted_until": member.muted_until
    }

@router.patch("/{group_id}/member-settings")
def update_member_settings(
    group_id: str,
    settings: str = Form("{}"),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        new_settings = json.loads(settings)
        if not isinstance(new_settings, dict):
            raise ValueError
    except:
        raise HTTPException(status_code=400, detail="Settings must be a JSON object")
    
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    current_settings = member.settings or {}
    current_settings.update(new_settings)
    member.settings = current_settings
    
    db.commit()
    
    return {
        "success": True,
        "message": "Member settings updated",
        "settings": member.settings
    }

@router.post("/{group_id}/mute")
def mute_group(
    group_id: str,
    hours: int = Query(1, ge=1, le=168),
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    member.muted_until = datetime.utcnow() + timedelta(hours=hours)
    db.commit()
    
    return {
        "success": True,
        "message": f"Group muted for {hours} hours",
        "muted_until": member.muted_until
    }

@router.post("/{group_id}/unmute")
def unmute_group(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    member.muted_until = None
    db.commit()
    
    return {"success": True, "message": "Group unmuted"}


@router.get("/{group_id}/stats")
def get_group_stats(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    stats = GroupService.get_group_stats(db, group_id, student_id)
    return stats

@router.get("/{group_id}/unread")
def get_unread_group_messages(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group, error = GroupService.get_group_details(db, group_id, student_id)
    if error:
        raise HTTPException(status_code=404, detail=error)
    
    last_message = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id,
        GroupMessage.deleted_for_all == False
    ).order_by(GroupMessage.created_at.desc()).first()
    
    if not last_message:
        return {"has_unread": False, "unread_count": 0}
    
    has_read = db.query(GroupMessageRead).filter(
        GroupMessageRead.message_id == last_message.id,
        GroupMessageRead.user_id == student_id
    ).first()
    
    return {
        "has_unread": not has_read,
        "unread_count": 1 if not has_read else 0,
        "last_message_time": last_message.created_at if last_message else None
    }

@router.post("/{group_id}/mark-read")
def mark_group_as_read(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group, error = GroupService.get_group_details(db, group_id, student_id)
    if error:
        raise HTTPException(status_code=404, detail=error)
    
    unread_messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id,
        GroupMessage.deleted_for_all == False
    ).outerjoin(
        GroupMessageRead,
        (GroupMessageRead.message_id == GroupMessage.id) & 
        (GroupMessageRead.user_id == student_id)
    ).filter(
        GroupMessageRead.id.is_(None)
    ).all()
    
    for msg in unread_messages:
        read_record = GroupMessageRead(
            id=str(uuid.uuid4()),
            message_id=msg.id,
            user_id=student_id
        )
        db.add(read_record)
    
    db.commit()
    
    return {"success": True, "marked_read": len(unread_messages)}

@router.get("/{group_id}/online")
def get_online_members(
    group_id: str,
    student_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == student_id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    online_users = group_manager.get_online_users(group_id)
    
    # Get user details
    online_members = []
    for user_id in online_users:
        user = db.query(Student).filter(Student.id == user_id).first()
        if user:
            online_members.append({
                "user_id": user_id,
                "username": user.github_username,
                "email": user.email,
                "last_seen": group_manager.user_status[user_id]["last_seen"] if user_id in group_manager.user_status else None
            })
    
    return {
        "group_id": group_id,
        "online_count": len(online_members),
        "online_members": online_members
    }


@router.websocket("/ws/{user_id}")
async def group_websocket(websocket: WebSocket, user_id: str):
    await group_manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "join_group":
                group_id = data.get("group_id")
                if group_id:
                    await group_manager.join_group(user_id, group_id)
                    await websocket.send_json({
                        "type": "group_joined",
                        "group_id": group_id,
                        "online_count": len(group_manager.get_online_users(group_id))
                    })
            
            elif message_type == "leave_group":
                group_id = data.get("group_id")
                if group_id:
                    await group_manager.leave_group(user_id, group_id)
                    await websocket.send_json({
                        "type": "group_left",
                        "group_id": group_id
                    })
            
            elif message_type == "typing":
                group_id = data.get("group_id")
                is_typing = data.get("typing", True)
                if group_id:
                    await group_manager.send_to_group(group_id, {
                        "type": "typing",
                        "group_id": group_id,
                        "user_id": user_id,
                        "typing": is_typing
                    }, exclude_user=user_id)
            
            elif message_type == "mark_read":
                group_id = data.get("group_id")
                message_id = data.get("message_id")
                if group_id and message_id:
                    db = next(get_db())
                    read_record = GroupMessageRead(
                        id=str(uuid.uuid4()),
                        message_id=message_id,
                        user_id=user_id
                    )
                    db.add(read_record)
                    db.commit()
                    
                    message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
                    if message and message.sender_id != user_id:
                        await group_manager.send_to_user(message.sender_id, {
                            "type": "message_read",
                            "group_id": group_id,
                            "message_id": message_id,
                            "read_by": user_id
                        })
            
            elif message_type == "heartbeat":
                if user_id in group_manager.user_status:
                    group_manager.user_status[user_id]["last_seen"] = datetime.utcnow()
                
                for group_id in group_manager.group_connections.get(user_id, []):
                    online_users = group_manager.get_online_users(group_id)
                    await websocket.send_json({
                        "type": "online_status",
                        "group_id": group_id,
                        "online_count": len(online_users)
                    })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
                
    except WebSocketDisconnect:
        group_manager.disconnect(user_id)
    except Exception as e:
        group_manager.disconnect(user_id)


def enrich_group_response(db: Session, group: Group, user_id: str) -> dict:
    member_count = db.query(GroupMember).filter(
        GroupMember.group_id == group.id
    ).count()
    
    user_role = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == user_id
    ).first()
    
    last_message = db.query(GroupMessage).filter(
        GroupMessage.group_id == group.id,
        GroupMessage.deleted_for_all == False
    ).order_by(GroupMessage.created_at.desc()).first()
    
    unread_count = 0
    if last_message:
        has_read = db.query(GroupMessageRead).filter(
            GroupMessageRead.message_id == last_message.id,
            GroupMessageRead.user_id == user_id
        ).first()
        if not has_read:
            unread_count = 1
    
    online_count = len(group_manager.get_online_users(group.id))
    
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "avatar_url": group.avatar_url,
        "creator_id": group.creator_id,
        "is_private": group.is_private,
        "member_count": member_count,
        "online_count": online_count,
        "my_role": user_role.role if user_role else None,
        "settings": group.settings,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "last_message": last_message.content[:50] + "..." if last_message and last_message.content else None,
        "last_message_time": last_message.created_at if last_message else None,
        "unread_count": unread_count
    }

def enrich_invite_response(db: Session, invite: GroupInvite) -> dict:
    group = db.query(Group).filter(Group.id == invite.group_id).first()
    inviter = db.query(Student).filter(Student.id == invite.inviter_id).first()
    
    return {
        "id": invite.id,
        "group_id": invite.group_id,
        "group_name": group.name if group else None,
        "inviter_id": invite.inviter_id,
        "inviter_username": inviter.github_username if inviter else None,
        "invite_code": invite.invite_code,
        "expires_at": invite.expires_at,
        "max_uses": invite.max_uses,
        "used_count": invite.used_count,
        "created_at": invite.created_at
    }