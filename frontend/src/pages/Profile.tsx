import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  X
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
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

      // Use /profile/me for own profile (no studentId, or 'me', or own user's ID)
      if (!studentId || studentId === 'me' || studentId === user?.id) {
        profileData = await profileApi.getMyProfile();
      } else {
        profileData = await profileApi.getByStudentId(studentId);
      }

      setProfile(profileData);

      // Load detailed repositories
      if (profileData.github_profile?.login) {
        const reposData = await reposApi.getUserRepos(profileData.github_profile.login);
        setRepos(reposData);
      }

      // Load activities if own profile
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
    if (level >= 4) return 'bg-green-100 text-green-800';
    if (level >= 3) return 'bg-blue-100 text-blue-800';
    if (level >= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <Loading fullScreen text="Loading profile..." />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-6">{error || 'Profile not found'}</p>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Repositories</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.repository_analysis.total_repositories}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Stars</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.repository_analysis.total_stars}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <GitFork className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Forks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.repository_analysis.total_forks}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Followers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.github_profile.followers}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Skills Section */}
          <Card title="Skills">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(profile.estimated_skills).map(([skill, level]) => (
                  <Tooltip key={skill} content={`Proficiency: ${level}/5`}>
                    <Badge
                      variant="primary"
                      className={`${getSkillLevelColor(level)} cursor-help`}
                    >
                      {skill} {level}/5
                    </Badge>
                  </Tooltip>
                ))}
              </div>

              {!profile.skill_comparison.skills_match && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Your skills have been updated since last verification
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Top Repositories */}
          <Card title="Top Repositories">
            <div className="space-y-4">
              {profile.top_repositories.map((repo: ProfileRepository) => (
                <div key={repo.name} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-1">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {repo.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {repo.description && (
                      <p className="text-xs text-gray-500 mt-1">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {repo.language && (
                        <span className="text-xs text-gray-500">{repo.language}</span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Star className="w-3 h-3" /> {repo.stars}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <GitFork className="w-3 h-3" /> {repo.forks}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 'repositories',
      label: 'Repositories',
      count: repos.length,
      content: (
        <div className="space-y-4">
          {repos.map((repo) => (
            <Card key={repo.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {repo.name}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {repo.description && (
                    <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    {repo.language && (
                      <span className="text-xs text-gray-500">{repo.language}</span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Star className="w-3 h-3" /> {repo.stars}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <GitFork className="w-3 h-3" /> {repo.forks}
                    </span>
                    <span className="text-xs text-gray-500">
                      Updated {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )
    },
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <Card title="Recent Activity">
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'sent' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                    {activity.type === 'sent' ? <Users className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{activity.message}</p>
                    <p className="text-xs text-gray-400">{formatDate(activity.date)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No recent activity to show.
              </p>
            )}
          </div>
        </Card>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar
              src={profile.github_profile.avatar_url}
              username={profile.github_profile.login}
              size="xl"
            />

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.github_profile.name || profile.github_profile.login}
                </h1>
                {profile.database_record.github_verified && (
                  <Tooltip content="GitHub Verified">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </Tooltip>
                )}
              </div>

              <p className="text-lg text-gray-600 mb-3">@{profile.github_profile.login}</p>

              {profile.github_profile.bio && (
                <p className="text-gray-700 mb-4">{profile.github_profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-4">
                {profile.github_profile.location && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {profile.github_profile.location}
                  </span>
                )}
                {profile.github_profile.blog && (
                  <a
                    href={profile.github_profile.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 flex items-center gap-1 hover:text-indigo-600"
                  >
                    <LinkIcon className="w-4 h-4" /> {profile.github_profile.blog}
                  </a>
                )}
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Joined {formatDate(profile.github_profile.created_at)}
                </span>
              </div>
            </div>

            {isOwnProfile ? (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await profileApi.refreshGithubData();
                    await loadProfile();
                    toast.success('Profile data refreshed from GitHub!');
                  } catch (err) {
                    console.error('Refresh failed:', err);
                    toast.error('Failed to refresh profile.');
                  }
                }}
              >
                Refresh from GitHub
              </Button>
            ) : (
              <div className="flex gap-2">
                {connectionStatus?.status === 'no_connection' && (
                  <Button
                    variant="primary"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={handleConnect}
                    loading={connectLoading}
                  >
                    Connect
                  </Button>
                )}
                {connectionStatus?.status === 'you_sent_pending' && (
                  <Button variant="outline" disabled icon={<Clock className="w-4 h-4" />}>
                    Pending...
                  </Button>
                )}
                {(connectionStatus?.status === 'you_sent_accepted' ||
                  connectionStatus?.status === 'they_sent_accepted') && (
                  <Button variant="success" disabled icon={<CheckCircle className="w-4 h-4" />}>
                    Connected
                  </Button>
                )}
                {connectionStatus?.status === 'they_sent_pending' && (
                  <>
                    <Button
                      variant="success"
                      icon={<Check className="w-4 h-4" />}
                      onClick={handleAccept}
                      loading={connectLoading}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="danger"
                      icon={<X className="w-4 h-4" />}
                      onClick={handleReject}
                      loading={connectLoading}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          defaultTabId="overview"
          variant="underline"
          onChange={setActiveTab}
        />
      </div>
    </div>
  );
};

export default ProfilePage;