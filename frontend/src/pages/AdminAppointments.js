import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Admin fetches all appointments by querying both roles
    // We reuse the existing /appointments endpoint but as admin
    api.get('/admin/appointments').then(({ data }) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  const filters = ['all', 'confirmed', 'completed', 'cancelled', 'held'];

  const filtered = appointments
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        a.patient?.name?.toLowerCase().includes(q) ||
        a.doctor?.name?.toLowerCase().includes(q) ||
        a.doctor?.specialisation?.toLowerCase().includes(q)
      );
    });

  const counts = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>All Appointments</h1>
          <p className="header-sub">Overview of every booking across all doctors and patients</p>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Bookings</div>
            <div className="stat-value stat-accent">{counts.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Upcoming</div>
            <div className="stat-value">{counts.confirmed}</div>
            <div className="stat-sub">confirmed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{counts.completed}</div>
            <div className="stat-sub">visits done</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cancelled</div>
            <div className="stat-value">{counts.cancelled}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient, doctor, or specialisation…"
              style={{ flex: 1, minWidth: 220, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}
            />
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={filter === f ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}
                  style={{ textTransform: 'capitalize' }}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && <p className="muted">Loading appointments…</p>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No appointments found</h3>
            <p>Try adjusting the search or filter.</p>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Specialisation</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Urgency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(appt => (
                <tr key={appt._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{appt.patient?.name || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{appt.patient?.email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>Dr. {appt.doctor?.name || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{appt.doctor?.email}</div>
                  </td>
                  <td>{appt.doctor?.specialisation || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(appt.slotStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                      {new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td><StatusBadge status={appt.status} /></td>
                  <td>
                    {appt.preVisitSummary?.urgencyLevel ? (
                      <span className={`badge badge-${appt.preVisitSummary.urgencyLevel.toLowerCase()}`}>
                        {appt.preVisitSummary.urgencyLevel}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <Link className="btn btn-ghost btn-sm" to={`/appointments/${appt._id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}