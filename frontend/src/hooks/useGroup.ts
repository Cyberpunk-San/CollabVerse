// 📄 src/hooks/useGroup.ts
import { useState, useCallback, useEffect } from 'react';
import { groupsApi } from '../api/group';
import { useGroupSocket } from './useWebSocket';
import type { AnyWebSocketMessage } from './useWebSocket';
import type {
  Group,
  GroupMember,
  GroupMessage,
  PinnedMessage,
  PollCreateData,
  ReactionInfo,
  OnlineMember,
  MessageMention
} from '../types/group';

import type { GroupNewMessageWS } from '../types/websocket';

export const useGroup = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [groupMessages, setGroupMessages] = useState<Record<string, GroupMessage[]>>({});
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, PinnedMessage[]>>({});
  const [onlineMembers, setOnlineMembers] = useState<Record<string, OnlineMember[]>>({});
  const [isTyping, setIsTyping] = useState<Record<string, string[]>>({}); // groupId -> userIds
  const [isLoading, setIsLoading] = useState(false);
  const [mentions, setMentions] = useState<MessageMention[]>([]);
  const [unreadMentionCount, setUnreadMentionCount] = useState(0);

  const studentId = localStorage.getItem('studentId') || '';

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: AnyWebSocketMessage) => {
    switch (data.type) {
      case 'group_message': {
        const payload = data as GroupNewMessageWS;
        const newMessage = payload.message;

        setGroupMessages(prev => ({
          ...prev,
          [payload.group_id]: [...(prev[payload.group_id] || []), newMessage]
        }));

        // Update group's last message
        setGroups(prev => prev.map(group =>
          group.id === payload.group_id
            ? {
              ...group,
              last_message: (newMessage.content ? newMessage.content.substring(0, 50) + '...' : undefined),
              last_message_time: newMessage.created_at,
              unread_count: group.unread_count + 1
            }
            : group
        ));
        break;
      }

      case 'message_edited': {
        const payload = data as { group_id?: string; message_id?: string; new_content?: string; edited_at?: string };
        setGroupMessages(prev => {
          const updated = { ...prev };
          if (payload.group_id && updated[payload.group_id]) {
            updated[payload.group_id] = updated[payload.group_id].map(msg =>
              msg.id === payload.message_id
                ? {
                  ...msg,
                  content: payload.new_content,
                  edited_at: payload.edited_at
                }
                : msg
            );
          }
          return updated;
        });
        break;
      }

      case 'message_deleted': {
        const payload = data as { group_id?: string; message_id?: string };
        setGroupMessages(prev => {
          const updated = { ...prev };
          if (payload.group_id && updated[payload.group_id]) {
            updated[payload.group_id] = updated[payload.group_id].filter(
              msg => msg.id !== payload.message_id
            );
          }
          return updated;
        });
        break;
      }

      case 'typing': {
        const payload = data as { group_id?: string; user_id?: string; typing?: boolean };
        if (payload.group_id) {
          setIsTyping(prev => {
            const groupTyping = prev[payload.group_id as string] || [];
            let updatedTyping = [...groupTyping];

            if (payload.typing) {
              if (payload.user_id && !updatedTyping.includes(payload.user_id)) {
                updatedTyping.push(payload.user_id);
              }
            } else if (payload.user_id) {
              updatedTyping = updatedTyping.filter(id => id !== payload.user_id);
            }

            return {
              ...prev,
              [payload.group_id as string]: updatedTyping
            };
          });
        }
        break;
      }

      case 'user_online': {
        const payload = data as { group_id?: string; user_id?: string };
        setOnlineMembers(prev => {
          const groupOnline = prev[payload.group_id as string] || [];
          // Add user if not already in list
          if (!groupOnline.some(member => member.user_id === payload.user_id)) {
            // We'll add the user when we get the full details
            return prev;
          }
          return prev;
        });
        break;
      }

      case 'user_offline': {
        const payload = data as { group_id?: string; user_id?: string };
        setOnlineMembers(prev => {
          const groupOnline = prev[payload.group_id as string] || [];
          return {
            ...prev,
            [payload.group_id as string]: groupOnline.filter(member => member.user_id !== payload.user_id)
          };
        });
        break;
      }

      case 'new_member': {
        // Refresh members for this group
        const payload = data as { group_id?: string };
        if (payload.group_id) {
          groupsApi.getGroupMembers(payload.group_id).then(members => {
            setGroupMembers(prev => ({
              ...prev,
              [payload.group_id as string]: members
            }));
          });
        }
        break;
      }

      case 'member_removed':
      case 'member_left': {
        const payload = data as { group_id?: string; user_id?: string };
        setGroupMembers(prev => {
          const updated = { ...prev };
          if (payload.group_id && updated[payload.group_id]) {
            updated[payload.group_id] = updated[payload.group_id].filter(
              member => member.user_id !== payload.user_id
            );
          }
          return updated;
        });
        break;
      }

      case 'message_pinned': {
        const payload = data as { group_id?: string };
        if (payload.group_id) {
          groupsApi.getPinnedMessages(payload.group_id).then(pins => {
            setPinnedMessages(prev => ({
              ...prev,
              [payload.group_id as string]: pins
            }));
          });
        }
        break;
      }

      case 'message_unpinned': {
        const payload = data as { group_id?: string; message_id?: string };
        setPinnedMessages(prev => {
          const updated = { ...prev };
          if (payload.group_id && updated[payload.group_id]) {
            updated[payload.group_id] = updated[payload.group_id].filter(
              pin => pin.message_id !== payload.message_id
            );
          }
          return updated;
        });
        break;
      }

      case 'message_reaction': {
        const payload = data as { group_id?: string; message_id?: string; reactions?: Record<string, ReactionInfo> };
        setGroupMessages(prev => {
          const updated = { ...prev };
          if (payload.group_id && updated[payload.group_id]) {
            updated[payload.group_id] = updated[payload.group_id].map(msg =>
              msg.id === payload.message_id
                ? { ...msg, reactions: payload.reactions ?? msg.reactions }
                : msg
            );
          }
          return updated;
        });
        break;
      }

      case 'mention_notification': {
        const payload = data as { group_id?: string; group_name?: string; message_id?: string; message_preview?: string; mentioner_id?: string; mentioner_username?: string; mention_type?: string };
        setMentions(prev => [...prev, {
          id: '',
          message_id: payload.message_id as string,
          mentioned_user_id: studentId,
          mentioner_id: payload.mentioner_id as string,
          username: payload.mentioner_username as string,
          mention_text: payload.message_preview || '',
          created_at: new Date().toISOString(),
          notified: false
        }]);
        setUnreadMentionCount(prev => prev + 1);
        break;
      }

      case 'online_status': {
        const payload = data as { group_id?: string; online_count?: number };
        // Update online count for group
        setGroups(prev => prev.map(group =>
          group.id === payload.group_id
            ? { ...group, online_count: payload.online_count ?? group.online_count }
            : group
        ));
        break;
      }
    }
  }, []);

  // WebSocket hook for groups
  const { isConnected, send: sendWsMessage } = useGroupSocket(studentId, {
    onMessage: handleWebSocketMessage
  });

  // Load groups
  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await groupsApi.getMyGroups();
      setGroups(response);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load group details
  const loadGroup = useCallback(async (groupId: string) => {
    setIsLoading(true);
    try {
      const newGroup = await groupsApi.getGroup(groupId);
      setGroups(prev => {
        const existing = prev.find(g => g.id === groupId);
        if (existing) {
          return prev.map(g => g.id === groupId ? newGroup : g);
        }
        return [...prev, newGroup];
      });
      return newGroup;
    } catch (error) {
      console.error('Failed to load group:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load group members
  const loadGroupMembers = useCallback(async (groupId: string) => {
    try {
      const members = await groupsApi.getGroupMembers(groupId);
      setGroupMembers(prev => ({ ...prev, [groupId]: members as any[] }));
      return members;
    } catch (error) {
      console.error('Failed to load group members:', error);
      return [];
    }
  }, []);

  // Load group messages
  const loadGroupMessages = useCallback(async (groupId: string, limit: number = 100, before?: string) => {
    try {
      // FIX: Backend returns array directly
      const messages = await groupsApi.getMessages(groupId, limit, before);
      setGroupMessages(prev => ({
        ...prev,
        [groupId]: messages // Direct assignment, not messages.items
      }));
      return messages;
    } catch (error) {
      console.error('Failed to load group messages:', error);
      return [];
    }
  }, []);

  // Batch operation methods
  const markMessagesRead = useCallback(async (groupId: string, messageIds: string[]) => {
    try {
      const result = await groupsApi.markMessagesRead(groupId, messageIds);
      return result;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }, []);

  const deleteMessages = useCallback(async (groupId: string, messageIds: string[]) => {
    try {
      const result = await groupsApi.deleteMessages(groupId, messageIds);
      return result;
    } catch (error) {
      console.error('Failed to delete messages:', error);
      throw error;
    }
  }, []);

  const reactToMessages = useCallback(async (groupId: string, messageIds: string[], emoji: string) => {
    try {
      const result = await groupsApi.reactToMessages(groupId, messageIds, emoji);
      return result;
    } catch (error) {
      console.error('Failed to react to messages:', error);
      throw error;
    }
  }, []);

  // Load pinned messages
  const loadPinnedMessages = useCallback(async (groupId: string) => {
    try {
      const pins = await groupsApi.getPinnedMessages(groupId);
      setPinnedMessages(prev => ({ ...prev, [groupId]: pins as any[] }));
      return pins;
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
      return [];
    }
  }, []);

  // Load online members
  const loadOnlineMembers = useCallback(async (groupId: string) => {
    try {
      const result = await groupsApi.getOnlineMembers(groupId);
      setOnlineMembers(prev => ({
        ...prev,
        [groupId]: result.online_members
      }));
      return result.online_members;
    } catch (error) {
      console.error('Failed to load online members:', error);
      return [];
    }
  }, []);

  // Send group message
  const sendGroupMessage = useCallback(async (
    groupId: string,
    content: string,
    options: {
      message_type?: string;
      file?: File;
      reply_to_id?: string;
      mention_type?: string;
      mentioned_users?: string[];
    } = {}
  ) => {
    try {
      const message = await groupsApi.sendMessage(groupId, {
        content,
        message_type: options.message_type,
        reply_to_id: options.reply_to_id,
        mention_type: options.mention_type as any,
        mentioned_users: options.mentioned_users
      }, options.file);

      // Update local state
      setGroupMessages(prev => ({
        ...prev,
        [groupId]: [...(prev[groupId] || []), message]
      }));

      return message;
    } catch (error) {
      console.error('Failed to send group message:', error);
      throw error;
    }
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((groupId: string, isTyping: boolean) => {
    if (isConnected) {
      sendWsMessage({
        type: 'group_typing',
        group_id: groupId,
        typing: isTyping
      });
    }
  }, [isConnected, sendWsMessage]);

  // Join group via WebSocket
  const joinGroup = useCallback((groupId: string) => {
    if (isConnected) {
      sendWsMessage({
        type: 'join_group',
        group_id: groupId
      });
    }
  }, [isConnected, sendWsMessage]);

  // Leave group via WebSocket
  const leaveGroup = useCallback((groupId: string) => {
    if (isConnected) {
      sendWsMessage({
        type: 'leave_group',
        group_id: groupId
      });
    }
  }, [isConnected, sendWsMessage]);

  // React to message
  const reactToMessage = useCallback(async (groupId: string, messageId: string, emoji: string) => {
    try {
      const result = await groupsApi.reactToMessage(groupId, messageId, emoji);
      return result;
    } catch (error) {
      console.error('Failed to react to message:', error);
      throw error;
    }
  }, []);

  // Pin message
  const pinMessage = useCallback(async (groupId: string, messageId: string, note?: string) => {
    try {
      const result = await groupsApi.pinMessage(groupId, messageId, note);
      return result;
    } catch (error) {
      console.error('Failed to pin message:', error);
      throw error;
    }
  }, []);

  // Create poll
  const createPoll = useCallback(async (groupId: string, pollData: PollCreateData) => {
    try {
      const result = await groupsApi.createPoll(groupId, pollData);
      return result;
    } catch (error) {
      console.error('Failed to create poll:', error);
      throw error;
    }
  }, []);

  // Vote in poll
  const voteInPoll = useCallback(async (pollId: string, optionIds: string[]) => {
    try {
      const result = await groupsApi.voteInPoll(pollId, optionIds);
      return result;
    } catch (error) {
      console.error('Failed to vote in poll:', error);
      throw error;
    }
  }, []);

  // Load mentions
  const loadMentions = useCallback(async (unreadOnly: boolean = false, groupId?: string) => {
    try {
      const mentionsData = await groupsApi.getMyMentions(unreadOnly, groupId);
      setMentions(mentionsData);
      return mentionsData;
    } catch (error) {
      console.error('Failed to load mentions:', error);
      return [];
    }
  }, []);

  // Load unread mention count
  const loadUnreadMentionCount = useCallback(async () => {
    try {
      const result = await groupsApi.getUnreadMentionCount();
      setUnreadMentionCount(result.unread_mentions);
      return result.unread_mentions;
    } catch (error) {
      console.error('Failed to load unread mention count:', error);
      return 0;
    }
  }, []);

  // Mark group as read
  const markGroupAsRead = useCallback(async (groupId: string) => {
    try {
      const result = await groupsApi.markGroupAsRead(groupId);

      // Update local state
      setGroups(prev => prev.map(group =>
        group.id === groupId
          ? { ...group, unread_count: 0 }
          : group
      ));

      return result;
    } catch (error) {
      console.error('Failed to mark group as read:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (studentId) {
      loadGroups();
      loadUnreadMentionCount();
    }
  }, [studentId, loadGroups, loadUnreadMentionCount]);

  return {
    // State
    groups,
    activeGroup,
    groupMembers,
    groupMessages,
    pinnedMessages,
    onlineMembers,
    isTyping,
    isLoading,
    mentions,
    unreadMentionCount,
    isConnected,

    // Setters
    setActiveGroup,

    // Actions
    loadGroups,
    loadGroup,
    loadGroupMembers,
    loadGroupMessages,
    loadPinnedMessages,
    loadOnlineMembers,
    sendGroupMessage,
    sendTypingIndicator,
    joinGroup,
    leaveGroup,
    reactToMessage,
    pinMessage,
    createPoll,
    voteInPoll,
    loadMentions,
    loadUnreadMentionCount,
    markGroupAsRead,
    markMessagesRead,
    deleteMessages,
    reactToMessages,

    // Group management
    createGroup: groupsApi.createGroup,
    updateGroup: groupsApi.updateGroup,
    deleteGroup: groupsApi.deleteGroup,
    addMembers: groupsApi.addMembers,
    removeMember: groupsApi.removeMember,
    promoteToAdmin: groupsApi.promoteToAdmin,
    demoteToMember: groupsApi.demoteToMember,
    apiLeaveGroup: groupsApi.leaveGroup,
    editGroupMessage: groupsApi.editMessage,
    deleteGroupMessage: groupsApi.deleteMessage,
    getMessageHistory: groupsApi.getMessageHistory,
    getMessageReactions: groupsApi.getMessageReactions,
    getMentionStats: groupsApi.getMentionStats,
    getPollResults: groupsApi.getPollResults,
    getGroupStats: (groupsApi as any).getGroupStats,
    getGroupSettings: (groupsApi as any).getGroupSettings,
    updateGroupSettings: (groupsApi as any).updateGroupSettings,
    getMemberSettings: (groupsApi as any).getMemberSettings,
    updateMemberSettings: (groupsApi as any).updateMemberSettings,
    muteGroup: (groupsApi as any).muteGroup,
    unmuteGroup: (groupsApi as any).unmuteGroup,
    createGroupInvite: groupsApi.createInvite,
    joinGroupViaInvite: groupsApi.joinViaInvite,
    getGroupInvites: groupsApi.getGroupInvites,
    revokeInvite: (groupsApi as any).revokeInvite,
  };
};