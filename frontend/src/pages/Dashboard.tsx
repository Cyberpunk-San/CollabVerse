import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
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
    const { user } = useAuthContext();
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
        setStats({
            totalMessages: conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0),
            totalGroups: groups.length,
            pendingRequests: unreadMentionCount,
            onlineFriends: conversations.filter(c => c.is_online).length,
            unreadMentions: unreadMentionCount,
            upcomingEvents: 3 
        });

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
            <div className="p-8 space-y-8">
                <Skeleton className="h-44 w-full rounded-[2.5rem]" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-32 rounded-3xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 max-w-7xl mx-auto animate-entrance">
            {/* Welcome Section - Bento Hero */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-slate-950 p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-400">{greeting}</p>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter mb-4">
                            Hello, <span className="gradient-text">{user?.githubUsername}</span>
                        </h1>
                        <p className="text-slate-400 max-w-xl text-lg leading-relaxed">
                            {systemStats ? (
                                <>Trusted by <span className="text-white font-semibold">{systemStats.users.total}</span> developers. <span className="text-indigo-400">{systemStats.messages.today}</span> messages pulsing through the network today.</>
                            ) : (
                                `Everything is looking good. You have ${stats.unreadMentions} mentions and ${stats.pendingRequests} requests to handle.`
                            )}
                        </p>
                    </div>
                    <div className="p-4 glass rounded-3xl border-white/5 hidden lg:block">
                         <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Stats Cards - Sophisticated & Clean */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Unread Messages', value: stats.totalMessages, sub: `${stats.onlineFriends} online`, icon: MessageSquare, col: 'text-blue-500', bg: 'bg-blue-500/10', path: '/chat' },
                    { label: 'Active Groups', value: stats.totalGroups, sub: `${stats.unreadMentions} mentions`, icon: Users, col: 'text-green-500', bg: 'bg-green-500/10', path: '/groups' },
                    { label: 'Pending Requests', value: stats.pendingRequests, sub: 'Awaiting you', icon: GitPullRequest, col: 'text-yellow-500', bg: 'bg-yellow-500/10', path: '/requests' },
                    { label: 'Upcoming', value: stats.upcomingEvents, sub: 'Next 7 days', icon: Calendar, col: 'text-purple-500', bg: 'bg-purple-500/10', path: '/' }
                ].map((item, i) => (
                    <div 
                        key={i} 
                        onClick={() => navigate(item.path)}
                        className="card-modern p-6 group cursor-pointer hover:bg-white dark:hover:bg-slate-900/50"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                                <p className="text-4xl font-black dark:text-white tracking-tighter">{item.value}</p>
                                <p className="text-sm text-slate-400 mt-2 font-medium">{item.sub}</p>
                            </div>
                            <div className={`p-3 rounded-2xl ${item.bg} ${item.col}`}>
                                <item.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions - Floating Pills */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className="group relative flex items-center gap-4 p-4 glass rounded-3xl hover:border-indigo-500/50 transition-all duration-300 overflow-hidden"
                    >
                        <div className={`p-3 rounded-2xl ${action.color} text-white group-hover:scale-110 transition-transform`}>
                            <action.icon size={20} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm dark:text-white">{action.label}</p>
                            <p className="text-xs text-slate-500">{action.badge ? `${action.badge} active` : 'Launch'}</p>
                        </div>
                        {action.badge ? (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />
                        ) : null}
                    </button>
                ))}
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Chats */}
                <Card 
                    className="card-modern border-none bg-transparent shadow-none"
                    headerAction={
                        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate('/chat')}>
                            View All <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    }
                >
                    <h2 className="text-2xl font-black mb-6 px-2 dark:text-white">Recent Conversations</h2>
                    <div className="space-y-2">
                        {recentChats.map(chat => (
                            <div 
                                key={chat.user_id}
                                onClick={() => navigate(`/chat/${chat.user_id}`)}
                                className="flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-white dark:hover:bg-slate-900/80 transition-all cursor-pointer group border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar username={chat.username} size="lg" className="rounded-2xl" />
                                        {chat.is_online && <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full" />}
                                    </div>
                                    <div>
                                        <p className="font-bold dark:text-white">{chat.username}</p>
                                        <p className="text-sm text-slate-500 line-clamp-1">{chat.last_message || 'No messages'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">
                                        {chat.last_message_time && new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {chat.unread_count > 0 && <div className="mt-2 ml-auto w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Activity Feed / Groups */}
                <Card title="Your Squads" className="card-modern border-none bg-transparent shadow-none">
                    <div className="space-y-4">
                        {recentGroups.length > 0 ? recentGroups.map(group => (
                            <div 
                                key={group.id}
                                onClick={() => navigate(`/groups/${group.id}`)}
                                className="p-6 glass rounded-[2rem] hover:bg-white dark:hover:bg-slate-900/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar username={group.name} size="md" className="rounded-xl" />
                                        <p className="font-bold dark:text-white">{group.name}</p>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {[...Array(Math.min(group.member_count, 3))].map((_, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-white dark:border-slate-900" />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Users size={12}/> {group.member_count} Members</span>
                                    {group.unread_count > 0 && <span className="text-indigo-500">{group.unread_count} New</span>}
                                </div>
                            </div>
                        )) : <EmptyState type="groups" title="Join a Squad" description="Join groups to start collaborating with your team." />}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;