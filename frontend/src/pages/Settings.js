import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export default function Settings() {
  const [connecting, setConnecting] = useState(false);
  const location = useLocation();
  const justConnected = new URLSearchParams(location.search).get('calendarConnected') === 'true';

  async function handleConnect() {
    setConnecting(true);
    const { data } = await api.get('/calendar/connect');
    window.location.href = data.url;
  }

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <h1>Settings</h1>

      <ChangePasswordForm />

      <div className="card">
        <h3>Google Calendar</h3>
        <p className="muted">
          Connect your Google Calendar so appointment events are added, updated, and removed automatically.
        </p>
        {justConnected && <p className="success-text">Google Calendar connected.</p>}
        <button className="btn" onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Redirecting…' : 'Connect Google Calendar'}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3>Change password</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}