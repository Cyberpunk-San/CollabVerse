import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, X, Image, File, Mic, StopCircle } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';


interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendFile?: (file: File, caption?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendFile,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...'
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    file: File;
    type: string;
    url: string;
  } | null>(null);
  const [caption, setCaption] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const typingTimeoutRef = useRef<any>(null);



  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    if (onTyping) {
      if (message.length > 0) {
        onTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      } else {
        onTyping(false);
      }
    }
  }, [message, onTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current?.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };


    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleSend = () => {
    if (attachmentPreview) {
      onSendFile?.(attachmentPreview.file, caption);
      setAttachmentPreview(null);
      setCaption('');
    } else if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    const url = URL.createObjectURL(file);

    setAttachmentPreview({
      file,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url
    });

    setShowFileMenu(false);
  };

  const handleRemoveAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview.url);
      setAttachmentPreview(null);
      setCaption('');
    }
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    setShowFileMenu(false);
  };

  const onEmojiClick = (emojiData: any) => {
    setMessage((prev: string) => prev + emojiData.emoji);
    // Optionally focus input after selection
    inputRef.current?.focus();
  };



  return (
    <div className="chat-input relative border-t border-gray-200 bg-white p-4">

      {attachmentPreview && (
        <div className="attachment-preview mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            {attachmentPreview.type === 'image' ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img
                  src={attachmentPreview.url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <File className="w-8 h-8 text-gray-400" />
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-2">
                {attachmentPreview.file.name}
              </p>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleRemoveAttachment}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative">
          <button
            onClick={() => setShowFileMenu(!showFileMenu)}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {showFileMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowFileMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                <span>Image / Video</span>
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowFileMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <File className="w-4 h-4" />
                <span>Document</span>
              </button>
              <button
                onClick={handleVoiceRecord}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <StopCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Voice Message</span>
                  </>
                )}
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <button
          ref={emojiButtonRef}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </button>


        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || !!attachmentPreview}
            rows={1}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !attachmentPreview)}
          className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-xl overflow-hidden bg-white border border-gray-200">
          <div className="p-2 bg-indigo-50 text-indigo-600 text-xs font-bold">EMOJI PICKER</div>
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.LIGHT}
            width={350}
            height={400}
          />
        </div>
      )}

    </div>
  );
};