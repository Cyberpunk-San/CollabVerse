import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (term: string) => void;
  onAnalyze: (username: string) => void;
  onAddUser: () => void;
  loading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onAnalyze, 
  onAddUser, 
  loading 
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputValue);
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAnalyze(inputValue.trim());
      setInputValue('');
    }
  };

  const handleClear = () => {
    setInputValue('');
    onSearch('');
  };

  const popularTechs = ['React', 'Node.js', 'Python', 'TypeScript', 'AWS', 'Docker', 'JavaScript', 'Java'];

  return (
    <div className="search-bar">
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search by username, technology, or enrollment number..."
            className="search-input"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
            >
              ✕
            </button>
          )}
          <button type="submit" className="search-button">
            🔍 Search
          </button>
        </div>
      </form>

      <div className="search-actions">
        <button 
          onClick={handleAnalyzeSubmit} 
          className="analyze-btn"
          disabled={loading || !inputValue.trim()}
        >
          {loading ? '🔄 Analyzing...' : '🤖 Analyze GitHub User'}
        </button>
        <button 
          onClick={onAddUser}
          className="add-user-btn"
          disabled={loading}
        >
          👤 Add User by Enrollment
        </button>
        <button 
          onClick={handleClear}
          className="clear-btn"
        >
          🗑️ Clear
        </button>
      </div>

      <div className="popular-searches">
        <span className="popular-label">Popular technologies:</span>
        {popularTechs.map(tech => (
          <button
            key={tech}
            onClick={() => {
              setInputValue(tech);
              onSearch(tech);
            }}
            className="tech-chip"
          >
            {tech}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;