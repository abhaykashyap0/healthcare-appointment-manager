import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [held, setHeld] = useState(null); // { appointment, holdExpiresAt }
  const [symptoms, setSymptoms] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError('');
    try {
      const { data } = await api.get(`/appointments/availability/${doctorId}`, { params: { date } });
      setSlots(data.slots);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load availability.');
    } finally {
      setLoadingSlots(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Countdown for the hold expiry.
  useEffect(() => {
    if (!held) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(held.holdExpiresAt) - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setError('Your slot hold expired. Please select a slot again.');
        setHeld(null);
      }
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
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/appointments/${held.appointment._id}/confirm`, { symptoms });
      navigate('/appointments', { state: { booked: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not confirm appointment.');
      if (err.response?.status === 410) setHeld(null);
    } finally {
      setSubmitting(false);
    }
  }

  function cancelHold() {
    setHeld(null);
    fetchSlots();
  }

  if (held) {
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <h1>Tell us what's going on</h1>
        <p className="muted">
          Slot reserved for{' '}
          <strong>{new Date(held.appointment.slotStart).toLocaleString()}</strong>. Confirm within{' '}
          <strong>{secondsLeft}s</strong> or it will be released.
        </p>
        <div className="card">
          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label htmlFor="symptoms">Describe your symptoms</label>
              <textarea
                id="symptoms"
                rows={5}
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Fever for 2 days, mild cough, fatigue..."
              />
            </div>
            <p className="muted">
              We'll generate a quick AI summary for your doctor so your visit starts faster. This doesn't replace
              talking to your doctor directly.
            </p>
            {error && <p className="error-text">{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" type="submit" disabled={submitting || secondsLeft === 0}>
                {submitting ? 'Confirming…' : 'Confirm appointment'}
              </button>
              <button className="btn secondary" type="button" onClick={cancelHold} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Choose a time</h1>
      <div className="card">
        <div className="form-group" style={{ maxWidth: 220 }}>
          <label htmlFor="date">Date</label>
          <input id="date" type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {loadingSlots && <p className="muted">Loading available slots…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loadingSlots && slots.length === 0 && !error && (
          <div className="empty-state">No available slots on this date. Try another day.</div>
        )}

        <div className="slot-grid">
          {slots.map((slot) => (
            <button key={slot.start} className="slot-btn" onClick={() => handleSelectSlot(slot.start)}>
              {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
