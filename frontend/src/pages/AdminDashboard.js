import React, { useEffect, useState } from 'react';
import api from '../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await api.get('/admin/doctors');
    setDoctors(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <h1>Admin · Doctors</h1>
      <CreateDoctorForm onCreated={load} />

      <h3 style={{ marginTop: 28 }}>All doctors</h3>
      {loading && <p className="muted">Loading…</p>}
      {!loading && doctors.length === 0 && <div className="empty-state">No doctors yet. Add one above.</div>}

      {doctors.map((doc) => (
        <DoctorRow key={doc._id} doctor={doc} onUpdated={load} />
      ))}
    </div>
  );
}

function CreateDoctorForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', specialisation: '', slotDurationMinutes: 30, bio: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/admin/doctors', form);
      setSuccess(`Dr. ${form.name} added.`);
      setForm({ name: '', email: '', password: '', specialisation: '', slotDurationMinutes: 30, bio: '' });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create doctor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3>Add a doctor</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label>Full name</label>
            <input required value={form.name} onChange={update('name')} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={update('email')} />
          </div>
          <div className="form-group">
            <label>Temporary password</label>
            <input type="password" required minLength={6} value={form.password} onChange={update('password')} />
          </div>
          <div className="form-group">
            <label>Specialisation</label>
            <input required value={form.specialisation} onChange={update('specialisation')} />
          </div>
          <div className="form-group">
            <label>Slot duration (minutes)</label>
            <input type="number" min={5} max={180} value={form.slotDurationMinutes} onChange={update('slotDurationMinutes')} />
          </div>
        </div>
        <div className="form-group">
          <label>Bio (optional)</label>
          <textarea rows={2} value={form.bio} onChange={update('bio')} />
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add doctor'}
        </button>
      </form>
    </div>
  );
}

function DoctorRow({ doctor, onUpdated }) {
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');

  async function handleMarkLeave(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult('');
    try {
      const { data } = await api.post(`/admin/doctors/${doctor._id}/leave`, { date: leaveDate, reason });
      setResult(`Marked on leave. ${data.affectedAppointments} affected patient(s) notified.`);
      setLeaveDate('');
      setReason('');
      onUpdated();
    } catch (err) {
      setResult(err.response?.data?.message || 'Could not mark leave.');
    } finally {
      setSubmitting(false);
    }
  }

  const workingDays = doctor.workingHours.filter((w) => w.isWorkingDay).map((w) => DAYS[w.dayOfWeek]).join(', ');

  return (
    <div className="card">
      <strong>Dr. {doctor.user?.name}</strong>
      <span className="muted"> · {doctor.specialisation} · {doctor.slotDurationMinutes} min slots</span>
      <p className="muted">Working days: {workingDays || 'Not set'}</p>
      {doctor.leaves?.length > 0 && (
        <p className="muted">
          Upcoming leave: {doctor.leaves.map((l) => new Date(l.date).toLocaleDateString()).join(', ')}
        </p>
      )}
      <form onSubmit={handleMarkLeave} style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Mark leave date</label>
          <input type="date" required value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label>Reason (optional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button className="btn small secondary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Mark leave'}
        </button>
      </form>
      {result && <p className="muted" style={{ marginTop: 6 }}>{result}</p>}
    </div>
  );
}
