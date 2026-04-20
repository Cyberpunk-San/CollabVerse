import React, { useState, useEffect, useRef } from 'react';
import { type GroupMessageResponse, type GroupMemberResponse } from '../../api/group';
import { formatToLocalDate } from '../../utils/date';

import { Avatar, Button } from '../common';

import { ChatInput } from '../chat/ChatInput';
import { MessageBubble } from '../chat/MessageBubble';




interface GroupChatProps {
  groupId: string;
  groupName: string;
  messages: GroupMessageResponse[];
  members: GroupMemberResponse[];
  currentUserId: string;
  currentUserRole?: 'member' | 'admin' | 'creator';
  isLoading?: boolean;
  onSendMessage: (content: string, mentionType?: string, mentionedUsers?: string[], replyToId?: string) => void;
  onSendFile?: (file: File, caption?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string, deleteForAll?: boolean) => void;
  onPinMessage?: (messageId: string) => void;
  onMentionClick?: (userId: string) => void;
  onLeaveGroup?: () => void;
  loadingMore?: boolean;
  onlineCount?: number;
}

export const GroupChat: React.FC<GroupChatProps> = ({
  groupName,
  messages,
  members,
  currentUserId,
  isLoading = false,
  onSendMessage,
  onSendFile,
  onTyping,
  onLoadMore,
  hasMore = false,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onPinMessage,
  loadingMore = false
}) => {

  const [replyingTo, setReplyingTo] = useState<GroupMessageResponse | null>(null);
  const [mentionSearch] = useState('');

  const [showMentions, setShowMentions] = useState(false);

  const [mentionStart] = useState(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);



  // Scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollButton]);

  // Handle scroll
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

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: GroupMessageResponse[] }[] = [];

    messages.forEach((message) => {
      const date = formatToLocalDate(message.created_at);
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

  const handleMentionSelect = (username: string) => {
    if (!inputRef.current || mentionStart === -1) return;

    const currentValue = inputRef.current.value;
    const beforeMention = currentValue.slice(0, mentionStart);
    const afterMention = currentValue.slice(mentionStart + mentionSearch.length + 1);

    const newValue = `${beforeMention}@${username} ${afterMention}`;
    inputRef.current.value = newValue;
    setShowMentions(false);

    // Trigger typing indicator
    onTyping?.(true);
  };

  const filteredMentions = members
    .filter(m => m.user_id !== currentUserId)
    .filter(m => m.username.toLowerCase().includes(mentionSearch.toLowerCase()));



  return (
    <div className="group-chat flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Messages */}

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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}

            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                    {group.date}
                  </span>
                </div>

                {group.messages.map((message, messageIndex) => {
                  const showAvatar = messageIndex === 0 ||
                    group.messages[messageIndex - 1].sender_id !== message.sender_id;

                  const sender = members.find(m => m.user_id === message.sender_id);

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message as any}
                      isOwn={message.sender_id === currentUserId}
                      showAvatar={showAvatar}
                      partnerUsername={sender?.username}
                      onReply={() => setReplyingTo(message)}
                      onEdit={(id: string, content) => onEditMessage?.(id, content)}
                      onDelete={(id: string) => onDeleteMessage?.(id)}
                      onReact={(emoji: string) => onReactToMessage?.(message.id, emoji)}
                      onPin={() => onPinMessage?.(message.id)}
                    />
                  );
                })}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
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

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-6 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Replying to</span>
            <span className="text-sm font-medium">{replyingTo.sender_username}</span>
            <span className="text-sm text-gray-600 truncate max-w-md">
              {replyingTo.content}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-gray-200 rounded-full"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Mention suggestions */}
      {showMentions && filteredMentions.length > 0 && (
        <div className="absolute bottom-24 left-6 right-6 max-h-48 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200">
          {filteredMentions.map(member => (
            <button
              key={member.user_id}
              onClick={() => handleMentionSelect(member.username)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-50"
            >
              <Avatar username={member.username} size="sm" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{member.username}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSendMessage={(content) => {
          const mentionRegex = /@(\w+)/g;
          const matches = content.match(mentionRegex);
          const mentionedUsers: string[] = [];
          let mentionType: string | undefined = undefined;

          if (matches) {
            mentionType = 'user';
            matches.forEach(match => {
              const username = match.substring(1);
              if (username === 'all') mentionType = 'all';
              else if (username === 'here') mentionType = 'here';
              else {
                const member = members.find(m => m.username === username);
                if (member) mentionedUsers.push(member.user_id);
              }
            });
          }

          onSendMessage(content, mentionType, mentionedUsers, replyingTo?.id);
          setReplyingTo(null);
        }}
        onSendFile={onSendFile}
        onTyping={onTyping}
        placeholder={`Message #${groupName}`}
      />

    </div>

  );
};