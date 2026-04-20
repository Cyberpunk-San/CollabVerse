import { apiClient } from './index';
import type {
  GroupCreate, GroupResponse, GroupMemberResponse, GroupMessageResponse,
  UserMentionSettingsResponse, UserMentionStats, PinnedMessageResponse,
  PollResults, GroupInviteResponse, ReactionInfo,
  GroupStats, GroupSettings, MemberSettings
} from '../types/group';

export * from '../types/group';

export const groupsApi = {

  /**
   * Create a new group
   * @param data - Group creation data
   */
  createGroup: async (data: GroupCreate) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    formData.append('member_ids', JSON.stringify(data.member_ids));
    formData.append('is_private', String(data.is_private));

    const response = await apiClient.post<GroupResponse>(
      '/groups/create',
      formData,
      {
        headers: {
          'Content-Type': undefined
        }
      }

    );

    return response.data;
  },

  /**
   * Get all groups for current user
   */
  getMyGroups: async () => {
    const response = await apiClient.get<GroupResponse[]>('/groups/my-groups');
    return response.data;
  },

  /**
   * Get group details by ID
   * @param groupId - Group ID
   */
  getGroup: async (groupId: string) => {
    const response = await apiClient.get<GroupResponse>(`/groups/${groupId}`);
    return response.data;
  },

  /**
   * Update group information
   * @param groupId - Group ID
   * @param updates - Fields to update
   */
  updateGroup: async (
    groupId: string,
    updates: { name?: string; description?: string | null }
  ) => {
    const formData = new FormData();
    if (updates.name !== undefined) formData.append('name', updates.name);
    if (updates.description !== undefined) formData.append('description', updates.description || '');

    const response = await apiClient.patch<GroupResponse>(
      `/groups/${groupId}`,
      formData,
      {
        headers: {
          'Content-Type': undefined
        }
      }
    );

    return response.data;
  },

  /**
   * Delete a group (creator only)
   * @param groupId - Group ID
   */
  deleteGroup: async (groupId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}`);
    return response.data;
  },


  /**
   * Get group members
   * @param groupId - Group ID
   */
  getGroupMembers: async (groupId: string) => {
    const response = await apiClient.get<GroupMemberResponse[]>(
      `/groups/${groupId}/members`
    );
    return response.data;
  },

  /**
   * Add members to group
   * @param groupId - Group ID
   * @param userIds - Array of user IDs to add
   */
  addMembers: async (groupId: string, userIds: string[]) => {
    const formData = new FormData();
    formData.append('user_ids', JSON.stringify(userIds));

    const response = await apiClient.post<{
      success: boolean;
      added_count: number;
    }>(`/groups/${groupId}/members/add`, formData, {
      headers: {
        'Content-Type': undefined
      }
    });

    return response.data;
  },

  /**
   * Remove member from group
   * @param groupId - Group ID
   * @param userId - User ID to remove
   */
  removeMember: async (groupId: string, userId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  /**
   * Promote member to admin
   * @param groupId - Group ID
   * @param userId - User ID to promote
   */
  promoteToAdmin: async (groupId: string, userId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/members/${userId}/promote`);
    return response.data;
  },

  /**
   * Demote admin to member
   * @param groupId - Group ID
   * @param userId - User ID to demote
   */
  demoteToMember: async (groupId: string, userId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/members/${userId}/demote`);
    return response.data;
  },

  /**
   * Leave a group
   * @param groupId - Group ID
   */
  leaveGroup: async (groupId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/leave`);
    return response.data;
  },


  /**
   * Send a message to group
   * @param groupId - Group ID
   * @param data - Message data
   * @param file - Optional file to attach
   */
  sendMessage: async (
    groupId: string,
    data: {
      content?: string | null;
      message_type?: string;
      reply_to_id?: string | null;
      mention_type?: 'none' | 'user' | 'here' | 'all';
      mentioned_users?: string[];
    },
    file?: File
  ) => {
    const formData = new FormData();
    if (data.content) formData.append('content', data.content);
    if (data.message_type) formData.append('message_type', data.message_type);
    if (data.reply_to_id) formData.append('reply_to_id', data.reply_to_id);
    if (data.mention_type) formData.append('mention_type', data.mention_type);
    if (data.mentioned_users) {
      formData.append('mentioned_users', JSON.stringify(data.mentioned_users));
    }
    if (file) formData.append('file', file);

    const response = await apiClient.post<GroupMessageResponse>(
      `/groups/${groupId}/messages`,
      formData,
      {
        headers: {
          'Content-Type': undefined
        }
      }
    );

    return response.data;
  },

  /**
   * Get group messages
   * @param groupId - Group ID
   * @param limit - Number of messages (default: 100, max: 500)
   * @param before - Timestamp to fetch messages before
   */
  getMessages: async (
    groupId: string,
    limit: number = 100,
    before?: string
  ) => {
    const params: any = { limit };
    if (before) params.before = before;

    const response = await apiClient.get<GroupMessageResponse[]>(
      `/groups/${groupId}/messages`,
      { params }
    );
    return response.data;
  },

  /**
   * Mark messages as read in batch
   * @param groupId - Group ID
   * @param messageIds - Array of message IDs
   */
  markMessagesRead: async (groupId: string, messageIds: string[]) => {
    const response = await apiClient.post<{
      success: boolean;
      count: number;
    }>(`/groups/${groupId}/messages/batch/read`, { message_ids: messageIds });
    return response.data;
  },

  /**
   * Delete messages in batch
   * @param groupId - Group ID
   * @param messageIds - Array of message IDs
   * @param deleteForAll - Delete for all members (admin only)
   */
  deleteMessages: async (
    groupId: string,
    messageIds: string[],
    deleteForAll: boolean = false
  ) => {
    const response = await apiClient.post<{
      success: boolean;
      count: number;
    }>(`/groups/${groupId}/messages/batch/delete`, { message_ids: messageIds }, {
      params: { delete_for_all: deleteForAll }
    });
    return response.data;
  },

  /**
   * React to messages in batch
   * @param groupId - Group ID
   * @param messageIds - Array of message IDs
   * @param emoji - Emoji to react with
   */
  reactToMessages: async (
    groupId: string,
    messageIds: string[],
    emoji: string
  ) => {
    const response = await apiClient.post<{
      success: boolean;
      count: number;
    }>(`/groups/${groupId}/messages/batch/react`, { message_ids: messageIds }, {
      params: { emoji }
    });
    return response.data;
  },

  /**
   * Delete a message
   * @param groupId - Group ID
   * @param messageId - Message ID
   * @param deleteForAll - Delete for all members (admin only)
   */
  deleteMessage: async (
    groupId: string,
    messageId: string,
    deleteForAll: boolean = false
  ) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/messages/${messageId}`, {
      params: { delete_for_all: deleteForAll }
    });
    return response.data;
  },

  /**
   * Edit a message
   * @param groupId - Group ID
   * @param messageId - Message ID
   * @param newContent - New message content
   */
  editMessage: async (groupId: string, messageId: string, newContent: string) => {
    const response = await apiClient.patch<{
      success: boolean;
      message: string;
      edited_at: string;
      content: string;
    }>(
      `/groups/${groupId}/messages/${messageId}`,
      null,
      {
        params: { new_content: newContent }
      }
    );
    return response.data;
  },

  /**
   * Get message edit history
   * @param groupId - Group ID
   * @param messageId - Message ID
   */
  getMessageHistory: async (groupId: string, messageId: string) => {
    const response = await apiClient.get<{
      message_id: string;
      history: Array<{
        content: string;
        edited_at: string;
      }>;
    }>(`/groups/${groupId}/messages/${messageId}/history`);
    return response.data;
  },


  /**
   * React to a message
   * @param groupId - Group ID
   * @param messageId - Message ID
   * @param emoji - Emoji to react with
   */
  reactToMessage: async (groupId: string, messageId: string, emoji: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      reactions: Record<string, ReactionInfo>;
    }>(
      `/groups/${groupId}/messages/${messageId}/react`,
      null,
      {
        params: { emoji }
      }
    );
    return response.data;
  },

  /**
   * Get message reactions
   * @param groupId - Group ID
   * @param messageId - Message ID
   */
  getMessageReactions: async (groupId: string, messageId: string) => {
    const response = await apiClient.get<{
      message_id: string;
      reactions: Record<string, {
        count: number;
        users: Array<{ user_id: string; username: string; reacted_at: string }>;
        you_reacted: boolean;
      }>;
    }>(`/groups/${groupId}/messages/${messageId}/reactions`);
    return response.data;
  },


  /**
   * Get mentions for current user
   * @param unreadOnly - Only unread mentions
   * @param groupId - Optional group filter
   * @param limit - Number of mentions to fetch
   */
  getMyMentions: async (
    unreadOnly: boolean = false,
    groupId?: string,
    limit: number = 50
  ) => {
    const params: any = { limit };
    if (unreadOnly) params.unread_only = true;
    if (groupId) params.group_id = groupId;

    const response = await apiClient.get<any[]>('/groups/mentions', { params });
    return response.data;
  },

  /**
   * Get unread mention count
   */
  getUnreadMentionCount: async () => {
    const response = await apiClient.get<{ unread_mentions: number }>(
      '/groups/mentions/unread-count'
    );
    return response.data;
  },

  /**
   * Mark mention as read
   * @param mentionId - Mention ID
   */
  markMentionAsRead: async (mentionId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/groups/mentions/${mentionId}/read`);
    return response.data;
  },

  /**
   * Mark all mentions as read
   * @param groupId - Optional group filter
   */
  markAllMentionsAsRead: async (groupId?: string) => {
    const params: any = {};
    if (groupId) params.group_id = groupId;

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      count: number;
    }>('/groups/mentions/mark-all-read', null, { params });
    return response.data;
  },

  /**
   * Get mention settings
   * @param groupId - Optional group ID for group-specific settings
   */
  getMentionSettings: async (groupId?: string) => {
    const params: any = {};
    if (groupId) params.group_id = groupId;

    const response = await apiClient.get<UserMentionSettingsResponse>(
      '/groups/mentions/settings',
      { params }
    );
    return response.data;
  },

  /**
   * Update mention settings
   * @param settings - Settings to update
   */
  updateMentionSettings: async (settings: {
    group_id?: string;
    notify_on_mention?: boolean;
    highlight_mentions?: boolean;
    sound_notification?: boolean;
    desktop_notification?: boolean;
  }) => {
    const params: any = {};
    if (settings.group_id) params.group_id = settings.group_id;
    if (settings.notify_on_mention !== undefined) {
      params.notify_on_mention = settings.notify_on_mention;
    }
    if (settings.highlight_mentions !== undefined) {
      params.highlight_mentions = settings.highlight_mentions;
    }
    if (settings.sound_notification !== undefined) {
      params.sound_notification = settings.sound_notification;
    }
    if (settings.desktop_notification !== undefined) {
      params.desktop_notification = settings.desktop_notification;
    }

    const response = await apiClient.put<{
      success: boolean;
      message: string;
      settings: UserMentionSettingsResponse;
    }>('/groups/mentions/settings', null, { params });
    return response.data;
  },

  /**
   * Get mention statistics
   */
  getMentionStats: async () => {
    const response = await apiClient.get<UserMentionStats>(
      '/groups/mentions/stats'
    );
    return response.data;
  },


  /**
   * Pin a message
   * @param groupId - Group ID
   * @param messageId - Message ID
   * @param note - Optional note
   */
  pinMessage: async (groupId: string, messageId: string, note?: string) => {
    const params: any = {};
    if (note) params.note = note;

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      pinned_message: PinnedMessageResponse;
    }>(
      `/groups/${groupId}/messages/${messageId}/pin`,
      null,
      { params }
    );
    return response.data;
  },

  /**
   * Unpin a message
   * @param groupId - Group ID
   * @param messageId - Message ID
   */
  unpinMessage: async (groupId: string, messageId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/messages/${messageId}/pin`);
    return response.data;
  },

  /**
   * Get pinned messages
   * @param groupId - Group ID
   */
  getPinnedMessages: async (groupId: string) => {
    const response = await apiClient.get<PinnedMessageResponse[]>(
      `/groups/${groupId}/pins`
    );
    return response.data;
  },


  /**
   * Create a poll
   * @param groupId - Group ID
   * @param data - Poll data
   */
  createPoll: async (
    groupId: string,
    data: {
      question: string;
      options: string[];
      is_multiple: boolean;
      is_anonymous: boolean;
      ends_at?: string | null;
    }
  ) => {
    const formData = new FormData();
    formData.append('question', data.question);
    formData.append('options', JSON.stringify(data.options));
    formData.append('is_multiple', String(data.is_multiple));
    formData.append('is_anonymous', String(data.is_anonymous));
    if (data.ends_at) formData.append('ends_at', data.ends_at);

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      poll_id: string;
      message_id: string;
    }>(`/groups/${groupId}/polls`, formData, {
      headers: {
        'Content-Type': undefined
      }
    });

    return response.data;
  },

  /**
   * Vote in a poll
   * @param pollId - Poll ID
   * @param optionIds - Selected option IDs
   */
  voteInPoll: async (pollId: string, optionIds: string[]) => {
    const formData = new FormData();
    formData.append('option_ids', JSON.stringify(optionIds));

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      results: PollResults;
    }>(`/groups/polls/${pollId}/vote`, formData, {
      headers: {
        'Content-Type': undefined
      }
    });

    return response.data;
  },

  /**
   * Get poll results
   * @param pollId - Poll ID
   */
  getPollResults: async (pollId: string) => {
    const response = await apiClient.get<PollResults>(`/groups/polls/${pollId}/results`);
    return response.data;
  },


  /**
   * Create group invite
   * @param groupId - Group ID
   * @param expiresHours - Hours until expiry (default: 24, max: 720)
   * @param maxUses - Maximum uses (default: 1, max: 100)
   */
  createInvite: async (
    groupId: string,
    expiresHours: number = 24,
    maxUses: number = 1
  ) => {
    const response = await apiClient.post<GroupInviteResponse>(
      `/groups/${groupId}/invites`,
      null,
      {
        params: {
          expires_hours: expiresHours,
          max_uses: maxUses
        }
      }
    );
    return response.data;
  },

  /**
   * Join group via invite code
   * @param inviteCode - Invite code
   */
  joinViaInvite: async (inviteCode: string) => {
    const response = await apiClient.post<GroupResponse>(
      `/groups/join/${inviteCode}`
    );
    return response.data;
  },

  /**
   * Get group invites (admin only)
   * @param groupId - Group ID
   */
  getGroupInvites: async (groupId: string) => {
    const response = await apiClient.get<GroupInviteResponse[]>(
      `/groups/${groupId}/invites`
    );
    return response.data;
  },

  /**
   * Revoke an invite
   * @param groupId - Group ID
   * @param inviteId - Invite ID
   */
  revokeInvite: async (groupId: string, inviteId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/invites/${inviteId}`);
    return response.data;
  },


  /**
   * Get group settings (admin only)
   * @param groupId - Group ID
   */
  getGroupSettings: async (groupId: string) => {
    const response = await apiClient.get<{
      group_id: string;
      settings: GroupSettings;
      can_edit: boolean;
    }>(`/groups/${groupId}/settings`);
    return response.data;
  },

  /**
   * Update group settings (admin only)
   * @param groupId - Group ID
   * @param settings - New settings
   */
  updateGroupSettings: async (groupId: string, settings: GroupSettings) => {
    const formData = new FormData();
    formData.append('settings', JSON.stringify(settings));

    const response = await apiClient.patch<{
      success: boolean;
      message: string;
      settings: GroupSettings;
    }>(`/groups/${groupId}/settings`, formData, {
      headers: {
        'Content-Type': undefined
      }
    });

    return response.data;
  },

  /**
   * Get member settings for current user
   * @param groupId - Group ID
   */
  getMemberSettings: async (groupId: string) => {
    const response = await apiClient.get<{
      group_id: string;
      settings: MemberSettings;
      muted_until?: string | null;
    }>(`/groups/${groupId}/member-settings`);
    return response.data;
  },

  /**
   * Update member settings
   * @param groupId - Group ID
   * @param settings - New settings
   */
  updateMemberSettings: async (groupId: string, settings: MemberSettings) => {
    const formData = new FormData();
    formData.append('settings', JSON.stringify(settings));

    const response = await apiClient.patch<{
      success: boolean;
      message: string;
      settings: MemberSettings;
    }>(`/groups/${groupId}/member-settings`, formData, {
      headers: {
        'Content-Type': undefined
      }
    });

    return response.data;
  },

  /**
   * Mute group notifications
   * @param groupId - Group ID
   * @param hours - Hours to mute (default: 1, max: 168)
   */
  muteGroup: async (groupId: string, hours: number = 1) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      muted_until: string;
    }>(
      `/groups/${groupId}/mute`,
      null,
      {
        params: { hours }
      }
    );
    return response.data;
  },

  /**
   * Unmute group notifications
   * @param groupId - Group ID
   */
  unmuteGroup: async (groupId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/groups/${groupId}/unmute`);
    return response.data;
  },


  /**
   * Get group statistics
   * @param groupId - Group ID
   */
  getGroupStats: async (groupId: string) => {
    const response = await apiClient.get<GroupStats>(`/groups/${groupId}/stats`);
    return response.data;
  },

  /**
   * Get unread status for a group
   * @param groupId - Group ID
   */
  getUnreadStatus: async (groupId: string) => {
    const response = await apiClient.get<{
      has_unread: boolean;
      unread_count: number;
      last_message_time?: string | null;
    }>(`/groups/${groupId}/unread`);
    return response.data;
  },

  /**
   * Mark group as read
   * @param groupId - Group ID
   */
  markGroupAsRead: async (groupId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      marked_read: number;
    }>(`/groups/${groupId}/mark-read`);
    return response.data;
  },

  /**
   * Get online members in group
   * @param groupId - Group ID
   */
  getOnlineMembers: async (groupId: string) => {
    const response = await apiClient.get<{
      group_id: string;
      online_count: number;
      online_members: Array<{
        user_id: string;
        username: string;
        email: string;
        last_seen?: string;
      }>;
    }>(`/groups/${groupId}/online`);
    return response.data;
  }
};