import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function WardenDashboard() {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/warden-dashboard/stats/'),
      api.get('/warden-dashboard/all-bookings/'),
    ]).then(([s, b]) => {
      setStats(s.data);
      setRecentBookings((b.data.results || b.data).slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  const statusBadge = { confirmed: 'badge-success', pending: 'badge-warning', payment_initiated: 'badge-info', cancelled: 'badge-danger' };

  return (
    <div>
      {/* Stats */}
      <div className="stat-grid">
        {[
          { icon: 'bi-bounding-box', label: 'Total Beds', value: stats?.total_beds, cls: 'blue' },
          { icon: 'bi-person-check', label: 'Occupied', value: stats?.occupied_beds, cls: 'red' },
          { icon: 'bi-bounding-box-circles', label: 'Available', value: stats?.available_beds, cls: 'green' },
          { icon: 'bi-bookmark-check', label: 'Confirmed Bookings', value: stats?.confirmed_bookings, cls: 'green' },
          { icon: 'bi-hourglass-split', label: 'Pending Payments', value: stats?.pending_bookings, cls: 'amber' },
          { icon: 'bi-percent', label: 'Occupancy Rate', value: `${stats?.occupancy_rate || 0}%`, cls: 'blue' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.cls}`}><i className={`bi ${s.icon}`} /></div>
            <div className="stat-info">
              <div className="stat-value">{s.value ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy Rate Bar */}
      <div className="card mb-4">
        <div className="card-header">
          <h2><i className="bi bi-bar-chart-line" style={{ marginRight: 8 }} />
            Overall Occupancy — {stats?.current_academic_year}
          </h2>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{stats?.occupancy_rate}%</span>
        </div>
        <div className="card-body">
          <div style={{ height: 18, background: 'var(--gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
              height: '100%', borderRadius: 'var(--radius-full)',
              background: stats?.occupancy_rate > 80 ? 'var(--danger)' : stats?.occupancy_rate > 50 ? 'var(--warning)' : 'var(--accent)',
              width: `${stats?.occupancy_rate || 0}%`, transition: 'width 0.8s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--gray-500)' }}>
            <span>0 beds occupied</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{stats?.available_beds} beds available</span>
            <span>{stats?.total_beds} total beds</span>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="card-header">
          <h2><i className="bi bi-list-check" style={{ marginRight: 8 }} />Recent Bookings</h2>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Reg No.</th>
                <th>Hostel</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.student_name}</td>
                  <td className="text-mono text-sm">{b.student_reg}</td>
                  <td>{b.hostel_name}</td>
                  <td className="text-mono">{b.room_number}</td>
                  <td className="text-mono">{b.bed_number}</td>
                  <td>KES {parseFloat(b.amount || 0).toLocaleString()}</td>
                  <td><span className={`badge ${statusBadge[b.status] || 'badge-gray'}`}>{b.status.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(b.applied_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}