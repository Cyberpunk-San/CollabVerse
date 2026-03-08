import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi, type GroupCreate } from '../../api/group';
import { studentsApi, type StudentResponse } from '../../api/students';
import { Button, Input, Modal, Avatar, Badge } from '../common';
import { Search, Lock, Globe, Check } from 'lucide-react';

interface CreateGroupProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (groupId: string) => void;
}

export const CreateGroup: React.FC<CreateGroupProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const [step, setStep] = useState<'details' | 'members'>('details');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen]);

  const loadStudents = async () => {
    try {
      const data = await studentsApi.getAll();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const filteredStudents = students.filter(student =>
    student.github_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  ).filter(student => !selectedMembers.includes(student.id));

  const handleNext = () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    setError(null);
    setStep('members');
  };

  const handleCreate = async () => {
    if (selectedMembers.length === 0) {
      setError('Please add at least one member');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const groupData: GroupCreate = {
        name: groupName,
        description: description || null,
        member_ids: selectedMembers,
        is_private: isPrivate
      };

      const newGroup = await groupsApi.createGroup(groupData);
      onGroupCreated?.(newGroup.id);
      onClose();
      navigate(`/groups/${newGroup.id}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'object' ? JSON.stringify(detail) : detail || 'Failed to create group');
    } finally {

      setLoading(false);
    }
  };

  const toggleMember = (studentId: string) => {
    setSelectedMembers(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const removeMember = (studentId: string) => {
    setSelectedMembers(prev => prev.filter(id => id !== studentId));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'details' ? 'Create New Group' : 'Add Members'}
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step === 'members' && (
              <Button variant="outline" onClick={() => setStep('details')}>
                Back
              </Button>
            )}
            <Button
              onClick={step === 'details' ? handleNext : handleCreate}
              loading={loading}
            >
              {step === 'details' ? 'Next' : 'Create Group'}
            </Button>
          </div>
        </div>
      }
    >
      {step === 'details' ? (
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Project Alpha Team"
            required
            fullWidth
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
            fullWidth
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Privacy
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setIsPrivate(true)}
                className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${isPrivate
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Private</span>
              </button>
              <button
                onClick={() => setIsPrivate(false)}
                className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${!isPrivate
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Public</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map(memberId => {
                  const student = students.find(s => s.id === memberId);
                  return student ? (
                    <Badge
                      key={memberId}
                      variant="primary"
                      removable
                      onRemove={() => removeMember(memberId)}
                    >
                      <div className="flex items-center gap-1">
                        <Avatar
                          username={student.github_username}
                          size="xs"
                        />
                        {student.github_username}
                      </div>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name or email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Students List */}
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No students found
              </div>
            ) : (
              filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => toggleMember(student.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      username={student.github_username}
                      size="sm"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {student.github_username}
                      </p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </div>
                  {selectedMembers.includes(student.id) && (
                    <Check className="w-5 h-5 text-indigo-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      )}
    </Modal>
  );
};