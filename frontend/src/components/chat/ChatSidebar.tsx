import React, { useState } from 'react';
import { Search, MessageSquare, Users } from 'lucide-react';
import type { ConversationPreview, ChatConnection } from '../../types/chat';

interface ChatSidebarProps {
  conversations: ConversationPreview[];
  connections: ChatConnection[];
  activeChatId: string | null;
  unreadCount: number;
  onSelectChat: (userId: string) => void;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  connections,
  activeChatId,
  unreadCount,
  onSelectChat,
  onSearch,
  isLoading = false
}) => {
  const [view, setView] = useState<'chats' | 'connections'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const filteredItems = view === 'chats' 
    ? conversations.filter(c => 
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : connections.filter(c => 
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="chat-sidebar w-80 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('chats')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'chats'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Chats
            {unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('connections')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'connections'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Connections
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${view}...`}
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              No {view} found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const isActive = activeChatId === item.user_id;
              const unread = 'unread_count' in item ? item.unread_count : 0;
              
              return (
                <button
                  key={item.user_id}
                  onClick={() => onSelectChat(item.user_id)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                    isActive ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                      {item.username.charAt(0).toUpperCase()}
                    </div>
                    {'is_online' in item && item.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {item.username}
                      </h3>
                      {'last_message_time' in item && (
                        <span className="text-xs text-gray-500">
                          {formatTime(item.last_message_time)}
                        </span>
                      )}
                    </div>
                    
                    {'last_message' in item && (
                      <p className="text-xs text-gray-500 truncate text-left">
                        {item.last_message}
                      </p>
                    )}
                    
                    {'connected_since' in item && (
                      <p className="text-xs text-gray-500 text-left">
                        Connected {new Date(item.connected_since).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded-full">
                        {unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};