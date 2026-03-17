import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function OccupancyHistoryPage() {
  const [history, setHistory]   = useState([]);
  const [hostels, setHostels]   = useState([]);
  const [years, setYears]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filters, setFilters]   = useState({
    hostel_id: '', year: '', room_number: '', bed_number: ''
  });
  const [search, setSearch]     = useState('');

  useEffect(() => {
    Promise.all([api.get('/hostels/'), api.get('/academic-years/')])
      .then(([h, y]) => {
        setHostels(h.data.results || h.data);
        setYears(y.data.results || y.data);
      });
    fetchHistory({});
  }, []);

  const fetchHistory = (f) => {
    setLoading(true);
    const params = Object.entries(f)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    api.get(`/warden-dashboard/room-history/${params ? '?' + params : ''}`)
      .then(({ data }) => setHistory(data.results || data))
      .finally(() => setLoading(false));
  };

  const setFilter = (key, val) => {
    const f = { ...filters, [key]: val };
    setFilters(f);
    fetchHistory(f);
  };

  const clearAll = () => {
    const f = { hostel_id: '', year: '', room_number: '', bed_number: '' };
    setFilters(f);
    setSearch('');
    fetchHistory(f);
  };

  const filtered = history.filter(h => {
    const q = search.toLowerCase();
    return !search || h.student_name?.toLowerCase().includes(q) || h.student_reg?.includes(q);
  });

  // Group by academic year for visual separation
  const grouped = filtered.reduce((acc, h) => {
    const yr = h.academic_year_name || 'Unknown';
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(h);
    return acc;
  }, {});

  const hasFilters = Object.values(filters).some(v => v) || search;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Occupancy History</h1>
          <p>View who slept in which room and bed across all academic years</p>
        </div>
        {hasFilters && (
          <button className="btn btn-outline btn-sm" onClick={clearAll}>
            <i className="bi bi-x" /> Clear Filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header"><h2><i className="bi bi-funnel" style={{ marginRight: 8 }} />Filter Records</h2></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Hostel</label>
              <select className="form-control" value={filters.hostel_id} onChange={e => setFilter('hostel_id', e.target.value)}>
                <option value="">All Hostels</option>
                {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Academic Year</label>
              <select className="form-control" value={filters.year} onChange={e => setFilter('year', e.target.value)}>
                <option value="">All Years</option>
                {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Room Number</label>
              <input className="form-control" placeholder="e.g. 101" value={filters.room_number}
                onChange={e => setFilter('room_number', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Bed Number</label>
              <input className="form-control" placeholder="e.g. A or 1" value={filters.bed_number}
                onChange={e => setFilter('bed_number', e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Search Student</label>
              <div style={{ position: 'relative' }}>
                <input className="form-control" placeholder="Name or reg no..." value={search}
                  onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
                <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 13 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
          <strong style={{ color: 'var(--gray-800)' }}>{filtered.length}</strong> records found
        </span>
        {Object.keys(grouped).map(yr => (
          <span key={yr} className="badge badge-primary">{yr}: {grouped[yr].length}</span>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <i className="bi bi-archive" />
            <h3>No Records Found</h3>
            <p>Try adjusting your filters to find occupancy records.</p>
          </div>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, records]) => (
              <div key={year}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                  fontSize: 13, fontWeight: 700, color: 'var(--gray-500)',
                  textTransform: 'uppercase', letterSpacing: '0.8px'
                }}>
                  <span className="badge badge-primary" style={{ fontSize: 13 }}>{year}</span>
                  <span>{records.length} records</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
                </div>

                <div className="card">
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th><th>Reg No.</th><th>Hostel</th>
                          <th>Room</th><th>Bed</th><th>Check In</th><th>Check Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(h => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 600 }}>{h.student_name}</td>
                            <td className="text-mono text-sm">{h.student_reg}</td>
                            <td>{h.hostel_name}</td>
                            <td className="text-mono">{h.room_number}</td>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                background: 'var(--primary-light)', color: 'var(--primary)',
                                fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 12.5
                              }}>
                                🛏️ {h.bed_number}
                              </span>
                            </td>
                            <td style={{ fontSize: 13 }}>
                              {h.check_in ? new Date(h.check_in).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ fontSize: 13 }}>
                              {h.check_out
                                ? new Date(h.check_out).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
                                : <span className="badge badge-success" style={{ fontSize: 11 }}>Current</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}