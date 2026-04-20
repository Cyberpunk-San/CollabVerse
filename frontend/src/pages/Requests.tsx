import React, { useState, useEffect } from 'react';
import { requestsApi, type RequestResponse, type Connection } from '../api/requests';
import { Card, Avatar, Button, Tabs, Badge, Loading } from '../components/common';
import {
    UserPlus,
    Check,
    X,
    Users,
    MessageSquare,
    Clock,
    Zap,
    ChevronRight,
    Search
} from 'lucide-react';

export const RequestsPage: React.FC = () => {
    const [sentRequests, setSentRequests] = useState<RequestResponse[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<RequestResponse[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('received');

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [sent, received, conns] = await Promise.all([
                requestsApi.getSentRequests(),
                requestsApi.getReceivedRequests('pending'),
                requestsApi.getConnections()
            ]);

            setSentRequests(sent);
            setReceivedRequests(received);
            setConnections(conns);
        } catch (error) {
            console.error('Failed to load requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await requestsApi.acceptRequest(requestId);
            await loadAllData();
        } catch (error) {
            console.error('Failed to accept request:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await requestsApi.rejectRequest(requestId);
            await loadAllData();
        } catch (error) {
            console.error('Failed to reject request:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancelRequest = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await requestsApi.cancelRequest(requestId);
            await loadAllData();
        } catch (error) {
            console.error('Failed to cancel request:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    const tabs = [
        {
            id: 'received',
            label: 'Inbox',
            count: receivedRequests.length,
            content: (
                <div className="space-y-4 animate-entrance">
                    {receivedRequests.length === 0 ? (
                        <div className="card-modern py-20 text-center border-dashed bg-white/5">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <UserPlus className="text-slate-600" />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500">No incoming intel</p>
                        </div>
                    ) : (
                        receivedRequests.map(request => (
                            <div key={request.id} className="glass-card-stat !flex-row items-center group">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="relative shrink-0">
                                        <Avatar
                                            username={request.sender_username || ''}
                                            size="lg"
                                            className="rounded-2xl border-2 border-white/5 group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 rounded-lg border-2 border-slate-950">
                                            <Zap size={10} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-black text-white tracking-tight truncate">
                                            {request.sender_username}
                                        </h3>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">{request.sender_email}</p>
                                        {request.message && (
                                            <p className="text-sm text-slate-400 italic font-medium leading-relaxed max-w-md">
                                                "{request.message}"
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <Clock size={12} /> Received {formatDate(request.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0 ml-4">
                                    <Button
                                        className="btn-modern !bg-emerald-600 !py-3 px-6 !rounded-xl active:scale-95"
                                        onClick={() => handleAcceptRequest(request.id)}
                                        loading={processingId === request.id}
                                        icon={<Check size={16} />}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="!text-red-400 hover:!bg-red-500/10 !rounded-xl !py-3"
                                        onClick={() => handleRejectRequest(request.id)}
                                        loading={processingId === request.id}
                                    >
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )
        },
        {
            id: 'sent',
            label: 'Outbound',
            count: sentRequests.length,
            content: (
                <div className="space-y-4 animate-entrance">
                    {sentRequests.length === 0 ? (
                        <div className="card-modern py-20 text-center border-dashed bg-white/5">
                            <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500">No active transmissions</p>
                        </div>
                    ) : (
                        sentRequests.map(request => (
                            <div key={request.id} className="card-modern p-6 bg-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-5">
                                    <Avatar
                                        username={request.receiver_username || ''}
                                        size="md"
                                        className="rounded-xl border border-white/10"
                                    />
                                    <div>
                                        <h3 className="font-bold text-white leading-tight">
                                            {request.receiver_username}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <Badge
                                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                                    request.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    request.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}
                                            >
                                                {request.status}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                Sent {formatDate(request.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {request.status === 'pending' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="!text-slate-500 hover:!text-red-400 hover:!bg-red-500/10 !rounded-xl"
                                        onClick={() => handleCancelRequest(request.id)}
                                        loading={processingId === request.id}
                                        icon={<X size={14} />}
                                    >
                                        Recall
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )
        },
        {
            id: 'connections',
            label: 'Network',
            count: connections.length,
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-entrance">
                    {connections.length === 0 ? (
                        <div className="col-span-full card-modern py-20 text-center border-dashed bg-white/5">
                            <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500">Isolated node detected</p>
                        </div>
                    ) : (
                        connections.map(connection => (
                            <div key={connection.student_id} className="card-modern p-6 bg-white/5 hover:bg-white/[0.08] transition-all group border-white/5">
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center gap-4 mb-6">
                                        <Avatar
                                            username={connection.github_username}
                                            size="lg"
                                            className="rounded-2xl shadow-2xl"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-black text-white tracking-tighter truncate">
                                                {connection.github_username}
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{connection.email}</p>
                                        </div>
                                        <Button
                                            className="w-10 h-10 !p-0 !rounded-xl !bg-white/5 hover:!bg-indigo-600 transition-colors shrink-0"
                                            onClick={() => window.location.href = `/chat/${connection.student_id}`}
                                        >
                                            <MessageSquare size={16} className="text-white" />
                                        </Button>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {Object.entries(connection.skills || {})
                                            .slice(0, 3)
                                            .map(([skill, level]) => (
                                                <span key={skill} className="text-[10px] font-black uppercase bg-slate-900 text-slate-400 px-3 py-1.5 rounded-lg border border-white/5">
                                                    {skill} <span className="text-indigo-500 ml-1">{level}</span>
                                                </span>
                                            ))}
                                        {Object.keys(connection.skills || {}).length > 3 && (
                                            <span className="text-[10px] font-black text-slate-600 px-2 py-1.5">+{Object.keys(connection.skills).length - 3}</span>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected {formatDate(connection.connected_since)}</span>
                                        <ChevronRight size={14} className="text-slate-700 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )
        }
    ];

    if (loading) {
        return <Loading fullScreen text="Syncing Network Protocol..." />;
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-6 space-y-12">
            <header className="animate-entrance">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black tracking-widest uppercase">Protocol Alpha</span>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white mt-2">Network Access</h1>
                <p className="mt-3 text-lg text-slate-500 max-w-lg leading-relaxed">Secure and manage authorized developer connections within the CollabVerse node.</p>
            </header>

            <div className="glass p-2 rounded-[2rem] w-fit mx-auto md:mx-0 shadow-2xl">
                <Tabs
                    tabs={tabs}
                    defaultTabId="received"
                    variant="pills"
                    onChange={setActiveTab}
                    className="!py-0"
                />
            </div>

            <div className="min-h-[500px]">
                {/* Dynamically render the content based on activeTab */}
                {tabs.find(t => t.id === activeTab)?.content}
            </div>
        </div>
    );
};

export default RequestsPage;