from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==================== MENTION SCHEMAS ====================

class MentionCreate(BaseModel):
    user_ids: List[str]  # List of users to mention
    mention_type: str = "user"  # user, here, all

class MessageMentionResponse(BaseModel):
    id: str
    message_id: str
    mentioned_user_id: str
    mentioner_id: str
    username: str
    mention_text: str
    created_at: datetime
    notified: bool
    read_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class UserMentionSettingsResponse(BaseModel):
    id: str
    user_id: str
    group_id: Optional[str]
    notify_on_mention: bool
    highlight_mentions: bool
    sound_notification: bool
    desktop_notification: bool
    
    class Config:
        from_attributes = True

class UserMentionStats(BaseModel):
    total_mentions: int
    unread_mentions: int
    mentions_by_group: Dict[str, int]
    last_mention_at: Optional[datetime]

# ==================== UPDATED GROUP MESSAGE SCHEMA ====================

class GroupMessageResponse(BaseModel):
    id: str
    group_id: str
    sender_id: str
    sender_username: str
    content: Optional[str]
    message_type: str
    file_url: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    file_mime_type: Optional[str]
    thumbnail_url: Optional[str]
    reply_to_id: Optional[str]
    created_at: datetime
    edited_at: Optional[datetime]
    deleted_for_all: bool
    
    # Mention fields
    mentioned_users: List[str] = []
    mention_type: str = "none"
    
    # Stats
    read_count: int
    total_members: int
    read_by_me: bool
    reactions: Dict[str, Any]
    mentions: List[MessageMentionResponse] = []
    
    # Edit info
    can_edit: bool
    
    class Config:
        from_attributes = True

# ==================== REACTION SCHEMAS ====================

class MessageReactionCreate(BaseModel):
    emoji: str
    message_id: str

class MessageReactionResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    username: str
    emoji: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== PINNED MESSAGES ====================

class PinnedMessageResponse(BaseModel):
    id: str
    group_id: str
    message_id: str
    message_content: str
    pinned_by: str
    pinned_by_username: str
    pinned_at: datetime
    note: Optional[str]
    
    class Config:
        from_attributes = True

# ==================== POLLS ====================

class PollOption(BaseModel):
    id: str
    text: str
    votes: List[str] = []  # user_ids who voted

class PollCreate(BaseModel):
    question: str
    options: List[str]  # List of option texts
    is_multiple: bool = False
    is_anonymous: bool = False
    ends_at: Optional[datetime]

class PollResponse(BaseModel):
    id: str
    group_id: str
    message_id: str
    question: str
    options: List[PollOption]
    is_multiple: bool
    is_anonymous: bool
    ends_at: Optional[datetime]
    created_at: datetime
    total_votes: int
    my_votes: List[str] = []  # option_ids I voted for
    
    class Config:
        from_attributes = True

# ==================== EXISTING SCHEMAS (UPDATED) ====================

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    member_ids: List[str]
    is_private: bool = True

class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    creator_id: str
    is_private: bool
    member_count: int
    created_at: datetime
    updated_at: datetime
    my_role: Optional[str] = None
    settings: Dict[str, Any]
    online_count: int
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0

    
    class Config:
        from_attributes = True

class GroupMemberResponse(BaseModel):
    id: str
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    email: str
    role: str
    joined_at: datetime
    settings: Dict[str, Any]
    is_online: bool = False

    
    class Config:
        from_attributes = True

class GroupMessageCreate(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    reply_to_id: Optional[str] = None
    mentions: Optional[MentionCreate] = None

class GroupInviteResponse(BaseModel):
    id: str
    group_id: str
    group_name: str
    inviter_id: str
    inviter_username: str
    invite_code: str
    expires_at: Optional[datetime]
    max_uses: int
    used_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True