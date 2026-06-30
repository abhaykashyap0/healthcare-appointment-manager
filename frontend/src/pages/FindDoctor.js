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

  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    fetchDoctors();
  }

  return (
    <div className="page">
      <h1>Find a doctor</h1>
      <p className="muted">Search by specialisation and book the next available slot.</p>

      <form onSubmit={handleSearch} className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="spec">Specialisation</label>
          <input id="spec" placeholder="e.g. Cardiology, General Medicine" value={specialisation} onChange={(e) => setSpecialisation(e.target.value)} />
        </div>
        <button className="btn" type="submit">Search</button>
      </form>

      {loading && <p className="muted">Loading doctors…</p>}

      {!loading && doctors.length === 0 && (
        <div className="empty-state">No doctors found. Try a different specialisation.</div>
      )}

      <div className="grid-2">
        {doctors.map((doc) => (
          <div className="card" key={doc._id}>
            <h3>Dr. {doc.user?.name}</h3>
            <p className="muted">{doc.specialisation} · {doc.slotDurationMinutes} min slots</p>
            {doc.bio && <p>{doc.bio}</p>}
            <Link className="btn small" to={`/book/${doc.user?._id}`}>View availability</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
