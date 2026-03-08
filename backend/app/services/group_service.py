from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from app.models.group import (
    Group, GroupMember, GroupMessage, GroupMessageRead, GroupInvite,
    MessageReaction, MessageMention, UserMentionSettings, 
    PinnedMessage, GroupPoll, PollVote
)
from app.models.student import Student
import uuid
import re
from datetime import datetime, timedelta
from typing import List, Tuple, Optional, Dict, Any

from app.models import group

class GroupService:
    
    @staticmethod
    def extract_mentions(content: str) -> Tuple[List[str], str]:
        if not content:
            return [], "none"
        
        if "@all" in content.lower() or "@everyone" in content.lower():
            return [], "all"
        elif "@here" in content.lower():
            return [], "here"
        
        username_pattern = r'@(\w+)'
        usernames = re.findall(username_pattern, content)
        
        return usernames, "user"
    
    @staticmethod
    def process_mentions(
        db: Session,
        message_id: str,
        content: str,
        sender_id: str,
        group_id: str,
        mention_type: str = "none",
        specific_user_ids: List[str] = None
    ) -> Tuple[List[MessageMention], str]:
        mentions = []
        
        members = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).all()
        
        if mention_type == "all":
            for member in members:
                if member.user_id != sender_id:
                    mention = MessageMention(
                        id=str(uuid.uuid4()),
                        message_id=message_id,
                        mentioned_user_id=member.user_id,
                        mentioner_id=sender_id,
                        mention_text="@all"
                    )
                    mentions.append(mention)
                    db.add(mention)
        
        # For @here mentions (online members)
        elif mention_type == "here":
            for member in members:
                if member.user_id != sender_id:
                    mention = MessageMention(
                        id=str(uuid.uuid4()),
                        message_id=message_id,
                        mentioned_user_id=member.user_id,
                        mentioner_id=sender_id,
                        mention_text="@here"
                    )
                    mentions.append(mention)
                    db.add(mention)
        
        # For specific user mentions
        elif mention_type == "user" and specific_user_ids:
            for user_id in specific_user_ids:
                # Check if user is a group member
                is_member = any(member.user_id == user_id for member in members)
                if is_member and user_id != sender_id:
                    # Get username for mention text
                    user = db.query(Student).filter(Student.id == user_id).first()
                    mention_text = f"@{user.github_username}" if user else f"@{user_id[:8]}"
                    
                    mention = MessageMention(
                        id=str(uuid.uuid4()),
                        message_id=message_id,
                        mentioned_user_id=user_id,
                        mentioner_id=sender_id,
                        mention_text=mention_text
                    )
                    mentions.append(mention)
                    db.add(mention)
        
        # Auto-detect @username mentions in content
        elif content:
            usernames, _ = GroupService.extract_mentions(content)
            for username in usernames:
                # Find user by username
                user = db.query(Student).filter(
                    Student.github_username.ilike(f"%{username}%")
                ).first()
                
                if user:
                    # Check if user is a group member
                    is_member = any(member.user_id == user.id for member in members)
                    if is_member and user.id != sender_id:
                        # Check if already mentioned
                        existing = any(m.mentioned_user_id == user.id for m in mentions)
                        if not existing:
                            mention = MessageMention(
                                id=str(uuid.uuid4()),
                                message_id=message_id,
                                mentioned_user_id=user.id,
                                mentioner_id=sender_id,
                                mention_text=f"@{user.github_username}"
                            )
                            mentions.append(mention)
                            db.add(mention)
        
        db.commit()
        return mentions, "processed"
    
    @staticmethod
    def get_user_mentions(
        db: Session,
        user_id: str,
        group_id: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get all mentions for a user.
        """
        query = db.query(
            MessageMention,
            GroupMessage,
            Student.github_username.label("mentioner_username"),
            Group.name.label("group_name")
        ).join(
            GroupMessage, MessageMention.message_id == GroupMessage.id
        ).join(
            Group, GroupMessage.group_id == Group.id
        ).join(
            Student, MessageMention.mentioner_id == Student.id
        ).filter(
            MessageMention.mentioned_user_id == user_id
        )
        
        if group_id:
            query = query.filter(GroupMessage.group_id == group_id)
        
        if unread_only:
            query = query.filter(MessageMention.read_at.is_(None))
        
        results = query.order_by(MessageMention.created_at.desc()).limit(limit).all()
        
        mentions = []
        for mention, message, mentioner_username, group_name in results:
            mentions.append({
                "id": mention.id,
                "message_id": mention.message_id,
                "group_id": message.group_id,
                "group_name": group_name,
                "mentioner_id": mention.mentioner_id,
                "mentioner_username": mentioner_username,
                "mention_text": mention.mention_text,
                "message_preview": message.content[:100] if message.content else "",
                "message_type": message.message_type,
                "created_at": mention.created_at,
                "read_at": mention.read_at,
                "notified": mention.notified
            })
        
        return mentions
    
    @staticmethod
    def mark_mention_as_read(
        db: Session,
        mention_id: str,
        user_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Mark a mention as read.
        """
        mention = db.query(MessageMention).filter(
            MessageMention.id == mention_id,
            MessageMention.mentioned_user_id == user_id
        ).first()
        
        if not mention:
            return False, "Mention not found"
        
        if not mention.read_at:
            mention.read_at = datetime.utcnow()
            db.commit()
        
        return True, None
    
    @staticmethod
    def mark_all_mentions_as_read(
        db: Session,
        user_id: str,
        group_id: Optional[str] = None
    ) -> int:
        """
        Mark all mentions as read for a user.
        Returns count of marked mentions.
        """
        query = db.query(MessageMention).filter(
            MessageMention.mentioned_user_id == user_id,
            MessageMention.read_at.is_(None)
        )
        
        if group_id:
            query = query.join(
                GroupMessage, MessageMention.message_id == GroupMessage.id
            ).filter(GroupMessage.group_id == group_id)
        
        mentions = query.all()
        
        for mention in mentions:
            mention.read_at = datetime.utcnow()
        
        db.commit()
        return len(mentions)
    
    @staticmethod
    def get_mention_settings(
        db: Session,
        user_id: str,
        group_id: Optional[str] = None
    ) -> Dict:
        """
        Get mention settings for a user.
        """
        if group_id:
            settings = db.query(UserMentionSettings).filter(
                UserMentionSettings.user_id == user_id,
                UserMentionSettings.group_id == group_id
            ).first()
        else:
            # Get global settings (where group_id is NULL)
            settings = db.query(UserMentionSettings).filter(
                UserMentionSettings.user_id == user_id,
                UserMentionSettings.group_id.is_(None)
            ).first()
        
        if settings:
            return {
                "id": settings.id,
                "user_id": settings.user_id,
                "group_id": settings.group_id,
                "notify_on_mention": settings.notify_on_mention,
                "highlight_mentions": settings.highlight_mentions,
                "sound_notification": settings.sound_notification,
                "desktop_notification": settings.desktop_notification
            }
        
        # Return defaults if no settings found
        return {
            "user_id": user_id,
            "group_id": group_id,
            "notify_on_mention": True,
            "highlight_mentions": True,
            "sound_notification": True,
            "desktop_notification": True
        }
    
    @staticmethod
    def update_mention_settings(
        db: Session,
        user_id: str,
        group_id: Optional[str] = None,
        notify_on_mention: Optional[bool] = None,
        highlight_mentions: Optional[bool] = None,
        sound_notification: Optional[bool] = None,
        desktop_notification: Optional[bool] = None
    ) -> Tuple[Optional[UserMentionSettings], Optional[str]]:
        """
        Update mention settings for a user.
        """
        if group_id:
            settings = db.query(UserMentionSettings).filter(
                UserMentionSettings.user_id == user_id,
                UserMentionSettings.group_id == group_id
            ).first()
        else:
            # Global settings
            settings = db.query(UserMentionSettings).filter(
                UserMentionSettings.user_id == user_id,
                UserMentionSettings.group_id.is_(None)
            ).first()
        
        if not settings:
            # Create new settings
            settings = UserMentionSettings(
                id=str(uuid.uuid4()),
                user_id=user_id,
                group_id=group_id,
                notify_on_mention=True,
                highlight_mentions=True,
                sound_notification=True,
                desktop_notification=True
            )
            db.add(settings)
        
        # Update fields
        if notify_on_mention is not None:
            settings.notify_on_mention = notify_on_mention
        if highlight_mentions is not None:
            settings.highlight_mentions = highlight_mentions
        if sound_notification is not None:
            settings.sound_notification = sound_notification
        if desktop_notification is not None:
            settings.desktop_notification = desktop_notification
        
        settings.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(settings)
        return settings, None
    
    @staticmethod
    def get_mention_statistics(
        db: Session,
        user_id: str
    ) -> Dict:
        """
        Get mention statistics for a user.
        """
        # Total mentions
        total_mentions = db.query(MessageMention).filter(
            MessageMention.mentioned_user_id == user_id
        ).count()
        
        # Unread mentions
        unread_mentions = db.query(MessageMention).filter(
            MessageMention.mentioned_user_id == user_id,
            MessageMention.read_at.is_(None)
        ).count()
        
        # Mentions by group
        group_counts = db.query(
            GroupMessage.group_id,
            Group.name,
            func.count(MessageMention.id).label('count')
        ).join(
            GroupMessage, MessageMention.message_id == GroupMessage.id
        ).join(
            Group, GroupMessage.group_id == Group.id
        ).filter(
            MessageMention.mentioned_user_id == user_id
        ).group_by(
            GroupMessage.group_id, Group.name
        ).all()
        
        mentions_by_group = {}
        for group_id, group_name, count in group_counts:
            mentions_by_group[group_id] = {
                "group_name": group_name,
                "count": count
            }
        
        # Last mention
        last_mention = db.query(MessageMention).filter(
            MessageMention.mentioned_user_id == user_id
        ).order_by(MessageMention.created_at.desc()).first()
        
        return {
            "total_mentions": total_mentions,
            "unread_mentions": unread_mentions,
            "mentions_by_group": mentions_by_group,
            "last_mention_at": last_mention.created_at if last_mention else None,
            "read_percentage": ((total_mentions - unread_mentions) / total_mentions * 100) if total_mentions > 0 else 100
        }
    
    # ==================== UPDATED MESSAGE METHODS ====================
    
    @staticmethod
    def send_group_message(
        db: Session,
        group_id: str,
        sender_id: str,
        content: Optional[str] = None,
        message_type: str = "text",
        file_url: Optional[str] = None,
        file_name: Optional[str] = None,
        file_size: Optional[int] = None,
        file_mime_type: Optional[str] = None,
        thumbnail_url: Optional[str] = None,
        reply_to_id: Optional[str] = None,
        mention_type: str = "none",
        specific_user_ids: List[str] = None
    ) -> Tuple[Optional[GroupMessage], Optional[str]]:
        
        # Create message
        message = GroupMessage(
            id=str(uuid.uuid4()),
            group_id=group_id,
            sender_id=sender_id,
            content=content,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            file_mime_type=file_mime_type,
            thumbnail_url=thumbnail_url,
            reply_to_id=reply_to_id,
            mention_type=mention_type
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Process mentions if any
        if content and (mention_type != "none" or specific_user_ids):
            mentioned_user_ids = []
            
            if specific_user_ids:
                mentioned_user_ids = specific_user_ids
            
            # Also extract from content
            usernames, extracted_type = GroupService.extract_mentions(content)
            if extracted_type != "none" and extracted_type != "user":
                mention_type = extracted_type
            
            # Create mention records
            mentions, _ = GroupService.process_mentions(
                db=db,
                message_id=message.id,
                content=content,
                sender_id=sender_id,
                group_id=group_id,
                mention_type=mention_type,
                specific_user_ids=mentioned_user_ids
            )
            
            # Update message with mentioned users
            if mentions:
                message.mentioned_users = [m.mentioned_user_id for m in mentions]
                db.commit()
        
        # Update group's updated_at
        group.updated_at = datetime.utcnow()
        db.commit()
        
        return message, None
    
    @staticmethod
    def pin_message(
        db: Session,
        group_id: str,
        message_id: str,
        user_id: str,
        note: Optional[str] = None
    ) -> Tuple[Optional[PinnedMessage], Optional[str]]:
        # Check if message exists
        message = db.query(GroupMessage).filter(
            GroupMessage.id == message_id,
            GroupMessage.group_id == group_id
        ).first()
        
        if not message:
            return None, "Message not found"
        
        # Check if user is admin
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member or member.role not in ["admin", "creator"]:
            return None, "Only admins can pin messages"
        
        # Check if already pinned
        existing = db.query(PinnedMessage).filter(
            PinnedMessage.group_id == group_id,
            PinnedMessage.message_id == message_id
        ).first()
        
        if existing:
            return None, "Message already pinned"
        
        # Check pin limit (max 5 per group)
        pin_count = db.query(PinnedMessage).filter(
            PinnedMessage.group_id == group_id
        ).count()
        
        if pin_count >= 5:
            return None, "Maximum 5 pins per group"
        
        # Create pinned message
        pinned = PinnedMessage(
            id=str(uuid.uuid4()),
            group_id=group_id,
            message_id=message_id,
            pinned_by=user_id,
            note=note
        )
        
        db.add(pinned)
        db.commit()
        db.refresh(pinned)
        return pinned, None
    
    @staticmethod
    def unpin_message(
        db: Session,
        group_id: str,
        message_id: str,
        user_id: str
    ) -> Tuple[bool, Optional[str]]:
        pinned = db.query(PinnedMessage).filter(
            PinnedMessage.group_id == group_id,
            PinnedMessage.message_id == message_id
        ).first()
        
        if not pinned:
            return False, "Message not pinned"
        
        # Check if user is admin or the one who pinned
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member or (member.role not in ["admin", "creator"] and pinned.pinned_by != user_id):
            return False, "You don't have permission to unpin"
        
        db.delete(pinned)
        db.commit()
        return True, None
    
    @staticmethod
    def get_pinned_messages(
        db: Session,
        group_id: str
    ) -> List[Dict]:
        pins = db.query(
            PinnedMessage,
            GroupMessage.content,
            Student.github_username.label("pinned_by_username")
        ).join(
            GroupMessage, PinnedMessage.message_id == GroupMessage.id
        ).join(
            Student, PinnedMessage.pinned_by == Student.id
        ).filter(
            PinnedMessage.group_id == group_id
        ).order_by(PinnedMessage.pinned_at.desc()).all()
        
        result = []
        for pin, content, pinned_by_username in pins:
            result.append({
                "id": pin.id,
                "group_id": pin.group_id,
                "message_id": pin.message_id,
                "message_content": content[:200] if content else "",
                "pinned_by": pin.pinned_by,
                "pinned_by_username": pinned_by_username,
                "pinned_at": pin.pinned_at,
                "note": pin.note
            })
        
        return result
    
    # ==================== POLLS ====================
    
    @staticmethod
    def create_poll(
        db: Session,
        group_id: str,
        sender_id: str,
        question: str,
        options: List[str],
        is_multiple: bool = False,
        is_anonymous: bool = False,
        ends_at: Optional[datetime] = None
    ) -> Tuple[Optional[GroupPoll], Optional[str]]:
        # Validate group and membership
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return None, "Group not found"
        
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == sender_id
        ).first()
        
        if not member:
            return None, "You are not a member of this group"
        
        # Create message first
        message = GroupMessage(
            id=str(uuid.uuid4()),
            group_id=group_id,
            sender_id=sender_id,
            content=question,
            message_type="poll"
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Create poll options
        poll_options = []
        for i, option_text in enumerate(options):
            option_id = str(uuid.uuid4())
            poll_options.append({
                "id": option_id,
                "text": option_text,
                "votes": []
            })
        
        # Create poll
        poll = GroupPoll(
            id=str(uuid.uuid4()),
            group_id=group_id,
            message_id=message.id,
            question=question,
            options=poll_options,
            is_multiple=is_multiple,
            is_anonymous=is_anonymous,
            ends_at=ends_at
        )
        
        db.add(poll)
        db.commit()
        db.refresh(poll)
        return poll, None
    
    @staticmethod
    def vote_in_poll(
        db: Session,
        poll_id: str,
        user_id: str,
        option_ids: List[str]
    ) -> Tuple[Optional[GroupPoll], Optional[str]]:
        poll = db.query(GroupPoll).filter(GroupPoll.id == poll_id).first()
        
        if not poll:
            return None, "Poll not found"
        
        # Check if user is group member
        member = db.query(GroupMember).filter(
            GroupMember.group_id == poll.group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member:
            return None, "You are not a member of this group"
        
        # Check if poll has ended
        if poll.ends_at and poll.ends_at < datetime.utcnow():
            return None, "Poll has ended"
        
        # Check if already voted
        existing_vote = db.query(PollVote).filter(
            PollVote.poll_id == poll_id,
            PollVote.user_id == user_id
        ).first()
        
        if existing_vote:
            # Update vote
            # Remove user from previous votes
            for option in poll.options:
                if user_id in option["votes"]:
                    option["votes"].remove(user_id)
            
            # Add to new votes
            for option in poll.options:
                if option["id"] in option_ids:
                    option["votes"].append(user_id)
            
            existing_vote.option_ids = option_ids
            existing_vote.voted_at = datetime.utcnow()
        else:
            # Check if multiple votes allowed
            if not poll.is_multiple and len(option_ids) > 1:
                return None, "Multiple votes not allowed"
            
            # Validate option IDs
            valid_option_ids = [opt["id"] for opt in poll.options]
            for opt_id in option_ids:
                if opt_id not in valid_option_ids:
                    return None, f"Invalid option: {opt_id}"
            
            # Add votes
            for option in poll.options:
                if option["id"] in option_ids:
                    option["votes"].append(user_id)
            
            # Create vote record
            vote = PollVote(
                id=str(uuid.uuid4()),
                poll_id=poll_id,
                user_id=user_id,
                option_ids=option_ids
            )
            db.add(vote)
        
        db.commit()
        db.refresh(poll)
        return poll, None
    
    @staticmethod
    def get_poll_results(
        db: Session,
        poll_id: str,
        user_id: str
    ) -> Dict:
        poll = db.query(GroupPoll).filter(GroupPoll.id == poll_id).first()
        
        if not poll:
            return {}
        
        # Check if user is group member
        member = db.query(GroupMember).filter(
            GroupMember.group_id == poll.group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member:
            return {}
        
        # Get user's vote
        user_vote = db.query(PollVote).filter(
            PollVote.poll_id == poll_id,
            PollVote.user_id == user_id
        ).first()
        
        # Calculate statistics
        total_votes = sum(len(opt["votes"]) for opt in poll.options)
        unique_voters = db.query(PollVote).filter(PollVote.poll_id == poll_id).count()
        
        # Prepare results
        results = []
        for option in poll.options:
            vote_count = len(option["votes"])
            percentage = (vote_count / total_votes * 100) if total_votes > 0 else 0
            
            result = {
                "id": option["id"],
                "text": option["text"],
                "votes": vote_count,
                "percentage": round(percentage, 1)
            }
            
            # Show voters if not anonymous and user is admin
            if not poll.is_anonymous:
                member_role = db.query(GroupMember).filter(
                    GroupMember.group_id == poll.group_id,
                    GroupMember.user_id == user_id
                ).first()
                
                if member_role and member_role.role in ["admin", "creator"]:
                    # Get usernames of voters
                    voter_usernames = []
                    for voter_id in option["votes"][:10]:  # Limit to 10
                        voter = db.query(Student).filter(Student.id == voter_id).first()
                        if voter:
                            voter_usernames.append(voter.github_username)
                    result["voters"] = voter_usernames
            
            results.append(result)
        
        return {
            "poll_id": poll_id,
            "question": poll.question,
            "is_multiple": poll.is_multiple,
            "is_anonymous": poll.is_anonymous,
            "ends_at": poll.ends_at,
            "total_votes": total_votes,
            "unique_voters": unique_voters,
            "my_votes": user_vote.option_ids if user_vote else [],
            "results": results,
            "has_ended": poll.ends_at and poll.ends_at < datetime.utcnow()
        }
    
    # ==================== REACTIONS (UPDATED) ====================
    
    @staticmethod
    def add_reaction(
        db: Session,
        message_id: str,
        user_id: str,
        emoji: str
    ) -> Tuple[Optional[MessageReaction], Optional[str]]:
        # Check if message exists
        message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
        if not message:
            return None, "Message not found"
        
        # Check if user is group member
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == message.group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not is_member:
            return None, "You are not a member of this group"
        
        # Check group settings
        group = db.query(Group).filter(Group.id == message.group_id).first()
        if group and not group.settings.get("allow_reactions", True):
            return None, "Reactions are disabled in this group"
        
        # Check if already reacted with same emoji
        existing = db.query(MessageReaction).filter(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == user_id,
            MessageReaction.emoji == emoji
        ).first()
        
        if existing:
            # Remove reaction (toggle)
            db.delete(existing)
            db.commit()
            return None, "Reaction removed"
        
        # Create new reaction
        reaction = MessageReaction(
            id=str(uuid.uuid4()),
            message_id=message_id,
            user_id=user_id,
            emoji=emoji
        )
        
        db.add(reaction)
        db.commit()
        db.refresh(reaction)
        return reaction, None
    
    
    @staticmethod
    def edit_message(
        db: Session,
        message_id: str,
        user_id: str,
        new_content: str
    ) -> Tuple[Optional[GroupMessage], Optional[str]]:
        message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
        
        if not message:
            return None, "Message not found"
        
        # Check if user is sender
        if message.sender_id != user_id:
            return None, "You can only edit your own messages"
        
        # Check group settings
        group = db.query(Group).filter(Group.id == message.group_id).first()
        if group and not group.settings.get("allow_editing", True):
            return None, "Message editing is disabled in this group"
        
        # Check if message is text type
        if message.message_type != "text":
            return None, "Only text messages can be edited"
        
        # Check time limit (15 minutes)
        time_diff = datetime.utcnow() - message.created_at
        if time_diff.total_seconds() > 900:  # 15 minutes
            return None, "Cannot edit after 15 minutes"
        
        # Save to edit history
        if not message.edit_history:
            message.edit_history = []
        
        message.edit_history.append({
            "old_content": message.content,
            "edited_at": datetime.utcnow().isoformat()
        })
        
        # Update message
        message.content = new_content
        message.edited_at = datetime.utcnow()
        
        # Reprocess mentions
        usernames, mention_type = GroupService.extract_mentions(new_content)
        if usernames or mention_type != "none":
            # Clear old mentions
            db.query(MessageMention).filter(
                MessageMention.message_id == message_id
            ).delete()
            
            # Process new mentions
            GroupService.process_mentions(
                db=db,
                message_id=message_id,
                content=new_content,
                sender_id=user_id,
                group_id=message.group_id,
                mention_type=mention_type
            )
        
        db.commit()
        db.refresh(message)
        return message, None
    
    @staticmethod
    def enrich_message_response(
        db: Session,
        message: GroupMessage,
        user_id: str
    ) -> Dict:
        sender = db.query(Student).filter(Student.id == message.sender_id).first()
        
        # Get read count
        read_count = db.query(GroupMessageRead).filter(
            GroupMessageRead.message_id == message.id
        ).count()
        
        # Get total members
        total_members = db.query(GroupMember).filter(
            GroupMember.group_id == message.group_id
        ).count()
        
        # Get reactions
        reactions_result = db.query(
            MessageReaction.emoji,
            func.count(MessageReaction.id).label('count'),
            func.group_concat(Student.github_username).label('usernames')
        ).join(
            Student, MessageReaction.user_id == Student.id
        ).filter(
            MessageReaction.message_id == message.id
        ).group_by(MessageReaction.emoji).all()
        
        reactions = {}
        for emoji, count, usernames_str in reactions_result:
            usernames = usernames_str.split(',')[:3] if usernames_str else []
            reactions[emoji] = {
                "count": count,
                "users": usernames,
                "you_reacted": user_id in [r.user_id for r in message.reactions if r.emoji == emoji]
            }
        
        # Get mentions
        mentions = []
        for mention in message.mentions:
            mentioned_user = db.query(Student).filter(Student.id == mention.mentioned_user_id).first()
            mentions.append({
                "id": mention.id,
                "user_id": mention.mentioned_user_id,
                "username": mentioned_user.github_username if mentioned_user else None,
                "mention_text": mention.mention_text,
                "read_at": mention.read_at
            })
        
        # Check if user can edit
        can_edit = (
            message.sender_id == user_id and 
            message.message_type == "text" and
            (datetime.utcnow() - message.created_at).total_seconds() <= 900 and
            db.query(Group).filter(
                Group.id == message.group_id,
                Group.settings["allow_editing"].as_boolean() == True
            ).first() is not None
        )
        
        # Check if poll
        poll_info = None
        if message.message_type == "poll":
            poll = db.query(GroupPoll).filter(GroupPoll.message_id == message.id).first()
            if poll:
                poll_info = GroupService.get_poll_results(db, poll.id, user_id)
        
        response = {
            "id": message.id,
            "group_id": message.group_id,
            "sender_id": message.sender_id,
            "sender_username": sender.github_username if sender else None,
            "content": message.content,
            "message_type": message.message_type,
            "file_url": message.file_url,
            "file_name": message.file_name,
            "file_size": message.file_size,
            "file_mime_type": message.file_mime_type,
            "thumbnail_url": message.thumbnail_url,
            "reply_to_id": message.reply_to_id,
            "created_at": message.created_at,
            "edited_at": message.edited_at,
            "deleted_for_all": message.deleted_for_all,
            "read_count": read_count,
            "total_members": total_members,
            "read_by_me": db.query(GroupMessageRead).filter(
                GroupMessageRead.message_id == message.id,
                GroupMessageRead.user_id == user_id
            ).first() is not None,
            "reactions": reactions,
            "mentions": mentions,
            "mentioned_users": message.mentioned_users,
            "mention_type": message.mention_type,
            "can_edit": can_edit,
            "poll": poll_info
        }
        
        return response

    @staticmethod
    def get_user_groups(db: Session, user_id: str) -> List[Group]:
        """
        Get all groups a user belongs to.
        """
        return db.query(Group).join(
            GroupMember, Group.id == GroupMember.group_id
        ).filter(
            GroupMember.user_id == user_id
        ).order_by(Group.updated_at.desc()).all()

    @staticmethod
    def create_group(
        db: Session,
        creator_id: str,
        name: str,
        description: Optional[str] = None,
        member_ids: List[str] = [],
        is_private: bool = True
    ) -> Tuple[Optional[Group], Optional[str]]:
        """
        Create a new group and add initial members.
        """
        try:
            group_id = str(uuid.uuid4())
            new_group = Group(
                id=group_id,
                name=name,
                description=description,
                creator_id=creator_id,
                is_private=is_private
            )
            db.add(new_group)
            
            # Add creator as admin
            creator_member = GroupMember(
                id=str(uuid.uuid4()),
                group_id=group_id,
                user_id=creator_id,
                role="creator"
            )
            db.add(creator_member)
            
            # Add other members
            for m_id in member_ids:
                if m_id != creator_id:
                    member = GroupMember(
                        id=str(uuid.uuid4()),
                        group_id=group_id,
                        user_id=m_id,
                        role="member"
                    )
                    db.add(member)
            
            db.commit()
            db.refresh(new_group)
            return new_group, None
        except Exception as e:
            db.rollback()
            return None, str(e)

    @staticmethod
    def get_group_details(
        db: Session,
        group_id: str,
        user_id: str
    ) -> Tuple[Optional[Group], Optional[str]]:
        """
        Get group details with membership check.
        """
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return None, "Group not found"
        
        # Check if user is member
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member and group.is_private:
            return None, "This group is private"
        
        return group, None

    @staticmethod
    def get_group_members(db: Session, group_id: str) -> List[Dict]:
        """
        Get all members of a group with user details.
        """
        results = db.query(
            GroupMember,
            Student.github_username,
            Student.email
        ).join(
            Student, GroupMember.user_id == Student.id
        ).filter(
            GroupMember.group_id == group_id
        ).all()
        
        members = []
        for member, username, email in results:
            members.append({
                "id": member.id,
                "user_id": member.user_id,
                "username": username,
                "avatar_url": None, # Student model doesn't have avatar_url yet
                "email": email,
                "role": member.role,
                "joined_at": member.joined_at,
                "settings": member.settings,
                "is_online": False # Needs real-time status
            })

        return members


    @staticmethod
    def create_invite(
        db: Session,
        group_id: str,
        inviter_id: str,
        expires_hours: int = 24,
        max_uses: int = 1
    ) -> Tuple[Optional[GroupInvite], Optional[str]]:
        """
        Create a new group invite.
        """
        # Check if inviter is admin
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == inviter_id
        ).first()
        
        if not member or member.role not in ["admin", "creator"]:
            return None, "Only admins can create invites"
        
        import secrets
        invite_code = secrets.token_urlsafe(8)
        
        invite = GroupInvite(
            id=str(uuid.uuid4()),
            group_id=group_id,
            inviter_id=inviter_id,
            invite_code=invite_code,
            expires_at=datetime.utcnow() + timedelta(hours=expires_hours),
            max_uses=max_uses
        )
        db.add(invite)
        db.commit()
        db.refresh(invite)
        return invite, None

    @staticmethod
    def join_via_invite(
        db: Session,
        invite_code: str,
        user_id: str
    ) -> Tuple[Optional[Group], Optional[str]]:
        """
        Join a group using an invite code.
        """
        invite = db.query(GroupInvite).filter(GroupInvite.invite_code == invite_code).first()
        if not invite:
            return None, "Invalid invite code"
        
        if invite.expires_at and invite.expires_at < datetime.utcnow():
            return None, "Invite has expired"
        
        if invite.used_count >= invite.max_uses:
            return None, "Invite has reached maximum uses"
        
        # Check if already a member
        existing = db.query(GroupMember).filter(
            GroupMember.group_id == invite.group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if existing:
            return None, "Already a member"
        
        # Join group
        member = GroupMember(
            id=str(uuid.uuid4()),
            group_id=invite.group_id,
            user_id=user_id,
            role="member"
        )
        db.add(member)
        
        # Update invite
        invite.used_count += 1
        
        db.commit()
        
        group = db.query(Group).filter(Group.id == invite.group_id).first()
        return group, None

    @staticmethod
    def get_group_stats(
        db: Session,
        group_id: str,
        user_id: str
    ) -> Dict:
        """
        Get group statistics.
        """
        # Membership check
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member:
            return {}
        
        total_messages = db.query(GroupMessage).filter(GroupMessage.group_id == group_id).count()
        total_members = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
        
        # Messages in last 24 hours
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        recent_messages = db.query(GroupMessage).filter(
            GroupMessage.group_id == group_id,
            GroupMessage.created_at >= one_day_ago
        ).count()
        
        return {
            "group_id": group_id,
            "total_messages": total_messages,
            "total_members": total_members,
            "recent_messages_24h": recent_messages,
            "joined_at": member.joined_at
        }
    
    @staticmethod
    def add_members(
        db: Session,
        group_id: str,
        inviter_id: str,
        user_ids: List[str]
    ) -> Tuple[int, Optional[str]]:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return 0, "Group not found"

        inviter = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == inviter_id
        ).first()

        if not inviter or inviter.role not in ["admin", "creator"]:
            return 0, "Only admins can add members"

        added_count = 0
        for user_id in user_ids:
            existing = db.query(GroupMember).filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user_id
            ).first()
            
            if not existing:
                member = GroupMember(
                    id=str(uuid.uuid4()),
                    group_id=group_id,
                    user_id=user_id,
                    role="member"
                )
                db.add(member)
                added_count += 1
                
        db.commit()
        return added_count, None

    @staticmethod
    def remove_member(
        db: Session,
        group_id: str,
        remover_id: str,
        user_id: str
    ) -> Tuple[bool, Optional[str]]:
        remover = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == remover_id
        ).first()

        target = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()

        if not target:
            return False, "User is not a member of this group"

        if remover_id != user_id:
            if not remover or remover.role not in ["admin", "creator"]:
                return False, "Only admins can remove other members"
            if target.role == "creator":
                return False, "Cannot remove the group creator"
            if target.role == "admin" and remover.role != "creator":
                return False, "Only creator can remove an admin"

        db.delete(target)
        db.commit()
        return True, None

    @staticmethod
    def update_member_role(
        db: Session,
        group_id: str,
        admin_id: str,
        user_id: str,
        new_role: str
    ) -> Tuple[bool, Optional[str]]:
        if new_role not in ["admin", "member"]:
            return False, "Invalid role"
            
        admin = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == admin_id
        ).first()
        
        if not admin or admin.role != "creator":
            return False, "Only the creator can change roles"
            
        target = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not target:
            return False, "User is not a member of this group"
            
        target.role = new_role
        db.commit()
        return True, None

    @staticmethod
    def get_group_messages(
        db: Session,
        group_id: str,
        user_id: str,
        limit: int,
        before: Optional[datetime] = None
    ) -> Tuple[List[GroupMessage], Optional[str]]:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        
        if not member:
            return [], "You are not a member of this group"
            
        query = db.query(GroupMessage).filter(
            GroupMessage.group_id == group_id,
            GroupMessage.deleted_for_all == False
        )
        
        if before:
            query = query.filter(GroupMessage.created_at < before)
            
        messages = query.order_by(GroupMessage.created_at.desc()).limit(limit).all()
        return messages[::-1], None

    @staticmethod
    def delete_group_message(
        db: Session,
        message_id: str,
        user_id: str,
        delete_for_all: bool
    ) -> Tuple[bool, Optional[str]]:
        message = db.query(GroupMessage).filter(GroupMessage.id == message_id).first()
        
        if not message:
            return False, "Message not found"
            
        if delete_for_all:
            member = db.query(GroupMember).filter(
                GroupMember.group_id == message.group_id,
                GroupMember.user_id == user_id
            ).first()
            
            if message.sender_id != user_id and (not member or member.role not in ["admin", "creator"]):
                return False, "Only sender or admin can delete for all"
                
            message.deleted_for_all = True
            db.commit()
            return True, None
        else:
            return False, "Local deletion not supported for group messages yet"
