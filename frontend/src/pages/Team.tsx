import React, { useState, useEffect } from 'react';
import { teamsApi, type ProjectResponse } from '../api/team';
import { studentsApi, type StudentResponse } from '../api/students';
import { requestsApi } from '../api/requests';
import { mlApi, type SkillPrediction } from '../api/ml';
import { useAuthContext } from '../contexts/AuthContext';
import { Button, Avatar, Badge, Input, useToast, Modal } from '../components/common';
import {
  Users,
  Target,
  Zap,
  CheckCircle,
  Search,
  Plus,
  FolderPlus,
  AlertTriangle,
  TrendingUp,
  Star,
  Send,
  Mail,
  Shield
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Skill bar component - Refined with Neon Glass
// ────────────────────────────────────────────────────────────
const SkillBar: React.FC<{ skill: string; level: number; max?: number; color?: string }> = ({
  skill, level, max = 5
}) => {
  const pct = Math.min((level / max) * 100, 100);
  const barColor = level >= 4 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                   level >= 3 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' :
                   level >= 2 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 
                                'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]';

  return (
    <div className="flex items-center gap-4 py-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-24 truncate">{skill}</span>
      <div className="flex-1 bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-black text-slate-300 w-4 text-right">{level}</span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Score ring / gauge - Modern Vector Style
// ────────────────────────────────────────────────────────────
const ScoreRing: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center group">
      <div className="relative flex items-center justify-center">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
          <circle
            cx="40" cy="40" r={radius}
            stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black text-white">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3 text-center leading-tight">{label}</span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main analysis panel - Bento Grid Implementation
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
  predictions?: SkillPrediction;
}

const TeamAnalysisPanel: React.FC<{ data: AnalysisData | null | undefined }> = ({ data }) => {
  if (!data) return (
    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 text-xs font-black uppercase tracking-widest">
      Awaiting Input Data
    </div>
  );

  const {
    valid = false,
    team_strength = 0,
    complementarity_score = 0,
    diversity_score = 0,
    member_profiles = [],
    weak_skills = {},
    uncovered_common_skills = [],
    recommendations = []
  } = data;

  return (
    <div className="space-y-8 animate-entrance">
      {/* Metrics Dashboard */}
      <div className="grid grid-cols-3 gap-2 p-8 glass rounded-[2.5rem] border-white/5 bg-white/5 shadow-2xl">
        <ScoreRing value={team_strength * 100} label="Strength" color="#6366f1" />
        <ScoreRing value={complementarity_score} label="Sync" color="#10b981" />
        <div className="flex flex-col items-center justify-center pt-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-3">
                <TrendingUp className="text-purple-400" size={24} />
            </div>
          <span className="text-2xl font-black text-white tracking-tighter">{diversity_score}</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Unique Skills</span>
        </div>
      </div>

      {/* Validation Banner */}
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest ${
        valid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}>
        {valid ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
        {valid ? 'Team verified • Ready for collaboration' : 'Incomplete skill data detected'}
      </div>

      {/* Member Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {member_profiles.map((m) => (
          <div
            key={m.student_id}
            className={`p-6 rounded-[2rem] border transition-all duration-300 ${
                m.is_me ? 'bg-indigo-600 shadow-indigo-500/20 shadow-xl border-none text-white' : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <Avatar username={m.username} size="md" className="rounded-2xl border-2 border-white/20" />
              <div className="flex-1 min-w-0">
                <p className={`font-black tracking-tight truncate ${m.is_me ? 'text-white text-xl' : 'text-slate-100'}`}>{m.username}</p>
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${m.is_me ? 'text-indigo-200' : 'text-slate-500'}`}>Score: {m.total_skill_score}</p>
              </div>
              {m.is_me && <Badge className="bg-white/20 text-white rounded-full text-[10px]">YOU</Badge>}
            </div>
            
            <div className="space-y-2 opacity-90">
              {m.top_skills.slice(0, 4).map(([skill, lvl]) => (
                <SkillBar key={skill} skill={skill} level={lvl} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Recommendations & Gaps - Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendations.length > 0 && (
          <div className="p-8 rounded-[2rem] bg-indigo-500 shadow-indigo-500/20 shadow-xl text-white">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-indigo-100">
                <Star size={14} /> Intelligence Advice
            </h4>
            <ul className="space-y-4">
              {recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-sm font-medium flex items-start gap-3 leading-relaxed">
                  <span className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0">{index + 1}</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(Object.keys(weak_skills).length > 0 || uncovered_common_skills.length > 0) && (
          <div className="p-8 rounded-[2.5rem] bg-white/5 border border-amber-500/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-2">
                <AlertTriangle size={14} /> Critical Gaps
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(weak_skills).slice(0, 5).map(([sk]) => (
                <span key={sk} className="text-[10px] font-bold px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 uppercase tracking-wider">{sk}</span>
              ))}
              {uncovered_common_skills.map(sk => (
                <span key={sk} className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 uppercase tracking-wider">{sk}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Intelligence Panel - Dedicated ML Forecasting
// ────────────────────────────────────────────────────────────
const IntelligencePanel: React.FC<{ 
  predictions: SkillPrediction | undefined;
  onPredict: () => void;
  loading: boolean;
  selectedUser?: string;
}> = ({ predictions, onPredict, loading, selectedUser }) => {
  return (
    <div className="card-modern p-10 bg-slate-900 shadow-2xl border-indigo-500/30 font-sans overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -mr-32 -mt-32" />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 text-white relative z-10 gap-6">
          <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2 font-mono">Neural Engine Phase: 01</h4>
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                Skill Projection 
                {selectedUser && <span className="text-sm font-medium bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20">Target: {selectedUser}</span>}
              </h2>
              <p className="text-slate-400 text-sm mt-3 max-w-lg leading-relaxed">Advanced simulation of developmental trajectory through automated skill-mapping.</p>
          </div>
          {!predictions ? (
              <Button 
                  className="btn-modern !rounded-2xl !bg-indigo-600 hover:!bg-indigo-500 !py-3 !px-6 text-white"
                  onClick={onPredict}
                  loading={loading}
              >
                  Project Growth
              </Button>
          ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                  <Zap size={14} /> Analysis Live
              </div>
          )}
      </div>

      {predictions ? (
          <div className="space-y-10 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                      { label: 'Python Evolution', value: predictions.prediction?.[0] || 0 },
                      { label: 'JS Advancement', value: predictions.prediction?.[1] || 0 },
                      { label: 'C++ Mastery', value: predictions.prediction?.[2] || 0 },
                      { label: 'Teamwork Delta', value: predictions.prediction?.[3] || 0 }
                  ].map((stat, i) => (
                      <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 group-hover:text-indigo-400 transition-colors">{stat.label}</p>
                          <div className="flex items-end gap-2">
                              <span className="text-3xl font-black text-white tabular-nums">+{Math.round(stat.value * 100)}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${stat.value * 100}%` }} />
                          </div>
                      </div>
                  ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Analysis Summary */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-8 rounded-[2rem] bg-indigo-600/20 border border-indigo-500/30">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                              <Shield size={14} /> Core Strength
                          </h4>
                          <p className="text-2xl font-black text-white">{predictions.best_skill}</p>
                          <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Primary Growth Driver</p>
                      </div>
                      <div className="p-8 rounded-[2rem] bg-amber-500/10 border border-amber-500/20">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
                              <AlertTriangle size={14} /> Critical Hub
                          </h4>
                          <p className="text-2xl font-black text-white">{predictions.weakest_skill}</p>
                          <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Largest Improvement Area</p>
                      </div>
                      
                      {predictions.project_fit !== "Neutral" && (
                        <div className="md:col-span-2 p-8 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Project Alignment</h4>
                                <p className="text-3xl font-black text-white">{predictions.project_fit}</p>
                            </div>
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-pulse">
                                <Target size={32} />
                            </div>
                        </div>
                      )}
                  </div>

                  {/* Growth Roadmap */}
                  <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                          <TrendingUp size={14} /> Development Roadmap
                      </h4>
                      <ul className="space-y-6">
                          {predictions.growth_roadmap?.map((step, idx) => (
                              <li key={idx} className="flex gap-4 group">
                                  <div className="flex flex-col items-center">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</div>
                                      {idx < predictions.growth_roadmap.length - 1 && <div className="w-0.5 flex-1 bg-white/5 my-2" />}
                                  </div>
                                  <p className="text-sm font-medium text-slate-300 leading-relaxed group-hover:text-white transition-colors">{step}</p>
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-[2.5rem]">
              <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6 animate-pulse">
                  <Zap size={40} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Neural Link Ready</h3>
              <p className="text-slate-400 font-bold">The projection engine is currently idle.</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-4">Required: One active team member selected</p>
          </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main Team page
// ────────────────────────────────────────────────────────────
const TeamPage: React.FC = () => {
  const { user } = useAuthContext();
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [teamAnalysis, setTeamAnalysis] = useState<AnalysisData | null>(null);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'my-team' | 'intelligence'>('generate');

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [generatedTeam, setGeneratedTeam] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStack, setNewProjectStack] = useState('');
  const [newProjectSize, setNewProjectSize] = useState('3');
  const [creatingProject, setCreatingProject] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ id: string; username: string } | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [predictingGrowth, setPredictingGrowth] = useState(false);

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

  const loadExistingInvites = async () => {
    try {
      const sent = await requestsApi.getSentRequests('pending');
      const pendingReceiverIds = new Set<string>(sent.map((r: any) => r.receiver_id as string));
      setInvitedIds(pendingReceiverIds);
    } catch { }
  };

  const openInviteModal = (memberId: string, username: string) => {
    const projectName = myTeam?.assigned_project || myTeam?.name || 'our project';
    const techStack = (myTeam?.tech_stack || []).join(', ');
    const defaultMsg = [`Hey ${username}! 👋`, ``, `I'd like to collaborate with you on ${projectName}.`, techStack ? `Tech stack: ${techStack}` : '', ``, `Let me know if you're interested!`].filter(Boolean).join('\n');
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
        setInvitedIds(prev => new Set(prev).add(inviteTarget.id));
        toast.success(`Request to ${inviteTarget.username} was already sent!`);
        setShowInviteModal(false);
      } else {
        toast.error(detail || 'Failed to send invite.');
      }
    } finally { setInviteSending(false); }
  };

  const handleGenerateMyTeam = async () => {
    if (!selectedProjectId) { toast.error('Select a project first.'); return; }
    setLoading(true);
    try {
      const result = await teamsApi.buildForMe(selectedProjectId, teamSize);
      setGeneratedTeam(result);
      setShowAnalysis(true);
      toast.success(`✅ Team formed!`);
      await loadMyTeam();
      await loadProjects();
    } catch (error: any) { toast.error(error?.response?.data?.detail || 'Failed to generate.'); }
    finally { setLoading(false); }
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

  const handlePredictGrowth = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Select a student first.');
      return;
    }
    setPredictingGrowth(true);
    try {
      const result = await mlApi.predictSkills(selectedStudents[0], undefined, selectedProjectId);
      setTeamAnalysis(prev => ({ ...(prev || {}), predictions: result } as AnalysisData));
      toast.success('Intelligence analysis complete!');
    } catch { toast.error('ML service unavailable.'); }
    finally { setPredictingGrowth(false); }
  };

  const handleFormTeam = async () => {
    if (selectedStudents.length < 2) return;
    (window as any).handlePredictGrowth = handlePredictGrowth;
    (window as any).predictingGrowth = predictingGrowth;
    setLoading(true);
    try {
      const response = await teamsApi.formTeam(selectedStudents);
      toast.success(response.message || 'Team formed!');
      const analysis = await teamsApi.validateTeam(selectedStudents);
      setTeamAnalysis(analysis as unknown as AnalysisData);
      await loadMyTeam();
    } catch (error: any) { toast.error(error?.response?.data?.detail || 'Failed to form team.'); }
    finally { setLoading(false); }
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
      toast.success(`Project created!`);
      setNewProjectName(''); setNewProjectStack(''); setNewProjectSize('3');
      setShowCreateProject(false);
      await loadProjects();
      setSelectedProjectId(created.id);
    } catch (error: any) { toast.error(error?.response?.data?.detail || 'Failed to create.'); }
    finally { setCreatingProject(false); }
  };

  const toggleStudent = (id: string) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredStudents = students.filter(s =>
    s.github_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 space-y-12">
      {/* Page Title Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="animate-entrance">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black tracking-widest uppercase">Squad Intel</span>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white mt-2">Team Builder</h1>
          <p className="mt-3 text-lg text-slate-500 max-w-lg leading-relaxed">Assemble elite teams using algorithmic skill-matching and complementarity analysis.</p>
        </div>
        <Button 
            className="btn-modern !rounded-3xl !py-4" 
            icon={<FolderPlus size={18} />} 
            onClick={() => setShowCreateProject(true)}
        >
          Initialize Project
        </Button>
      </header>

      {/* Modern Segmented Control Tabs */}
      <div className="flex p-2 glass rounded-[2rem] w-fit mx-auto md:mx-0 overflow-x-auto no-scrollbar">
        {(['generate', 'manual', 'my-team', 'intelligence'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all duration-300 shrink-0 ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'generate' && <Zap size={16} />}
            {tab === 'manual' && <Users size={16} />}
            {tab === 'my-team' && <Target size={16} />}
            {tab === 'intelligence' && <Star size={16} />}
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-8 min-h-[500px]">
        {}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Selection Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <section className="card-modern p-8 bg-white/5">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-[10px]">01</span> Project Scope
                        </h3>
                        <div className="space-y-3">
                            {projects.map((p) => (
                                <button 
                                    key={p.id} 
                                    onClick={() => setSelectedProjectId(p.id === selectedProjectId ? '' : p.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                        selectedProjectId === p.id 
                                        ? 'border-indigo-500 bg-indigo-600 shadow-xl shadow-indigo-500/20' 
                                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <p className={`font-black tracking-tight ${selectedProjectId === p.id ? 'text-white' : 'text-slate-200'}`}>{p.name}</p>
                                    <p className={`text-[10px] mt-1 font-bold ${selectedProjectId === p.id ? 'text-indigo-200' : 'text-slate-500'}`}>{p.max_team_size} Units Allowed</p>
                                </button>
                            ))}
                            <button onClick={() => setShowCreateProject(true)} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-white/5 rounded-2xl text-xs font-black text-slate-500 hover:text-indigo-500 hover:border-indigo-500 transition-all">
                                <Plus size={14} /> New Deployment
                            </button>
                        </div>
                    </section>

                    <section className="card-modern p-8 bg-white/5">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-[10px]">02</span> Unit Capacity
                        </h3>
                        <div className="flex gap-2">
                            {[2, 3, 4, 5].map(size => (
                                <button key={size} onClick={() => setTeamSize(size)}
                                    className={`flex-1 py-3 rounded-xl border font-black text-xs transition-all ${
                                        teamSize === size ? 'bg-indigo-600 border-none text-white shadow-lg' : 'border-white/5 text-slate-500 hover:bg-white/5'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Generation Result Area */}
                <div className="lg:col-span-8">
                    {!generatedTeam ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center card-modern p-12 border-dashed bg-white/5">
                            <Zap size={48} className="text-slate-800 mb-6" />
                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Ready for Matching</h2>
                            <p className="text-slate-500 text-center mb-10 max-w-sm">Select project parameters to run the complementarity algorithm.</p>
                            <Button 
                                onClick={handleGenerateMyTeam} 
                                loading={loading} 
                                disabled={!selectedProjectId}
                                className="btn-modern !px-12 !py-4 shadow-2xl"
                            >
                                {selectedProjectId ? `Compute Best Squad` : 'Awaiting Selection'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-8 rounded-[2.5rem] bg-emerald-600 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
                                <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-200 mb-2">Algorithm Match Verified</h3>
                                        <h2 className="text-4xl font-black tracking-tighter">{generatedTeam.project_name}</h2>
                                    </div>
                                    <button onClick={() => setShowAnalysis(!showAnalysis)} className="flex items-center gap-2 bg-white/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/30 transition-all">
                                        <TrendingUp size={14} /> {showAnalysis ? 'Collapse Intel' : 'Expand Intel'}
                                    </button>
                                </div>
                            </div>
                            {showAnalysis && <TeamAnalysisPanel data={generatedTeam.analysis} />}
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {}
        {activeTab === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="space-y-6">
                <div className="card-modern p-8 bg-white/5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Database Selection</h3>
                    <div className="relative mb-6">
                        <Input 
                            placeholder="Find students..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="!rounded-2xl !bg-slate-900 !border-white/5 !py-6 pl-12"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    </div>
                    
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredStudents.map(student => (
                            <button 
                                key={student.id} 
                                onClick={() => toggleStudent(student.id)}
                                className={`w-full p-4 flex items-center justify-between rounded-2xl border transition-all ${
                                    selectedStudents.includes(student.id) ? 'bg-indigo-600 border-none shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar username={student.github_username} size="sm" className="rounded-xl" />
                                    <div className="text-left">
                                        <p className="text-sm font-black dark:text-white">{student.github_username}</p>
                                        <p className="text-[10px] font-bold text-slate-500">{student.email}</p>
                                    </div>
                                </div>
                                {selectedStudents.includes(student.id) && <CheckCircle size={18} className="text-white" />}
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-8 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">{selectedStudents.length} Units Selected</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={handleValidateTeam} disabled={selectedStudents.length < 2} loading={loading} className="!text-indigo-400">Analyze</Button>
                            <Button onClick={handleFormTeam} disabled={selectedStudents.length < 2} loading={loading} className="btn-modern !rounded-2xl">Confirm Squad</Button>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                {teamAnalysis ? (
                    <TeamAnalysisPanel data={teamAnalysis} />
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center card-modern p-12 border-dashed bg-white/5 text-slate-800">
                        <Users size={48} className="mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">Awaiting Selection Intel</p>
                    </div>
                )}
            </section>
          </div>
        )}

        {}
        {activeTab === 'my-team' && (
          <div className="space-y-8">
            {myTeam ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <div className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-2xl relative overflow-hidden group">
                        <Target className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10 rotate-12 transition-transform group-hover:scale-110 duration-700" />
                        <span className="text-[10px] font-black tracking-widest uppercase opacity-70">Assigned Operation</span>
                        <h2 className="text-5xl font-black tracking-tighter mt-2 mb-6">{myTeam.assigned_project || myTeam.name}</h2>
                        <div className="flex flex-wrap gap-2">
                            {myTeam.tech_stack?.map((t: string) => (
                                <span key={t} className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest">{t}</span>
                            ))}
                        </div>
                    </div>

                    <div className="card-modern p-1">
                        <div className="p-8 border-b border-white/5">
                            <h3 className="text-xl font-black dark:text-white tracking-tight">Active Squad Members</h3>
                        </div>
                        <div className="p-4 space-y-2">
                            {myTeam.member_ids?.map((memberId: string) => {
                                const student = students.find(s => s.id === memberId);
                                const isMe = memberId === user?.id;
                                return (
                                    <div key={memberId} className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${
                                        isMe ? 'bg-indigo-600/10 border-indigo-500/20 shadow-lg' : 'bg-transparent border-white/5'
                                    }`}>
                                        <Avatar username={student?.github_username || memberId} size="lg" className="rounded-2xl" />
                                        <div className="flex-1">
                                            <p className="font-black text-lg dark:text-white tracking-tight">{student?.github_username || memberId}</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{student?.email}</p>
                                        </div>
                                        {isMe ? (
                                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black">YOU</div>
                                        ) : invitedIds.has(memberId) ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl">INVITED</Badge>
                                        ) : (
                                            <button onClick={() => openInviteModal(memberId, student?.github_username || memberId)} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                                                <Send size={14} /> Invite
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                <aside className="space-y-6">
                    <div className="card-modern p-8 bg-indigo-600 text-white shadow-2xl border-none relative overflow-hidden">
                        <Mail className="absolute -right-2 -top-2 w-20 h-20 opacity-10 -rotate-12" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 text-indigo-100">Operation Tip</h4>
                        <p className="text-sm font-medium leading-relaxed italic">"Sync with your teammates by sending official project invites. Each invite includes your tech-stack analysis automatically."</p>
                    </div>
                </aside>
              </div>
            ) : (
                <div className="card-modern p-20 flex flex-col items-center justify-center border-dashed bg-white/5">
                    <Users size={64} className="text-slate-800 mb-6" />
                    <h3 className="text-3xl font-black text-white tracking-tight mb-3 text-center uppercase">No Active Squad Found</h3>
                    <p className="text-slate-500 text-center mb-10 max-w-sm">Use the algorithmic matching system to initialize your first development team.</p>
                    <Button className="btn-modern !px-10 !py-4" onClick={() => setActiveTab('generate')}>Run Matchmaking</Button>
                </div>
            )}
          </div>
        )}

        {}
        {activeTab === 'intelligence' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
                <section className="card-modern p-8 bg-white/5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Subject Selection</h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {students.map(student => (
                            <button 
                                key={student.id} 
                                onClick={() => setSelectedStudents([student.id])}
                                className={`w-full p-4 flex items-center gap-3 rounded-2xl border transition-all ${
                                    selectedStudents[0] === student.id ? 'bg-indigo-600 border-none shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                            >
                                <Avatar username={student.github_username} size="sm" className="rounded-xl" />
                                <div className="text-left">
                                    <p className="text-sm font-black dark:text-white">{student.github_username}</p>
                                </div>
                                {selectedStudents[0] === student.id && <Zap size={14} className="ml-auto text-white" />}
                            </button>
                        ))}
                    </div>
                </section>
            </div>
            <div className="lg:col-span-8">
                <IntelligencePanel 
                  predictions={teamAnalysis?.predictions}
                  onPredict={handlePredictGrowth}
                  loading={predictingGrowth}
                  selectedUser={students.find(s => s.id === selectedStudents[0])?.github_username}
                />
            </div>
          </div>
        )}
      </div>

      {}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Mission Deployment Invite">
        {inviteTarget && (
          <div className="space-y-6 animate-entrance">
            <div className="p-6 rounded-2xl bg-indigo-600 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Recipient Target</p>
                <div className="flex items-center gap-4">
                    <Avatar username={inviteTarget.username} size="md" className="border-2 border-white/20" />
                    <p className="text-2xl font-black tracking-tight">{inviteTarget.username}</p>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Broadcast Message</label>
                <textarea
                    className="w-full p-6 rounded-[2rem] bg-slate-900 border border-white/5 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[150px] transition-all"
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                />
            </div>
            <div className="flex gap-4">
                <Button className="btn-modern flex-1 !bg-indigo-600" onClick={handleSendInvite} loading={inviteSending}>Initiate Invite</Button>
                <Button variant="ghost" className="!text-slate-400" onClick={() => setShowInviteModal(false)}>Abort</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} title="Initialize New Operation">
        <div className="space-y-6 animate-entrance">
            <Input label="Operation Name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="!rounded-2xl !bg-slate-900 !border-white/5 !py-6" />
            <Input label="Resource Stack (CSV)" value={newProjectStack} onChange={e => setNewProjectStack(e.target.value)} placeholder="React, Node.js..." className="!rounded-2xl !bg-slate-900 !border-white/5 !py-6" />
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Team Capacity</label>
                <div className="flex gap-2">
                    {[2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setNewProjectSize(String(n))} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${newProjectSize === String(n) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-white/5'}`}>{n}</button>
                    ))}
                </div>
            </div>
            <div className="flex gap-4 pt-4">
                <Button className="btn-modern flex-1 !bg-indigo-600" onClick={handleCreateProject} loading={creatingProject}>Create Operation</Button>
                <Button variant="ghost" className="!text-slate-400" onClick={() => setShowCreateProject(false)}>Cancel</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamPage;