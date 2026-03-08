import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroup';
import { Card, Avatar, Button, Skeleton, EmptyState } from '../components/common';
import { statsApi } from '../api/stats';
import type { SystemStats } from '../api/stats';
import {
    MessageSquare,
    Users,
    GitPullRequest,
    Activity,
    ArrowRight,
    Star,
    TrendingUp,
    Calendar
} from 'lucide-react';

interface DashboardStats {
    totalMessages: number;
    totalGroups: number;
    pendingRequests: number;
    onlineFriends: number;
    unreadMentions: number;
    upcomingEvents: number;
}

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { conversations, isLoading: chatLoading } = useChat();
    const { groups, unreadMentionCount, isLoading: groupLoading } = useGroup();
    const navigate = useNavigate();

    const [stats, setStats] = useState<DashboardStats>({
        totalMessages: 0,
        totalGroups: 0,
        pendingRequests: 0,
        onlineFriends: 0,
        unreadMentions: 0,
        upcomingEvents: 0
    });

    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const fetchSystemStats = async () => {
            try {
                const data = await statsApi.getSystemStats();
                setSystemStats(data);
            } catch (error) {
                console.error('Failed to fetch system stats:', error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchSystemStats();
    }, []);

    useEffect(() => {
        // Calculate stats
        setStats({
            totalMessages: conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0),
            totalGroups: groups.length,
            pendingRequests: unreadMentionCount,
            onlineFriends: conversations.filter(c => c.is_online).length,
            unreadMentions: unreadMentionCount,
            upcomingEvents: 3 // Placeholder for now
        });

        // Set greeting based on time
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, [conversations, groups, unreadMentionCount]);

    const recentChats = conversations.slice(0, 3);
    const recentGroups = groups.slice(0, 3);

    const quickActions = [
        {
            id: 'chat',
            label: 'New Chat',
            icon: MessageSquare,
            onClick: () => navigate('/chat'),
            color: 'bg-blue-500',
            description: 'Start a conversation'
        },
        {
            id: 'group',
            label: 'Create Group',
            icon: Users,
            onClick: () => navigate('/groups'),
            color: 'bg-green-500',
            description: 'Collaborate with team'
        },
        {
            id: 'team',
            label: 'Build Team',
            icon: Star,
            onClick: () => navigate('/teams'),
            color: 'bg-purple-500',
            description: 'Find your perfect match'
        },
        {
            id: 'requests',
            label: 'Requests',
            icon: GitPullRequest,
            onClick: () => navigate('/requests'),
            color: 'bg-orange-500',
            description: `${stats.pendingRequests} pending`,
            badge: stats.pendingRequests
        }
    ];

    if (chatLoading || groupLoading || loadingStats) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-10" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-indigo-100">{greeting},</p>
                            <h1 className="text-3xl font-bold">{user?.githubUsername}</h1>
                        </div>
                    </div>
                    <p className="text-indigo-100 max-w-2xl">
                        {systemStats ? (
                            `Shared by ${systemStats.users.total} developers across ${systemStats.groups.total} active groups. ${systemStats.messages.today} messages exchanged today.`
                        ) : (
                            `Here's what's happening with your projects today. You have ${stats.unreadMentions} unread mentions and ${stats.pendingRequests} pending requests.`
                        )}
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/chat')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Unread Messages</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.totalMessages}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stats.onlineFriends} friends online
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/groups')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Active Groups</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.totalGroups}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {stats.unreadMentions} mentions
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/requests')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending Requests</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.pendingRequests}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Awaiting response
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <GitPullRequest className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </Card>

                <Card
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Upcoming</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.upcomingEvents}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Events this week
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map(action => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className="group relative p-6 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 text-left"
                    >
                        <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                            <action.icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{action.label}</h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                        {action.badge !== undefined && action.badge > 0 && (
                            <span className="absolute top-4 right-4 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                                {action.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Chats */}
                <Card
                    title="Recent Chats"
                    headerAction={
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/chat')}
                            icon={<ArrowRight className="w-4 h-4" />}
                            iconPosition="right"
                        >
                            View All
                        </Button>
                    }
                    className="hover:shadow-lg transition-shadow"
                >
                    {recentChats.length > 0 ? (
                        <div className="space-y-3">
                            {recentChats.map(chat => (
                                <div
                                    key={chat.user_id}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                                    onClick={() => navigate(`/chat/${chat.user_id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar username={chat.username} size="md" />
                                            {chat.is_online && (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{chat.username}</p>
                                            <p className="text-sm text-gray-500 line-clamp-1">
                                                {chat.last_message || 'No messages yet'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">
                                            {chat.last_message_time && new Date(chat.last_message_time).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        {chat.unread_count > 0 && (
                                            <span className="inline-block px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full mt-1">
                                                {chat.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            type="chat"
                            title="No recent chats"
                            description="Start a conversation with your connections"
                            action={{
                                label: "Find Connections",
                                onClick: () => navigate('/requests')
                            }}
                        />
                    )}
                </Card>

                {/* Recent Groups */}
                <Card
                    title="Recent Groups"
                    headerAction={
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/groups')}
                            icon={<ArrowRight className="w-4 h-4" />}
                            iconPosition="right"
                        >
                            View All
                        </Button>
                    }
                    className="hover:shadow-lg transition-shadow"
                >
                    {recentGroups.length > 0 ? (
                        <div className="space-y-3">
                            {recentGroups.map(group => (
                                <div
                                    key={group.id}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                                    onClick={() => navigate(`/groups/${group.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar username={group.name} size="md" />
                                        <div>
                                            <p className="font-medium text-gray-900">{group.name}</p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {group.member_count} members
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">
                                            {group.last_message_time && new Date(group.last_message_time).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        {group.unread_count > 0 && (
                                            <span className="inline-block px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full mt-1">
                                                {group.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            type="groups"
                            title="No groups yet"
                            description="Create a group to start collaborating"
                            action={{
                                label: "Create Group",
                                onClick: () => navigate('/groups')
                            }}
                        />
                    )}
                </Card>
            </div>

            {/* Activity Chart - Placeholder for now */}
            <Card title="Weekly Activity">
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Activity chart coming soon</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;