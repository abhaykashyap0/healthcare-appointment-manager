import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/doctors');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">✚ Clinic Connect</div>
        <div className="auth-hero">
          <h2>Your health, managed end-to-end.</h2>
          <p>Book appointments, describe symptoms in advance, receive AI summaries, and get prescription reminders — all in one place.</p>
        </div>
        <div className="auth-features">
          {['Book any available slot instantly', 'AI-powered pre-visit briefings', 'Post-visit summaries in plain language', 'Medication reminders by email'].map((f) => (
            <div className="auth-feature" key={f}>
              <span className="auth-feature-dot" /> {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <h1>Create your account</h1>
          <p className="auth-sub">Patient accounts only. Doctor accounts are created by clinic admin.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full name</label>
              <input required value={form.name} onChange={update('name')} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label>Email address</label>
              <input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Phone number</label>
              <input value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required minLength={6} value={form.password} onChange={update('password')} placeholder="Min. 6 characters" />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-lg" type="submit" disabled={submitting}
              style={{ width: '100%', marginTop: 6 }}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 20, textAlign: 'center' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}