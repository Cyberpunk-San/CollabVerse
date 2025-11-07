import React from 'react';
import UserCard from './UserCard';

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
  compatibility_score?: number;
}

interface TeamSuggestion {
  members: User[];
  reasoning: string;
  required_skill: string;
}

interface TeamBuilderProps {
  suggestions: TeamSuggestion;
  onReset: () => void;
  selectedLanguage: string;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ 
  suggestions, 
  onReset,
  selectedLanguage 
}) => {
  if (!suggestions || !suggestions.members) {
    return (
      <div className="team-builder">
        <h3>No team suggestions available</h3>
      </div>
    );
  }

  return (
    <div className="team-builder">
      {/* Header */}
      <div className="team-header">
        <h3>🤝 Your Dream Team for {selectedLanguage}</h3>
        <button onClick={onReset} className="btn btn-outline">
          Reset Team
        </button>
      </div>

      {/* Reasoning / AI Summary */}
      <div className="team-reasoning">
        <strong>🎯 Team Strategy:</strong>
        <p style={{ marginTop: '0.5rem' }}>{suggestions.reasoning}</p>
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: '8px',
            fontSize: '0.8rem',
          }}
        >
          <strong>Required Skill:</strong> {suggestions.required_skill}
        </div>
      </div>

      {/* Members */}
      <div className="team-members">
        {suggestions.members.map((member, index) => (
          <div key={member.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  background: 'var(--gradient-secondary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                }}
              >
                {index + 1}
              </div>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                }}
              >
                {member.compatibility_score
                  ? `Compatibility: ${member.compatibility_score}/10`
                  : `Perfect match for ${suggestions.required_skill}`}
              </span>
            </div>

            <UserCard user={member} isSelected={false} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="team-actions">
        <button className="btn btn-success">💌 Invite All to Team</button>
        <button className="btn btn-outline">📋 Save Team</button>
        <button className="btn btn-primary" onClick={onReset}>
          🔄 Build Another Team
        </button>
      </div>
    </div>
  );
};

export default TeamBuilder;