import React from 'react';

interface LanguageSelectionProps {
  selectedLanguage: string;
  onLanguageSelect: (language: string) => void;
  loading: boolean;
}

const LanguageSelection: React.FC<LanguageSelectionProps> = ({
  selectedLanguage,
  onLanguageSelect,
  loading
}) => {
  const popularLanguages = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust',
    'React', 'Node.js', 'Vue', 'Angular', 'Django', 'Flask', 'Spring',
    'AWS', 'Docker', 'Kubernetes', 'TensorFlow', 'PyTorch'
  ];

  return (
    <div className="language-selection">
      <h3>🚀 Build Team For Language</h3>
      <p>Select a technology to find the perfect team members:</p>
      
      <div className="language-options">
        {popularLanguages.map(language => (
          <button
            key={language}
            className={`language-option ${selectedLanguage === language ? 'selected' : ''}`}
            onClick={() => onLanguageSelect(language)}
            disabled={loading}
          >
            {language}
          </button>
        ))}
      </div>

      {selectedLanguage && (
        <div className="action-buttons">
          <button
            className="btn btn-success"
            onClick={() => onLanguageSelect(selectedLanguage)}
            disabled={loading}
          >
            {loading ? '🔄 Building Team...' : '🤖 Get Team Suggestions'}
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSelection;