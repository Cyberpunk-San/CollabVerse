// Based on chat.py schemas
export const MessageType = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    LINK: 'link'
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export interface ChatMessageBase {
    receiver_id: string;
    content?: string | null;
    message_type?: MessageType;
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    file_mime_type?: string | null;
    thumbnail_url?: string | null;
    reply_to_id?: string | null;
}

export interface ChatMessageCreate extends ChatMessageBase { }

export interface ChatMessageResponse {
    id: string;
    sender_id: string;
    receiver_id: string;
    content?: string | null;
    message_type: string;
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    file_mime_type?: string | null;
    thumbnail_url?: string | null;
    is_read: boolean;
    created_at: string;
    edited_at?: string | null;
    sender_username?: string | null;
    receiver_username?: string | null;
    is_pinned?: boolean;
    pinned_at?: string | null;
    reply_to_id?: string | null;
    reply_to?: ChatMessageResponse | null;
    reactions?: Record<string, string[]>; // emoji -> userIds
}

export interface FileUploadResponse {
    file_id: string;
    file_url: string;
    file_name: string;
    file_size: number;
    file_mime_type: string;
    thumbnail_url?: string | null;
}

export interface ConversationPreview {
    user_id: string;
    username: string;
    last_message?: string;
    last_message_time?: string;
    unread_count: number;
    is_online?: boolean;
    last_seen?: string;
    avatar_url?: string;
}

export interface ChatConnection {
    user_id: string;
    username: string;
    email: string;
    connected_since: string;
    is_online?: boolean;
}

export interface UnreadCountResponse {
    unread_count: number;
    has_unread: boolean;
}

export interface UnreadByUserResponse {
    [userId: string]: {
        username: string;
        count: number;
    };
}

export interface CanChatResponse {
    can_chat: boolean;
    other_user: {
        id: string;
        username: string;
        email: string;
    };
    status: 'connected' | 'pending' | 'accepted' | 'rejected' | 'no_connection';
    message: string;
}

export interface SearchMessagesResponse {
    count: number;
    query: string;
    messages: ChatMessageResponse[];
}

export interface FileMessageResponse {
    id: string;
    file_url: string;
    file_name: string;
    file_size: number;
    file_type: string;
    thumbnail_url?: string | null;
    sender_id: string;
    sender_username?: string | null;
    sent_at: string;
    caption?: string | null;
}

export interface ChatStats {
    total_messages: number;
    total_conversations: number;
    messages_by_type: Record<MessageType, number>;
    most_active_hour: number;
    average_response_time?: number;
    files_shared: number;
    top_chat_partners: Array<{
        user_id: string;
        username: string;
        message_count: number;
    }>;
}

// Backward compatible aliases
export type ChatMessage = ChatMessageResponse;

export type AnyWebSocketMessage = 
    | { type: 'new_message'; message_id: string; from: string; text?: string; caption?: string; message_type?: string; file_url?: string; file_name?: string; file_size?: number; file_type?: string; thumbnail_url?: string; time?: string; from_username?: string; reply_to_id?: string }
    | { type: 'typing'; from: string; typing: boolean; group_id?: string; user_id?: string }
    | { type: 'message_read'; message_id: string }
    | { type: 'messages_read'; read_by: string }
    | { type: 'message_edited'; message_id: string; new_content: string; edited_at?: string }
    | { type: 'message_reacted'; message_id: string; reactions: Record<string, string[]> }
    | { type: 'message_pinned'; message_id: string }
    | { type: 'message_unpinned'; message_id: string }
    | { type: 'chat'; to: string; text: string; reply_to_id?: string }
    | { type: 'file'; to: string; file_url: string; file_name: string; file_size: number; file_type: string; caption?: string; thumbnail_url?: string }
    | { type: 'read'; message_id: string }
    | { type: 'error'; message: string }
    | { type: 'pong' }
    | { type: 'user_online'; group_id: string; user_id: string }
    | { type: 'user_offline'; group_id: string; user_id: string }
    | { type: 'group_message'; group_id: string; message: any }
    | { type: 'member_added'; group_id: string; user_id: string }
    | { type: 'member_removed'; group_id: string; user_id: string }
    | { type: 'message_reaction'; group_id: string; message_id: string; reactions: any }
    | { type: 'online_status'; user_id: string; status: string };

export type WebSocketMessage = AnyWebSocketMessage;