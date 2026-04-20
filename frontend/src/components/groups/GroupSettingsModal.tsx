import React, { useState, useEffect } from 'react';
import { groupsApi, type GroupResponse, type GroupSettings } from '../../api/group';
import { Button, Input, Modal, Tabs } from '../common';
import { Lock, Globe, Settings, Shield, Bell } from 'lucide-react';
import { useToast } from '../common/Toast';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupResponse;
  onGroupUpdated?: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  group,
  onGroupUpdated
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [groupName, setGroupName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [isPrivate, setIsPrivate] = useState(group.is_private);
  
  // Advanced Settings
  const [settings, setSettings] = useState<GroupSettings>(group.settings || {});
  
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setGroupName(group.name);
      setDescription(group.description || '');
      setIsPrivate(group.is_private);
      setSettings(group.settings || {});
    }
  }, [isOpen, group]);

  const handleUpdateGeneral = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setLoading(true);
    try {
      await groupsApi.updateGroup(group.id, {
        name: groupName,
        description: description || null
      });
      
      // Privacy is currently handled via a separate mechanism or by updateGroup if supported by backend
      // In groupsApi.updateGroup, it only takes name and description.
      // If we need to change privacy, we might need another endpoint or update groupsApi.
      
      toast.success('Channel updated successfully');
      onGroupUpdated?.();
    } catch (err) {
      toast.error('Failed to update channel');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdvanced = async () => {
    setLoading(true);
    try {
      await groupsApi.updateGroupSettings(group.id, settings);
      toast.success('Advanced settings updated');
      onGroupUpdated?.();
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Settings size={16} /> },
    { id: 'permissions', label: 'Permissions', icon: <Shield size={16} /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Channel Settings: ${group.name}`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={activeTab === 'general' ? handleUpdateGeneral : handleUpdateAdvanced}
            loading={loading}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Tabs
          tabs={tabs}
          activeTabId={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        {activeTab === 'general' ? (
          <div className="space-y-4 animate-entrance">
            <Input
              label="Channel Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Core Systems"
              fullWidth
            />

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the channel focus..."
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[100px]"
                />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-400">Access Level</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsPrivate(true)}
                  className={`flex-1 p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${isPrivate
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                    : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                >
                  <Lock size={20} />
                  <span className="text-sm font-black uppercase tracking-widest">Encrypted</span>
                </button>
                <button
                  onClick={() => setIsPrivate(false)}
                  className={`flex-1 p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${!isPrivate
                    ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                    : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                >
                  <Globe size={20} />
                  <span className="text-sm font-black uppercase tracking-widest">Broadcast</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-2">
                * Note: Changing access level affects terminal visibility across the network.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-entrance">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Slow Mode</h4>
                    <p className="text-xs text-slate-500">Interval between transmissions</p>
                </div>
                <select 
                    value={settings.slow_mode || 0}
                    onChange={(e) => setSettings({...settings, slow_mode: Number(e.target.value)})}
                    className="bg-slate-900 text-white border-white/10 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value={0}>Disabled</option>
                    <option value={5}>5 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Reactions</h4>
                    <p className="text-xs text-slate-500">Allow personnel to react to data</p>
                </div>
                <button 
                   onClick={() => setSettings({...settings, allow_reactions: !settings.allow_reactions})}
                   className={`w-12 h-6 rounded-full relative transition-colors ${settings.allow_reactions !== false ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allow_reactions !== false ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Poll Initiative</h4>
                    <p className="text-xs text-slate-500">Allow personnel to start voting</p>
                </div>
                <button 
                   onClick={() => setSettings({...settings, allow_polls: !settings.allow_polls})}
                   className={`w-12 h-6 rounded-full relative transition-colors ${settings.allow_polls !== false ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allow_polls !== false ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div>
                    <h4 className="text-sm font-bold text-white mb-1">Broadcasting</h4>
                    <p className="text-xs text-slate-500">Who can send messages</p>
                </div>
                <select 
                    value={settings.admin_only_messages ? 'admin' : 'all'}
                    onChange={(e) => setSettings({...settings, admin_only_messages: e.target.value === 'admin'})}
                    className="bg-slate-900 text-white border-white/10 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">Everyone</option>
                    <option value="admin">Admins Only</option>
                </select>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
