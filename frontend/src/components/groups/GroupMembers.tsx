import React, { useState } from 'react';
import { type GroupMemberResponse } from '../../api/group';
import { Avatar, Badge, Button, Dropdown, Modal, Input } from '../common';
import { MoreVertical, Shield, UserMinus, Crown, Search } from 'lucide-react';


interface GroupMembersProps {
  members: GroupMemberResponse[];
  currentUserId: string;
  currentUserRole?: 'member' | 'admin' | 'creator';
  groupId: string;
  onAddMember?: () => void;
  onRemoveMember?: (userId: string) => void;
  onPromoteToAdmin?: (userId: string) => void;
  onDemoteToMember?: (userId: string) => void;
  loading?: boolean;
  onlineCount?: number; // Added onlineCount prop
}

export const GroupMembers: React.FC<GroupMembersProps> = ({
  members,
  currentUserId,
  currentUserRole,
  // groupId is currently not used directly in this component but passed from parent
  // groupId,
  onAddMember,
  onRemoveMember,
  onPromoteToAdmin,
  onDemoteToMember,
  loading = false,
  onlineCount = 0 // Default value for onlineCount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<GroupMemberResponse | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManage = currentUserRole === 'creator' || currentUserRole === 'admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'creator':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-indigo-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'creator':
        return <Badge variant="primary">Creator</Badge>;
      case 'admin':
        return <Badge variant="secondary">Admin</Badge>;
      default:
        return <Badge variant="gray">Member</Badge>;
    }
  };

  const handleRemoveClick = (member: GroupMemberResponse) => {
    setSelectedMember(member);
    setShowRemoveModal(true);
  };

  const handleRemoveConfirm = () => {
    if (selectedMember && onRemoveMember) {
      onRemoveMember(selectedMember.user_id);
    }
    setShowRemoveModal(false);
    setSelectedMember(null);
  };

  const getMemberActions = (member: GroupMemberResponse) => {
    if (!canManage) return [];
    if (member.user_id === currentUserId) return [];
    if (member.role === 'creator') return [];

    const actions = [];

    if (member.role === 'member' && (currentUserRole === 'creator' || currentUserRole === 'admin')) {
      actions.push({
        id: 'promote',
        label: 'Promote to Admin',
        icon: <Shield className="w-4 h-4" />,
        onClick: () => onPromoteToAdmin?.(member.user_id)
      });
    }

    if (member.role === 'admin' && currentUserRole === 'creator') {
      actions.push({
        id: 'demote',
        label: 'Demote to Member',
        icon: <UserMinus className="w-4 h-4" />,
        onClick: () => onDemoteToMember?.(member.user_id)
      });
    }

    actions.push({
      id: 'remove',
      label: 'Remove from Group',
      icon: <UserMinus className="w-4 h-4" />,
      onClick: () => handleRemoveClick(member),
      danger: true
    });

    return actions;
  };

  return (
    <div className="group-members">


      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          fullWidth
        />
      </div>

      {/* Members List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  username={member.username}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {member.username}
                    </span>
                    {getRoleIcon(member.role)}
                    {member.user_id === currentUserId && (
                      <Badge size="sm" variant="gray">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(member.role)}
                    <span className="text-xs text-gray-400">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {getMemberActions(member).length > 0 && (
                <Dropdown
                  trigger={
                    <button className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                  }
                  items={getMemberActions(member)}
                  position="right"
                />
              )}
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No members found
            </div>
          )}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remove Member"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowRemoveModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveConfirm}
            >
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to remove{' '}
          <span className="font-medium">{selectedMember?.username}</span> from the group?
        </p>
      </Modal>
    </div>
  );
};