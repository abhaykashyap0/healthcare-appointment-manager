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
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="header-sub">Manage your account and integrations</p>
        </div>
      </div>
      <div className="page-body" style={{ maxWidth: 560 }}>
        <ChangePasswordForm />

        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-title">Google Calendar</div>
          <p className="muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>
            Connect your Google Calendar so appointment events are automatically created, updated, and removed when you book, reschedule, or cancel.
          </p>
          {justConnected && <p className="success-text" style={{ marginBottom: 10 }}>✓ Google Calendar connected successfully.</p>}
          <button className="btn" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Redirecting to Google…' : '🗓 Connect Google Calendar'}
          </button>
        </div>
      </div>
    </>
  );
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update password.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="card">
      <div className="card-title">Change password</div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Current password</label>
          <input type="password" required value={form.currentPassword} onChange={update('currentPassword')} />
        </div>
        <div className="form-group">
          <label>New password</label>
          <input type="password" required minLength={6} value={form.newPassword} onChange={update('newPassword')} />
        </div>
        <div className="form-group">
          <label>Confirm new password</label>
          <input type="password" required minLength={6} value={form.confirmPassword} onChange={update('confirmPassword')} />
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">✓ {success}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}