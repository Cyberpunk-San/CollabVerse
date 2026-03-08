import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { ChatWindow, ChatSidebar } from '../components/chat';
import { EmptyState, Skeleton } from '../components/common';
import { useToast } from '../components/common/Toast';
import { Search } from 'lucide-react';

const Chat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const initialLoadRef = useRef(false);

  const {
    conversations,
    connections,
    messages,
    activeChat,
    isTyping,
    isLoading,
    isConnected,
    setActiveChat,
    sendMessage,
    sendFileMessage,
    loadConversation,
    loadMoreMessages,
    markAsRead,
    sendTypingIndicator,
    editMessage,
    deleteMessage,
    loadConversations,
    loadConnections
  } = useChat();

  const [partnerTyping, setPartnerTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConnections, setFilteredConnections] = useState(connections);

  // Initial load
  useEffect(() => {
    if (!initialLoadRef.current && user) {
      loadConversations();
      loadConnections();
      initialLoadRef.current = true;
    }
  }, [user, loadConversations, loadConnections]);

  // Handle URL param
  useEffect(() => {
    if (userId && userId !== activeChat) {
      setActiveChat(userId);
      loadConversation(userId);
    }
  }, [userId, setActiveChat, loadConversation, activeChat]);

  // Handle typing indicator
  useEffect(() => {
    if (activeChat && isTyping[activeChat]) {
      setPartnerTyping(true);
      const timer = setTimeout(() => setPartnerTyping(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, activeChat]);

  // Filter connections based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = connections.filter(conn =>
        conn.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConnections(filtered);
    } else {
      setFilteredConnections(connections);
    }
  }, [connections, searchQuery]);

  const handleSendMessage = async (content: string) => {
    if (!activeChat) {
      toast.error('No active chat selected');
      return;
    }

    try {
      await sendMessage(activeChat, content);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleSendFile = async (file: File, caption?: string) => {
    if (!activeChat) return;

    try {
      await sendFileMessage(activeChat, file, caption);
    } catch (error) {
      toast.error('Failed to send file');
    }
  };

  const handleTyping = (typing: boolean) => {
    if (activeChat) {
      sendTypingIndicator(activeChat, typing);
    }
  };

  const handleMarkAsRead = () => {
    if (activeChat) {
      markAsRead(activeChat);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      toast.success('Message edited');
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
    navigate(`/chat/${id}`);
  };

  const activePartner = conversations.find(c => c.user_id === activeChat);

  if (!user) return null;

  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* Chat Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Conversations/Connections Toggle */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSearchQuery('')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${!searchQuery
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Conversations
          </button>
          <button
            onClick={() => setSearchQuery('search')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${searchQuery === 'search'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Connections
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : !searchQuery ? (
            <ChatSidebar
              conversations={conversations}
              connections={connections}
              activeChatId={activeChat}
              unreadCount={conversations.reduce((sum, c) => sum + c.unread_count, 0)}
              onSelectChat={handleSelectChat}
              onSearch={() => { }}
              isLoading={isLoading}
            />
          ) : (
            <div className="p-4 space-y-2">
              {filteredConnections.length > 0 ? (
                filteredConnections.map(conn => (
                  <button
                    key={conn.user_id}
                    onClick={() => handleSelectChat(conn.user_id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {conn.username.charAt(0).toUpperCase()}
                      </div>
                      {conn.is_online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">{conn.username}</p>
                      <p className="text-xs text-gray-500">{conn.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  type="search"
                  title="No results found"
                  description="No connections match your search"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        {activeChat ? (
          <ChatWindow
            partnerId={activeChat}
            partnerUsername={activePartner?.username || 'User'}
            messages={messages[activeChat] || []}
            isOnline={activePartner?.is_online}
            isTyping={partnerTyping}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            onTyping={handleTyping}
            onMarkAsRead={handleMarkAsRead}
            onLoadMore={() => loadMoreMessages(activeChat)}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            hasMore={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <EmptyState
              type="chat"
              title="No active chat"
              description="Choose a conversation from the sidebar or start a new one"
              action={{
                label: "Find Connections",
                onClick: () => setSearchQuery('search')
              }}
            />
          </div>
        )}
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-sm">Reconnecting...</span>
        </div>
      )}
    </div>
  );
};

export default Chat;