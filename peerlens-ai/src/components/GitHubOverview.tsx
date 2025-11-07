import React from 'react';

interface GitHubOverview {
  summary: string;
  strengths: string[];
  recommendations: string[];
  tech_insights: string[];
}

interface GitHubOverviewProps {
  overview: GitHubOverview;
  username: string;
}

const GitHubOverview: React.FC<GitHubOverviewProps> = ({ overview, username }) => {
  return (
    <div className="github-overview" style={{
      background: 'var(--gradient-card)',
      borderRadius: '12px',
      padding: '1.5rem',
      margin: '1rem 0',
      border: '1px solid var(--border)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '1.5rem' }}>🤖</span>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          AI Analysis: @{username}
        </h3>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--text-primary)',
          fontSize: '1rem'
        }}>
          📝 Summary
        </h4>
        <p style={{ 
          margin: 0, 
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
          fontSize: '0.9rem'
        }}>
          {overview.summary}
        </p>
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--text-primary)',
          fontSize: '1rem'
        }}>
          💪 Strengths
        </h4>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '1.2rem',
          color: 'var(--text-secondary)'
        }}>
          {overview.strengths.map((strength, index) => (
            <li key={index} style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
              {strength}
            </li>
          ))}
        </ul>
      </div>

      {/* Tech Insights */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--text-primary)',
          fontSize: '1rem'
        }}>
          🔧 Technical Insights
        </h4>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '1.2rem',
          color: 'var(--text-secondary)'
        }}>
          {overview.tech_insights.map((insight, index) => (
            <li key={index} style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div>
        <h4 style={{ 
          margin: '0 0 0.5rem 0', 
          color: 'var(--text-primary)',
          fontSize: '1rem'
        }}>
          🎯 Recommendations
        </h4>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '1.2rem',
          color: 'var(--text-secondary)'
        }}>
          {overview.recommendations.map((recommendation, index) => (
            <li key={index} style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
              {recommendation}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        marginTop: '1rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        Powered by AI Analysis • Generated from GitHub profile data
      </div>
    </div>
  );
};

export default GitHubOverview;