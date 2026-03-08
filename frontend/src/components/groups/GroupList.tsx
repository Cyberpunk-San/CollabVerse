import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type GroupResponse } from '../../api/group';
import { Card, Avatar, Badge, Button, Input } from '../common';
import { Users, Lock, Globe, Plus, Search } from 'lucide-react';
import { type GroupStats } from '../../types/group';

interface GroupListProps {
  groups: GroupResponse[];
  onCreateGroup: () => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  activeGroupId?: string; // Add activeGroupId
  stats?: GroupStats;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  onCreateGroup,
  onSearch,
  loading = false,
  activeGroupId,
  stats
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const formatTime = (timestamp?: string | null) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 0) return `${hours}h ago`;
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    }
  };

  const getRoleBadge = (role?: string | null) => {
    if (role === 'creator') return <Badge variant="primary">Creator</Badge>;
    if (role === 'admin') return <Badge variant="secondary">Admin</Badge>;
    return null;
  };

  return (
    <div className="group-list">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        {stats && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {stats.active_today} active today • {stats.total_messages} total messages
            </p>
          </div>
        )}
        <Button
          onClick={onCreateGroup}
          icon={<Plus className="w-4 h-4" />}
        >
          Create Group
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={handleSearch}
          leftIcon={<Search className="w-4 h-4" />}
          fullWidth
        />
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No groups yet
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Create a group to start collaborating with others
          </p>
          <Button onClick={onCreateGroup} icon={<Plus className="w-4 h-4" />}>
            Create Your First Group
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              hoverable
              onClick={() => navigate(`/groups/${group.id}`)}
              className={`relative ${activeGroupId === group.id ? 'ring-2 ring-indigo-500' : ''}`}
            >
              {/* Unread Badge */}
              {group.unread_count > 0 && (
                <div className="absolute top-2 right-2">
                  <Badge>{group.unread_count}</Badge>
                </div>
              )}

              <div className="flex items-start gap-3 mb-3">
                <Avatar
                  username={group.name}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {group.name}
                    </h3>
                    {group.is_private ? (
                      <Lock className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Globe className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.member_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {group.online_count} online
                    </span>
                  </div>
                </div>
              </div>

              {group.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {group.description}
                </p>
              )}

              {/* Last Message */}
              {group.last_message && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Latest activity:</p>
                  <p className="text-sm text-gray-700 truncate">
                    {group.last_message}
                  </p>
                  {group.last_message_time && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(group.last_message_time)}
                    </p>
                  )}
                </div>
              )}

              {/* Role Badge */}
              <div className="absolute bottom-2 left-2">
                {getRoleBadge(group.my_role)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};