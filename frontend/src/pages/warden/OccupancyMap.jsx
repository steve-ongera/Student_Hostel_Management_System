import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useBedSocket } from '../../hooks/useBedSocket';

export default function OccupancyMap() {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [bedStatuses, setBedStatuses] = useState({});
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filterYear, setFilterYear] = useState('');

  useBedSocket((msg) => {
    if (['bed_locked', 'bed_unlocked', 'bed_occupied'].includes(msg.type)) {
      setBedStatuses(prev => ({
        ...prev,
        [msg.bed_id]: msg.type === 'bed_locked' ? 'locked'
          : msg.type === 'bed_occupied' ? 'occupied' : 'available',
      }));
    }
  });

  useEffect(() => {
    Promise.all([
      api.get('/warden-dashboard/occupancy-matrix/'),
      api.get('/academic-years/'),
    ]).then(([m, y]) => {
      setMatrix(m.data);
      if (m.data.length) setSelectedHostel(m.data[0].id);
      setAcademicYears(y.data.results || y.data);
    }).finally(() => setLoading(false));
  }, []);

  const openHistory = async (bed) => {
    setHistoryModal(bed);
    const params = filterYear ? `?bed_number=${bed.bed_number}` : '';
    const { data } = await api.get(`/warden-dashboard/room-history/?bed_number=${bed.bed_number}${filterYear ? `&year=${filterYear}` : ''}`);
    setHistoryData(data);
  };

  const statusColor = {
    available: 'var(--bed-available)',
    occupied: 'var(--bed-occupied)',
    locked: 'var(--bed-locked)',
    maintenance: 'var(--bed-maintenance)',
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  const hostel = matrix.find(h => h.id === selectedHostel);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Live Occupancy Map</h1>
          <p>Real-time bed status across all hostels. Click any bed to view its history.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Live</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(statusColor).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: c, opacity: 0.85 }} />
            <span style={{ color: 'var(--gray-600)', textTransform: 'capitalize' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Hostel Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {matrix.map(h => (
          <button
            key={h.id}
            onClick={() => setSelectedHostel(h.id)}
            className={`btn ${selectedHostel === h.id ? 'btn-primary' : 'btn-outline'} btn-sm`}
          >
            <i className={`bi bi-building${h.gender === 'M' ? '' : '-fill'}`} />
            {h.name}
          </button>
        ))}
      </div>

      {hostel && hostel.floors.map(floor => (
        <div key={floor.floor} className="floor-section">
          <div className="floor-label">
            <i className="bi bi-layers" /> Floor {floor.floor}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {floor.rooms.map(room => (
              <div key={room.room_id} style={{
                background: 'var(--white)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-lg)', padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                    Room {room.room_number}
                  </span>
                  <span className={`badge ${room.available > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {room.available}/{room.capacity} free
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
                  {room.beds.map(bed => {
                    const liveStatus = bedStatuses[bed.id] || bed.status;
                    return (
                      <div
                        key={bed.id}
                        onClick={() => openHistory({ ...bed, room_number: room.room_number, hostel_name: hostel.name })}
                        title={`Bed ${bed.bed_number} — ${liveStatus}${bed.current_occupant ? `\n${bed.current_occupant.full_name}` : ''}`}
                        style={{
                          padding: '10px 6px', borderRadius: 'var(--radius-md)',
                          border: `2px solid ${statusColor[liveStatus] || 'var(--gray-200)'}`,
                          background: liveStatus === 'occupied' ? 'var(--danger-light)'
                            : liveStatus === 'locked' ? 'var(--warning-light)'
                            : liveStatus === 'available' ? 'var(--accent-light)' : 'var(--gray-100)',
                          cursor: 'pointer', textAlign: 'center', transition: 'all 200ms',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ fontSize: 18 }}>🛏️</div>
                        <div style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                          {bed.bed_number}
                        </div>
                        {bed.current_occupant && (
                          <div style={{ fontSize: 9, color: 'var(--gray-500)', marginTop: 2, lineHeight: 1.2 }}>
                            {bed.current_occupant.full_name?.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bed History Modal */}
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="bi bi-clock-history" style={{ marginRight: 8 }} />
                Bed {historyModal.bed_number} — Room {historyModal.room_number}
              </h3>
              <button className="modal-close" onClick={() => setHistoryModal(null)}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Filter by Academic Year</label>
                <select className="form-control" value={filterYear} onChange={e => {
                  setFilterYear(e.target.value);
                  openHistory({ ...historyModal });
                }}>
                  <option value="">All Years</option>
                  {academicYears.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
                </select>
              </div>
              {historyData.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <i className="bi bi-person-x" />
                  <h3>No Records</h3>
                  <p>No occupancy history for this bed.</p>
                </div>
              ) : (
                <div>
                  {historyData.map(h => (
                    <div key={h.id} style={{
                      padding: '12px 0', borderBottom: '1px solid var(--gray-100)',
                      display: 'flex', gap: 14, alignItems: 'center'
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
                      }}>
                        <i className="bi bi-person" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>{h.student_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>{h.student_reg}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="badge badge-primary">{h.academic_year_name}</span>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                          {h.check_in} – {h.check_out || 'Present'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}