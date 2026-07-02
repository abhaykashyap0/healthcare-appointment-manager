import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/appointments');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">✚ Clinic Connect</div>
        <div className="auth-hero">
          <h2>Healthcare that starts before you walk in.</h2>
          <p>Share your symptoms in advance. Get AI-powered summaries. Stay informed at every step.</p>
        </div>
        <div className="auth-features">
          {['AI pre-visit symptom summaries', 'Real-time slot booking', 'Email & calendar reminders', 'Secure role-based access'].map((f) => (
            <div className="auth-feature" key={f}>
              <span className="auth-feature-dot" /> {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <h1>Welcome back</h1>
          <p className="auth-sub">Sign in to your patient, doctor, or admin account.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" required autoFocus
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-lg" type="submit" disabled={submitting}
              style={{ width: '100%', marginTop: 6 }}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 20, textAlign: 'center' }}>
            New patient? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}