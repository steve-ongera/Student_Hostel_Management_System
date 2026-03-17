import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [eligibility, setEligibility] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/students/my-eligibility/'),
      api.get('/students/my-bookings/'),
      api.get('/students/my-history/'),
    ]).then(([elig, book, hist]) => {
      setEligibility(elig.data);
      setBookings(book.data.results || book.data);
      setHistory(hist.data.results || hist.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const currentBooking = bookings.find(b =>
    b.academic_year_name === eligibility?.current_academic_year?.name
  );

  const statusColor = {
    confirmed: 'badge-success',
    pending: 'badge-warning',
    payment_initiated: 'badge-info',
    cancelled: 'badge-danger',
    expired: 'badge-gray',
  };

  if (loading) return (
    <div className="loading-overlay" style={{ position: 'relative', height: 300 }}>
      <span className="spinner" />
    </div>
  );

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        borderRadius: 'var(--radius-xl)', padding: '28px 32px',
        color: 'white', marginBottom: 24, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)'
        }} />
        <div style={{
          position: 'absolute', right: 40, bottom: -50, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)'
        }} />
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 4 }}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p style={{ fontSize: 13.5, opacity: 0.8 }}>
            {user?.reg_number} &nbsp;·&nbsp; Year {user?.current_year || '—'}, Semester {user?.current_semester || '—'}
            &nbsp;·&nbsp; {eligibility?.current_academic_year?.name || '—'}
          </p>
        </div>
      </div>

      {/* Force password change warning */}
      {user?.must_change_password && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle-fill" />
          <div>
            <strong>Action Required:</strong> Please change your default password to secure your account.
            <button className="btn btn-sm btn-outline" style={{ marginLeft: 12 }} onClick={() => navigate('/student/change-password')}>
              Change Now
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className={`stat-icon ${eligibility?.eligible ? 'green' : 'red'}`}>
            <i className={`bi ${eligibility?.eligible ? 'bi-shield-check' : 'bi-shield-x'}`} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{eligibility?.eligible ? 'Yes' : 'No'}</div>
            <div className="stat-label">Hostel Eligible</div>
          </div>
        </div>

        <div className="stat-card">
          <div className={`stat-icon ${currentBooking?.status === 'confirmed' ? 'green' : 'amber'}`}>
            <i className="bi bi-bookmark-check" />
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: 18 }}>
              {currentBooking ? currentBooking.status.replace('_', ' ') : 'None'}
            </div>
            <div className="stat-label">Current Booking</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <i className="bi bi-calendar-check" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{history.length}</div>
            <div className="stat-label">Years Hosted</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <i className="bi bi-mortarboard" />
          </div>
          <div className="stat-info">
            <div className="stat-value">Y{user?.current_year || '?'}S{user?.current_semester || '?'}</div>
            <div className="stat-label">Current Level</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Current Booking Card */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-bookmark-star" style={{ marginRight: 8 }} />Current Booking</h2>
            {eligibility?.eligible && !currentBooking && (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/student/book')}>
                <i className="bi bi-plus" /> Book Now
              </button>
            )}
          </div>
          <div className="card-body">
            {currentBooking ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                  {[
                    { label: 'Hostel', value: currentBooking.hostel_name, icon: 'bi-building' },
                    { label: 'Room', value: currentBooking.room_number, icon: 'bi-door-open' },
                    { label: 'Bed', value: currentBooking.bed_number, icon: 'bi-bounding-box' },
                    { label: 'Academic Year', value: currentBooking.academic_year_name, icon: 'bi-calendar3' },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: '12px 14px', background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)'
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                        <i className={`bi ${item.icon}`} style={{ marginRight: 4 }} />{item.label}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', fontFamily: 'var(--font-mono)' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`badge ${statusColor[currentBooking.status] || 'badge-gray'}`}>
                    <i className="bi bi-circle-fill" style={{ fontSize: 7 }} />
                    {currentBooking.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                    KES {parseFloat(currentBooking.amount || 0).toLocaleString()}
                  </span>
                </div>
                {currentBooking.payment?.mpesa_receipt_number && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: '#065f46' }}>
                    <i className="bi bi-receipt" style={{ marginRight: 6 }} />
                    M-Pesa: {currentBooking.payment.mpesa_receipt_number}
                    {currentBooking.payment.is_dev_bypass && ' (Dev Mode)'}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <i className="bi bi-bookmark" />
                <h3>No Active Booking</h3>
                <p>{eligibility?.eligible
                  ? 'You are eligible. Click "Book Now" to reserve your bed.'
                  : eligibility?.eligibility_message
                }</p>
                {eligibility?.eligible && (
                  <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate('/student/book')}>
                    <i className="bi bi-plus-circle" /> Book a Bed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Occupancy History Preview */}
        <div className="card">
          <div className="card-header">
            <h2><i className="bi bi-clock-history" style={{ marginRight: 8 }} />Past Occupancy</h2>
            {history.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/student/history')}>View All</button>
            )}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {history.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-archive" />
                <h3>No History Yet</h3>
                <p>Your past hostel occupancy will appear here.</p>
              </div>
            ) : (
              <div>
                {history.slice(0, 5).map((h, i) => (
                  <div key={h.id} style={{
                    padding: '14px 20px', borderBottom: i < history.length - 1 ? '1px solid var(--gray-100)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 14
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0
                    }}>
                      <i className="bi bi-building" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--gray-900)' }}>{h.hostel_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
                        Rm {h.room_number} · Bed {h.bed_number}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>{h.academic_year_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}