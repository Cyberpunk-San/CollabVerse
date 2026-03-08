import { apiClient } from './index';

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
  sender_username?: string | null;
  receiver_username?: string | null;
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
}

// WebSocket message types
export interface WebSocketChatMessage {
  type: 'chat';
  to: string;
  text: string;
}

export interface WebSocketFileMessage {
  type: 'file';
  to: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  caption?: string;
  thumbnail_url?: string;
}

export interface WebSocketTypingMessage {
  type: 'typing';
  to: string;
  typing: boolean;
}

export interface WebSocketReadMessage {
  type: 'read';
  message_id: string;
}

export interface WebSocketPingMessage {
  type: 'ping';
}

export interface WebSocketMessageResponse {
  type: 'new_message' | 'message_sent' | 'message_read' | 'messages_read' |
  'typing' | 'error' | 'pong' | 'message_edited';
  from?: string;
  from_username?: string;
  text?: string;
  message_id?: string;
  time?: string;
  message_type?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  caption?: string;
  thumbnail_url?: string;
  read_by?: string;
  timestamp?: string;
  message?: string;
  new_content?: string;
  edited_at?: string;
}

export const chatApi = {
  /**
   * Upload a file before sending as message
   * @param file - File to upload
   * @param onProgress - Optional progression callback
   * @returns Uploaded file information
   */
  uploadFile: async (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<FileUploadResponse>(
      '/chat/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      }
    );
    return response.data;
  },

  /**
   * Send a file message with uploaded file
   * @param receiverId - ID of message recipient
   * @param file - File to send
   * @param caption - Optional caption
   */
  sendFileMessage: async (receiverId: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('receiver_id', receiverId);
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await apiClient.post<ChatMessageResponse>(
      '/chat/send-file',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  /**
   * Send a file message using existing file URL
   * @param receiverId - ID of message recipient
   * @param fileInfo - File information
   * @param caption - Optional caption
   */
  sendFileByUrl: async (
    receiverId: string,
    fileInfo: {
      file_url: string;
      file_name: string;
      file_size: number;
      file_mime_type: string;
      thumbnail_url?: string;
    },
    caption?: string
  ) => {
    const response = await apiClient.post<ChatMessageResponse>(
      '/chat/send-file-url',
      null,
      {
        params: {
          receiver_id: receiverId,
          file_url: fileInfo.file_url,
          file_name: fileInfo.file_name,
          file_size: fileInfo.file_size,
          file_mime_type: fileInfo.file_mime_type,
          thumbnail_url: fileInfo.thumbnail_url,
          caption
        }
      }
    );
    return response.data;
  },

  /**
   * Send a text message
   * @param receiverId - ID of message recipient
   * @param content - Message text
   */
  sendTextMessage: async (receiverId: string, content: string) => {
    const response = await apiClient.post<ChatMessageResponse>(
      '/chat/message',
      null,
      {
        params: {
          receiver_id: receiverId,
          content
        }
      }
    );
    return response.data;
  },

  /**
   * Get conversation with another user
   * @param otherUserId - ID of the other user
   * @param limit - Number of messages to fetch (default: 100, max: 500)
   * @param before - Timestamp to fetch messages before
   */
  getConversation: async (
    otherUserId: string,
    limit: number = 100,
    before?: string
  ) => {
    const params: any = { limit };
    if (before) {
      params.before = before;
    }

    const response = await apiClient.get<ChatMessageResponse[]>(
      `/chat/conversation/${otherUserId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get all chats/conversations for current user
   */
  getMyChats: async () => {
    const response = await apiClient.get<{
      count: number;
      chats: ConversationPreview[];
    }>('/chat/chats');
    return response.data;
  },

  /**
   * Get all chat connections (accepted requests)
   */
  getChatConnections: async () => {
    const response = await apiClient.get<{
      count: number;
      connections: ChatConnection[];
    }>('/chat/connections');
    return response.data;
  },

  /**
   * Get total unread messages count
   */
  getUnreadCount: async () => {
    const response = await apiClient.get<UnreadCountResponse>('/chat/unread');
    return response.data;
  },

  /**
   * Get unread messages count grouped by user
   */
  getUnreadByUser: async () => {
    const response = await apiClient.get<UnreadByUserResponse>('/chat/unread-by-user');
    return response.data;
  },

  /**
   * Mark all messages from a user as read
   * @param otherUserId - ID of the other user
   */
  markAsRead: async (otherUserId: string) => {
    const response = await apiClient.post<{
      marked_read: number;
      message: string;
    }>(`/chat/mark-read/${otherUserId}`);
    return response.data;
  },

  /**
   * Mark a specific message as read
   * @param messageId - ID of the message
   */
  markMessageAsRead: async (messageId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/chat/mark-message-read/${messageId}`);
    return response.data;
  },

  /**
   * Check if you can chat with a user
   * @param otherUserId - ID of the other user
   */
  checkCanChat: async (otherUserId: string) => {
    const response = await apiClient.get<CanChatResponse>(
      `/chat/can-chat/${otherUserId}`
    );
    return response.data;
  },

  /**
   * Search messages
   * @param query - Search query
   * @param messageType - Optional message type filter
   */
  searchMessages: async (query: string, messageType?: MessageType) => {
    const params: any = { query };
    if (messageType) {
      params.message_type = messageType;
    }

    const response = await apiClient.get<SearchMessagesResponse>(
      '/chat/search',
      { params }
    );
    return response.data;
  },

  /**
   * Get files by message type
   * @param messageType - Type of files to fetch (image, video, document, etc.)
   */
  getFilesByType: async (messageType: string) => {
    const response = await apiClient.get<{
      count: number;
      message_type: string;
      files: FileMessageResponse[];
    }>(`/chat/files/${messageType}`);
    return response.data;
  },

  /**
   * Get chat statistics
   */
  getChatStats: async () => {
    const response = await apiClient.get<ChatStats>('/chat/stats');
    return response.data;
  },

  /**
   * Delete a message (for current user only)
   * @param messageId - ID of the message
   */
  deleteMessageForMe: async (messageId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/chat/message/${messageId}`);
    return response.data;
  },

  /**
   * Clear entire conversation (for current user only)
   * @param otherUserId - ID of the other user
   */
  clearConversationForMe: async (otherUserId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      deleted_count: number;
    }>(`/chat/conversation/${otherUserId}`);
    return response.data;
  },

  /**
   * Download a file from a message
   * @param messageId - ID of the message containing the file
   */
  downloadFile: async (messageId: string) => {
    const response = await apiClient.get(`/chat/download/${messageId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Edit a text message
   * @param messageId - ID of the message
   * @param newContent - New message content
   */
  editMessage: async (messageId: string, newContent: string) => {
    const response = await apiClient.patch<{
      success: boolean;
      message: string;
      edited_at: string;
      content: string;
    }>(
      `/chat/message/${messageId}`,
      null,
      {
        params: { new_content: newContent }
      }
    );
    return response.data;
  }
};