import React, { useEffect, useState } from 'react';
import api from '../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('doctors');

  async function load() {
    const { data } = await api.get('/admin/doctors');
    setDoctors(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="header-sub">Manage doctors, schedules, and leave</p>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Doctors</div>
            <div className="stat-value stat-accent">{doctors.length}</div>
            <div className="stat-sub">registered in system</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value">{doctors.filter(d => d.isAcceptingBookings).length}</div>
            <div className="stat-sub">accepting bookings</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">On Leave</div>
            <div className="stat-value">{doctors.filter(d => d.leaves?.length > 0).length}</div>
            <div className="stat-sub">have upcoming leave</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {['doctors', 'add'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? 'btn btn-sm' : 'btn btn-ghost btn-sm'}>
              {t === 'doctors' ? `All Doctors (${doctors.length})` : '+ Add Doctor'}
            </button>
          ))}
        </div>

        {tab === 'add' && <CreateDoctorForm onCreated={() => { load(); setTab('doctors'); }} />}

        {tab === 'doctors' && (
          <>
            {loading && <p className="muted">Loading…</p>}
            {!loading && doctors.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🩺</div>
                <h3>No doctors yet</h3>
                <p><button className="btn btn-sm" onClick={() => setTab('add')}>Add the first doctor</button></p>
              </div>
            )}
            {doctors.map((doc) => (
              <DoctorRow key={doc._id} doctor={doc} onUpdated={load} />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function CreateDoctorForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', specialisation: '', slotDurationMinutes: 30, bio: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      await api.post('/admin/doctors', form);
      setSuccess(`Dr. ${form.name} added successfully.`);
      setForm({ name: '', email: '', password: '', specialisation: '', slotDurationMinutes: 30, bio: '' });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create doctor.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="card">
      <div className="card-title">Add a new doctor</div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Full name</label>
            <input required value={form.name} onChange={update('name')} placeholder="Dr. Priya Sharma" />
          </div>
          <div className="form-group">
            <label>Email address</label>
            <input type="email" required value={form.email} onChange={update('email')} placeholder="doctor@clinic.com" />
          </div>
          <div className="form-group">
            <label>Temporary password</label>
            <input type="password" required minLength={6} value={form.password} onChange={update('password')} />
          </div>
          <div className="form-group">
            <label>Specialisation</label>
            <input required value={form.specialisation} onChange={update('specialisation')} placeholder="e.g. Cardiology" />
          </div>
          <div className="form-group">
            <label>Slot duration (minutes)</label>
            <input type="number" min={5} max={180} value={form.slotDurationMinutes} onChange={update('slotDurationMinutes')} />
          </div>
        </div>
        <div className="form-group">
          <label>Bio (optional)</label>
          <textarea rows={2} value={form.bio} onChange={update('bio')} placeholder="Brief professional background…" />
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">✓ {success}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add doctor'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DoctorRow({ doctor, onUpdated }) {
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [expanded, setExpanded] = useState(false);

  const workingDays = doctor.workingHours?.filter(w => w.isWorkingDay).map(w => DAYS[w.dayOfWeek]).join(', ') || 'Not set';
  const initials = doctor.user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  async function handleMarkLeave(e) {
    e.preventDefault();
    setSubmitting(true); setResult('');
    try {
      const { data } = await api.post(`/admin/doctors/${doctor._id}/leave`, { date: leaveDate, reason });
      setResult(`✓ Leave marked. ${data.affectedAppointments} patient(s) notified.`);
      setLeaveDate(''); setReason('');
      onUpdated();
    } catch (err) {
      setResult(err.response?.data?.message || 'Could not mark leave.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="doc-avatar">{initials}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Dr. {doctor.user?.name}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--teal-600)', fontWeight: 600 }}>{doctor.specialisation}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 2 }}>
              {doctor.slotDurationMinutes} min slots · {workingDays}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`badge ${doctor.isAcceptingBookings ? 'badge-confirmed' : 'badge-cancelled'}`}>
            {doctor.isAcceptingBookings ? 'Active' : 'Inactive'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Collapse ▲' : 'Manage ▼'}
          </button>
        </div>
      </div>

      {doctor.leaves?.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--amber)' }}>
          📅 Upcoming leave: {doctor.leaves.map(l => new Date(l.date).toLocaleDateString()).join(', ')}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--ink-2)' }}>Mark leave date</div>
          <form onSubmit={handleMarkLeave} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Leave date</label>
              <input type="date" required value={leaveDate} onChange={e => setLeaveDate(e.target.value)}
                min={new Date().toISOString().slice(0,10)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
              <label>Reason (shown to patients)</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Personal emergency" />
            </div>
            <button className="btn btn-sm" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Mark leave'}
            </button>
          </form>
          {result && <p className={result.startsWith('✓') ? 'success-text' : 'error-text'} style={{ marginTop: 8 }}>{result}</p>}
        </div>
      )}
    </div>
  );
}