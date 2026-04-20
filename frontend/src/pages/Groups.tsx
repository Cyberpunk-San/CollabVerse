import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/group';
import type { GroupResponse, GroupMessageResponse, GroupMemberResponse } from '../api/group';
import { useAuthContext } from '../contexts/AuthContext';
import { useGroupSocket } from '../hooks/useWebSocket';
import { CreateGroup } from '../components/groups/CreateGroup';
import { GroupList } from '../components/groups/GroupList';
import { GroupChat } from '../components/groups/GroupChat';
import { GroupMembers } from '../components/groups/GroupMembers';
import { GroupSettingsModal } from '../components/groups/GroupSettingsModal';
import { Tabs, EmptyState, Skeleton } from '../components/common';
import { useToast } from '../components/common/Toast';
import { Dropdown, Button } from '../components/common';

import { 
  MessageSquare, 
  Users, 
  Hash, 
  MoreVertical, 
  LogOut, 
  BellOff, 
  Info, 
  Edit2, 
  UserPlus, 
  Plus, 
  ShieldCheck 
} from 'lucide-react';

export const GroupsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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

  const handleSendMessage = async (content: string, mentionType?: string, mentionedUsers?: string[], replyToId?: string) => {
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
        mentioned_users: mentionedUsers,
        reply_to_id: replyToId
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

  const handlePinMessage = async (messageId: string) => {
    if (!groupId) return;
    try {
      await groupsApi.pinMessage(groupId, messageId);
      toast.success('Message pinned to channel');
    } catch (error) {
      toast.error('Failed to pin message');
    }
  };

  const tabs = [
    {
      id: 'chat',
      label: 'Broadcast',
      icon: <MessageSquare size={16} />
    },
    {
      id: 'members',
      label: 'Personnel',
      icon: <Users size={16} />,
      count: members.length
    }
  ];

  if (loading && groupId) {
    return (
      <div className="h-full flex animate-pulse">
        <div className="w-80 border-r border-white/5 bg-slate-900/50 p-6">
          <Skeleton className="h-12 w-full rounded-2xl mb-8" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 mb-6">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full opacity-50" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 p-10 bg-slate-950">
          <Skeleton className="h-8 w-48 mb-4 rounded-lg" />
          <Skeleton className="h-full w-full rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Group Navigation Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-slate-900/30 backdrop-blur-xl flex flex-col">
        <div className="p-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Terminal Channels</h2>
            <Button 
                onClick={() => setShowCreateModal(true)}
                className="btn-modern !rounded-2xl w-full !py-4 mb-2 !bg-indigo-600"
                icon={<Plus size={18} />}
            >
                New Channel
            </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            <GroupList
              groups={groups}
              onCreateGroup={() => setShowCreateModal(true)}
              loading={loading && !groupId}
              activeGroupId={groupId}
              stats={groupStats}
            />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-950/50 relative">
        {groupId && currentGroup ? (
          <div className="h-full flex flex-col animate-entrance">
            
            {/* Contextual Header */}
            <header className="glass border-b-white/5 px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="relative group">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                        <Hash size={24} />
                    </div>
                    {onlineCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-4 border-slate-950 rounded-full animate-pulse" />
                    )}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    {currentGroup.name}
                    {currentGroup.my_role === 'creator' && <ShieldCheck size={14} className="text-indigo-400" />}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" /> {onlineCount} Live
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{members.length} Personnel</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {activeTab === 'members' && (currentGroup.my_role === 'creator' || currentGroup.my_role === 'admin') && (
                  <Button
                    size="sm"
                    className="btn-modern !rounded-xl !py-2.5 !px-4 !bg-white !text-slate-900"
                    onClick={handleAddMember}
                    icon={<UserPlus size={16} />}
                  >
                    Add Personnel
                  </Button>
                )}
                
                <Dropdown
                  trigger={
                    <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                      <MoreVertical size={20} />
                    </button>
                  }
                  position="right"
                  items={[
                    {
                      id: 'info',
                      label: 'Operation Intel',
                      icon: <Info size={16} />,
                      onClick: () => { }
                    },
                    { id: 'divider-1', label: '', divider: true },
                    {
                      id: 'notifications',
                      label: 'Silence Comms',
                      icon: <BellOff size={16} />,
                      onClick: () => { }
                    },
                    ...(currentGroup.my_role === 'admin' || currentGroup.my_role === 'creator' ? [
                      {
                        id: 'settings',
                        label: 'Terminal Settings',
                        icon: <Edit2 size={16} />,
                        onClick: () => setShowSettingsModal(true)
                      }
                    ] : []),
                    {
                      id: 'leave',
                      label: 'Abort Group',
                      icon: <LogOut size={16} />,
                      onClick: handleLeaveGroup,
                      danger: true
                    }
                  ]}
                />
              </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="px-8 bg-slate-900/10 border-b border-white/5">
                <Tabs
                    tabs={tabs}
                    defaultTabId="chat"
                    variant="underline"
                    onChange={setActiveTab}
                    className="!py-0"
                />
            </nav>

            {/* View Switching */}
            <div className="flex-1 overflow-hidden relative">
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
                  onPinMessage={handlePinMessage}
                  onLeaveGroup={handleLeaveGroup}
                  loadingMore={loadingMore}
                  onlineCount={onlineCount}
                />
              )}
              {activeTab === 'members' && currentGroup && (
                <div className="h-full p-8 max-w-5xl mx-auto overflow-y-auto custom-scrollbar">
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
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State Dashboard */
          <div className="h-full flex items-center justify-center p-12">
            <div className="card-modern max-w-md w-full p-12 text-center border-dashed bg-white/5">
                <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <MessageSquare size={40} className="text-indigo-500" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-3">Terminal Idle</h2>
                <p className="text-slate-500 mb-10 leading-relaxed">Choose an active communication channel from the console or initialize a new group mission.</p>
                <Button 
                    className="btn-modern !px-10 !py-4"
                    onClick={() => setShowCreateModal(true)}
                    icon={<Plus size={18} />}
                >
                    Create Operation
                </Button>
            </div>
            {/* Settings Modal */}
      {currentGroup && (
        <GroupSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          group={currentGroup}
          onGroupUpdated={() => {
            loadGroups();
            if (groupId) loadGroupDetails(groupId);
          }}
        />
      )}
    </div>
        )}
      </main>

      {/* Creation Modal */}
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