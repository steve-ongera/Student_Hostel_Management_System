import { useState, useEffect } from 'react';
import api from '../../utils/api';

// ── All Bookings ───────────────────────────────────────────────
export function AllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/academic-years/').then(({ data }) => setYears(data.results || data));
    fetchBookings();
  }, []);

  const fetchBookings = (year = '', status = '') => {
    setLoading(true);
    let url = '/warden-dashboard/all-bookings/';
    const params = [];
    if (year) params.push(`year=${year}`);
    if (params.length) url += '?' + params.join('&');
    api.get(url).then(({ data }) => setBookings(data.results || data)).finally(() => setLoading(false));
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return (!filterStatus || b.status === filterStatus)
      && (!search || b.student_name?.toLowerCase().includes(q) || b.student_reg?.includes(q) || b.hostel_name?.toLowerCase().includes(q));
  });

  const statusBadge = { confirmed: 'badge-success', pending: 'badge-warning', payment_initiated: 'badge-info', cancelled: 'badge-danger', expired: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>All Bookings</h1>
          <p>{filtered.length} bookings found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <input className="form-control" placeholder="Search student name or reg no..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
              <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            </div>
            <select className="form-control" style={{ flex: '0 1 180px' }} value={filterYear} onChange={e => { setFilterYear(e.target.value); fetchBookings(e.target.value); }}>
              <option value="">All Years</option>
              {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
            <select className="form-control" style={{ flex: '0 1 160px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {['confirmed', 'pending', 'payment_initiated', 'cancelled', 'expired'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No.</th>
                  <th>Hostel</th>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Year</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.student_name}</td>
                    <td className="text-mono text-sm">{b.student_reg}</td>
                    <td>{b.hostel_name}</td>
                    <td className="text-mono">{b.room_number}</td>
                    <td className="text-mono">{b.bed_number}</td>
                    <td className="text-mono text-sm">{b.academic_year_name}</td>
                    <td>KES {parseFloat(b.amount || 0).toLocaleString()}</td>
                    <td><span className={`badge ${statusBadge[b.status] || 'badge-gray'}`}>{b.status.replace('_', ' ')}</span></td>
                    <td className="text-mono text-sm" style={{ color: 'var(--gray-400)' }}>{b.payment?.mpesa_receipt_number || '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>No bookings match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Students ───────────────────────────────────────────────────
export function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/students/').then(({ data }) => setStudents(data.results || data)).finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return !search || s.reg_number?.includes(q) || s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q);
  });

  const genderIcon = { M: 'bi-gender-male', F: 'bi-gender-female' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Students</h1>
          <p>{students.length} students registered</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <input className="form-control" placeholder="Search by name or reg no..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reg No.</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Course</th>
                  <th>Year</th>
                  <th>Sem</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="text-mono text-sm">{s.reg_number}</td>
                    <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                    <td><i className={`bi ${genderIcon[s.gender] || 'bi-person'}`} style={{ marginRight: 4 }} />{s.gender_display}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{s.course_name}</td>
                    <td style={{ textAlign: 'center' }}>{s.current_year}</td>
                    <td style={{ textAlign: 'center' }}>{s.current_semester}</td>
                    <td><span className={`badge ${s.status === 'active' ? 'badge-success' : s.status === 'deferred' ? 'badge-warning' : 'badge-gray'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Occupancy History (Warden) ─────────────────────────────────
export function OccupancyHistory() {
  const [history, setHistory] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ hostel_id: '', year: '', room_number: '', bed_number: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/hostels/'), api.get('/academic-years/')]).then(([h, y]) => {
      setHostels(h.data.results || h.data);
      setYears(y.data.results || y.data);
    });
    fetchHistory({});
  }, []);

  const fetchHistory = (f) => {
    setLoading(true);
    const params = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&');
    api.get(`/warden-dashboard/room-history/${params ? '?' + params : ''}`).then(({ data }) => setHistory(data.results || data)).finally(() => setLoading(false));
  };

  const setFilter = (key, val) => {
    const f = { ...filters, [key]: val };
    setFilters(f);
    fetchHistory(f);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Occupancy History</h1>
          <p>View who stayed in which room and bed across all academic years</p>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select className="form-control" style={{ flex: '1 1 160px' }} value={filters.hostel_id} onChange={e => setFilter('hostel_id', e.target.value)}>
              <option value="">All Hostels</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <select className="form-control" style={{ flex: '1 1 160px' }} value={filters.year} onChange={e => setFilter('year', e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
            <input className="form-control" placeholder="Room No." style={{ flex: '0 1 120px' }} value={filters.room_number} onChange={e => setFilter('room_number', e.target.value)} />
            <input className="form-control" placeholder="Bed No." style={{ flex: '0 1 120px' }} value={filters.bed_number} onChange={e => setFilter('bed_number', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Student</th>
                  <th>Reg No.</th>
                  <th>Hostel</th>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td><span className="badge badge-primary">{h.academic_year_name}</span></td>
                    <td style={{ fontWeight: 600 }}>{h.student_name}</td>
                    <td className="text-mono text-sm">{h.student_reg}</td>
                    <td>{h.hostel_name}</td>
                    <td className="text-mono">{h.room_number}</td>
                    <td className="text-mono">{h.bed_number}</td>
                    <td style={{ fontSize: 12.5 }}>{h.check_in || '—'}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--gray-400)' }}>{h.check_out || 'Current'}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>No records match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Academic Years ─────────────────────────────────────────────
export function AcademicYears() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_current: false, application_open: false });
  const [saving, setSaving] = useState(false);

  const fetchYears = () => {
    setLoading(true);
    api.get('/academic-years/').then(({ data }) => setYears(data.results || data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchYears(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/academic-years/', form);
      setShowForm(false);
      setForm({ name: '', start_date: '', end_date: '', is_current: false, application_open: false });
      fetchYears();
    } catch {} finally { setSaving(false); }
  };

  const toggleField = async (year, field) => {
    await api.patch(`/academic-years/${year.id}/`, { [field]: !year[field] });
    fetchYears();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Academic Years</h1>
          <p>Manage academic years and hostel application windows</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus" /> Add Year
        </button>
      </div>

      {showForm && (
        <div className="card mb-4" style={{ maxWidth: 500 }}>
          <div className="card-header"><h2>New Academic Year</h2></div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Year Name</label>
                <input className="form-control" placeholder="e.g. 2025-2026" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-control" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-control" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
                {[['is_current', 'Set as Current Year'], ['application_open', 'Applications Open']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : <i className="bi bi-check" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Year</th><th>Start</th><th>End</th><th>Current</th><th>Applications</th></tr>
              </thead>
              <tbody>
                {years.map(y => (
                  <tr key={y.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{y.name}</td>
                    <td style={{ fontSize: 13 }}>{y.start_date}</td>
                    <td style={{ fontSize: 13 }}>{y.end_date}</td>
                    <td>
                      <button
                        onClick={() => toggleField(y, 'is_current')}
                        className={`badge ${y.is_current ? 'badge-primary' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {y.is_current ? '✓ Current' : 'Set Current'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleField(y, 'application_open')}
                        className={`badge ${y.application_open ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {y.application_open ? '✓ Open' : '✗ Closed'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reports ────────────────────────────────────────────────────
export function Reports() {
  const [stats, setStats] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    api.get('/warden-dashboard/stats/').then(({ data }) => setStats(data));
    api.get('/academic-years/').then(({ data }) => setYears(data.results || data));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports</h1>
          <p>Summary statistics and downloadable reports</p>
        </div>
      </div>

      {stats && (
        <div className="stat-grid">
          {[
            { label: 'Total Beds', value: stats.total_beds, icon: 'bi-bounding-box', cls: 'blue' },
            { label: 'Occupied', value: stats.occupied_beds, icon: 'bi-person-fill', cls: 'red' },
            { label: 'Available', value: stats.available_beds, icon: 'bi-bounding-box-circles', cls: 'green' },
            { label: 'Occupancy Rate', value: `${stats.occupancy_rate}%`, icon: 'bi-percent', cls: 'blue' },
            { label: 'Confirmed', value: stats.confirmed_bookings, icon: 'bi-bookmark-check', cls: 'green' },
            { label: 'Pending Pay', value: stats.pending_bookings, icon: 'bi-hourglass-split', cls: 'amber' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}><i className={`bi ${s.icon}`} /></div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header"><h2><i className="bi bi-download" style={{ marginRight: 8 }} />Download Reports</h2></div>
        <div className="card-body">
          <div className="form-group" style={{ maxWidth: 300, marginBottom: 20 }}>
            <label className="form-label">Academic Year</label>
            <select className="form-control" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">Current Year</option>
              {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { icon: 'bi-file-earmark-spreadsheet', label: 'Bookings Report (CSV)', hint: 'All booking records' },
              { icon: 'bi-file-earmark-person', label: 'Occupancy History (CSV)', hint: 'Per bed allocation history' },
              { icon: 'bi-file-earmark-bar-graph', label: 'Statistics Summary', hint: 'Counts & percentages' },
            ].map(r => (
              <div key={r.label} style={{
                padding: '20px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)',
                cursor: 'pointer', minWidth: 200, transition: 'all 200ms',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
              >
                <i className={`bi ${r.icon}`} style={{ fontSize: 28, color: 'var(--primary)', display: 'block', marginBottom: 10 }} />
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{r.hint}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--gray-400)' }}>
            <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
            CSV export can be implemented via Django's built-in CSV response — connect your download buttons to the appropriate API endpoint.
          </p>
        </div>
      </div>
    </div>
  );
}