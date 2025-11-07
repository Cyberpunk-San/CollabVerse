import React, { useState } from 'react';

interface AddUserModalProps {
  onClose: () => void;
  onAddUser: (enrollmentNumber: string, githubUsername: string) => void;
  loading: boolean;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  onClose,
  onAddUser,
  loading
}) => {
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [githubUsername, setGithubUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollmentNumber.trim() && githubUsername.trim()) {
      onAddUser(enrollmentNumber.trim(), githubUsername.trim());
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>👤 Add GitHub User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">College Enrollment Number</label>
            <input
              type="text"
              className="form-input"
              value={enrollmentNumber}
              onChange={(e) => setEnrollmentNumber(e.target.value)}
              placeholder="Enter enrollment number"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">GitHub Username</label>
            <input
              type="text"
              className="form-input"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="Enter GitHub username"
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !enrollmentNumber.trim() || !githubUsername.trim()}
            >
              {loading ? '🔄 Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;