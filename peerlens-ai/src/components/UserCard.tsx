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

interface UserCardProps {
  user: User;
  isSelected: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, isSelected }) => {
  return (
    <div
      className={`user-card ${isSelected ? 'selected' : ''}`}
      style={{
        background: isSelected ? 'var(--bg-highlight)' : 'var(--bg-secondary)',
        border: isSelected
          ? '2px solid var(--primary)'
          : '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        className="user-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <img
          src={user.avatar_url}
          alt={`${user.name}'s avatar`}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '2px solid var(--primary)',
          }}
        />
        <div>
          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
            {user.name || user.github_username}
          </h4>
          <a
            href={`https://github.com/${user.github_username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--primary)',
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            @{user.github_username}
          </a>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p
          style={{
            marginTop: '0.5rem',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
          }}
        >
          {user.bio}
        </p>
      )}

      {/* Tech Stack */}
      {user.tech_stack && user.tech_stack.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <h5
            style={{
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            💻 Tech Stack
          </h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {user.tech_stack.slice(0, 5).map((tech) => (
              <span
                key={tech.name}
                className="tech-chip"
                style={{
                  background: 'var(--gradient-secondary)',
                  color: 'white',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                }}
              >
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GitHub Stats */}
      <div style={{ marginTop: '1rem' }}>
        <h5
          style={{
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
          }}
        >
          📊 GitHub Stats
        </h5>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Repos: <strong>{user.github_stats.repos}</strong></span>
          <span>Followers: <strong>{user.github_stats.followers}</strong></span>
          <span>Stars: <strong>{user.github_stats.stars}</strong></span>
          <span>Forks: <strong>{user.github_stats.forks}</strong></span>
        </div>
      </div>

      {/* Projects */}
      {user.projects && user.projects.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h5
            style={{
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            🧩 Top Projects
          </h5>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            {user.projects.slice(0, 3).map((proj) => (
              <li key={proj}>• {proj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Seeking */}
      {user.seeking && user.seeking.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h5
            style={{
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            🚀 Seeking
          </h5>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {user.seeking.map((goal) => (
              <span
                key={goal}
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary)',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                }}
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'right',
        }}
      >
        Last updated: {new Date(user.last_updated).toLocaleDateString()}
      </div>
    </div>
  );
};

export default UserCard;
