// frontend/src/types/websocket.ts
import { WS_EVENTS } from '../api/constants';


export interface ChatMessageWS {
    type: typeof WS_EVENTS.CHAT_MESSAGE; // 'chat'
    to: string;
    text: string;
    reply_to_id?: string;
}

export interface ChatFileWS {
    type: typeof WS_EVENTS.FILE_MESSAGE; // 'file'
    to: string;
    file_url: string;
    file_name: string;
    file_size: number;
    file_type: string;
    caption?: string;
    thumbnail_url?: string;
}

export interface ChatTypingWS {
    type: typeof WS_EVENTS.TYPING; // 'typing'
    to: string;
    typing: boolean;
}

export interface ChatReadWS {
    type: typeof WS_EVENTS.READ; // 'read'
    message_id: string;
}

export interface PingWS {
    type: typeof WS_EVENTS.PING; // 'ping'
}

export interface ChatNewMessageWS {
    type: 'new_message';
    from: string;
    from_username?: string;
    text?: string;
    message_id: string;
    time: string;
    message_type?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    caption?: string;
    thumbnail_url?: string;
    reply_to_id?: string;
}

export interface ChatMessageSentWS {
    type: 'message_sent';
    message_id: string;
}

export interface ChatMessageReadWS {
    type: 'message_read';
    message_id: string;
    read_by: string;
}

export interface ChatMessagesReadWS {
    type: 'messages_read';
    read_by: string;
    timestamp: string;
}

export interface ChatMessageEditedWS {
    type: 'message_edited';
    message_id: string;
    new_content: string;
    edited_at?: string;
}

export interface ChatTypingNotificationWS {
    type: 'typing';
    from: string;
    typing: boolean;
}

export interface ChatMessageReactedWS {
    type: 'message_reacted';
    message_id: string;
    reactions: Record<string, string[]>;
}

export interface ChatMessagePinnedWS {
    type: 'message_pinned';
    message_id: string;
}

export interface ChatMessageUnpinnedWS {
    type: 'message_unpinned';
    message_id: string;
}

export interface ErrorWS {
    type: 'error';
    message: string;
}

export interface PongWS {
    type: 'pong';
}

// Union types for Chat WebSocket
export type ChatWebSocketSendMessage =
    | ChatMessageWS
    | ChatFileWS
    | ChatTypingWS
    | ChatReadWS
    | PingWS;

export type ChatWebSocketReceiveMessage =
    | ChatNewMessageWS
    | ChatMessageSentWS
    | ChatMessageReadWS
    | ChatMessagesReadWS
    | ChatMessageEditedWS
    | ChatTypingNotificationWS
    | ChatMessageReactedWS
    | ChatMessagePinnedWS
    | ChatMessageUnpinnedWS
    | ErrorWS
    | PongWS;


// Client -> Server messages
export interface GroupJoinWS {
    type: typeof WS_EVENTS.GROUP_JOIN; // 'join_group'
    group_id: string;
}

export interface GroupLeaveWS {
    type: typeof WS_EVENTS.GROUP_LEAVE; // 'leave_group'
    group_id: string;
}

export interface GroupMessageWS {
    type: typeof WS_EVENTS.GROUP_MESSAGE; // 'group_message'
    group_id: string;
    text: string;
    reply_to_id?: string;
}

export interface GroupTypingWS {
    type: typeof WS_EVENTS.GROUP_TYPING; // 'group_typing'
    group_id: string;
    typing: boolean;
}

export interface GroupReadWS {
    type: typeof WS_EVENTS.GROUP_READ; // 'group_read'
    group_id: string;
    message_id: string;
}

export interface PollVoteSendWS {
    type: 'poll_vote';
    poll_id: string;
    option_ids: string[];  // Plural to match backend
}

// Server -> Client messages
export interface PollVoteReceiveWS {
    type: 'poll_vote';
    poll_id: string;
    option_ids: string[];
    user_id: string;
    username: string;
}

import type { GroupMessage, ReactionInfo } from './group';

// Server -> Client messages
export interface GroupNewMessageWS {
    type: 'group_message';
    group_id: string;
    message: GroupMessage;
}

export interface GroupMemberAddedWS {
    type: 'member_added';
    group_id: string;
    user_id: string;
    username: string;
    role: string;
}

export interface GroupMemberRemovedWS {
    type: 'member_removed';
    group_id: string;
    user_id: string;
}

export interface GroupUpdatedWS {
    type: 'group_updated';
    group_id: string;
    updates: Record<string, any>;
}

export interface GroupDeletedWS {
    type: 'group_deleted';
    group_id: string;
}

export interface GroupTypingNotificationWS {
    type: 'group_typing';
    group_id: string;
    from: string;
    from_username: string;
    typing: boolean;
}

export interface UserOnlineWS {
    type: 'user_online';
    user_id: string;
    username: string;
}

export interface UserOfflineWS {
    type: 'user_offline';
    user_id: string;
}

// Poll events
export interface PollCreatedWS {
    type: 'poll_created';
    group_id: string;
    poll_id: string;
    message_id: string;
    question: string;
    options: string[];
}

export interface PollVoteWS {
    type: 'poll_vote';
    poll_id: string;
    option_id: string;
    user_id: string;
    username: string;
}

// Union types for Group WebSocket
export type GroupWebSocketSendMessage =
    | GroupJoinWS
    | GroupLeaveWS
    | GroupMessageWS
    | GroupTypingWS
    | GroupReadWS
    | PollVoteSendWS
    | PingWS;

export type GroupWebSocketReceiveMessage =
    | GroupNewMessageWS
    | GroupMemberAddedWS
    | GroupMemberRemovedWS
    | GroupUpdatedWS
    | GroupDeletedWS
    | GroupTypingNotificationWS
    | UserOnlineWS
    | UserOfflineWS
    | PollCreatedWS
    | PollVoteReceiveWS  // Add this
    | ErrorWS
    | PongWS
    | { type: 'group_joined'; group_id: string; online_count: number }
    | { type: 'group_left'; group_id: string }
    | { type: 'new_member'; group_id: string }
    | { type: 'member_left'; group_id: string; user_id: string }
    | { type: 'message_pinned'; group_id: string }
    | { type: 'message_unpinned'; group_id: string; message_id: string }
    | { type: 'message_reaction'; group_id: string; message_id: string; reactions: Record<string, ReactionInfo> }
    | { type: 'mention_notification'; group_id: string; message_id: string; message_preview: string; mentioner_id: string; mentioner_username: string }
    | { type: 'online_status'; group_id: string; online_count: number }
    | { type: 'message_deleted'; group_id: string; message_id: string };

// Helper type for any WebSocket message
export type AnyWebSocketMessage =
    | ChatWebSocketSendMessage
    | ChatWebSocketReceiveMessage
    | GroupWebSocketSendMessage
    | GroupWebSocketReceiveMessage;

export type WebSocketErrorMessage = ErrorWS;