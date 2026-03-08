// 📄 src/contexts/ChatContext.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, type ReactNode } from 'react';
import { useChat } from '../hooks/useChat';
import type {
  ChatMessage,
  ConversationPreview,
  ChatConnection,
  CanChatResponse,
  MessageType
} from '../types/chat';

interface ChatContextType {
  // State
  messages: Record<string, ChatMessage[]>;
  conversations: ConversationPreview[];
  connections: ChatConnection[];
  activeChat: string | null;
  unreadCount: number;
  isTyping: Record<string, boolean>;
  isLoading: boolean;
  isConnected: boolean;

  // Setters
  setActiveChat: (partnerId: string | null) => void;

  // Actions
  sendMessage: (receiverId: string, content: string) => Promise<ChatMessage>;
  sendFileMessage: (receiverId: string, file: File, caption?: string) => Promise<ChatMessage>;
  loadConversation: (partnerId: string, limit?: number) => Promise<ChatMessage[]>;
  loadConversations: () => Promise<void>;
  loadConnections: () => Promise<void>;
  markAsRead: (partnerId: string) => Promise<void>;
  checkCanChat: (otherUserId: string) => Promise<CanChatResponse>;
  searchMessages: (query: string, messageType?: MessageType) => Promise<ChatMessage[]>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearConversation: (partnerId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  sendTypingIndicator: (partnerId: string, isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const chat = useChat();

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
};