import React, { useState } from 'react';
import { Avatar, Dropdown } from '../common';
import {
  CheckCheck,
  Clock,
  MoreVertical,
  Edit2,
  Copy,
  Download,
  File,
  Image,
  Video,
  Music,
  FileText,
  Trash2
} from 'lucide-react';
import type { ChatMessageResponse } from '../../types/chat';
import { formatToLocalTime } from '../../utils/date';


interface MessageBubbleProps {
  message: ChatMessageResponse;
  isOwn: boolean;
  showAvatar?: boolean;
  partnerUsername?: string;
  partnerAvatar?: string | null;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: ChatMessageResponse) => void;
  onReact?: (emoji: string) => void;
  onPin?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = true,
  partnerUsername,
  partnerAvatar,
  onEdit,
  onDelete,
  onReply,
  onReact,
  onPin
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [, setShowImageModal] = useState(false);

  const formatTime = (timestamp: string) => {
    return formatToLocalTime(timestamp);
  };


  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <File className="w-8 h-8" />;

    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (mimeType.startsWith('video/')) return <Video className="w-8 h-8" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-8 h-8" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8" />;
    if (mimeType.includes('document')) return <FileText className="w-8 h-8" />;

    return <File className="w-8 h-8" />;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const dropdownItems = [
    {
      id: 'reply',
      label: 'Reply',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => onReply?.(message)
    },
    {
      id: 'react',
      label: 'React',
      icon: <CheckCheck className="w-4 h-4" />,
      onClick: () => onReact?.('👍')
    },
    {
      id: 'pin',
      label: 'Pin',
      icon: <Clock className="w-4 h-4" />,
      onClick: () => onPin?.()
    },
    ...(isOwn ? [
      {
        id: 'edit',
        label: 'Edit',
        icon: <Edit2 className="w-4 h-4" />,
        onClick: () => setIsEditing(true)
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => onDelete?.(message.id),
        danger: true
      }
    ] : []),
    ...(message.file_url ? [
      { id: 'divider', label: '', divider: true },
      {
        id: 'download',
        label: 'Download',
        icon: <Download className="w-4 h-4" />,
        onClick: () => handleDownload(message.file_url!, message.file_name || 'file')
      }
    ] : [])
  ];

  return (
    <div
      className={`flex items-end gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for others */}
      {!isOwn && showAvatar ? (
        <Avatar
          src={partnerAvatar}
          username={partnerUsername}
          size="sm"
        />
      ) : !isOwn && !showAvatar ? (
        <div className="w-8" />
      ) : null}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name for group chats */}
        {!isOwn && showAvatar && (
          <p className="text-xs text-gray-500 ml-2 mb-1">{partnerUsername}</p>
        )}

        <div className="relative group">
          {/* Message bubble */}
          <div
            className={`
              rounded-2xl px-4 py-2 break-words
              ${isOwn
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-900'
              }
              ${message.file_url ? 'pb-2' : ''}
            `}
          >
            {/* File attachment */}
            {message.file_url && (
              <div className="mb-2">
                {message.message_type === 'image' ? (
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setShowImageModal(true)}
                  >
                    <img
                      src={message.file_url}
                      alt={message.file_name || 'Image'}
                      className="max-w-full max-h-64 rounded-lg"
                    />
                  </div>
                ) : (
                  <a
                    href={message.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      flex items-center gap-3 p-3 rounded-lg
                      ${isOwn ? 'bg-indigo-700' : 'bg-gray-200'}
                    `}
                  >
                    {getFileIcon(message.file_mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                        {message.file_name}
                      </p>
                      <p className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                        {formatFileSize(message.file_size)}
                      </p>
                    </div>
                  </a>
                )}
              </div>
            )}

            {/* Text content */}
            {isEditing ? (
              <div className="min-w-[200px]">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 text-gray-900 border rounded-lg text-sm"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleEditSubmit}
                    className="text-xs bg-indigo-700 text-white px-2 py-1 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Edited indicator */}
            {message.edited_at && (
              <span className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-400'} ml-2`}>
                (edited)
              </span>
            )}
          </div>

          {/* Message actions dropdown */}
          {showActions && !isEditing && (
            <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 px-2`}>
              <Dropdown
                trigger={
                  <button className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50">
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                }
                items={dropdownItems}
                position={isOwn ? 'left' : 'right'}
              />
            </div>
          )}
        </div>

        {/* Message metadata */}
        <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-gray-400">
            {formatTime(message.created_at)}
          </span>
          {isOwn && (
            <span className="text-gray-400">
              {message.id.startsWith('temp-') ? (
                <Clock className="w-3 h-3 animate-pulse" />
              ) : (message.is_read || (message as any).read_by_me) ? (
                <CheckCheck className="w-3 h-3 text-indigo-600" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
            </span>
          )}

        </div>
      </div>
    </div>
  );
};