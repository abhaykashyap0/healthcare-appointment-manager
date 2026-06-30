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
