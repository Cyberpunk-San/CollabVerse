import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/group';
import type { GroupResponse, GroupMessageResponse, GroupMemberResponse } from '../api/group';
import { useAuth } from '../hooks/useAuth';
import { useGroupSocket } from '../hooks/useWebSocket';
import { CreateGroup } from '../components/groups/CreateGroup';
import { GroupList } from '../components/groups/GroupList';
import { GroupChat } from '../components/groups/GroupChat';
import { GroupMembers } from '../components/groups/GroupMembers';
import { Tabs, EmptyState, Skeleton } from '../components/common';
import { useToast } from '../components/common/Toast';


import { MessageSquare, Users, Hash, MoreVertical, LogOut, BellOff, Info, Edit2, UserPlus } from 'lucide-react';
import { Dropdown, Button } from '../components/common';





export const GroupsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [currentGroup, setCurrentGroup] = useState<GroupResponse | null>(null);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [messages, setMessages] = useState<GroupMessageResponse[]>([]);
  const [groupStats, setGroupStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [onlineCount, setOnlineCount] = useState(0);

  // WebSocket for real-time group updates
  const { isConnected, send: sendWsMessage } = useGroupSocket(user?.id || '', {
    onMessage: (data) => {
      handleWebSocketMessage(data);
    }
  });

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails(groupId);
    } else {
      setCurrentGroup(null);
      setMembers([]);
      setMessages([]);
    }
  }, [groupId]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'user_online':
      case 'user_offline':
        if (groupId && data.group_id === groupId) {
          setOnlineCount(prev => data.type === 'user_online' ? prev + 1 : prev - 1);
        }
        break;

      case 'group_message':
        if (groupId && data.group_id === groupId) {
          setMessages(prev => [...prev, data.message]);
          if (data.message.sender_id !== user?.id) {
            playNotificationSound();
          }
        }
        break;

      case 'member_added':
      case 'member_removed':
        if (groupId && data.group_id === groupId) {
          loadGroupMembers(groupId);
        }
        break;

      case 'message_edited':
        if (groupId && data.group_id === groupId) {
          setMessages(prev => prev.map(msg =>
            msg.id === data.message_id
              ? { ...msg, content: data.new_content, edited_at: data.edited_at }
              : msg
          ));
        }
        break;

      case 'message_deleted':
        if (groupId && data.group_id === groupId) {
          setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        }
        break;

      case 'message_reaction':
        if (groupId && data.group_id === groupId) {
          setMessages(prev => prev.map(msg =>
            msg.id === data.message_id
              ? { ...msg, reactions: data.reactions }
              : msg
          ));
        }
        break;
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(() => { });
  };

  const loadGroups = async () => {
    try {
      const data = await groupsApi.getMyGroups();
      setGroups(data);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (id: string) => {
    setLoading(true);
    try {
      const [groupData, membersData, messagesData, statsData] = await Promise.all([
        groupsApi.getGroup(id),
        groupsApi.getGroupMembers(id),
        groupsApi.getMessages(id, 50),
        groupsApi.getGroupStats(id)
      ]);

      setCurrentGroup(groupData);
      setMembers(membersData);
      setMessages(messagesData);
      setGroupStats(statsData);
      setHasMore(messagesData.length === 50);
      setOnlineCount(groupData.online_count);

      if (isConnected) {
        sendWsMessage({
          type: 'join_group',
          group_id: id
        });
      }
    } catch (error) {
      toast.error('Failed to load group details');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (id: string) => {
    try {
      const membersData = await groupsApi.getGroupMembers(id);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleSendMessage = async (content: string, mentionType?: string, mentionedUsers?: string[]) => {
    if (!groupId || !content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: GroupMessageResponse = {
      id: tempId,
      group_id: groupId,
      sender_id: user?.id || '',
      sender_username: user?.githubUsername || '',
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      read_count: 1,
      total_members: members.length,
      read_by_me: true,
      reactions: {},
      mentions: [],
      mentioned_users: mentionedUsers || [],
      mention_type: mentionType || 'none',
      can_edit: true,
      deleted_for_all: false
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const newMessage = await groupsApi.sendMessage(groupId, {
        content,
        mention_type: mentionType as any || 'none',
        mentioned_users: mentionedUsers
      });

      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? newMessage : msg
      ));

      if (isConnected) {
        sendWsMessage({
          type: 'group_message',
          group_id: groupId,
          message: newMessage
        });
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast.error('Failed to send message');
    }
  };

  const handleLoadMore = async () => {
    if (!groupId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const before = oldestMessage?.created_at;

      const newMessages = await groupsApi.getMessages(groupId, 50, before);
      setMessages(prev => [...newMessages, ...prev]);
      setHasMore(newMessages.length === 50);
    } catch (error) {
      toast.error('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddMember = () => {
    navigate('/requests');
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;

    try {
      await groupsApi.removeMember(groupId, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      toast.success('Member removed successfully');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!groupId) return;

    try {
      await groupsApi.promoteToAdmin(groupId, userId);
      setMembers(prev => prev.map(m =>
        m.user_id === userId ? { ...m, role: 'admin' } : m
      ));
      toast.success('Member promoted to admin');
    } catch (error) {
      toast.error('Failed to promote member');
    }
  };

  const handleDemoteToMember = async (userId: string) => {
    if (!groupId) return;

    try {
      await groupsApi.demoteToMember(groupId, userId);
      setMembers(prev => prev.map(m =>
        m.user_id === userId ? { ...m, role: 'member' } : m
      ));
      toast.success('Admin demoted to member');
    } catch (error) {
      toast.error('Failed to demote member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId) return;

    try {
      await groupsApi.leaveGroup(groupId);
      toast.success('Left group successfully');
      navigate('/groups');
      loadGroups();
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!groupId) return;
    try {
      await groupsApi.reactToMessage(groupId, messageId, emoji);
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!groupId) return;
    try {
      await groupsApi.editMessage(groupId, messageId, newContent);
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForAll: boolean = false) => {
    if (!groupId) return;
    try {
      await groupsApi.deleteMessage(groupId, messageId, deleteForAll);
      if (!deleteForAll) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const tabs = [
    {

      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-4 h-4" />
    },
    {
      id: 'members',
      label: 'Members',
      icon: <Users className="w-4 h-4" />,
      count: members.length
    }
  ];


  if (loading && groupId) {
    return (
      <div className="h-full flex">
        <div className="w-80 border-r border-gray-200 bg-white p-4">
          <Skeleton className="h-10 w-full mb-4" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
        <GroupList
          groups={groups}
          onCreateGroup={() => setShowCreateModal(true)}
          loading={loading && !groupId}
          activeGroupId={groupId}
          stats={groupStats}
        />
      </div>

      <div className="flex-1 min-w-0">
        {groupId && currentGroup ? (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {currentGroup.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {onlineCount} online • {members.length} members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === 'members' && (currentGroup.my_role === 'creator' || currentGroup.my_role === 'admin') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleAddMember}
                        icon={<UserPlus className="w-4 h-4" />}
                      >
                        Add Member
                      </Button>
                    )}
                    <Dropdown
                      trigger={
                        <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      }
                      position="right"
                      items={[
                        {
                          id: 'info',
                          label: 'Group Info',
                          icon: <Info className="w-4 h-4" />,
                          onClick: () => { }
                        },
                        { id: 'divider-1', label: '', divider: true },


                        {
                          id: 'notifications',
                          label: 'Mute Notifications',
                          icon: <BellOff className="w-4 h-4" />,
                          onClick: () => { }
                        },
                        ...(currentGroup.my_role === 'admin' || currentGroup.my_role === 'creator' ? [
                          {
                            id: 'settings',
                            label: 'Group Settings',
                            icon: <Edit2 className="w-4 h-4" />,
                            onClick: () => { }
                          }
                        ] : []),
                        {
                          id: 'leave',
                          label: 'Leave Group',
                          icon: <LogOut className="w-4 h-4" />,
                          onClick: handleLeaveGroup,
                          danger: true
                        }
                      ]}
                    />
                  </div>
                </div>


              <Tabs
                tabs={tabs}
                defaultTabId="chat"
                variant="underline"
                onChange={setActiveTab}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' && currentGroup && (
                <GroupChat
                  groupId={currentGroup.id}
                  groupName={currentGroup.name}
                  messages={messages}
                  members={members}
                  currentUserId={user?.id || ''}
                  currentUserRole={currentGroup.my_role || undefined}
                  isLoading={loading}
                  onSendMessage={handleSendMessage}
                  onLoadMore={handleLoadMore}
                  hasMore={hasMore}
                  onReactToMessage={handleReaction}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onLeaveGroup={handleLeaveGroup}
                  loadingMore={loadingMore}
                  onlineCount={onlineCount}
                />
              )}
              {activeTab === 'members' && currentGroup && (
                <GroupMembers
                  members={members}
                  currentUserId={user?.id || ''}
                  currentUserRole={currentGroup.my_role || undefined}
                  groupId={currentGroup.id}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                  onPromoteToAdmin={handlePromoteToAdmin}
                  onDemoteToMember={handleDemoteToMember}
                  onlineCount={onlineCount}
                />
              )}
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              type="groups"
              title="No group selected"
              description="Choose a group from the sidebar or create a new one to start collaborating"
              action={{
                label: "Create Group",
                onClick: () => setShowCreateModal(true)
              }}
            />
          </div>
        )}
      </div>

      <CreateGroup
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={(id: string) => {
          loadGroups();
          navigate(`/groups/${id}`);
        }}
      />
    </div>
  );
};

export default GroupsPage;