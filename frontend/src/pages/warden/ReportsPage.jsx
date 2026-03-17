import { useState, useEffect } from 'react';
import api from '../../utils/api';

function exportCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [stats, setStats]       = useState(null);
  const [hostels, setHostels]   = useState([]);
  const [years, setYears]       = useState([]);
  const [selYear, setSelYear]   = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    api.get('/warden-dashboard/stats/').then(({ data }) => setStats(data));
    api.get('/academic-years/').then(({ data }) => {
      const list = data.results || data;
      setYears(list);
      const cur = list.find(y => y.is_current);
      if (cur) setSelYear(cur.name);
    });
    api.get('/hostels/').then(({ data }) => setHostels(data.results || data));
  }, []);

  const handleExportBookings = async () => {
    setExporting('bookings');
    try {
      let url = '/warden-dashboard/all-bookings/';
      if (selYear) url += `?year=${selYear}`;
      const { data } = await api.get(url);
      const rows = (data.results || data).map(b => [
        b.student_reg, b.student_name, b.hostel_name, b.room_number,
        b.bed_number, b.academic_year_name, b.amount, b.status,
        b.applied_at ? new Date(b.applied_at).toLocaleDateString() : '',
        b.payment?.mpesa_receipt_number || '',
      ]);
      exportCSV(
        `bookings_${selYear || 'all'}.csv`,
        ['Reg No', 'Name', 'Hostel', 'Room', 'Bed', 'Year', 'Amount', 'Status', 'Applied', 'Receipt'],
        rows
      );
    } finally { setExporting(''); }
  };

  const handleExportHistory = async () => {
    setExporting('history');
    try {
      let url = '/warden-dashboard/room-history/';
      if (selYear) url += `?year=${selYear}`;
      const { data } = await api.get(url);
      const rows = (data.results || data).map(h => [
        h.student_reg, h.student_name, h.hostel_name, h.room_number,
        h.bed_number, h.academic_year_name, h.check_in || '', h.check_out || 'Current'
      ]);
      exportCSV(
        `occupancy_history_${selYear || 'all'}.csv`,
        ['Reg No', 'Name', 'Hostel', 'Room', 'Bed', 'Year', 'Check In', 'Check Out'],
        rows
      );
    } finally { setExporting(''); }
  };

  const handleExportStudents = async () => {
    setExporting('students');
    try {
      const { data } = await api.get('/students/');
      const rows = (data.results || data).map(s => [
        s.reg_number, s.full_name, s.gender === 'M' ? 'Male' : 'Female',
        s.date_of_birth, s.phone, s.email, s.course_name,
        s.current_year, s.current_semester, s.status, s.admission_year
      ]);
      exportCSV(
        'students.csv',
        ['Reg No', 'Full Name', 'Gender', 'DOB', 'Phone', 'Email', 'Course', 'Year', 'Semester', 'Status', 'Admission Year'],
        rows
      );
    } finally { setExporting(''); }
  };

  const handleExportHostelSummary = async () => {
    setExporting('hostel');
    try {
      const { data } = await api.get('/hostels/');
      const rows = (data.results || data).map(h => [
        h.code, h.name, h.gender === 'M' ? 'Boys' : 'Girls',
        h.total_floors, h.total_beds, h.occupied_beds || (h.total_beds - h.available_beds),
        h.available_beds, h.monthly_fee, h.has_kitchen ? 'Yes' : 'No',
        h.has_toilet ? 'Yes' : 'No', h.is_active ? 'Active' : 'Inactive'
      ]);
      exportCSV(
        'hostels_summary.csv',
        ['Code', 'Name', 'Gender', 'Floors', 'Total Beds', 'Occupied', 'Available', 'Fee', 'Kitchen', 'En-Suite', 'Status'],
        rows
      );
    } finally { setExporting(''); }
  };

  const exportCards = [
    {
      key: 'bookings',
      icon: 'bi-file-earmark-spreadsheet',
      title: 'Bookings Report',
      desc: `All booking applications${selYear ? ` for ${selYear}` : ''}  with payment receipts`,
      color: 'var(--primary)',
      bg: 'var(--primary-light)',
      action: handleExportBookings,
    },
    {
      key: 'history',
      icon: 'bi-file-earmark-person',
      title: 'Occupancy History',
      desc: `Per-bed allocation history${selYear ? ` for ${selYear}` : ''} across all hostels`,
      color: 'var(--accent)',
      bg: 'var(--accent-light)',
      action: handleExportHistory,
    },
    {
      key: 'students',
      icon: 'bi-file-earmark-people',
      title: 'Students List',
      desc: 'Full student directory with course and contact details',
      color: 'var(--warning)',
      bg: 'var(--warning-light)',
      action: handleExportStudents,
    },
    {
      key: 'hostel',
      icon: 'bi-file-earmark-bar-graph',
      title: 'Hostel Summary',
      desc: 'Bed capacity, occupancy counts and fees per hostel',
      color: '#8b5cf6',
      bg: '#ede9fe',
      action: handleExportHostelSummary,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports</h1>
          <p>Statistics overview and downloadable CSV reports</p>
        </div>
      </div>

      {/* Live stats */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          {[
            { icon: 'bi-bounding-box',        label: 'Total Beds',        val: stats.total_beds,         cls: 'blue'  },
            { icon: 'bi-person-fill',          label: 'Occupied',          val: stats.occupied_beds,      cls: 'red'   },
            { icon: 'bi-bounding-box-circles', label: 'Available',         val: stats.available_beds,     cls: 'green' },
            { icon: 'bi-percent',              label: 'Occupancy Rate',    val: `${stats.occupancy_rate}%`, cls: 'blue'},
            { icon: 'bi-bookmark-check',       label: 'Confirmed',         val: stats.confirmed_bookings, cls: 'green' },
            { icon: 'bi-hourglass-split',      label: 'Pending Payment',   val: stats.pending_bookings,   cls: 'amber' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}><i className={`bi ${s.icon}`} /></div>
              <div className="stat-info">
                <div className="stat-value">{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Occupancy progress per hostel */}
      <div className="card mb-6">
        <div className="card-header">
          <h2><i className="bi bi-bar-chart-line" style={{ marginRight: 8 }} />Occupancy by Hostel</h2>
        </div>
        <div className="card-body">
          {hostels.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 20 }}>No hostel data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {hostels.map(h => {
                const total    = h.total_beds || 0;
                const occupied = total - (h.available_beds || 0);
                const pct      = total > 0 ? Math.round((occupied / total) * 100) : 0;
                const barColor = pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--accent)';
                return (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{h.name}</span>
                        <span className={`badge ${h.gender === 'M' ? 'badge-info' : 'badge-primary'}`} style={{ fontSize: 11 }}>
                          {h.gender === 'M' ? 'Boys' : 'Girls'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: 'var(--gray-500)' }}>
                        <span style={{ color: barColor, fontWeight: 700 }}>{pct}%</span>
                        <span>{occupied} / {total} beds</span>
                        <span style={{ color: 'var(--accent)' }}>{h.available_beds} free</span>
                      </div>
                    </div>
                    <div style={{ height: 10, background: 'var(--gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Export section */}
      <div className="card">
        <div className="card-header">
          <h2><i className="bi bi-download" style={{ marginRight: 8 }} />Export Reports (CSV)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Year:</span>
            <select className="form-control" style={{ width: 160, padding: '7px 12px', fontSize: 13 }}
              value={selYear} onChange={e => setSelYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {exportCards.map(card => (
              <div key={card.key} style={{
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)',
                padding: '20px', transition: 'all 200ms', cursor: 'pointer',
                background: 'var(--white)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.background = card.bg; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = 'var(--white)'; }}
                onClick={card.action}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    <i className={`bi ${card.icon}`} />
                  </div>
                  {exporting === card.key
                    ? <span className="spinner" />
                    : <i className="bi bi-download" style={{ color: 'var(--gray-400)', fontSize: 18 }} />
                  }
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{card.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-500)', lineHeight: 1.5 }}>{card.desc}</div>
                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: card.color }}>
                    <i className="bi bi-filetype-csv" style={{ marginRight: 4 }} />Download CSV
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--gray-400)' }}>
            <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
            Reports are generated from live data. Select a specific year to filter results before downloading.
          </p>
        </div>
      </div>
    </div>
  );
}