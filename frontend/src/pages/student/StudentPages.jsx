// ── MyBooking ──────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export function MyBooking() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/my-bookings/').then(({ data }) => {
      setBookings(data.results || data);
    }).finally(() => setLoading(false));
  }, []);

  const statusBadge = { confirmed: 'badge-success', pending: 'badge-warning', payment_initiated: 'badge-info', cancelled: 'badge-danger', expired: 'badge-gray' };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  const current = bookings.find(b => ['confirmed', 'payment_initiated', 'pending'].includes(b.status));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Booking</h1>
          <p>View your current and past booking records</p>
        </div>
        {!current && (
          <button className="btn btn-primary" onClick={() => navigate('/student/book')}>
            <i className="bi bi-plus-circle" /> New Booking
          </button>
        )}
      </div>

      {current && (
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-light), #dbeafe)',
          border: '1px solid #bfdbfe', borderRadius: 'var(--radius-xl)', padding: '24px 28px', marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontWeight: 800, fontSize: 17 }}>Current Academic Year Booking</h2>
            <span className={`badge ${statusBadge[current.status] || 'badge-gray'}`}>
              {current.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { icon: 'bi-building', label: 'Hostel', val: current.hostel_name },
              { icon: 'bi-door-open', label: 'Room', val: current.room_number },
              { icon: 'bi-bounding-box', label: 'Bed', val: current.bed_number },
              { icon: 'bi-calendar3', label: 'Year', val: current.academic_year_name },
              { icon: 'bi-cash-stack', label: 'Amount', val: `KES ${parseFloat(current.amount || 0).toLocaleString()}` },
            ].map(({ icon, label, val }) => (
              <div key={label} style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  <i className={`bi ${icon}`} style={{ marginRight: 4 }} />{label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gray-900)' }}>{val}</div>
              </div>
            ))}
          </div>
          {current.payment?.mpesa_receipt_number && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'white', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-receipt-cutoff" style={{ color: 'var(--accent)' }} />
              M-Pesa Receipt: <strong style={{ fontFamily: 'var(--font-mono)' }}>{current.payment.mpesa_receipt_number}</strong>
              {current.payment.is_dev_bypass && <span className="badge badge-warning" style={{ marginLeft: 4 }}>Dev</span>}
            </div>
          )}
        </div>
      )}

      {/* All bookings table */}
      {bookings.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>Booking History</h2></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Hostel</th>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td className="text-mono">{b.academic_year_name}</td>
                    <td>{b.hostel_name}</td>
                    <td className="text-mono">{b.room_number}</td>
                    <td className="text-mono">{b.bed_number}</td>
                    <td>KES {parseFloat(b.amount || 0).toLocaleString()}</td>
                    <td><span className={`badge ${statusBadge[b.status] || 'badge-gray'}`}>{b.status.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(b.applied_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <i className="bi bi-bookmark" />
              <h3>No Bookings Yet</h3>
              <p>You haven't made any hostel bookings.</p>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate('/student/book')}>
                Book a Bed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MyHistory ──────────────────────────────────────────────────
export function MyHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/my-history/').then(({ data }) => setHistory(data.results || data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Occupancy History</h1>
          <p>All your past hostel allocations across every academic year</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <i className="bi bi-archive" />
          <h3>No History Found</h3>
          <p>Your past hostel records will appear here once you have completed at least one year.</p>
        </div></div></div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Hostel</th>
                  <th>Room No.</th>
                  <th>Bed No.</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td><span className="badge badge-primary">{h.academic_year_name}</span></td>
                    <td style={{ fontWeight: 600 }}>{h.hostel_name}</td>
                    <td className="text-mono">{h.room_number}</td>
                    <td className="text-mono">{h.bed_number}</td>
                    <td style={{ fontSize: 13 }}>{h.check_in ? new Date(h.check_in).toLocaleDateString() : '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>{h.check_out ? new Date(h.check_out).toLocaleDateString() : 'Current'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChangePassword ─────────────────────────────────────────────
export function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const isFirst = new URLSearchParams(window.location.search).get('first') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (form.new_password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/change-password/', form);
      setSuccess(true);
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {isFirst && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-shield-exclamation" />
          <div><strong>Security Notice:</strong> You are using a default password. Please set a new secure password.</div>
        </div>
      )}
      <div className="card">
        <div className="card-header"><h2><i className="bi bi-key" style={{ marginRight: 8 }} />Change Password</h2></div>
        <div className="card-body">
          {success ? (
            <div className="alert alert-success">
              <i className="bi bi-check-circle-fill" />
              Password changed successfully! Redirecting...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger mb-4"><i className="bi bi-x-circle" />{error}</div>}
              {[
                { key: 'old_password', label: isFirst ? 'Current (Default) Password' : 'Current Password', hint: isFirst ? 'Enter your DDMMYYYY birth date' : '' },
                { key: 'new_password', label: 'New Password', hint: 'Minimum 8 characters' },
                { key: 'confirm_password', label: 'Confirm New Password' },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-control" type="password" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
                  {f.hint && <p className="form-hint">{f.hint}</p>}
                </div>
              ))}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StudentProfile ─────────────────────────────────────────────
export function StudentProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get('/students/my-profile/').then(({ data }) => setProfile(data));
  }, []);

  if (!profile) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 'var(--radius-xl)',
              background: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, flexShrink: 0
            }}>
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>{profile.full_name}</h2>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{profile.reg_number}</p>
              <span className={`badge ${profile.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 8 }}>{profile.status}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Gender', value: profile.gender === 'M' ? 'Male' : 'Female', icon: 'bi-person' },
              { label: 'Course', value: profile.course_name, icon: 'bi-mortarboard' },
              { label: 'Year & Semester', value: `Year ${profile.current_year}, Semester ${profile.current_semester}`, icon: 'bi-calendar' },
              { label: 'Admission', value: profile.admission_year, icon: 'bi-calendar-check' },
              { label: 'Phone', value: profile.phone, icon: 'bi-phone' },
              { label: 'Email', value: profile.email, icon: 'bi-envelope' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  <i className={`bi ${icon}`} style={{ marginRight: 4 }} />{label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EligibilityPage ────────────────────────────────────────────
export function EligibilityPage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/students/my-eligibility/').then(({ d }) => setData(d)).catch(() => {});
    api.get('/students/my-eligibility/').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '48px 36px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: data.eligible ? 'var(--accent-light)' : 'var(--danger-light)',
            color: data.eligible ? 'var(--accent)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32
          }}>
            <i className={`bi ${data.eligible ? 'bi-shield-check' : 'bi-shield-x'}`} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
            {data.eligible ? 'You Are Eligible' : 'Not Eligible'}
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
            {data.eligibility_message}
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            {[
              { label: 'Academic Year', value: data.current_academic_year?.name },
              { label: 'Level', value: `Y${data.current_year} S${data.current_semester}` },
              { label: 'Status', value: data.status },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '12px 20px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', minWidth: 120 }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-mono)' }}>{value}</div>
              </div>
            ))}
          </div>

          {data.eligible && !data.existing_booking && (
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/student/book')}>
              <i className="bi bi-calendar-plus" /> Book a Bed
            </button>
          )}
          {data.existing_booking && (
            <button className="btn btn-outline" onClick={() => navigate('/student/my-booking')}>
              <i className="bi bi-bookmark-check" /> View My Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}