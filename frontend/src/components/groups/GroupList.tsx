import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type GroupResponse } from '../../api/group';
import { Card, Avatar, Badge, Button, Input } from '../common';
import { Users, Lock, Globe, Plus, Search, MessageSquare, Hash } from 'lucide-react';
import { type GroupStats } from '../../types/group';

interface GroupListProps {
  groups: GroupResponse[];
  onCreateGroup: () => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  activeGroupId?: string;
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

    if (days > 7) return date.toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getRoleBadge = (role?: string | null) => {
    if (role === 'creator') return <span className="text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20">Creator</span>;
    if (role === 'admin') return <span className="text-[9px] font-black uppercase bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-md border border-slate-500/20">Admin</span>;
    return null;
  };

  return (
    <div className="flex flex-col h-full animate-entrance">
      {/* Search & Header Section */}
      <div className="p-4 space-y-4">
        <div className="relative group">
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={handleSearch}
            className="!rounded-2xl !bg-slate-900/50 !border-white/5 !py-6 pl-12 focus:!border-indigo-500/50 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
        </div>

        {stats && (
          <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <span>{stats.active_today} Active Today</span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span>{stats.total_messages} Total Msgs</span>
          </div>
        )}
      </div>

      {/* Group Items List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6 space-y-2">
        {loading ? (
          <div className="space-y-4 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-white/5 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 bg-white/5 rounded" />
                  <div className="h-2 w-full bg-white/5 rounded opacity-50" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-10 px-6 card-modern border-dashed bg-transparent mx-2">
            <MessageSquare size={32} className="mx-auto mb-4 text-slate-700" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              No Channels Found
            </p>
            <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 !text-indigo-500" 
                onClick={onCreateGroup}
            >
                Initialize Channel
            </Button>
          </div>
        ) : (
          groups.map((group, index) => (
            <button
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className={`w-full text-left p-4 rounded-[1.5rem] transition-all duration-300 border group relative overflow-hidden ${
                activeGroupId === group.id 
                  ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-500/20' 
                  : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4 relative z-10">
                {/* Avatar with Status */}
                <div className="relative shrink-0">
                  <Avatar
                    username={group.name}
                    size="md"
                    className={`rounded-xl border-2 transition-transform group-hover:scale-105 ${
                        activeGroupId === group.id ? 'border-indigo-400' : 'border-white/5'
                    }`}
                  />
                  {group.online_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 className={`font-black text-sm tracking-tight truncate ${activeGroupId === group.id ? 'text-white' : 'text-slate-200'}`}>
                      {group.name}
                    </h3>
                    <span className={`text-[9px] font-medium whitespace-nowrap ${activeGroupId === group.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {formatTime(group.last_message_time)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${activeGroupId === group.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                        <Users size={10} />
                        {group.member_count}
                    </div>
                    {getRoleBadge(group.my_role)}
                    {group.is_private ? <Lock size={10} className="text-slate-600" /> : <Globe size={10} className="text-slate-600" />}
                  </div>
                </div>

                {/* Unread Indicator */}
                {group.unread_count > 0 && (
                    <div className="shrink-0 ml-2">
                        <div className="h-5 min-w-[20px] px-1.5 flex items-center justify-center bg-white text-indigo-600 text-[10px] font-black rounded-full shadow-lg">
                            {group.unread_count}
                        </div>
                    </div>
                )}
              </div>

              {/* Peek at last message */}
              {group.last_message && activeGroupId !== group.id && (
                <p className="text-[11px] text-slate-500 truncate mt-3 ml-1 leading-none opacity-60 group-hover:opacity-100 transition-opacity">
                  {group.last_message}
                </p>
              )}

              {/* Active State Background Element */}
              {activeGroupId === group.id && (
                  <div className="absolute top-0 right-0 p-2 opacity-10 rotate-12">
                      <Hash size={48} className="text-white" />
                  </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};