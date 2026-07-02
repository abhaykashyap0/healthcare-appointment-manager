import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';

export default function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await api.get(`/appointments/${id}`);
    setAppt(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (loading) return <div className="page-body"><p className="muted">Loading…</p></div>;
  if (!appt) return <div className="page-body"><p className="error-text">Appointment not found.</p></div>;

  const isDoctor = user.role === 'doctor';

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Appointment Details</h1>
          <p className="header-sub">
            {isDoctor ? `Patient: ${appt.patient?.name}` : `Doctor: Dr. ${appt.doctor?.name}`}
          </p>
        </div>
        <Link to="/appointments" className="btn btn-ghost btn-sm">← Back</Link>
      </div>
      <div className="page-body" style={{ maxWidth: 760 }}>

        {/* Summary card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {isDoctor ? appt.patient?.name : `Dr. ${appt.doctor?.name}`}
              </div>
              <div style={{ color: 'var(--teal-600)', fontWeight: 600, fontSize: '0.85rem', marginTop: 2 }}>
                {appt.doctor?.specialisation}
              </div>
              <div style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: 6 }}>
                📅 {new Date(appt.slotStart).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                &nbsp;·&nbsp;
                {new Date(appt.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(appt.slotEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <StatusBadge status={appt.status} />
          </div>
          <hr className="divider" />
          <StatusTimeline status={appt.status} />
          {appt.cancellationReason && (
            <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--coral)' }}>
              Reason: {appt.cancellationReason}
            </p>
          )}
        </div>

        {/* Symptoms */}
        {appt.symptoms && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Symptoms reported</div>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{appt.symptoms}</p>
          </div>
        )}

        {/* AI Pre-visit summary */}
        {appt.preVisitSummary?.chiefComplaint && (
          <div className="card" style={{ marginBottom: 14, borderLeft: '4px solid var(--teal-400)' }}>
            <div className="card-title">AI pre-visit summary</div>
            {appt.preVisitSummary.failed && (
              <div style={{ padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--amber)', marginBottom: 12 }}>
                ⚠ AI summary unavailable — please review the patient's symptoms directly.
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', marginBottom: 4 }}>Urgency</div>
                <span className={`badge badge-${appt.preVisitSummary.urgencyLevel?.toLowerCase()}`}>
                  {appt.preVisitSummary.urgencyLevel}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', marginBottom: 4 }}>Chief Complaint</div>
                <div style={{ fontSize: '0.9rem' }}>{appt.preVisitSummary.chiefComplaint}</div>
              </div>
            </div>
            {appt.preVisitSummary.suggestedQuestions?.length > 0 && (
              <>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', marginBottom: 8 }}>Suggested questions for the doctor</div>
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {appt.preVisitSummary.suggestedQuestions.map((q, i) => (
                    <li key={i} style={{ fontSize: '0.88rem', color: 'var(--ink-2)' }}>{q}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* Doctor post-visit form */}
        {isDoctor && appt.status === 'confirmed' && (
          <PostVisitForm appointmentId={appt._id} onSubmitted={load} />
        )}

        {/* Post-visit summary */}
        {appt.postVisitSummary?.text && (
          <div className="card" style={{ marginBottom: 14, borderLeft: '4px solid var(--green)' }}>
            <div className="card-title">Visit summary</div>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{appt.postVisitSummary.text}</p>
          </div>
        )}

        {/* Prescription */}
        {appt.prescription?.medications?.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Prescription</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Times/day</th>
                    <th>Duration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {appt.prescription.medications.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.dosage}</td>
                      <td>{m.frequencyPerDay}x</td>
                      <td>{m.durationDays} days</td>
                      <td style={{ color: 'var(--ink-muted)' }}>{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PostVisitForm({ appointmentId, onSubmitted }) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequencyPerDay: 1, durationDays: 5, notes: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateMed = (i, field, value) =>
    setMedications(meds => meds.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await api.post(`/appointments/${appointmentId}/post-visit`, {
        doctorNotes,
        medications: medications.filter(m => m.name.trim()),
      });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit visit notes.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 14, borderLeft: '4px solid var(--amber)' }}>
      <div className="card-title">Complete this visit</div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Clinical notes</label>
          <textarea rows={5} required value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)}
            placeholder="Diagnosis, observations, treatment plan…" />
        </div>

        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', marginBottom: 10 }}>
          Prescription
        </div>

        {medications.map((m, i) => (
          <div key={i} style={{ background: 'var(--sage-100)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Medication name</label>
                <input value={m.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="e.g. Paracetamol" />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Dosage</label>
                <input value={m.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Times per day</label>
                <input type="number" min={1} max={12} value={m.frequencyPerDay}
                  onChange={e => updateMed(i, 'frequencyPerDay', Number(e.target.value))} />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Duration (days)</label>
                <input type="number" min={1} value={m.durationDays}
                  onChange={e => updateMed(i, 'durationDays', Number(e.target.value))} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Notes (optional)</label>
              <input value={m.notes} onChange={e => updateMed(i, 'notes', e.target.value)} placeholder="e.g. Take after food" />
            </div>
            {medications.length > 1 && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                onClick={() => setMedications(meds => meds.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            )}
          </div>
        ))}

        <button type="button" className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}
          onClick={() => setMedications(m => [...m, { name: '', dosage: '', frequencyPerDay: 1, durationDays: 5, notes: '' }])}>
          + Add medication
        </button>

        {error && <p className="error-text">{error}</p>}
        <div>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Generating AI summary…' : '✓ Complete visit & generate summary'}
          </button>
        </div>
      </form>
    </div>
  );
}