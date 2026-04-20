import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useAuthContext } from '../contexts/AuthContext';
import { ChatWindow, ChatSidebar } from '../components/chat';
import { EmptyState, Skeleton, Button } from '../components/common';
import { useToast } from '../components/common/Toast';
import { Search, MessageSquare, Users, WifiOff, Zap } from 'lucide-react';

const Chat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
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
    pinMessage,
    reactToMessage,
    loadConversations,
    loadConnections
  } = useChat();

  const [partnerTyping, setPartnerTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConnections, setFilteredConnections] = useState(connections);

  useEffect(() => {
    if (!initialLoadRef.current && user) {
      loadConversations();
      loadConnections();
      initialLoadRef.current = true;
    }
  }, [user, loadConversations, loadConnections]);

  useEffect(() => {
    if (userId && userId !== activeChat) {
      setActiveChat(userId);
      loadConversation(userId);
    }
  }, [userId, setActiveChat, loadConversation, activeChat]);

  useEffect(() => {
    if (activeChat && isTyping[activeChat]) {
      setPartnerTyping(true);
      const timer = setTimeout(() => setPartnerTyping(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, activeChat]);

  useEffect(() => {
    if (searchQuery && searchQuery !== 'search') {
      const filtered = connections.filter(conn =>
        conn.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConnections(filtered);
    } else {
      setFilteredConnections(connections);
    }
  }, [connections, searchQuery]);

  const handleSendMessage = async (content: string, replyToId?: string) => {
    if (!activeChat) return;
    try {
      await sendMessage(activeChat, content, replyToId);
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
    if (activeChat) sendTypingIndicator(activeChat, typing);
  };

  const handleMarkAsRead = () => {
    if (activeChat) markAsRead(activeChat);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await pinMessage(messageId);
    } catch (error) {
      toast.error('Failed to pin message');
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      await reactToMessage(messageId, emoji);
    } catch (error) {
      toast.error('Failed to react to message');
    }
  };

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
    navigate(`/chat/${id}`);
  };

  const activePartner = conversations.find(c => c.user_id === activeChat);

  if (!user) return null;

  return (
    <div className="h-full flex overflow-hidden bg-slate-950/50">
      {/* Dynamic Chat Sidebar */}
      <aside className="w-85 border-r border-white/5 bg-slate-900/30 backdrop-blur-2xl flex flex-col animate-entrance">
        {/* Search & Header */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Communications</h2>
            {!isConnected && <WifiOff size={14} className="text-amber-500 animate-pulse" />}
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search intel..."
              value={searchQuery === 'search' ? '' : searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* Operational Tabs */}
        <div className="flex px-6 mb-4 gap-2">
          <button
            onClick={() => setSearchQuery('')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              searchQuery !== 'search'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <MessageSquare size={14} /> Active
          </button>
          <button
            onClick={() => setSearchQuery('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              searchQuery === 'search'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Users size={14} /> Network
          </button>
        </div>

        {/* Scrollable Personnel List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6">
          {isLoading ? (
            <div className="p-4 space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-20 bg-white/5 rounded" />
                    <div className="h-2 w-full bg-white/5 rounded opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery !== 'search' && !searchQuery ? (
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
            <div className="space-y-1 animate-entrance">
              {filteredConnections.length > 0 ? (
                filteredConnections.map(conn => (
                  <button
                    key={conn.user_id}
                    onClick={() => handleSelectChat(conn.user_id)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-white/5 rounded-[1.5rem] transition-all group border border-transparent hover:border-white/5"
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center text-indigo-400 font-black border border-indigo-500/20 group-hover:scale-105 transition-transform">
                        {conn.username.charAt(0).toUpperCase()}
                      </div>
                      {conn.is_online && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-4 border-slate-900" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-black text-slate-200 truncate tracking-tight">{conn.username}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{conn.email}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-20 text-center opacity-30">
                    <Search size={40} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">No matching intel</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Terminal */}
      <main className="flex-1 min-w-0 bg-slate-950/20 relative">
        {activeChat ? (
          <div className="h-full animate-entrance">
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
              onPinMessage={handlePinMessage}
              onReactToMessage={handleReactToMessage}
              hasMore={true}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-12">
            <div className="card-modern max-w-md w-full p-12 text-center border-dashed bg-white/5">
                <div className="w-20 h-20 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <Zap size={40} className="text-indigo-500" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter mb-3 uppercase">Frequency Silent</h2>
                <p className="text-slate-500 mb-10 leading-relaxed font-medium">Select a direct communication link or scan your network to initiate a secure broadcast.</p>
                <Button 
                    className="btn-modern !px-12 !py-4"
                    onClick={() => setSearchQuery('search')}
                >
                    Initialize Connection
                </Button>
            </div>
          </div>
        )}
      </main>

      {/* Connectivity Status Overlay */}
      {!isConnected && (
        <div className="fixed bottom-8 right-8 glass border-amber-500/20 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-in z-50">
          <div className="relative">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-amber-500 rounded-full animate-ping opacity-40" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Attempting Reconnection</span>
        </div>
      )}
    </div>
  );
};

export default Chat;