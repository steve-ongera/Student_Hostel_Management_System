import { useState, useEffect } from 'react';
import api from '../../utils/api';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const statusBadge = {
  confirmed: 'badge-success',
  pending: 'badge-warning',
  payment_initiated: 'badge-info',
  cancelled: 'badge-danger',
  expired: 'badge-gray',
};

const statusColor = {
  confirmed: 'var(--accent)',
  pending: 'var(--warning)',
  payment_initiated: 'var(--info)',
  cancelled: 'var(--danger)',
  expired: 'var(--gray-400)',
};

export default function BookingsPage() {
  const [bookings, setBookings]     = useState([]);
  const [years, setYears]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]         = useState('');
  const [viewBooking, setViewBooking] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchBookings = (year = filterYear) => {
    setLoading(true);
    let url = '/warden-dashboard/all-bookings/';
    if (year) url += `?year=${year}`;
    api.get(url).then(({ data }) => setBookings(data.results || data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/academic-years/').then(({ data }) => setYears(data.results || data));
    fetchBookings();
  }, []);

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Cancel booking for ${booking.student_name}? The bed will be released.`)) return;
    setUpdatingId(booking.id);
    try {
      await api.patch(`/bookings/${booking.id}/`, { status: 'cancelled' });
      fetchBookings();
      if (viewBooking?.id === booking.id) setViewBooking(prev => ({ ...prev, status: 'cancelled' }));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmBooking = async (booking) => {
    setUpdatingId(booking.id);
    try {
      await api.patch(`/bookings/${booking.id}/`, { status: 'confirmed' });
      fetchBookings();
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return (
      (!filterStatus || b.status === filterStatus) &&
      (!search || b.student_name?.toLowerCase().includes(q) ||
        b.student_reg?.toLowerCase().includes(q) ||
        b.hostel_name?.toLowerCase().includes(q))
    );
  });

  // Summary counts
  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>All Bookings</h1>
          <p>{filtered.length} bookings {filterYear ? `for ${filterYear}` : ''}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 24 }}>
        {[
          { label: 'Confirmed',   key: 'confirmed',         icon: 'bi-bookmark-check-fill', cls: 'green' },
          { label: 'Initiated',   key: 'payment_initiated', icon: 'bi-phone',               cls: 'blue'  },
          { label: 'Pending',     key: 'pending',           icon: 'bi-hourglass-split',      cls: 'amber' },
          { label: 'Cancelled',   key: 'cancelled',         icon: 'bi-x-circle',            cls: 'red'   },
        ].map(s => (
          <div className="stat-card" key={s.key} style={{ cursor: 'pointer' }}
            onClick={() => setFilterStatus(filterStatus === s.key ? '' : s.key)}>
            <div className={`stat-icon ${s.cls}`}><i className={`bi ${s.icon}`} /></div>
            <div className="stat-info">
              <div className="stat-value">{counts[s.key] || 0}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <input className="form-control" placeholder="Search student, reg no, hostel..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          </div>
          <select className="form-control" style={{ flex: '0 1 180px' }} value={filterYear}
            onChange={e => { setFilterYear(e.target.value); fetchBookings(e.target.value); }}>
            <option value="">All Years</option>
            {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
          </select>
          <select className="form-control" style={{ flex: '0 1 180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['confirmed', 'payment_initiated', 'pending', 'cancelled', 'expired'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          {(search || filterStatus || filterYear) && (
            <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterYear(''); fetchBookings(''); }}>
              <i className="bi bi-x" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Reg No.</th><th>Hostel</th><th>Room</th>
                  <th>Bed</th><th>Year</th><th>Amount</th><th>Status</th><th>Actions</th>
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
                    <td>
                      <span className={`badge ${statusBadge[b.status] || 'badge-gray'}`}>
                        <i className="bi bi-circle-fill" style={{ fontSize: 6 }} />
                        {' '}{b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setViewBooking(b)} title="View details">
                          <i className="bi bi-eye" />
                        </button>
                        {b.status === 'payment_initiated' && (
                          <button className="btn btn-sm btn-success"
                            onClick={() => handleConfirmBooking(b)}
                            disabled={updatingId === b.id}
                            title="Manually confirm"
                            style={{ fontSize: 12 }}>
                            {updatingId === b.id ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                          </button>
                        )}
                        {['confirmed', 'pending', 'payment_initiated'].includes(b.status) && (
                          <button className="btn btn-sm"
                            style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                            onClick={() => handleCancelBooking(b)}
                            disabled={updatingId === b.id}
                            title="Cancel booking">
                            <i className="bi bi-x-lg" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
                    <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                    No bookings match your filters
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {viewBooking && (
        <Modal title="Booking Details" onClose={() => setViewBooking(null)}>
          <div className="modal-body">
            {/* Status banner */}
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 20,
              background: viewBooking.status === 'confirmed' ? 'var(--accent-light)' : 'var(--gray-50)',
              border: `1px solid ${statusColor[viewBooking.status] || 'var(--gray-200)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Booking Status</div>
              <span className={`badge ${statusBadge[viewBooking.status] || 'badge-gray'}`} style={{ fontSize: 13 }}>
                {viewBooking.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Student', viewBooking.student_name,      'bi-person'],
                ['Reg No.', viewBooking.student_reg,       'bi-hash'],
                ['Hostel',  viewBooking.hostel_name,       'bi-building'],
                ['Room',    viewBooking.room_number,       'bi-door-open'],
                ['Bed',     viewBooking.bed_number,        'bi-bounding-box'],
                ['Year',    viewBooking.academic_year_name,'bi-calendar3'],
                ['Amount',  `KES ${parseFloat(viewBooking.amount || 0).toLocaleString()}`, 'bi-cash-stack'],
                ['Applied', viewBooking.applied_at ? new Date(viewBooking.applied_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', 'bi-clock'],
              ].map(([label, val, icon]) => (
                <div key={label} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    <i className={`bi ${icon}`} style={{ marginRight: 4 }} />{label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--gray-900)' }}>{val || '—'}</div>
                </div>
              ))}
            </div>

            {/* Payment info */}
            {viewBooking.payment && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: viewBooking.payment.status === 'success' ? 'var(--accent-light)' : 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="bi bi-phone" style={{ color: 'var(--accent)' }} /> M-Pesa Payment
                  {viewBooking.payment.is_dev_bypass && <span className="badge badge-warning">Dev Bypass</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  {[
                    ['Phone', viewBooking.payment.phone_number],
                    ['Receipt', viewBooking.payment.mpesa_receipt_number || '—'],
                    ['Pay Status', viewBooking.payment.status],
                    ['Description', viewBooking.payment.result_description || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span style={{ color: 'var(--gray-400)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</span>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setViewBooking(null)}>Close</button>
            {viewBooking.status === 'payment_initiated' && (
              <button className="btn btn-success" onClick={() => { handleConfirmBooking(viewBooking); setViewBooking(null); }}>
                <i className="bi bi-check-circle" /> Confirm Manually
              </button>
            )}
            {['confirmed', 'pending', 'payment_initiated'].includes(viewBooking.status) && (
              <button className="btn btn-danger" onClick={() => { handleCancelBooking(viewBooking); setViewBooking(null); }}>
                <i className="bi bi-x-circle" /> Cancel Booking
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}