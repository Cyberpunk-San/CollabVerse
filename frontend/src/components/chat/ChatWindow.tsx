import React, { useState, useEffect, useRef } from 'react';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { Phone, Video, MoreVertical } from 'lucide-react';
import type { ChatMessageResponse } from '../../types/chat';

interface ChatWindowProps {
  partnerId: string;
  partnerUsername: string;
  messages: ChatMessageResponse[];
  isOnline?: boolean;
  isTyping?: boolean;
  isLoading?: boolean;
  onSendMessage: (content: string, replyToId?: string) => void;
  onSendFile?: (file: File, caption?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onMarkAsRead?: () => void;
  onLoadMore?: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  hasMore?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  partnerId,
  partnerUsername,
  messages,
  isOnline = false,
  isTyping = false,
  isLoading = false,
  onSendMessage,
  onSendFile,
  onTyping,
  onMarkAsRead,
  onLoadMore,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onReactToMessage,
  hasMore = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessageResponse | null>(null);

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollButton]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onMarkAsRead?.();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [onMarkAsRead]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const handleScrollTop = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !isLoading) {
      onLoadMore?.();
    }
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: ChatMessageResponse[] }[] = [];

    messages.forEach((message) => {
      const date = new Date(message.created_at).toLocaleDateString();
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="chat-window flex flex-col h-full bg-transparent">
      <div className="chat-header px-6 py-4 bg-transparent border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                {partnerUsername.charAt(0).toUpperCase()}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {partnerUsername}
              </h2>
              <p className="text-sm text-gray-500">
                {isTyping ? (
                  <span className="text-indigo-600">Typing...</span>
                ) : isOnline ? (
                  'Online'
                ) : (
                  'Offline'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors">
              <Phone className="w-5 h-5" />
            </button>

            <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors">
              <Video className="w-5 h-5" />
            </button>

            <div className="relative">
              <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        onScroll={(e) => {
          handleScroll(e);
          handleScrollTop(e);
        }}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center mb-4">
                <button
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}

            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {group.date}
                  </span>
                </div>

                {group.messages.map((message, messageIndex) => {
                  const showAvatar = messageIndex === 0 ||
                    group.messages[messageIndex - 1].sender_id !== message.sender_id;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id !== partnerId}
                      showAvatar={showAvatar}
                      partnerUsername={partnerUsername}
                      onEdit={(id, content) => onEditMessage?.(id, content)}
                      onDelete={(id) => onDeleteMessage?.(id)}
                      onReply={(msg) => setReplyingTo(msg)}
                      onPin={(id) => onPinMessage?.(id)}
                      onReact={(id, emoji) => onReactToMessage?.(id, emoji)}
                    />
                  );
                })}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                  {partnerUsername.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showScrollButton && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-8 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7m14-6l-7 7-7-7" />
          </svg>
        </button>
      )}

      <ChatInput
        onSendMessage={(content) => {
          onSendMessage(content, replyingTo?.id);
          setReplyingTo(null);
        }}
        onSendFile={onSendFile}
        onTyping={onTyping}
        disabled={isLoading}
        placeholder={`Message ${partnerUsername}...`}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
};