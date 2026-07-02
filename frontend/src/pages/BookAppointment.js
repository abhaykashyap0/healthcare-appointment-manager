import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [held, setHeld] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true); setError('');
    try {
      const { data } = await api.get(`/appointments/availability/${doctorId}`, { params: { date } });
      setSlots(data.slots);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load availability.');
    } finally { setLoadingSlots(false); }
  }, [doctorId, date]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  useEffect(() => {
    if (!held) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(held.holdExpiresAt) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) { setError('Your slot hold expired. Please select a slot again.'); setHeld(null); }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [held]);

  async function handleSelectSlot(slotStart) {
    setError('');
    try {
      const { data } = await api.post('/appointments/hold', { doctorId, slotStart });
      setHeld(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not hold this slot.');
      fetchSlots();
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    if (!held) return;
    setSubmitting(true); setError('');

    const fallbackTimer = setTimeout(() => {
      navigate('/appointments', { state: { booked: true } });
    }, 15000);

    try {
      await api.post(`/appointments/${held.appointment._id}/confirm`, { symptoms });
      clearTimeout(fallbackTimer);
      navigate('/appointments', { state: { booked: true } });
    } catch (err) {
      clearTimeout(fallbackTimer);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        navigate('/appointments', { state: { booked: true } });
        return;
      }
      setError(err.response?.data?.message || 'Could not confirm appointment.');
      if (err.response?.status === 410) setHeld(null);
    } finally { setSubmitting(false); }
  }

  if (held) {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const isExpiring = secondsLeft < 60;

    return (
      <>
        <div className="page-header">
          <div>
            <h1>Describe your symptoms</h1>
            <p className="header-sub">Help your doctor prepare before you arrive</p>
          </div>
        </div>
        <div className="page-body" style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: 14, background: isExpiring ? 'var(--amber-bg)' : 'var(--teal-50)', border: `1px solid ${isExpiring ? 'var(--amber)' : 'var(--teal-400)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isExpiring ? 'var(--amber)' : 'var(--teal-700)' }}>
                  Slot reserved
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                  {new Date(held.appointment.slotStart).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: isExpiring ? 'var(--amber)' : 'var(--teal-700)' }}>
                  {mins}:{String(secs).padStart(2,'0')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>remaining</div>
              </div>
            </div>
          </div>

          <div className="card">
            <form onSubmit={handleConfirm}>
              <div className="form-group">
                <label htmlFor="symptoms">What's bringing you in today?</label>
                <textarea id="symptoms" rows={6} required value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  placeholder="Describe your symptoms in as much detail as you can — duration, severity, anything that makes it better or worse. This helps your doctor prepare an AI summary before your visit." />
              </div>
              <p className="muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>
                An AI pre-visit summary will be generated for your doctor. This doesn't replace the consultation — it helps them prepare.
              </p>
              {error && <p className="error-text">{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="submit" disabled={submitting || secondsLeft === 0}>
                  {submitting ? 'Confirming…' : 'Confirm appointment →'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => { setHeld(null); fetchSlots(); }} disabled={submitting}>
                  Back to slots
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Choose a time</h1>
          <p className="header-sub">Select a date and pick an available slot</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 20, maxWidth: 280 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="date">Appointment date</label>
            <input id="date" type="date" min={todayStr()} value={date}
              onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        {loadingSlots && (
          <div>
            <p className="muted" style={{ marginBottom: 12 }}>Loading available slots…</p>
            <div className="slot-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="loading-shimmer" style={{ height: 42 }} />
              ))}
            </div>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        {!loadingSlots && slots.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No slots available</h3>
            <p>This doctor has no available slots on this date. Try another day.</p>
          </div>
        )}

        {!loadingSlots && slots.length > 0 && (
          <>
            <p className="muted" style={{ marginBottom: 12 }}>{slots.length} slot{slots.length !== 1 ? 's' : ''} available</p>
            <div className="slot-grid">
              {slots.map(slot => (
                <button key={slot.start} className="slot-btn" onClick={() => handleSelectSlot(slot.start)}>
                  {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}