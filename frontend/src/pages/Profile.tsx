import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { profileApi } from '../api/profile';
import type { ProfileResponse, ProfileRepository } from '../api/profile';
import { reposApi } from '../api/repos';
import { requestsApi } from '../api/requests';
import type { ConnectionStatusResponse } from '../api/requests';
import type { Repository } from '../api/repos';
import { Button, Card, Tabs, Badge, Loading, Avatar, Tooltip, useToast } from '../components/common';
import {
  Star,
  GitFork,
  MapPin,
  Link as LinkIcon,
  Users,
  BookOpen,
  Calendar,
  ExternalLink,
  CheckCircle,
  XCircle,
  UserPlus,
  Clock,
  Check,
  X,
  Zap,
  RefreshCw
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusResponse | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const isOwnProfile = !studentId || studentId === 'me' || studentId === user?.id;

  useEffect(() => {
    loadProfile();
    if (studentId && !isOwnProfile) {
      loadConnectionStatus();
    }
  }, [studentId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      let profileData: ProfileResponse;
      if (!studentId || studentId === 'me' || studentId === user?.id) {
        profileData = await profileApi.getMyProfile();
      } else {
        profileData = await profileApi.getByStudentId(studentId);
      }

      setProfile(profileData);

      if (profileData.github_profile?.login) {
        const reposData = await reposApi.getUserRepos(profileData.github_profile.login);
        setRepos(reposData);
      }

      if (isOwnProfile) {
        const [sent, received] = await Promise.all([
          requestsApi.getSentRequests(),
          requestsApi.getReceivedRequests('pending')
        ]);

        const allActivities = [
          ...sent.map(r => ({ id: r.id, type: 'sent', message: `Sent request to ${r.receiver_username}`, date: r.created_at })),
          ...received.map(r => ({ id: r.id, type: 'received', message: `Received request from ${r.sender_username}`, date: r.created_at }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setActivities(allActivities);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectionStatus = async () => {
    if (!studentId) return;
    try {
      const status = await requestsApi.checkConnectionStatus(studentId);
      setConnectionStatus(status);
    } catch (err) {
      console.error('Failed to check connection status:', err);
    }
  };

  const handleConnect = async () => {
    if (!studentId) return;
    setConnectLoading(true);
    try {
      await requestsApi.sendRequest({ receiver_id: studentId });
      toast.success('Connection request sent!');
      await loadConnectionStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to send request.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!connectionStatus?.request_id) return;
    setConnectLoading(true);
    try {
      await requestsApi.acceptRequest(connectionStatus.request_id);
      toast.success('Connection accepted!');
      await loadConnectionStatus();
    } catch (err: any) {
      toast.error('Failed to accept request.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleReject = async () => {
    if (!connectionStatus?.request_id) return;
    setConnectLoading(true);
    try {
      await requestsApi.rejectRequest(connectionStatus.request_id);
      toast.success('Request rejected.');
      await loadConnectionStatus();
    } catch (err: any) {
      toast.error('Failed to reject request.');
    } finally {
      setConnectLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'dark:!bg-emerald-500/10 dark:!text-emerald-400 border-emerald-500/20';
    if (level >= 3) return 'dark:!bg-indigo-500/10 dark:!text-indigo-400 border-indigo-500/20';
    if (level >= 2) return 'dark:!bg-amber-500/10 dark:!text-amber-400 border-amber-500/20';
    return 'dark:!bg-slate-800/50 dark:!text-slate-400 border-slate-700/50';
  };

  if (loading) {
    return <Loading fullScreen text="Syncing developer profile..." />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="card-modern max-w-md w-full p-10 text-center animate-entrance bg-white/50 dark:bg-slate-900/50">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Profile Offline</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{error || 'Could not find the requested developer profile.'}</p>
          <Button className="btn-modern w-full" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-8 animate-entrance">
          {/* Bento Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
                { label: 'Repositories', value: profile.repository_analysis.total_repositories, icon: BookOpen, col: 'text-blue-500' },
                { label: 'Stars', value: profile.repository_analysis.total_stars, icon: Star, col: 'text-yellow-500' },
                { label: 'Forks', value: profile.repository_analysis.total_forks, icon: GitFork, col: 'text-emerald-500' },
                { label: 'Followers', value: profile.github_profile.followers, icon: Users, col: 'text-purple-500' }
            ].map((stat, i) => (
                <div key={i} className="card-modern p-6 bg-white/40 dark:bg-white/5">
                    <stat.icon className={`${stat.col} mb-3`} size={20} />
                    <p className="text-3xl font-black dark:text-white tracking-tighter">{stat.value}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                </div>
            ))}
          </div>

          {/* Skills Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card className="card-modern p-8 bg-transparent shadow-none border-none">
                    <h3 className="text-xl font-black mb-6 dark:text-white flex items-center gap-2">
                        <Zap className="text-indigo-500" size={20} />
                        Tech Stack Proficiency
                    </h3>
                    /* In ProfilePage.tsx */
                    <div className="flex flex-wrap gap-3 mt-4">
                      {Object.entries(profile.estimated_skills).map(([skill, level]) => (
                        <div 
                          key={skill} 
                          className={`skill-badge-modern group hover:border-indigo-500/50 ${getSkillLevelColor(level)}`}
                        >
                          <span className="text-xs font-black uppercase tracking-widest">{skill}</span>
                          <span className="text-[10px] font-bold opacity-40 group-hover:opacity-100 transition-opacity">
                            LVL {level}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!profile.skill_comparison.skills_match && (
                        <div className="mt-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                            <Clock className="text-amber-500" size={18} />
                            <p className="text-sm text-amber-500/90 font-medium italic">
                                Data update pending verification from recent GitHub activity.
                            </p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Top Repositories List */}
            <div className="lg:col-span-1">
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest px-2">Featured Projects</h3>
                    {profile.top_repositories.map((repo: ProfileRepository) => (
                        <a 
                            key={repo.name} 
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-5 card-modern bg-white/50 dark:bg-white/5 hover:border-indigo-500/50 group transition-all"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold dark:text-white group-hover:text-indigo-500 transition-colors">{repo.name}</span>
                                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                                {repo.description || "No project description provided."}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-400">
                                <span className="flex items-center gap-1"><Star size={10} className="text-yellow-500" /> {repo.stars}</span>
                                <span className="flex items-center gap-1"><GitFork size={10} className="text-emerald-500" /> {repo.forks}</span>
                                {repo.language && <span className="ml-auto text-indigo-500">{repo.language}</span>}
                            </div>
                        </a>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'repositories',
      label: 'Repositories',
      count: repos.length,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-entrance">
          {repos.map((repo) => (
            <div key={repo.id} className="card-modern p-6 bg-white/40 dark:bg-white/5 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all">
              <div className="flex flex-col h-full">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-black text-slate-900 dark:text-white hover:text-indigo-500 transition-colors flex items-center justify-between"
                >
                  {repo.name}
                  <ExternalLink className="w-4 h-4 opacity-50" />
                </a>
                <p className="text-sm text-slate-500 mt-3 line-clamp-2 flex-grow">
                    {repo.description || "No description available for this repository."}
                </p>
                <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-white/5 font-bold text-[10px] uppercase tracking-tighter text-slate-400">
                  {repo.language && <span className="text-indigo-500">{repo.language}</span>}
                  <span className="flex items-center gap-1"><Star size={12} /> {repo.stars}</span>
                  <span className="flex items-center gap-1"><GitFork size={12} /> {repo.forks}</span>
                  <span className="ml-auto opacity-50 tracking-normal">{new Date(repo.updated_at).getFullYear()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <div className="max-w-2xl mx-auto py-4 animate-entrance">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                {activities.length > 0 ? activities.map((activity, idx) => (
                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            {activity.type === 'sent' ? <UserPlus size={16} /> : <Zap size={16} />}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 card-modern bg-white dark:bg-white/5">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                                <div className="font-bold dark:text-white text-sm">{activity.message}</div>
                                <time className="text-[10px] font-medium text-indigo-500 uppercase">{formatDate(activity.date)}</time>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 text-slate-500 font-bold italic">Silence in the activity logs.</div>
                )}
            </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Profile Header Card */}
        <div className="card-modern p-10 mb-10 bg-slate-900 dark:bg-slate-950 text-white overflow-hidden relative border-none shadow-2xl">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="relative group">
                <Avatar
                  src={profile.github_profile.avatar_url}
                  username={profile.github_profile.login}
                  className="w-40 h-40 rounded-[2.5rem] border-4 border-white/10 shadow-2xl transition-transform group-hover:scale-105"
                />
                {profile.database_record.github_verified && (
                  <div className="absolute -bottom-2 -right-2 bg-indigo-500 p-2 rounded-2xl border-4 border-slate-900">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl font-black tracking-tighter mb-2">
                {profile.github_profile.name || profile.github_profile.login}
              </h1>
              <p className="text-xl font-bold text-indigo-400 mb-6">@{profile.github_profile.login}</p>

              {profile.github_profile.bio && (
                <p className="text-slate-400 text-lg max-w-2xl leading-relaxed mb-8 italic">
                  "{profile.github_profile.bio}"
                </p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start gap-6 font-bold text-xs uppercase tracking-widest text-slate-500">
                {profile.github_profile.location && (
                  <span className="flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-500" /> {profile.github_profile.location}
                  </span>
                )}
                {profile.github_profile.blog && (
                  <a
                    href={profile.github_profile.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <LinkIcon size={16} className="text-indigo-500" /> Website
                  </a>
                )}
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" /> Joined {new Date(profile.github_profile.created_at).getFullYear()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[160px]">
              {isOwnProfile ? (
                <Button
                  className="btn-modern !bg-indigo-600 !text-white border-none py-4"
                  onClick={async () => {
                    try {
                      await profileApi.refreshGithubData();
                      await loadProfile();
                      toast.success('System re-synced with GitHub!');
                    } catch (err) {
                      toast.error('Sync failed.');
                    }
                  }}
                >
                  <RefreshCw className="mr-2 w-4 h-4" /> Re-sync
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  {connectionStatus?.status === 'no_connection' && (
                    <Button
                      variant="primary"
                      className="btn-modern !bg-indigo-600 !text-white border-none py-4"
                      icon={<UserPlus size={16} />}
                      onClick={handleConnect}
                      loading={connectLoading}
                    >
                      Connect
                    </Button>
                  )}
                  {connectionStatus?.status === 'you_sent_pending' && (
                    <div className="glass p-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase text-amber-500 border-amber-500/20">
                      <Clock size={16} /> Pending
                    </div>
                  )}
                  {(connectionStatus?.status === 'you_sent_accepted' ||
                    connectionStatus?.status === 'they_sent_accepted') && (
                    <div className="glass p-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase text-emerald-500 border-emerald-500/20">
                      <CheckCircle size={16} /> Connected
                    </div>
                  )}
                  {connectionStatus?.status === 'they_sent_pending' && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 btn-modern bg-emerald-600 text-white"
                        onClick={handleAccept}
                        loading={connectLoading}
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        className="flex-1 btn-modern bg-red-600 text-white"
                        onClick={handleReject}
                        loading={connectLoading}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="glass rounded-[2rem] p-2 mb-10">
            <Tabs
            tabs={tabs}
            defaultTabId="overview"
            variant="underline"
            onChange={setActiveTab}
            />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;