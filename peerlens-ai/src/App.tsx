import React, { useEffect, useState } from 'react';
import './styles/App.css';
import { getStudents, analyzeGitHubUser, getTeamSuggestions, addUserByEnrollment, makeTeam } from './services/api';
import SearchBar from './components/SearchBar';
import UserCard from './components/UserCard';
import TeamBuilder from './components/TeamBuilder';
import AddUserModal from './components/AddUserModal';
import LanguageSelection from './components/LanguageSelection';
import MakeTeamButton from './components/MakeTeamButton';
import NetworkGraph from './components/NetworkGraph';
import GitHubOverview from './components/GitHubOverview';

interface TechStack {
  name: string;
  level: string;
  confidence: number;
}

interface GithubStats {
  repos: number;
  followers: number;
  stars: number;
  forks: number;
  languages: { [key: string]: number };
}

interface GitHubOverview {
  summary: string;
  strengths: string[];
  recommendations: string[];
  tech_insights: string[];
}

interface User {
  id: string;
  name: string;
  github_username: string;
  avatar_url: string;
  bio?: string | null;
  tech_stack: TechStack[];
  github_stats: GithubStats;
  projects: string[];
  seeking: string[];
  last_updated: string;
  enrollment_number?: string;
  compatibility_score?: number;
  overview?: GitHubOverview; // Add overview field
}

interface TeamSuggestion {
  members: User[];
  reasoning: string;
  required_skill: string;
}

const App: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suggestions, setSuggestions] = useState<TeamSuggestion | null>(null);
  const [autoTeam, setAutoTeam] = useState<TeamSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [showGraph, setShowGraph] = useState(true);
  const [showOverview, setShowOverview] = useState(false); // Add overview state

  // Load all students when app starts
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await getStudents();
        setStudents(data);
      } catch (err: any) {
        console.error('⚠️ Backend not reachable:', err);
        setError('Backend not reachable. Make sure FastAPI is running.');
      }
    };
    fetchStudents();
  }, []);

  // Analyze a new GitHub user
  const handleAnalyze = async (username: string) => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setShowOverview(false); // Reset overview when analyzing new user
    try {
      const newUser = await analyzeGitHubUser(username);
      setStudents((prev) => {
        const exists = prev.some((u) => u.id === newUser.id);
        return exists ? prev : [...prev, newUser];
      });
      setSelectedUser(newUser);
      setShowOverview(true); // Show overview after successful analysis
    } catch (err: any) {
      setError(err.message || 'Failed to analyze GitHub user.');
    } finally {
      setLoading(false);
    }
  };

  // Add user by enrollment number
  const handleAddUser = async (enrollmentNumber: string, githubUsername: string) => {
    setLoading(true);
    setError(null);
    setShowOverview(false);
    try {
      const newUser = await addUserByEnrollment(enrollmentNumber, githubUsername);
      setStudents((prev) => {
        const exists = prev.some((u) => u.id === newUser.id);
        return exists ? prev : [...prev, newUser];
      });
      setSelectedUser(newUser);
      setShowAddUserModal(false);
      setShowOverview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add user.');
    } finally {
      setLoading(false);
    }
  };

  // Request team suggestions for specific language
  const handleTeamSuggestions = async (language: string) => {
    if (!selectedUser) return;
    setLoading(true);
    setError(null);
    setShowOverview(false); // Hide overview when building teams
    try {
      const team = await getTeamSuggestions(selectedUser.id, language);
      setSuggestions(team);
      setAutoTeam(null); // Clear auto team
      setSelectedLanguage(language);
    } catch (err: any) {
      setError(err.message || 'Failed to get team suggestions.');
    } finally {
      setLoading(false);
    }
  };

  // Make team with best 3 teammates (auto-match) - FRONTEND ONLY
  const handleMakeTeam = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setError(null);
    setShowOverview(false); // Hide overview when building teams
    try {
      const team = await makeTeam(selectedUser.id, students);
      setAutoTeam(team);
      setSuggestions(null); // Clear language-based suggestions
      setSelectedLanguage('Auto-Matched Team');
    } catch (err: any) {
      setError(err.message || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTeam = () => {
    setSuggestions(null);
    setAutoTeam(null);
    setSelectedLanguage('');
    setShowOverview(false);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowOverview(false); // Hide overview when selecting different user
  };

  // Filter students based on search term
  const filteredStudents = students.filter((student) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in username
    if (student.github_username.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in name
    if (student.name?.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in tech stack
    if (student.tech_stack.some(tech => 
      tech.name.toLowerCase().includes(searchLower)
    )) {
      return true;
    }
    
    // Search in enrollment number
    if (student.enrollment_number?.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
  });

  // Determine which team to display
  const currentTeam = autoTeam || suggestions;

  return (
    <div className="App">
      <header className="app-header">
        <h1 className="title">CollabVerse</h1>
        <p className="subtitle">Discover talent. Build AI-powered hackathon teams.</p>
      </header>

      {/* Search Bar */}
      <SearchBar 
        onSearch={setSearchTerm} 
        onAnalyze={handleAnalyze}
        onAddUser={() => setShowAddUserModal(true)}
        loading={loading} 
      />

      {/* Graph Toggle */}
      <div style={{ 
        textAlign: 'center', 
        margin: '1rem 0',
        display: students.length > 0 ? 'block' : 'none'
      }}>
        <button
          onClick={() => setShowGraph(!showGraph)}
          className="btn btn-outline"
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          {showGraph ? '📊 Hide Network Graph' : '🌐 Show Network Graph'}
        </button>
      </div>

      {/* Network Graph */}
      {showGraph && students.length > 0 && (
        <NetworkGraph
          users={students}
          selectedUser={selectedUser}
          searchTerm={searchTerm}
          onUserSelect={handleUserSelect}
        />
      )}

      {/* Errors */}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Make Team Button - Quick Team Formation */}
      {selectedUser && !currentTeam && (
        <MakeTeamButton 
          selectedUser={selectedUser}
          onTeamCreated={handleMakeTeam}
          loading={loading}
        />
      )}

      {/* Language Selection for Team Building */}
      {selectedUser && !currentTeam && (
        <LanguageSelection 
          selectedLanguage={selectedLanguage}
          onLanguageSelect={handleTeamSuggestions}
          loading={loading}
        />
      )}

      {/* Students List */}
      {!currentTeam && (
        <div className="user-list">
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <h3>No users found</h3>
              <p>Try searching for a different term or add a new GitHub user.</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                key={student.id} 
                onClick={() => handleUserSelect(student)}
                style={{ cursor: 'pointer' }}
              >
                <UserCard
                  user={student}
                  isSelected={selectedUser?.id === student.id}
                />
              </div>
            ))
          )}
        </div>
      )}

      {/* Team Builder */}
      {currentTeam && (
        <TeamBuilder 
          suggestions={currentTeam} 
          onReset={handleResetTeam}
          selectedLanguage={selectedLanguage}
        />
      )}

      {/* Selected Profile */}
      {selectedUser && !currentTeam && (
        <div className="selected-user-section">
          <h3>👤 Selected Profile</h3>
          <UserCard user={selectedUser} isSelected={true} />
        </div>
      )}

      {/* GitHub AI Overview */}
      {selectedUser && showOverview && selectedUser.overview && !currentTeam && (
        <GitHubOverview 
          overview={selectedUser.overview}
          username={selectedUser.github_username}
        />
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onAddUser={handleAddUser}
          loading={loading}
        />
      )}

      <footer className="footer">
        <p>Built with ❤️ using FastAPI + React + PeerLens AI Engine.</p>
      </footer>
    </div>
  );
};

export default App;