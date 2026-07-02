import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icons = {
  dashboard: '⚕',
  doctors:   '🩺',
  book:      '📅',
  appointments: '📋',
  admin:     '🏥',
  settings:  '⚙',
  logout:    '→',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark">✚</div>
        <span className="brand-name">Clinic Connect</span>
        <span className="brand-sub">Healthcare Platform</span>
      </div>

      <nav className="sidebar-nav">
        {user.role === 'patient' && (
          <>
            <span className="nav-section">Patient</span>
            <NavLink to="/doctors">
              <span className="nav-icon">{icons.doctors}</span> Find a Doctor
            </NavLink>
            <NavLink to="/appointments">
              <span className="nav-icon">{icons.appointments}</span> My Appointments
            </NavLink>
          </>
        )}

        {user.role === 'doctor' && (
          <>
            <span className="nav-section">Doctor</span>
            <NavLink to="/appointments">
              <span className="nav-icon">{icons.appointments}</span> Appointments
            </NavLink>
          </>
        )}

        {user.role === 'admin' && (
          <>
            <span className="nav-section">Admin</span>
            <NavLink to="/admin">
              <span className="nav-icon">{icons.admin}</span> Dashboard
            </NavLink>
            <NavLink to="/admin/appointments">
              <span className="nav-icon">{icons.appointments}</span> All Appointments
            </NavLink>
          </>
        )}

        <span className="nav-section">Account</span>
        <NavLink to="/settings">
          <span className="nav-icon">{icons.settings}</span> Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', marginTop: 8, textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem',
            cursor: 'pointer', borderRadius: 6, fontFamily: 'var(--font-body)' }}
        >
          <span>⎋</span> Log out
        </button>
      </div>
    </aside>
  );
}