import React, { useState, useEffect } from 'react';
import { requestsApi, type RequestResponse, type Connection } from '../api/requests';
import { Card, Avatar, Button, Tabs, Badge, Loading } from '../components/common';
import {
    UserPlus,
    Check,
    X,
    Users,
    MessageSquare
} from 'lucide-react';

export const RequestsPage: React.FC = () => {
    const [sentRequests, setSentRequests] = useState<RequestResponse[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<RequestResponse[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [, setActiveTab] = useState('received');

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
            label: 'Received',
            count: receivedRequests.length,
            content: (
                <div className="space-y-4">
                    {receivedRequests.length === 0 ? (
                        <Card className="text-center py-8">
                            <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No pending requests</p>
                        </Card>
                    ) : (
                        receivedRequests.map(request => (
                            <Card key={request.id} className="hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            username={request.sender_username || ''}
                                            size="lg"
                                        />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {request.sender_username}
                                            </h3>
                                            <p className="text-sm text-gray-500">{request.sender_email}</p>
                                            {request.message && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    "{request.message}"
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">
                                                Received {formatDate(request.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => handleAcceptRequest(request.id)}
                                            loading={processingId === request.id}
                                            icon={<Check className="w-4 h-4" />}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleRejectRequest(request.id)}
                                            loading={processingId === request.id}
                                            icon={<X className="w-4 h-4" />}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )
        },
        {
            id: 'sent',
            label: 'Sent',
            count: sentRequests.length,
            content: (
                <div className="space-y-4">
                    {sentRequests.length === 0 ? (
                        <Card className="text-center py-8">
                            <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No sent requests</p>
                        </Card>
                    ) : (
                        sentRequests.map(request => (
                            <Card key={request.id} className="hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            username={request.receiver_username || ''}
                                            size="lg"
                                        />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {request.receiver_username}
                                            </h3>
                                            <p className="text-sm text-gray-500">{request.receiver_email}</p>
                                            {request.message && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    "{request.message}"
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge
                                                    variant={
                                                        request.status === 'accepted' ? 'success' :
                                                            request.status === 'rejected' ? 'danger' :
                                                                request.status === 'cancelled' ? 'gray' : 'warning'
                                                    }
                                                    size="sm"
                                                >
                                                    {request.status}
                                                </Badge>
                                                <span className="text-xs text-gray-400">
                                                    Sent {formatDate(request.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {request.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleCancelRequest(request.id)}
                                            loading={processingId === request.id}
                                            icon={<X className="w-4 h-4" />}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )
        },
        {
            id: 'connections',
            label: 'Connections',
            count: connections.length,
            content: (
                <div className="space-y-4">
                    {connections.length === 0 ? (
                        <Card className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No connections yet</p>
                        </Card>
                    ) : (
                        connections.map(connection => (
                            <Card key={connection.student_id} className="hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            username={connection.github_username}
                                            size="lg"
                                        />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {connection.github_username}
                                            </h3>
                                            <p className="text-sm text-gray-500">{connection.email}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {Object.entries(connection.skills)
                                                    .slice(0, 3)
                                                    .map(([skill, level]) => (
                                                        <Badge key={skill} size="sm" variant="primary">
                                                            {skill} {level}/5
                                                        </Badge>
                                                    ))}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">
                                                Connected {formatDate(connection.connected_since)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            icon={<MessageSquare className="w-4 h-4" />}
                                            onClick={() => window.location.href = `/chat/${connection.student_id}`}
                                        >
                                            Message
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )
        }
    ];

    if (loading) {
        return <Loading fullScreen text="Loading requests..." />;
    }

    return (
        <div className="requests-page max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Requests & Connections</h1>

            <Tabs
                tabs={tabs}
                defaultTabId="received"
                variant="pills"
                onChange={setActiveTab}
            />
        </div>
    );
};

export default RequestsPage;