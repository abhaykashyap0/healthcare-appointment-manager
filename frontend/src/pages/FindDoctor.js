import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function FindDoctor() {
  const [doctors, setDoctors] = useState([]);
  const [specialisation, setSpecialisation] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchDoctors() {
    setLoading(true);
    const { data } = await api.get('/doctors', { params: specialisation ? { specialisation } : {} });
    setDoctors(data);
    setLoading(false);
  }

  useEffect(() => { fetchDoctors(); }, []); // eslint-disable-line

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Find a doctor</h1>
          <p className="header-sub">Search by specialisation and book the next available slot</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={(e) => { e.preventDefault(); fetchDoctors(); }}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="spec">Specialisation</label>
              <input id="spec" value={specialisation} onChange={(e) => setSpecialisation(e.target.value)}
                placeholder="e.g. Cardiology, General Medicine, Dermatology" />
            </div>
            <button className="btn" type="submit">Search</button>
            {specialisation && (
              <button className="btn btn-ghost" type="button"
                onClick={() => { setSpecialisation(''); fetchDoctors(); }}>Clear</button>
            )}
          </form>
        </div>

        {loading && (
          <div className="doctor-grid">
            {[1,2,3].map(i => (
              <div className="card" key={i}>
                <div className="loading-shimmer" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: 12 }} />
                <div className="loading-shimmer" style={{ width: '60%', marginBottom: 8 }} />
                <div className="loading-shimmer" style={{ width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && doctors.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🩺</div>
            <h3>No doctors found</h3>
            <p>Try a different specialisation or clear the search filter.</p>
          </div>
        )}

        <div className="doctor-grid">
          {doctors.map((doc) => {
            const initials = doc.user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
            return (
              <div className="doctor-card" key={doc._id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="doc-avatar">{initials}</div>
                  <div>
                    <div className="doc-name">Dr. {doc.user?.name}</div>
                    <div className="doc-spec">{doc.specialisation}</div>
                  </div>
                </div>
                {doc.bio && <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', lineHeight: 1.5 }}>{doc.bio}</p>}
                <div className="doc-meta">
                  🕐 {doc.slotDurationMinutes} min slots ·{' '}
                  {doc.workingHours?.filter(w => w.isWorkingDay).length || 5} days/week
                </div>
                <Link className="btn btn-sm" to={`/book/${doc.user?._id}`}
                  style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                  View availability →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}