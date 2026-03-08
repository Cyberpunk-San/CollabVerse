from sqlalchemy import Column, String, DateTime, Text, Boolean, JSON, Integer, ForeignKey, UniqueConstraint, Table
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

# ==================== GROUP CORE MODELS ====================

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    creator_id = Column(String, nullable=False)
    is_private = Column(Boolean, default=True)
    settings = Column(JSON, default={
        "allow_mentions": True,
        "allow_reactions": True,
        "allow_editing": True,
        "allow_pinning": True,
        "admin_only_messages": False,
        "slow_mode": 0,  # seconds between messages (0 = disabled)
        "mention_notify_all": False
    })
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("GroupMessage", back_populates="group", cascade="all, delete-orphan")
    invites = relationship("GroupInvite", back_populates="group", cascade="all, delete-orphan")
    pinned_messages = relationship("PinnedMessage", back_populates="group", cascade="all, delete-orphan")
    polls = relationship("GroupPoll", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)
    role = Column(String, default="member")  # member, admin, creator
    joined_at = Column(DateTime, default=datetime.utcnow)
    muted_until = Column(DateTime, nullable=True)
    settings = Column(JSON, default={
        "notify_mentions": True,
        "notify_all_messages": True,
        "notify_reactions": False,
        "mute_group": False
    })
    
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("Student", foreign_keys=[user_id], primaryjoin="GroupMember.user_id == Student.id")
    
    __table_args__ = (UniqueConstraint('group_id', 'user_id', name='uq_group_user'),)


class GroupMessage(Base):
    __tablename__ = "group_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    message_type = Column(String, default="text")  # text, image, video, audio, document, poll
    file_url = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    file_mime_type = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    reply_to_id = Column(String, ForeignKey("group_messages.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)
    edit_history = Column(JSON, default=[])
    deleted_for_all = Column(Boolean, default=False)
    
    # Mention tracking
    mentioned_users = Column(JSON, default=[])  # List of user_ids mentioned
    mention_type = Column(String, default="none")  # none, user, here, all
    
    # Relationships
    group = relationship("Group", back_populates="messages")
    sender = relationship("Student", foreign_keys=[sender_id], primaryjoin="GroupMessage.sender_id == Student.id")
    reply_to = relationship("GroupMessage", remote_side=[id])
    
    # Additional relationships
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    mentions = relationship("MessageMention", back_populates="message", cascade="all, delete-orphan")
    reads = relationship("GroupMessageRead", back_populates="message", cascade="all, delete-orphan")
    poll = relationship("GroupPoll", back_populates="message", uselist=False, cascade="all, delete-orphan")


# ==================== MENTION FEATURES ====================

class MessageMention(Base):
    __tablename__ = "message_mentions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String, ForeignKey("group_messages.id", ondelete="CASCADE"), nullable=False)
    mentioned_user_id = Column(String, nullable=False)  # User who was mentioned
    mentioner_id = Column(String, nullable=False)  # User who mentioned
    mention_text = Column(String, nullable=True)  # The actual @username text
    created_at = Column(DateTime, default=datetime.utcnow)
    notified = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    message = relationship("GroupMessage", back_populates="mentions")
    mentioned_user = relationship("Student", foreign_keys=[mentioned_user_id], 
                                 primaryjoin="MessageMention.mentioned_user_id == Student.id")
    mentioner = relationship("Student", foreign_keys=[mentioner_id], 
                            primaryjoin="MessageMention.mentioner_id == Student.id")
    
    __table_args__ = (UniqueConstraint('message_id', 'mentioned_user_id', name='uq_message_mention'),)


class UserMentionSettings(Base):
    __tablename__ = "user_mention_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    notify_on_mention = Column(Boolean, default=True)
    highlight_mentions = Column(Boolean, default=True)
    sound_notification = Column(Boolean, default=True)
    desktop_notification = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    group = relationship("Group")
    user = relationship("Student", foreign_keys=[user_id], primaryjoin="UserMentionSettings.user_id == Student.id")
    
    __table_args__ = (UniqueConstraint('user_id', 'group_id', name='uq_user_group_settings'),)


# ==================== REACTIONS & READ STATUS ====================

class MessageReaction(Base):
    __tablename__ = "message_reactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String, ForeignKey("group_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)
    emoji = Column(String, nullable=False)  # e.g., "👍", "❤️", "😂"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    message = relationship("GroupMessage", back_populates="reactions")
    user = relationship("Student", foreign_keys=[user_id], primaryjoin="MessageReaction.user_id == Student.id")
    
    __table_args__ = (
        UniqueConstraint('message_id', 'user_id', 'emoji', name='uq_message_user_emoji'),
    )


class GroupMessageRead(Base):
    __tablename__ = "group_message_reads"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String, ForeignKey("group_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)
    read_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    message = relationship("GroupMessage", back_populates="reads")
    user = relationship("Student", foreign_keys=[user_id], primaryjoin="GroupMessageRead.user_id == Student.id")
    
    __table_args__ = (UniqueConstraint('message_id', 'user_id', name='uq_message_user'),)


# ==================== ADDITIONAL FEATURES ====================

class PinnedMessage(Base):
    __tablename__ = "pinned_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(String, ForeignKey("group_messages.id", ondelete="CASCADE"), nullable=False)
    pinned_by = Column(String, nullable=False)
    pinned_at = Column(DateTime, default=datetime.utcnow)
    note = Column(Text, nullable=True)  # Why this was pinned
    
    # Relationships
    group = relationship("Group", back_populates="pinned_messages")
    message = relationship("GroupMessage")
    pinned_by_user = relationship("Student", foreign_keys=[pinned_by], 
                                 primaryjoin="PinnedMessage.pinned_by == Student.id")
    
    __table_args__ = (UniqueConstraint('group_id', 'message_id', name='uq_group_message_pinned'),)


class GroupPoll(Base):
    __tablename__ = "group_polls"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(String, ForeignKey("group_messages.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # [{id, text, votes: []}]
    is_multiple = Column(Boolean, default=False)
    is_anonymous = Column(Boolean, default=False)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    group = relationship("Group", back_populates="polls")
    message = relationship("GroupMessage", back_populates="poll")
    votes = relationship("PollVote", back_populates="poll", cascade="all, delete-orphan")


class PollVote(Base):
    __tablename__ = "poll_votes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    poll_id = Column(String, ForeignKey("group_polls.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, nullable=False)
    option_ids = Column(JSON, nullable=False)  # List of selected option IDs
    voted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    poll = relationship("GroupPoll", back_populates="votes")
    user = relationship("Student", foreign_keys=[user_id], primaryjoin="PollVote.user_id == Student.id")
    
    __table_args__ = (UniqueConstraint('poll_id', 'user_id', name='uq_poll_user'),)


# ==================== INVITES ====================

class GroupInvite(Base):
    __tablename__ = "group_invites"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    inviter_id = Column(String, nullable=False)
    invite_code = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, default=1)
    used_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    group = relationship("Group", back_populates="invites")
    inviter = relationship("Student", foreign_keys=[inviter_id], 
                        primaryjoin="GroupInvite.inviter_id == Student.id")