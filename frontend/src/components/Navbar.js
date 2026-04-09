import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  senior_manager: 'Senior Manager',
  director: 'Director',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const openModal = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setError(''); setSuccess('');
    setShowModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/auth/change-password`, { currentPassword, newPassword });
      setSuccess('Password changed successfully!');
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">🏆 Nomination System</div>
        <div className="navbar-user">
          <span className="user-info">
            <strong>{user?.name}</strong>
            <span className="role-badge">{ROLE_LABELS[user?.role] || user?.role}</span>
          </span>
          <button className="btn btn-outline btn-sm" onClick={openModal}>
            Change Password
          </button>
          <button className="btn btn-outline btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">Change Password</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoFocus
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>
                    {showCurrent ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>
                    {showNew ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline-dark" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
