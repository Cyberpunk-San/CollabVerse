// Based on group.py schemas
export interface GroupCreate {
  name: string;
  description?: string | null;
  member_ids: string[];
  is_private: boolean;
}

export interface GroupResponse {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  creator_id: string;
  is_private: boolean;
  member_count: number;
  online_count: number;
  created_at: string;
  updated_at: string;
  my_role?: 'member' | 'admin' | 'creator' | null;
  settings: GroupSettings;
  last_message?: string | null;
  last_message_time?: string | null;
  unread_count: number;
}

export interface GroupMemberResponse {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: 'member' | 'admin' | 'creator';
  joined_at: string;
  settings: MemberSettings;
}

export interface GroupSettings {
  slow_mode?: number;  // seconds between messages
  allow_reactions?: boolean;
  allow_polls?: boolean;
  allow_mentions?: 'all' | 'admin' | 'none';
  [key: string]: any;
}

export interface MemberSettings {
  notifications?: boolean;
  sound?: boolean;
  [key: string]: any;
}

// Message types
export interface MentionCreate {
  user_ids: string[];
  mention_type: 'user' | 'here' | 'all';
}

export interface GroupMessageCreate {
  content?: string | null;
  message_type?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_mime_type?: string | null;
  thumbnail_url?: string | null;
  reply_to_id?: string | null;
  mentions?: MentionCreate | null;
}

export interface MessageMentionResponse {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  mentioner_id: string;
  username: string;
  mention_text: string;
  created_at: string;
  notified: boolean;
  read_at?: string | null;
}

export interface MessageReactionResponse {
  id: string;
  message_id: string;
  user_id: string;
  username: string;
  emoji: string;
  created_at: string;
}

export interface GroupMessageResponse {
  id: string;
  group_id: string;
  sender_id: string;
  sender_username: string;
  content?: string | null;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_mime_type?: string | null;
  thumbnail_url?: string | null;
  reply_to_id?: string | null;
  created_at: string;
  edited_at?: string | null;
  deleted_for_all: boolean;

  // Mention fields
  mentioned_users: string[];
  mention_type: string;

  // Stats
  read_count: number;
  total_members: number;
  read_by_me: boolean;
  reactions: Record<string, {
    count: number;
    users: Array<{ user_id: string; username: string; reacted_at: string }>;
    you_reacted: boolean;
  }>;
  mentions: MessageMentionResponse[];

  // Edit info
  can_edit: boolean;
}

// Mention settings
export interface UserMentionSettingsResponse {
  id: string;
  user_id: string;
  group_id?: string | null;
  notify_on_mention: boolean;
  highlight_mentions: boolean;
  sound_notification: boolean;
  desktop_notification: boolean;
}

export interface UserMentionStats {
  total_mentions: number;
  unread_mentions: number;
  mentions_by_group: Record<string, number>;
  last_mention_at?: string | null;
}

// Poll types
export interface PollOption {
  id: string;
  text: string;
  votes: string[];  // user_ids who voted
}

export interface PollCreate {
  question: string;
  options: string[];
  is_multiple: boolean;
  is_anonymous: boolean;
  ends_at?: string | null;
}

export interface PollResponse {
  id: string;
  group_id: string;
  message_id: string;
  question: string;
  options: PollOption[];
  is_multiple: boolean;
  is_anonymous: boolean;
  ends_at?: string | null;
  created_at: string;
  total_votes: number;
  my_votes: string[];  // option_ids I voted for
}

export interface PollResults {
  poll_id: string;
  total_votes: number;
  options: Array<{
    id: string;
    text: string;
    votes: number;
    percentage: number;
    voters?: Array<{ user_id: string; username: string }>; // if not anonymous
  }>;
  user_voted: boolean;
  user_votes?: string[];
}

// Pinned messages
export interface PinnedMessageResponse {
  id: string;
  group_id: string;
  message_id: string;
  message_content: string;
  pinned_by: string;
  pinned_by_username: string;
  pinned_at: string;
  note?: string | null;
}

// Invites
export interface GroupInviteResponse {
  id: string;
  group_id: string;
  group_name: string;
  inviter_id: string;
  inviter_username: string;
  invite_code: string;
  expires_at?: string | null;
  max_uses: number;
  used_count: number;
  created_at: string;
}

// Stats
export interface GroupStats {
  total_messages: number;
  total_members: number;
  active_today: number;
  top_contributors: Array<{
    user_id: string;
    username: string;
    message_count: number;
  }>;
  messages_by_type: Record<string, number>;
  messages_by_hour: Record<number, number>;
  peak_activity: string;
  average_messages_per_day: number;
}

// Backward compatible aliases and missing interfaces
export type Group = GroupResponse;
export type GroupMember = GroupMemberResponse;
export type GroupMessage = GroupMessageResponse;
export type PinnedMessage = PinnedMessageResponse;
export type MessageMention = MessageMentionResponse;
export type PollCreateData = PollCreate;
export type GroupPoll = PollResponse;

export interface OnlineMember {
  user_id: string;
  username: string;
  email: string;
  last_seen?: string;
}

export interface ReactionInfo {
  count: number;
  users: Array<{ user_id: string; username: string; reacted_at: string }>;
  you_reacted: boolean;
}

export type WebSocketGroupMessage = any;
