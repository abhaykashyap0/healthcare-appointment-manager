import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="page">Loading…</div>;
  if (!appt) return <div className="page">Appointment not found.</div>;

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <h1>Appointment details</h1>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>{user.role === 'doctor' ? appt.patient?.name : `Dr. ${appt.doctor?.name}`}</strong>
            <div className="muted">{new Date(appt.slotStart).toLocaleString()}</div>
          </div>
          <StatusBadge status={appt.status} />
        </div>
      </div>

      {appt.symptoms && (
        <div className="card">
          <h3>Symptoms reported by patient</h3>
          <p>{appt.symptoms}</p>
        </div>
      )}

      {appt.preVisitSummary?.chiefComplaint && (
        <div className="card">
          <h3>AI pre-visit summary</h3>
          {appt.preVisitSummary.failed && (
            <p className="muted">AI summary generation failed for this visit — review the patient's symptoms above directly.</p>
          )}
          <p>
            Urgency:{' '}
            <span className={`urgency-${appt.preVisitSummary.urgencyLevel}`}>{appt.preVisitSummary.urgencyLevel}</span>
          </p>
          <p><strong>Chief complaint:</strong> {appt.preVisitSummary.chiefComplaint}</p>
          {appt.preVisitSummary.suggestedQuestions?.length > 0 && (
            <>
              <strong>Suggested questions:</strong>
              <ul>
                {appt.preVisitSummary.suggestedQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {user.role === 'doctor' && appt.status === 'confirmed' && (
        <PostVisitForm appointmentId={appt._id} onSubmitted={load} />
      )}

      {appt.postVisitSummary?.text && (
        <div className="card">
          <h3>Visit summary</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{appt.postVisitSummary.text}</p>
        </div>
      )}

      {appt.prescription?.medications?.length > 0 && (
        <div className="card">
          <h3>Prescription</h3>
          <table>
            <thead>
              <tr><th>Medication</th><th>Dosage</th><th>Frequency/day</th><th>Duration (days)</th></tr>
            </thead>
            <tbody>
              {appt.prescription.medications.map((m, i) => (
                <tr key={i}>
                  <td>{m.name}</td>
                  <td>{m.dosage}</td>
                  <td>{m.frequencyPerDay}</td>
                  <td>{m.durationDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PostVisitForm({ appointmentId, onSubmitted }) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequencyPerDay: 1, durationDays: 5, notes: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateMed(index, field, value) {
    setMedications((meds) => meds.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function addMed() {
    setMedications((meds) => [...meds, { name: '', dosage: '', frequencyPerDay: 1, durationDays: 5, notes: '' }]);
  }

  function removeMed(index) {
    setMedications((meds) => meds.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/appointments/${appointmentId}/post-visit`, {
        doctorNotes,
        medications: medications.filter((m) => m.name.trim()),
      });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit visit notes.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h3>Complete visit</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="notes">Clinical notes</label>
          <textarea id="notes" rows={5} required value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} />
        </div>

        <label className="muted">Prescription</label>
        {medications.map((m, i) => (
          <div key={i} className="grid-2" style={{ marginBottom: 8, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Medication name</label>
              <input value={m.name} onChange={(e) => updateMed(i, 'name', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Dosage</label>
              <input value={m.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} placeholder="e.g. 500mg" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Times per day</label>
              <input type="number" min={1} max={12} value={m.frequencyPerDay} onChange={(e) => updateMed(i, 'frequencyPerDay', Number(e.target.value))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Duration (days)</label>
              <input type="number" min={1} value={m.durationDays} onChange={(e) => updateMed(i, 'durationDays', Number(e.target.value))} />
            </div>
            <button type="button" className="btn small secondary" onClick={() => removeMed(i)}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn small secondary" onClick={addMed} style={{ marginBottom: 14 }}>
          + Add medication
        </button>

        {error && <p className="error-text">{error}</p>}
        <div>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Generating summary…' : 'Complete visit & generate summary'}
          </button>
        </div>
      </form>
    </div>
  );
}
