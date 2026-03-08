import React, { useState, useEffect } from 'react';
import { teamsApi, type ProjectResponse } from '../api/team';
import { studentsApi, type StudentResponse } from '../api/students';
import { requestsApi } from '../api/requests';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Avatar, Badge, Input, useToast, Modal } from '../components/common';
import {
  Users,
  Target,
  Zap,
  CheckCircle,
  Search,
  Plus,
  FolderPlus,
  X,
  AlertTriangle,
  TrendingUp,
  Star,
  Shield,
  Send,
  Mail
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Skill bar component
// ────────────────────────────────────────────────────────────
const SkillBar: React.FC<{ skill: string; level: number; max?: number; color?: string }> = ({
  skill, level, max = 5, color = 'indigo'
}) => {
  const pct = Math.min((level / max) * 100, 100);
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    green: 'bg-green-500',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    purple: 'bg-purple-500',
  };
  const barColor = level >= 4 ? colorMap.green :
    level >= 3 ? colorMap.indigo :
    level >= 2 ? colorMap.amber : colorMap.red;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 truncate capitalize">{skill}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{level}</span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Score ring / gauge
// ────────────────────────────────────────────────────────────
const ScoreRing: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} stroke="#e5e7eb" strokeWidth="6" fill="none" />
        <circle
          cx="36" cy="36" r={radius}
          stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold text-gray-800 -mt-10 relative z-10">{Math.round(value)}%</span>
      <span className="text-xs text-gray-500 mt-6 text-center">{label}</span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main analysis panel
// ────────────────────────────────────────────────────────────
interface AnalysisData {
  valid?: boolean;
  team_strength?: number;
  complementarity_score?: number;
  diversity_score?: number;
  member_profiles?: Array<{
    student_id: string;
    username: string;
    skills: Record<string, number>;
    total_skill_score: number;
    top_skills: [string, number][];
    is_me?: boolean;
  }>;
  skill_coverage?: Record<string, number>;
  skill_coverage_raw?: Record<string, number>;
  weak_skills?: Record<string, number>;
  uncovered_common_skills?: string[];
  recommendations?: string[];
}

