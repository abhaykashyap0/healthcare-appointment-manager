import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand">Clinic Connect</Link>
      <nav>
        {user?.role === 'patient' && (
          <>
            <Link to="/doctors">Find a doctor</Link>
            <Link to="/appointments">My appointments</Link>
          </>
        )}
        {user?.role === 'doctor' && <Link to="/appointments">My appointments</Link>}
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        {user && (
          <>
            <Link to="/settings">Settings</Link>
            <span className="muted">{user.name}</span>
            <button onClick={handleLogout}>Log out</button>
          </>
        )}
        {!user && (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
