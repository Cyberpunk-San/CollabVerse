import React from 'react';

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
}

interface MakeTeamButtonProps {
  selectedUser: User | null;
  onTeamCreated: () => void;
  loading: boolean;
  disabled?: boolean;
}

const MakeTeamButton: React.FC<MakeTeamButtonProps> = ({
  selectedUser,
  onTeamCreated,
  loading,
  disabled = false
}) => {
  return (
    <div style={{ 
      textAlign: 'center', 
      margin: '1.5rem 0',
      padding: '1.5rem',
      background: 'var(--gradient-card)',
      borderRadius: '16px',
      border: '2px solid var(--primary)',
      boxShadow: 'var(--shadow-glow)'
    }}>
      <h4 style={{ 
        marginBottom: '1rem', 
        color: 'var(--text-primary)',
        fontSize: '1.25rem'
      }}>
        🚀 Quick Team Formation
      </h4>
      <p style={{ 
        marginBottom: '1.5rem', 
        color: 'var(--text-secondary)',
        fontSize: '0.95rem',
        lineHeight: '1.5'
      }}>
        Automatically find the 3 most compatible teammates based on your tech stack, 
        GitHub activity, and project interests
      </p>
      <button
        onClick={onTeamCreated}
        disabled={!selectedUser || loading || disabled}
        className="btn btn-success"
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: '600',
          opacity: (!selectedUser || disabled) ? 0.6 : 1,
          cursor: (!selectedUser || disabled) ? 'not-allowed' : 'pointer',
          width: '100%',
          borderRadius: '12px'
        }}
      >
        {loading ? (
          <>
            <span style={{ marginRight: '0.5rem' }}>🔄</span>
            Finding Perfect Teammates...
          </>
        ) : (
          <>
            <span style={{ marginRight: '0.5rem' }}>🤝</span>
            Make My Team (Auto-Match Top 3)
          </>
        )}
      </button>
      
      {!selectedUser && (
        <p style={{ 
          marginTop: '1rem', 
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          fontStyle: 'italic'
        }}>
          👆 Select a user first to create a team
        </p>
      )}
    </div>
  );
};

export default MakeTeamButton;