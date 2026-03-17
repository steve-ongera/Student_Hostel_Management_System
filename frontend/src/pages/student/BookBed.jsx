import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useBedSocket } from '../../hooks/useBedSocket';

const STEPS = ['Choose Hostel', 'Choose Room', 'Choose Bed', 'Confirm & Pay'];

export default function BookBed() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [eligibility, setEligibility] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockTimer, setLockTimer] = useState(null);
  const [bedStatuses, setBedStatuses] = useState({});
  const [bookingResult, setBookingResult] = useState(null);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null); // shows raw server error in dev
  const timerRef = useRef(null);

  // ── helpers ──────────────────────────────────────────────────
  const extractError = (err) => {
    const data = err.response?.data;
    if (!data) return `Network error (${err.message})`;
    if (typeof data === 'string') return data;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    // DRF field errors: { bed_id: ['...'], phone_number: ['...'] }
    const msgs = Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
      .join(' | ');
    return msgs || JSON.stringify(data);
  };

  // ── WebSocket live bed updates ────────────────────────────────
  useBedSocket((msg) => {
    if (['bed_locked', 'bed_unlocked', 'bed_occupied'].includes(msg.type)) {
      setBedStatuses(prev => ({
        ...prev,
        [msg.bed_id]:
          msg.type === 'bed_locked'   ? 'locked'
          : msg.type === 'bed_occupied' ? 'occupied'
          : 'available',
      }));
    }
  });

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    api.get('/students/my-eligibility/').then(({ data }) => {
      setEligibility(data);
      if (!data.eligible) return;
      if (data.existing_booking?.status === 'confirmed') return;
      api.get('/hostels/available-for-student/')
        .then(r => setHostels(r.data.results || r.data))
        .catch(err => setError('Could not load hostels: ' + extractError(err)));
    }).catch(err => setError('Could not load eligibility: ' + extractError(err)));

    return () => clearInterval(timerRef.current);
  }, []);

  // ── Bed-lock countdown ────────────────────────────────────────
  useEffect(() => {
    if (selectedBed && step === 3) {
      setLockTimer(180);
      timerRef.current = setInterval(() => {
        setLockTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            api.post(`/beds/${selectedBed.id}/unlock/`).catch(() => {});
            setSelectedBed(null);
            setError('Your bed lock expired. Please select a bed again.');
            setStep(2);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [selectedBed, step]);

  // ── Step handlers ─────────────────────────────────────────────
  const selectHostel = async (hostel) => {
    setError('');
    setSelectedHostel(hostel);
    setLoading(true);
    try {
      const { data } = await api.get(`/hostels/${hostel.id}/rooms-with-availability/`);
      setRooms(data);
      setStep(1);
    } catch (err) {
      setError('Could not load rooms: ' + extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    setStep(2);
  };

  const selectBed = async (bed) => {
    const liveStatus = bedStatuses[bed.id] || bed.status;
    if (liveStatus !== 'available') return;
    setError('');
    setLoading(true);
    try {
      await api.post(`/beds/${bed.id}/lock/`);
      // Refresh bed object with latest data
      setSelectedBed({ ...bed, status: 'locked' });
      setStep(3);
    } catch (err) {
      setError('Could not lock bed: ' + extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!phone.match(/^(?:254|\+254|0)\d{9}$/)) {
      setError('Please enter a valid Kenyan phone number (e.g. 0712345678)');
      return;
    }
    setError('');
    setDebugInfo(null);
    setLoading(true);

    const payload = {
      bed_id: selectedBed.id,
      phone_number: phone.startsWith('0')
        ? '254' + phone.slice(1)
        : phone.replace('+', ''),
    };

    console.log('[BookBed] POST /bookings/apply/ payload:', payload);

    try {
      const { data } = await api.post('/bookings/apply/', payload);
      console.log('[BookBed] apply success:', data);
      clearInterval(timerRef.current);
      setBookingResult(data);
    } catch (err) {
      console.error('[BookBed] apply error:', err.response?.status, err.response?.data);
      const msg = extractError(err);
      setError(msg);
      // Show raw response in dev for debugging
      if (import.meta.env.DEV) {
        setDebugInfo({
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelAndUnlock = () => {
    if (selectedBed) {
      api.post(`/beds/${selectedBed.id}/unlock/`).catch(() => {});
    }
    setSelectedBed(null);
    setStep(2);
    setError('');
    setDebugInfo(null);
    clearInterval(timerRef.current);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Booking success screen ────────────────────────────────────
  if (bookingResult) {
    const b = bookingResult.booking;
    const isDev = bookingResult.payment?.is_dev_bypass;
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          background: isDev ? 'var(--warning-light)' : 'var(--accent-light)',
          border: `1px solid ${isDev ? '#fcd34d' : '#6ee7b7'}`,
          borderRadius: 'var(--radius-xl)', padding: '36px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>{isDev ? '🛠️' : '🎉'}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>
            {isDev ? 'Booking Confirmed (Dev Mode)' : 'Booking Confirmed!'}
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 13.5, marginBottom: 24 }}>
            {isDev ? 'Payment bypassed in development mode.' : 'Payment received via M-Pesa.'}
          </p>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'left', marginBottom: 20 }}>
            {[
              ['Hostel',        b?.hostel_name],
              ['Room',          b?.room_number],
              ['Bed',           b?.bed_number],
              ['Academic Year', b?.academic_year_name],
              ['Amount',        `KES ${parseFloat(b?.amount || 0).toLocaleString()}`],
              ['Receipt',       bookingResult.payment?.mpesa_receipt_number || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{v}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/student/my-booking')}>
            <i className="bi bi-bookmark-check" /> View My Booking
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / eligibility guards ──────────────────────────────
  if (!eligibility) return (
    <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
  );

  if (!eligibility.eligible) return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="card-body" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Not Eligible</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 13.5 }}>{eligibility.eligibility_message}</p>
      </div>
    </div>
  );

  if (eligibility.existing_booking?.status === 'confirmed') return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="card-body" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Already Booked</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 13.5, marginBottom: 20 }}>
          You already have a confirmed booking for {eligibility.current_academic_year?.name}.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/student/my-booking')}>
          View Booking
        </button>
      </div>
    </div>
  );

  // ── Main booking flow ─────────────────────────────────────────
  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: i > step ? 0.4 : 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: i < step ? 'var(--accent)' : i === step ? 'var(--primary)' : 'var(--gray-200)',
                color: i <= step ? 'white' : 'var(--gray-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {i < step ? <i className="bi bi-check" /> : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--gray-900)' : 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < step ? 'var(--accent)' : 'var(--gray-200)', margin: '0 12px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-circle-fill" />
          <div style={{ flex: 1 }}>
            <strong>Error:</strong> {error}
          </div>
          <button onClick={() => { setError(''); setDebugInfo(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18 }}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* Dev debug panel */}
      {debugInfo && import.meta.env.DEV && (
        <div style={{
          background: '#1e1e2e', color: '#cdd6f4', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', marginBottom: 16, fontSize: 12,
          fontFamily: 'var(--font-mono)', overflowX: 'auto',
        }}>
          <div style={{ color: '#f38ba8', fontWeight: 700, marginBottom: 6 }}>
            🛠 DEBUG — Server responded {debugInfo.status}
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(debugInfo.data, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Step 0: Choose Hostel ── */}
      {step === 0 && (
        <div>
          <div className="page-header-left mb-4">
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>Available Hostels</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {eligibility.current_academic_year?.name} &nbsp;·&nbsp; {hostels.length} hostels for your gender
            </p>
          </div>
          {loading
            ? <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
            : hostels.length === 0
              ? (
                <div className="card"><div className="card-body">
                  <div className="empty-state">
                    <i className="bi bi-building-x" />
                    <h3>No Hostels Available</h3>
                    <p>There are no hostels with available beds matching your gender at the moment.</p>
                  </div>
                </div></div>
              )
              : (
                <div className="hostel-grid">
                  {hostels.map(h => {
                    const occ = h.total_beds > 0
                      ? ((h.total_beds - h.available_beds) / h.total_beds) * 100
                      : 0;
                    return (
                      <div key={h.id} className="hostel-card" onClick={() => selectHostel(h)}>
                        <div className="hostel-card-img">
                          <i className="bi bi-building-fill" />
                        </div>
                        <div className="hostel-card-body">
                          <div className="hostel-card-name">{h.name}</div>
                          <div className="hostel-card-meta">
                            <span><i className="bi bi-gender-ambiguous" /> {h.gender === 'M' ? 'Boys' : 'Girls'}</span>
                            {h.has_kitchen && <span><i className="bi bi-basket" /> Kitchen</span>}
                            {h.has_toilet  && <span><i className="bi bi-droplet" /> En-suite</span>}
                          </div>
                          <div className="hostel-availability-bar">
                            <div
                              className={`hostel-availability-fill ${occ > 80 ? 'low' : occ > 50 ? 'medium' : ''}`}
                              style={{ width: `${Math.max(2, 100 - occ)}%` }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{h.available_beds} beds free</span>
                            <span>KES {parseFloat(h.monthly_fee || 0).toLocaleString()}/sem</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          }
        </div>
      )}

      {/* ── Step 1: Choose Room ── */}
      {step === 1 && (
        <div>
          <button className="btn btn-outline btn-sm mb-4" onClick={() => setStep(0)}>
            <i className="bi bi-arrow-left" /> Back to Hostels
          </button>
          <div className="page-header-left mb-4">
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>{selectedHostel?.name} — Rooms</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Select a room with available beds</p>
          </div>
          {loading
            ? <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
            : (
              <div className="room-list">
                {rooms.filter(r => r.available_beds_count > 0).map(r => (
                  <div key={r.id} className="room-card" onClick={() => selectRoom(r)}>
                    <div className="room-card-header">
                      <span className="room-number">Room {r.room_number}</span>
                      <span className="badge badge-success">{r.available_beds_count} free</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: 'var(--gray-500)' }}>
                      <span><i className="bi bi-layers" /> Floor {r.floor}</span>
                      <span><i className="bi bi-bounding-box" /> {r.capacity} beds</span>
                      {r.has_toilet  && <span><i className="bi bi-droplet" /> En-suite</span>}
                      {r.has_kitchen && <span><i className="bi bi-basket" /> Kitchen</span>}
                    </div>
                    <div className="bed-grid" style={{ marginTop: 14 }}>
                      {r.beds.map(b => {
                        const liveStatus = bedStatuses[b.id] || b.status;
                        return (
                          <div key={b.id} className={`bed-card ${liveStatus}`}>
                            <span className="bed-icon">🛏️</span>
                            <div className="bed-label">Bed {b.bed_number}</div>
                            <div className="bed-status-text">{liveStatus}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {rooms.filter(r => r.available_beds_count > 0).length === 0 && (
                  <div className="empty-state">
                    <i className="bi bi-x-circle" />
                    <h3>No Rooms Available</h3>
                    <p>All rooms in this hostel are fully occupied.</p>
                  </div>
                )}
              </div>
            )
          }
        </div>
      )}

      {/* ── Step 2: Choose Bed ── */}
      {step === 2 && (
        <div style={{ maxWidth: 520 }}>
          <button className="btn btn-outline btn-sm mb-4" onClick={() => setStep(1)}>
            <i className="bi bi-arrow-left" /> Back to Rooms
          </button>
          <div className="card">
            <div className="card-header">
              <h2>Select Your Bed — Room {selectedRoom?.room_number}</h2>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 18, padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--primary-dark)' }}>
                <i className="bi bi-info-circle" style={{ marginRight: 6 }} />
                Click an available bed to lock it for 3 minutes while you complete payment.
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', fontSize: 12 }}>
                {[
                  { cls: 'available',   label: 'Available' },
                  { cls: 'occupied',    label: 'Occupied' },
                  { cls: 'locked',      label: 'Locked (being booked)' },
                  { cls: 'maintenance', label: 'Maintenance' },
                ].map(s => (
                  <div key={s.cls} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className={`bed-card ${s.cls}`} style={{ width: 20, height: 20, padding: 0, borderRadius: 4 }} />
                    <span style={{ color: 'var(--gray-500)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="bed-grid">
                {selectedRoom?.beds.map(b => {
                  const liveStatus = bedStatuses[b.id] || b.status;
                  return (
                    <div
                      key={b.id}
                      className={`bed-card ${liveStatus}${loading ? ' disabled' : ''}`}
                      onClick={() => !loading && liveStatus === 'available' && selectBed(b)}
                      style={{ cursor: liveStatus === 'available' ? 'pointer' : 'not-allowed' }}
                    >
                      <span className="bed-icon">🛏️</span>
                      <div className="bed-label">Bed {b.bed_number}</div>
                      <div className="bed-status-text">
                        {liveStatus === 'available' ? 'Click to select' : liveStatus}
                      </div>
                    </div>
                  );
                })}
              </div>
              {loading && (
                <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--gray-400)', fontSize: 13 }}>
                  <span className="spinner" style={{ marginRight: 8 }} />
                  Locking bed...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm & Pay ── */}
      {step === 3 && selectedBed && (
        <div style={{ maxWidth: 520 }}>
          <div className="card">
            <div className="card-header">
              <h2>Confirm Your Booking</h2>
              {lockTimer !== null && lockTimer > 0 && (
                <span className="timer-badge">
                  <i className="bi bi-clock" /> {fmt(lockTimer)}
                </span>
              )}
            </div>
            <div className="card-body">
              {/* Booking summary */}
              <div style={{ marginBottom: 20 }}>
                {[
                  { label: 'Hostel',   value: selectedHostel?.name,        icon: 'bi-building'   },
                  { label: 'Room No.', value: selectedRoom?.room_number,    icon: 'bi-door-open'  },
                  { label: 'Bed No.',  value: selectedBed?.bed_number,      icon: 'bi-bounding-box' },
                  { label: 'Amount',   value: `KES ${parseFloat(selectedHostel?.monthly_fee || 0).toLocaleString()}`, icon: 'bi-cash-stack' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderBottom: '1px solid var(--gray-100)',
                  }}>
                    <i className={`bi ${item.icon}`} style={{ color: 'var(--primary)', width: 20, textAlign: 'center' }} />
                    <span style={{ fontSize: 13, color: 'var(--gray-500)', flex: 1 }}>{item.label}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Phone input */}
              <div className="form-group">
                <label className="form-label">M-Pesa Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    placeholder="e.g. 0712345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ paddingLeft: 40 }}
                  />
                  <i className="bi bi-phone" style={{
                    position: 'absolute', left: 13, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--gray-400)',
                  }} />
                </div>
                <p className="form-hint">You will receive an M-Pesa STK Push prompt.</p>
              </div>

              {/* Dev mode notice */}
              {import.meta.env.DEV && (
                <div style={{ padding: '10px 14px', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', fontSize: 12.5, color: '#92400e', marginBottom: 16, border: '1px solid #fcd34d' }}>
                  <i className="bi bi-tools" style={{ marginRight: 6 }} />
                  <strong>Dev Mode:</strong> Payment will be bypassed — no real M-Pesa charge.
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={cancelAndUnlock} disabled={loading}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleBook}
                  disabled={loading || !phone.trim()}
                >
                  {loading
                    ? <><span className="spinner" /> Processing...</>
                    : <><i className="bi bi-phone" /> Pay via M-Pesa</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}