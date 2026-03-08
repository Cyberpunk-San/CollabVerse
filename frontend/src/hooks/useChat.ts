// 📄 src/hooks/useChat.ts
import { useState, useCallback, useEffect } from 'react';
import { chatApi } from '../api/chat';
import { useChatSocket } from './useWebSocket';
import type { AnyWebSocketMessage } from './useWebSocket';
import type {
  ChatMessage,
  ConversationPreview,
  ChatConnection,
  CanChatResponse,
  MessageType,
  WebSocketMessage
} from '../types/chat';

// WebSocket payload shapes
type WSNewMessage = WebSocketMessage & {
  type: 'new_message';
  message_id: string;
  from: string;
  text?: string;
  caption?: string;
  message_type?: MessageType;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  thumbnail_url?: string;
  time?: string;
  from_username?: string;
};

type WSTyping = WebSocketMessage & {
  type: 'typing';
  from: string;
  typing: boolean;
};

type WSMessageRead = WebSocketMessage & {
  type: 'message_read';
  message_id: string;
};

type WSMessageEdited = WebSocketMessage & {
  type: 'message_edited';
  message_id: string;
  new_content: string;
  edited_at?: string;
};

type WSMessagesRead = WebSocketMessage & {
  type: 'messages_read';
  read_by: string;
};

// Define FailedOperation type for the new state
type FailedOperation = {
  id: string;
  type: 'send' | 'reaction'; // Example types, adjust as needed
  data: any; // Data needed to retry the operation
  retryCount: number;
};