const TeamAnalysisPanel: React.FC<{ data: AnalysisData }> = ({ data }) => {
  const {
    valid,
    team_strength = 0,
    complementarity_score = 0,
    diversity_score = 0,
    member_profiles = [],
    skill_coverage = {},
    weak_skills = {},
    uncovered_common_skills = [],
    recommendations = []
  } = data;

  // Sort skill_coverage by level desc, show top 12
  const topCoverage = Object.entries(skill_coverage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="space-y-5">
      {/* ── Headline scores ── */}
      <div className="grid grid-cols-3 gap-4 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <ScoreRing value={team_strength * 100} label="Team Strength" color="#6366f1" />
        <ScoreRing value={complementarity_score} label="Complementarity" color="#10b981" />
        <div className="flex flex-col items-center gap-1 justify-center">
          <span className="text-3xl font-extrabold text-purple-600">{diversity_score}</span>
          <span className="text-xs text-gray-500 text-center">Unique Skills</span>
        </div>
      </div>

      {/* ── Validation badge ── */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
        valid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
      }`}>
        {valid ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {valid ? 'Valid team — all members have skill data' : 'Some members have no skills recorded yet'}
      </div>

      {/* ── Per-member profiles ── */}
      {member_profiles.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Member Profiles
          </h4>
          <div className="space-y-4">
            {member_profiles.map((m, i) => (
              <div
                key={m.student_id}
                className={`p-4 rounded-xl border ${m.is_me ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar username={m.username} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.username}</p>
                    <p className="text-xs text-gray-500">Skill score: <strong>{m.total_skill_score}</strong></p>
                  </div>
                  {m.is_me && <Badge variant="primary" size="sm" className="ml-auto">You</Badge>}
                </div>
                {Object.keys(m.skills).length > 0 ? (
                  <div className="space-y-1">
                    {m.top_skills.map(([skill, lvl]) => (
                      <SkillBar key={skill} skill={skill} level={lvl} />
                    ))}
                    {Object.keys(m.skills).length > 5 && (
                      <p className="text-xs text-gray-400 mt-1">
                        +{Object.keys(m.skills).length - 5} more skills
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No skill data available</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Team-wide skill coverage ── */}
      {topCoverage.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            Team Skill Coverage (best across all members)
          </h4>
          <div className="space-y-1.5">
            {topCoverage.map(([skill, pct]) => (
              <SkillBar key={skill} skill={skill} level={Math.round(pct * 5)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Weak/uncovered skills ── */}
      {(Object.keys(weak_skills).length > 0 || uncovered_common_skills.length > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Skill Gaps
          </h4>
          {Object.keys(weak_skills).length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-amber-700 font-medium mb-1">Low proficiency (team scores under 2/5):</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(weak_skills).slice(0, 6).map(([sk]) => (
                  <span key={sk} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full capitalize">{sk}</span>
                ))}
              </div>
            </div>
          )}
          {uncovered_common_skills.length > 0 && (
            <div>
              <p className="text-xs text-amber-700 font-medium mb-1">Missing common skills:</p>
              <div className="flex flex-wrap gap-1">
                {uncovered_common_skills.map(sk => (
                  <span key={sk} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">{sk}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Recommendations
          </h4>
          <ul className="space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-blue-700 flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 text-blue-800 font-bold">{index + 1}</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main Team page
// ────────────────────────────────────────────────────────────
const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [teamAnalysis, setTeamAnalysis] = useState<AnalysisData | null>(null);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'my-team'>('generate');

  // Personal team generation
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [generatedTeam, setGeneratedTeam] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Create Project modal
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStack, setNewProjectStack] = useState('');
  const [newProjectSize, setNewProjectSize] = useState('3');
  const [creatingProject, setCreatingProject] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ id: string; username: string } | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const toast = useToast();

  useEffect(() => {
    loadStudents();
    loadProjects();
    if (user?.id) {
      loadMyTeam();
      loadExistingInvites();
    }
  }, [user?.id]);

  const loadStudents = async () => {
    try { setStudents(await studentsApi.getAll()); }
    catch { console.error('Failed to load students'); }
  };

  const loadProjects = async () => {
    try { setProjects(await teamsApi.listProjects()); }
    catch { console.error('Failed to load projects'); }
  };

  const loadMyTeam = async () => {
    try { setMyTeam(await teamsApi.getMyTeam()); }
    catch { /* not on a team yet */ }
  };

  // Pre-load which team members already have a pending request from us
  const loadExistingInvites = async () => {
    try {
      const sent = await requestsApi.getSentRequests('pending');
      const pendingReceiverIds = new Set<string>(sent.map((r: any) => r.receiver_id as string));
      setInvitedIds(pendingReceiverIds);
    } catch {
      // Non-critical — ignore
    }
  };

  const openInviteModal = (memberId: string, username: string) => {
    const projectName = myTeam?.assigned_project || myTeam?.name || 'our project';
    const techStack = (myTeam?.tech_stack || []).join(', ');
    const defaultMsg = [
      `Hey ${username}! 👋`,
      ``,
      `I'd like to collaborate with you on ${projectName}.`,
      techStack ? `Tech stack: ${techStack}` : '',
      ``,
      `Let me know if you're interested!`
    ].filter(Boolean).join('\n');
    setInviteTarget({ id: memberId, username });
    setInviteMessage(defaultMsg);
    setShowInviteModal(true);
  };

  const handleSendInvite = async () => {
    if (!inviteTarget) return;
    setInviteSending(true);
    try {
      await requestsApi.sendRequest({ receiver_id: inviteTarget.id, message: inviteMessage });
      setInvitedIds(prev => new Set(prev).add(inviteTarget.id));
      toast.success(`Invite sent to ${inviteTarget.username}!`);
      setShowInviteModal(false);
    } catch (error: any) {
      const detail: string = error?.response?.data?.detail || '';
      if (detail.toLowerCase().includes('already') || detail.toLowerCase().includes('pending')) {
        // Already sent — just mark as invited and close
        setInvitedIds(prev => new Set(prev).add(inviteTarget.id));
        toast.success(`Request to ${inviteTarget.username} was already sent!`);
        setShowInviteModal(false);
      } else if (detail.toLowerCase().includes('yourself')) {
        toast.error('You cannot invite yourself.');
        setShowInviteModal(false);
      } else if (detail) {
        toast.error(detail);
      } else {
        toast.error('Failed to send invite. Make sure the recipient exists.');
      }
    } finally {
      setInviteSending(false);
    }
  };

  const handleGenerateMyTeam = async () => {
    if (!selectedProjectId) { toast.error('Select a project first.'); return; }
    setLoading(true);
    try {
      const result = await teamsApi.buildForMe(selectedProjectId, teamSize);
      setGeneratedTeam(result);
      setShowAnalysis(true);
      toast.success(`✅ Team of ${result.team_size} formed for "${result.project_name}"!`);
      await loadMyTeam();
      await loadProjects();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to generate team.');
    } finally { setLoading(false); }
  };

  const handleValidateTeam = async () => {
    if (selectedStudents.length < 2) return;
    setLoading(true);
    try {
      const result = await teamsApi.validateTeam(selectedStudents);
      setTeamAnalysis(result as unknown as AnalysisData);
    } catch { toast.error('Failed to analyze team.'); }
    finally { setLoading(false); }
  };

  const handleFormTeam = async () => {
    if (selectedStudents.length < 2) return;
    setLoading(true);
    try {
      const response = await teamsApi.formTeam(selectedStudents);
      toast.success(response.message || 'Team requests sent!');
      // Also validate/analyze the formed team
      const analysis = await teamsApi.validateTeam(selectedStudents);
      setTeamAnalysis(analysis as unknown as AnalysisData);
      await loadMyTeam();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to form team.');
    } finally { setLoading(false); }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const stackList = newProjectStack.split(',').map(s => s.trim()).filter(Boolean);
      const created = await teamsApi.createProject({
        name: newProjectName.trim(), tech_stack: stackList,
        max_team_size: parseInt(newProjectSize) || 3
      });
      toast.success(`Project "${created.name}" created!`);
      setNewProjectName(''); setNewProjectStack(''); setNewProjectSize('3');
      setShowCreateProject(false);
      await loadProjects();
      setSelectedProjectId(created.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create project.');
    } finally { setCreatingProject(false); }
  };

  const toggleStudent = (id: string) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredStudents = students.filter(s =>
    s.github_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Formation</h1>
          <p className="text-sm text-gray-500 mt-1">Find your perfect teammates using skill-based matching</p>
        </div>
        <Button variant="outline" icon={<FolderPlus className="w-4 h-4" />} onClick={() => setShowCreateProject(true)}>
          New Project
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([
          { id: 'generate', label: 'Find My Team', icon: <Zap className="w-4 h-4" /> },
          { id: 'manual', label: 'Manual Build', icon: <Users className="w-4 h-4" /> },
          { id: 'my-team', label: 'My Team', icon: <Target className="w-4 h-4" /> },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ======== FIND MY TEAM ======== */}
      {activeTab === 'generate' && (
        <div className="space-y-5">
          {/* Step 1 */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="font-semibold text-gray-900">Choose a Project</h3>
              </div>
              {projects.length === 0 ? (
                <div className="ml-10 flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-500">No projects yet.</p>
                  <Button variant="outline" size="sm" icon={<Plus className="w-3 h-3" />} onClick={() => setShowCreateProject(true)}>Create one</Button>
                </div>
              ) : (
                <div className="ml-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map(p => (
                    <button key={p.id} onClick={() => setSelectedProjectId(p.id === selectedProjectId ? '' : p.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selectedProjectId === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                        {selectedProjectId === p.id && <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" />}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(p.tech_stack || []).slice(0, 3).map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{t}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{(p.member_ids || []).length}/{p.max_team_size || 3} members</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="ml-10">
                <button onClick={() => setShowCreateProject(true)} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  <Plus className="w-4 h-4" />Create a new project
                </button>
              </div>
            </div>
          </Card>

          {/* Step 2 */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="font-semibold text-gray-900">Team Size</h3>
            </div>
            <div className="ml-10 flex gap-3">
              {[2, 3, 4, 5].map(size => (
                <button key={size} onClick={() => setTeamSize(size)}
                  className={`px-5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    teamSize === size ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {size}<span className="text-xs ml-1 opacity-60">ppl</span>
                </button>
              ))}
            </div>
            <p className="ml-10 text-xs text-gray-400 mt-2">
              You + {teamSize - 1} best-matched teammate{teamSize - 1 !== 1 ? 's' : ''}, chosen by skill complementarity.
            </p>
          </Card>

          {/* Step 3 */}
          <Card>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <h3 className="font-semibold text-gray-900">Generate</h3>
            </div>
            <div className="ml-10 space-y-3">
              {selectedProject && (
                <div className="flex items-center gap-2 text-sm text-gray-700 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  Building <strong>{teamSize}</strong> people for <strong>{selectedProject.name}</strong>
                </div>
              )}
              <Button onClick={handleGenerateMyTeam} loading={loading} disabled={!selectedProjectId}
                icon={<Zap className="w-4 h-4" />} variant="primary"
              >
                {selectedProjectId ? `Find My ${teamSize} Teammates` : 'Select a Project First'}
              </Button>
            </div>
          </Card>

          {/* Generated team + full analysis */}
          {generatedTeam && (
            <div className="space-y-4">
              {/* Team card */}
              <div className="border-2 border-green-300 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-green-600 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{generatedTeam.project_name}</h3>
                    <p className="text-sm text-gray-500">{generatedTeam.team_size} members committed</p>
                  </div>
                  <button
                    onClick={() => setShowAnalysis(v => !v)}
                    className="ml-auto flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-800"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {showAnalysis ? 'Hide' : 'Show'} Analysis
                  </button>
                </div>
                <div className="space-y-2">
                  {generatedTeam.members.map((m: any, i: number) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${m.is_me ? 'bg-indigo-100 border border-indigo-200' : 'bg-white shadow-sm'}`}>
                      <Avatar username={m.student_username} size="md" />
                      <span className="text-sm font-semibold text-gray-900 flex-1">{m.student_username}</span>
                      {m.is_me ? <Badge variant="primary" size="sm">You</Badge> : <Badge variant="success" size="sm">Teammate</Badge>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill analysis panel */}
              {showAnalysis && generatedTeam.analysis && (
                <Card title="Team Skill Analysis">
                  <TeamAnalysisPanel data={generatedTeam.analysis} />
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======== MANUAL BUILD ======== */}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          <Card title="Select Team Members">
            <div className="space-y-4">
              <Input placeholder="Search students..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />} fullWidth
              />
              <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
                {filteredStudents.map(student => (
                  <button key={student.id} onClick={() => toggleStudent(student.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      selectedStudents.includes(student.id) ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar username={student.github_username} size="sm" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{student.github_username}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    {selectedStudents.includes(student.id) && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-600">{selectedStudents.length} selected</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleValidateTeam} disabled={selectedStudents.length < 2} loading={loading} size="sm">
                    Analyze Only
                  </Button>
                  <Button onClick={handleFormTeam} disabled={selectedStudents.length < 2} loading={loading}
                    icon={<CheckCircle className="w-4 h-4" />} size="sm"
                  >
                    Form + Analyze
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {teamAnalysis && (
            <Card title="Team Skill Analysis">
              <TeamAnalysisPanel data={teamAnalysis} />
            </Card>
          )}
        </div>
      )}

      {/* ======== MY TEAM ======== */}
      {activeTab === 'my-team' && (
        <div className="space-y-4">
          {myTeam ? (
            <>
              {/* Project Details Banner */}
              <div className="rounded-2xl overflow-hidden border border-indigo-200 shadow-sm">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Your Project</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{myTeam.assigned_project || myTeam.name}</h2>
                  {myTeam.tech_stack?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {myTeam.tech_stack.map((t: string) => (
                        <span key={t} className="text-xs px-3 py-1 bg-white/20 text-white rounded-full font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-indigo-200 text-xs">
                    <span>{(myTeam.member_ids || []).length} team member{(myTeam.member_ids || []).length !== 1 ? 's' : ''}</span>
                    {invitedIds.size > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {invitedIds.size} invite{invitedIds.size !== 1 ? 's' : ''} sent
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Team members + invite buttons */}
              <Card title="Team Members">
                {myTeam.member_ids?.length > 0 ? (
                  <div className="space-y-3">
                    {myTeam.member_ids.map((memberId: string) => {
                      const student = students.find(s => s.id === memberId);
                      const username = student?.github_username || memberId;
                      const isMe = memberId === user?.id;
                      const alreadyInvited = invitedIds.has(memberId);
                      return (
                        <div key={memberId}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            isMe ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'
                          }`}
                        >
                          <Avatar username={username} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{username}</p>
                            {student?.email && (
                              <p className="text-xs text-gray-400 truncate">{student.email}</p>
                            )}
                          </div>
                          {isMe ? (
                            <Badge variant="primary" size="sm">You</Badge>
                          ) : alreadyInvited ? (
                            <Button variant="outline" size="sm" disabled icon={<CheckCircle className="w-3.5 h-3.5 text-green-600" />}>
                              Invited
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Send className="w-3.5 h-3.5" />}
                              onClick={() => openInviteModal(memberId, username)}
                            >
                              Send Invite
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-4 text-center">No team members assigned yet.</p>
                )}
              </Card>

              {/* Invite tip */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Click <strong>Send Invite</strong> next to any teammate to send them a project collaboration request with your project details pre-filled in the message.
                </p>
              </div>
            </>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 font-medium">You're not on a team yet.</p>
                <p className="text-gray-400 text-sm mb-6">Use the "Find My Team" tab to generate your team with smart matching.</p>
                <Button onClick={() => setActiveTab('generate')} icon={<Zap className="w-4 h-4" />}>Find My Team</Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ======== INVITE MODAL ======== */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Send Project Invite" size="md">
        {inviteTarget && myTeam && (
          <div className="space-y-4">
            {/* Project summary */}
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Project</span>
              </div>
              <p className="font-bold text-gray-900">{myTeam.assigned_project || myTeam.name}</p>
              {myTeam.tech_stack?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {myTeam.tech_stack.map((t: string) => (
                    <span key={t} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Sending to */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar username={inviteTarget.username} size="sm" />
              <div>
                <p className="text-xs text-gray-500">Sending invite to</p>
                <p className="text-sm font-semibold text-gray-900">{inviteTarget.username}</p>
              </div>
            </div>

            {/* Editable message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-gray-400 font-normal">(editable)</span>
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none bg-white"
                rows={7}
                value={inviteMessage}
                onChange={e => setInviteMessage(e.target.value)}
                placeholder="Write your invite message..."
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                onClick={handleSendInvite}
                loading={inviteSending}
                disabled={!inviteMessage.trim()}
                icon={<Send className="w-4 h-4" />}
                variant="primary"
              >
                Send Invite
              </Button>
              <Button variant="outline" onClick={() => setShowInviteModal(false)} icon={<X className="w-4 h-4" />}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======== CREATE PROJECT MODAL ======== */}
      <Modal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} title="Create New Project" size="sm">
        <div className="space-y-4">
          <Input label="Project Name *" placeholder="e.g. AI Recommendation Engine"
            value={newProjectName} onChange={e => setNewProjectName(e.target.value)} fullWidth
          />
          <Input label="Tech Stack (comma-separated)" placeholder="e.g. Python, React, FastAPI"
            value={newProjectStack} onChange={e => setNewProjectStack(e.target.value)} fullWidth
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Size</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setNewProjectSize(String(n))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    newProjectSize === String(n) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreateProject} loading={creatingProject} disabled={!newProjectName.trim()} icon={<Plus className="w-4 h-4" />}>
              Create Project
            </Button>
            <Button variant="outline" onClick={() => setShowCreateProject(false)} icon={<X className="w-4 h-4" />}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamPage;