import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    api.get('/appointments').then(({ data }) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  const filters = ['all', 'confirmed', 'completed', 'cancelled'];
  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const counts = {
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Appointments</h1>
          <p className="header-sub">
            {user?.role === 'doctor' ? 'Manage your patient appointments' : 'Track and manage your clinic visits'}
          </p>
        </div>
        {user?.role === 'patient' && (
          <Link to="/doctors" className="btn">+ Book appointment</Link>
        )}
      </div>
      <div className="page-body">
        {location.state?.booked && (
          <div className="card" style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', marginBottom: 20 }}>
            <p style={{ color: 'var(--green)', fontWeight: 600 }}>
              ✓ Appointment confirmed! A confirmation email is on its way.
            </p>
          </div>
        )}

        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Upcoming</div>
            <div className="stat-value stat-accent">{counts.confirmed}</div>
            <div className="stat-sub">confirmed appointments</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{counts.completed}</div>
            <div className="stat-sub">past visits</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{appointments.length}</div>
            <div className="stat-sub">all time</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={filter === f ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ textTransform: 'capitalize' }}>
              {f === 'all' ? `All (${appointments.length})` : `${f.charAt(0).toUpperCase()+f.slice(1)} (${appointments.filter(a=>a.status===f).length})`}
            </button>
          ))}
        </div>

        {loading && <p className="muted">Loading appointments…</p>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No appointments here</h3>
            <p>{user?.role === 'patient' ? <Link to="/doctors">Book your first appointment →</Link> : 'No appointments to show yet.'}</p>
          </div>
        )}

        {filtered.map((appt) => (
          <div className="appt-card" key={appt._id}>
            <div className="appt-card-top">
              <div className="appt-card-main">
                <div className="appt-who">
                  {user?.role === 'doctor' ? appt.patient?.name : `Dr. ${appt.doctor?.name}`}
                </div>
                <div className="appt-spec">{appt.doctor?.specialisation}</div>
                <div className="appt-when">
                  📅 {new Date(appt.slotStart).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  &nbsp;·&nbsp;
                  {new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <StatusBadge status={appt.status} />
            </div>

            {appt.preVisitSummary?.urgencyLevel && appt.status !== 'cancelled' && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--sage-100)', borderRadius: 8, fontSize: '0.82rem' }}>
                Urgency: <span className={`urgency-${appt.preVisitSummary.urgencyLevel}`}>{appt.preVisitSummary.urgencyLevel}</span>
                {appt.preVisitSummary.chiefComplaint && <> · {appt.preVisitSummary.chiefComplaint}</>}
              </div>
            )}

            <div className="appt-card-bottom">
              <StatusTimeline status={appt.status} />
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                <Link className="btn btn-ghost btn-sm" to={`/appointments/${appt._id}`}>View →</Link>
                {!['cancelled', 'completed'].includes(appt.status) && (
                  <CancelButton id={appt._id} onCancelled={() =>
                    setAppointments(list => list.map(a => a._id === appt._id ? { ...a, status: 'cancelled' } : a))
                  } />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CancelButton({ id, onCancelled }) {
  const [busy, setBusy] = useState(false);
  async function handleCancel() {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusy(true);
    try { await api.post(`/appointments/${id}/cancel`, {}); onCancelled(); }
    finally { setBusy(false); }
  }
  return (
    <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={busy}>
      {busy ? '…' : 'Cancel'}
    </button>
  );
}