export const useChat = () => {
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [connections, setConnections] = useState<ChatConnection[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState<Record<string, string[]>>({}); // groupId -> userIds
  // Error recovery queue for failed group operations
  const [failedQueue, setFailedQueue] = useState<FailedOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Pagination state for loading older messages
  const [pagination, setPagination] = useState<Record<string, { hasMore: boolean; nextCursor?: string; loadingMore: boolean }>>({});

  const studentId = localStorage.getItem('studentId') || '';

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: AnyWebSocketMessage) => {
    switch (data.type) {
      case 'new_message': {
        const payload = data as WSNewMessage;
        const newMsg: ChatMessage = {
          id: payload.message_id,
          sender_id: payload.from,
          receiver_id: studentId,
          content: payload.text || payload.caption,
          message_type: payload.message_type as MessageType,
          file_url: payload.file_url,
          file_name: payload.file_name,
          file_size: payload.file_size,
          file_mime_type: payload.file_type,
          thumbnail_url: payload.thumbnail_url,
          is_read: false,
          created_at: payload.time || new Date().toISOString(),
          sender_username: payload.from_username
        };

        setMessages(prev => ({
          ...prev,
          [payload.from]: [...(prev[payload.from] || []), newMsg]
        }));

        // Update conversation preview
        setConversations(prev => {
          const updated = [...prev];
          const index = updated.findIndex(c => c.user_id === payload.from);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              last_message: payload.text || payload.caption || '📷 Image',
              last_message_time: payload.time || new Date().toISOString(),
              unread_count: (updated[index].unread_count || 0) + 1
            };
          } else {
            updated.unshift({
              user_id: payload.from,
              username: payload.from_username || 'Unknown',
              last_message: payload.text || payload.caption || '📷 Image',
              last_message_time: payload.time || new Date().toISOString(),
              unread_count: 1,
              is_online: false
            });
          }
          return updated.sort((a, b) =>
            new Date(b.last_message_time || 0).getTime() -
            new Date(a.last_message_time || 0).getTime()
          );
        });

        setUnreadCount(prev => prev + 1);
        break;
      }

      case 'typing': {
        const payload = data as WSTyping;
        // The original logic for direct chat typing
        setIsTyping(prev => ({
          ...prev,
          [payload.from]: payload.typing ? [payload.from] : [] // Assuming direct chat typing means only the sender is typing
        }));
        // The new logic for group chat typing (assuming 'from' could be a group_id or user_id)
        const typingPayload = data as { group_id?: string; user_id?: string; typing?: boolean };
        if (typingPayload.group_id) {
          setIsTyping(prev => {
            const groupTyping = prev[typingPayload.group_id as string] || [];
            let updatedTyping = [...groupTyping];

            if (typingPayload.typing) {
              if (typingPayload.user_id && !updatedTyping.includes(typingPayload.user_id)) {
                updatedTyping.push(typingPayload.user_id);
              }
            } else if (typingPayload.user_id) {
              updatedTyping = updatedTyping.filter(id => id !== typingPayload.user_id);
            }

            return {
              ...prev,
              [typingPayload.group_id as string]: updatedTyping
            };
          });
        }
        break;
      }

      case 'message_read': {
        const payload = data as WSMessageRead;
        setMessages(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(partnerId => {
            updated[partnerId] = updated[partnerId].map(msg =>
              msg.id === payload.message_id ? { ...msg, is_read: true } : msg
            );
          });
          return updated;
        });
        break;
      }

      case 'message_edited': {
        const payload = data as WSMessageEdited;
        setMessages(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(partnerId => {
            updated[partnerId] = updated[partnerId].map(msg =>
              msg.id === payload.message_id
                ? { ...msg, content: payload.new_content, edited_at: payload.edited_at }
                : msg
            );
          });
          return updated;
        });
        break;
      }

      case 'messages_read': {
        const payload = data as WSMessagesRead;
        if (activeChat === payload.read_by) {
          setMessages(prev => ({
            ...prev,
            [payload.read_by]: (prev[payload.read_by] || []).map(msg =>
              ({ ...msg, is_read: true })
            )
          }));
        }
        break;
      }
    }
  }, [studentId, activeChat]);

  // WebSocket hook
  const { isConnected, send: sendWsMessage } = useChatSocket(studentId, {
    onMessage: handleWebSocketMessage
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await chatApi.getMyChats();
      setConversations(data.chats);

      const total = data.chats.reduce((sum: number, chat: ConversationPreview) => sum + chat.unread_count, 0);
      setUnreadCount(total);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load connections
  const loadConnections = useCallback(async () => {
    try {
      const data = await chatApi.getChatConnections();
      setConnections(data.connections);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, []);

  // Load conversation with a specific user
  const loadConversation = useCallback(async (partnerId: string, limit: number = 100) => {
    setIsLoading(true);
    try {
      const messages = await chatApi.getConversation(partnerId, limit);
      setMessages(prev => ({ ...prev, [partnerId]: messages }));
      return messages;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load older messages with pagination
  const loadMoreMessages = useCallback(async (partnerId: string) => {
    const state = pagination[partnerId];
    if (!state?.hasMore || state.loadingMore) return;

    setPagination(prev => ({
      ...prev,
      [partnerId]: { ...prev[partnerId], loadingMore: true }
    }));

    try {
      // FIX: Get cursor from oldest message (first in array)
      const oldestMessage = messages[partnerId]?.[0];
      const cursor = oldestMessage?.created_at;

      const older = await chatApi.getConversation(partnerId, 50, cursor);

      setMessages(prev => ({
        ...prev,
        [partnerId]: [...older, ...(prev[partnerId] || [])]
      }));

      setPagination(prev => ({
        ...prev,
        [partnerId]: {
          hasMore: older.length === 50,
          nextCursor: older[0]?.created_at,
          loadingMore: false
        }
      }));
    } catch (error) {
      console.error('Failed to load more messages:', error);
      setPagination(prev => ({
        ...prev,
        [partnerId]: { ...prev[partnerId], loadingMore: false }
      }));
    }
  }, [messages, pagination]);
  // Send message
  const sendMessage = useCallback(async (receiverId: string, content: string) => {
    // Optimistic update: generate temporary ID
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      sender_id: studentId,
      receiver_id: receiverId,
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      // other optional fields can be omitted or set to undefined
    };
    // Add temp message to UI immediately
    setMessages(prev => ({
      ...prev,
      [receiverId]: [...(prev[receiverId] || []), tempMessage]
    }));

    try {
      // Send via WebSocket for real-time broadcast
      if (isConnected) {
        sendWsMessage({
          type: 'chat',
          to: receiverId,
          text: content
        });
      }

      // Persist via API
      const message = await chatApi.sendTextMessage(receiverId, content);

      // Replace temp message with real message
      setMessages(prev => ({
        ...prev,
        [receiverId]: prev[receiverId].map(msg => msg.id === tempId ? message : msg)
      }));

      return message;
    } catch (error) {
      // Rollback optimistic update on failure
      setMessages(prev => ({
        ...prev,
        [receiverId]: prev[receiverId].filter(msg => msg.id !== tempId)
      }));
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [isConnected, sendWsMessage, studentId]);

  // Send file message
  const sendFileMessage = useCallback(async (receiverId: string, file: File, caption?: string) => {
    try {
      const message = await chatApi.sendFileMessage(receiverId, file, caption);

      // Send via WebSocket if connected
      if (isConnected) {
        sendWsMessage({
          type: 'file',
          to: receiverId,
          file_url: message.file_url || '',
          file_name: message.file_name || 'file',
          file_size: message.file_size || 0,
          file_type: message.file_mime_type || '',
          caption: message.content || undefined,
          thumbnail_url: message.thumbnail_url || undefined
        });
      }

      setMessages(prev => ({
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), message]
      }));

      // Add new conversation if it doesn't exist
      setConversations(prev => {
        if (!prev.some(c => c.user_id === message.sender_id)) {
          const newConversation: ConversationPreview = {
            user_id: message.sender_id,
            username: message.sender_username || 'Unknown',
            last_message: message.content || '📷 Image',
            last_message_time: message.created_at,
            unread_count: 1,
            is_online: true
          };
          return [newConversation, ...prev];
        }
        return prev;
      });

      return message;
    } catch (error) {
      console.error('Failed to send file message:', error);
      throw error;
    }
  }, [isConnected, sendWsMessage]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((receiverId: string, isTyping: boolean) => {
    if (isConnected) {
      sendWsMessage({
        type: 'typing',
        to: receiverId,
        typing: isTyping
      });
    }
  }, [isConnected, sendWsMessage]);

  // Mark conversation as read
  const markAsRead = useCallback(async (partnerId: string) => {
    try {
      await chatApi.markAsRead(partnerId);

      // Update local state
      setMessages(prev => ({
        ...prev,
        [partnerId]: (prev[partnerId] || []).map(msg =>
          ({ ...msg, is_read: true })
        )
      }));

      setConversations(prev =>
        prev.map(chat =>
          chat.user_id === partnerId
            ? { ...chat, unread_count: 0 }
            : chat
        )
      );

      // Send read receipt via WebSocket
      if (isConnected) {
        sendWsMessage({
          type: 'read',
          message_id: 'all' // Special ID to indicate all messages read
        });
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [isConnected, sendWsMessage]);

  // Check if can chat with user
  const checkCanChat = useCallback(async (otherUserId: string): Promise<CanChatResponse> => {
    return await chatApi.checkCanChat(otherUserId);
  }, []);

  // Search messages
  const searchMessages = useCallback(async (query: string, messageType?: MessageType) => {
    try {
      const data = await chatApi.searchMessages(query, messageType);
      return data.messages;
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await chatApi.deleteMessageForMe(messageId);

      // Update local state
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(partnerId => {
          updated[partnerId] = updated[partnerId].filter(msg => msg.id !== messageId);
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, []);

  // Clear conversation
  const clearConversation = useCallback(async (partnerId: string) => {
    try {
      await chatApi.clearConversationForMe(partnerId);
      setMessages(prev => {
        const updated = { ...prev };
        delete updated[partnerId];
        return updated;
      });
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      throw error;
    }
  }, []);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      await chatApi.editMessage(messageId, newContent);

      // Update local state
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(partnerId => {
          updated[partnerId] = updated[partnerId].map(msg =>
            msg.id === messageId
              ? { ...msg, content: newContent, edited_at: new Date().toISOString() }
              : msg
          );
        });
        return updated;
      });

      // Notify via WebSocket
      if (isConnected) {
        sendWsMessage({
          type: 'message_edited',
          message_id: messageId,
          new_content: newContent
        });
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  }, [isConnected, sendWsMessage]);

  // Initial load
  useEffect(() => {
    if (studentId) {
      loadConversations();
      loadConnections();
    }
  }, [studentId, loadConversations, loadConnections]);

  // Retry failed operations when connection is restored
  // Placeholder for sendGroupMessage and reactToMessage, which are not defined in this file


  useEffect(() => {
    if (isConnected && failedQueue.length > 0) {
      failedQueue.forEach(async op => {
        try {
          // Simple retry logic based on operation type
          if (op.type === 'send') {
            // Assuming op.id is receiverId for sendMessage
            await sendMessage(op.id, op.data.content);
          } else if (op.type === 'reaction') {
            // This part assumes a reactToMessage function exists, which is not in the original file
            // For now, it's a placeholder. If this is for group chats, it would be in a different hook.
            // await reactToMessage(op.id, op.data.messageId, op.data.emoji);
          }
          // Remove from queue on success
          setFailedQueue(prev => prev.filter(item => item.id !== op.id));
        } catch (e) {
          // Increment retry count, drop after max attempts (e.g., 3)
          setFailedQueue(prev =>
            prev.map(item =>
              item.id === op.id ? { ...item, retryCount: item.retryCount + 1 } : item
            ).filter(item => item.retryCount < 3)
          );
        }
      });
    }
  }, [isConnected, failedQueue, sendMessage]); // Added sendMessage to dependencies

  return {
    // State
    messages,
    conversations,
    connections,
    activeChat,
    unreadCount,
    isTyping,
    isLoading,
    isConnected,

    // Setters
    setActiveChat,

    // Actions
    sendMessage,
    sendFileMessage,
    loadConversation,
    loadConversations,
    loadConnections,
    markAsRead,
    checkCanChat,
    searchMessages,
    deleteMessage,
    clearConversation,
    editMessage,
    sendTypingIndicator,
    loadMoreMessages,
  };
};