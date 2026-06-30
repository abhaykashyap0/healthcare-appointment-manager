import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    api.get('/appointments').then(({ data }) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page">
      <h1>My appointments</h1>
      {location.state?.booked && <p className="success-text">Your appointment is confirmed. A confirmation email is on its way.</p>}

      {loading && <p className="muted">Loading…</p>}
      {!loading && appointments.length === 0 && (
        <div className="empty-state">
          No appointments yet.{' '}
          {user?.role === 'patient' && <Link to="/doctors">Find a doctor to get started.</Link>}
        </div>
      )}

      {appointments.map((appt) => (
        <div className="card" key={appt._id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>
                {user?.role === 'doctor' ? appt.patient?.name : `Dr. ${appt.doctor?.name}`}
              </strong>
              {user?.role === 'doctor' && <span className="muted"> · {appt.doctor?.specialisation}</span>}
              {user?.role !== 'doctor' && <span className="muted"> · {appt.doctor?.specialisation}</span>}
              <div className="muted">{new Date(appt.slotStart).toLocaleString()}</div>
            </div>
            <StatusBadge status={appt.status} />
          </div>

          {appt.preVisitSummary?.urgencyLevel && (
            <p style={{ marginTop: 10 }}>
              Urgency: <span className={`urgency-${appt.preVisitSummary.urgencyLevel}`}>{appt.preVisitSummary.urgencyLevel}</span>
              {appt.preVisitSummary.failed && <span className="muted"> (AI summary unavailable, please review symptoms manually)</span>}
            </p>
          )}

          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Link className="btn small secondary" to={`/appointments/${appt._id}`}>View details</Link>
            {!['cancelled', 'completed'].includes(appt.status) && (
              <CancelButton id={appt._id} onCancelled={() => setAppointments((list) => list.map((a) => (a._id === appt._id ? { ...a, status: 'cancelled' } : a)))} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CancelButton({ id, onCancelled }) {
  const [busy, setBusy] = useState(false);

  async function handleCancel() {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusy(true);
    try {
      await api.post(`/appointments/${id}/cancel`, {});
      onCancelled();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn small danger" onClick={handleCancel} disabled={busy}>
      {busy ? 'Cancelling…' : 'Cancel'}
    </button>
  );
}
