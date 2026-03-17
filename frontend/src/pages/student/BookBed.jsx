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
  const timerRef = useRef(null);

  // Real-time WebSocket bed updates
  useBedSocket((msg) => {
    if (msg.type === 'bed_locked' || msg.type === 'bed_unlocked' || msg.type === 'bed_occupied') {
      setBedStatuses(prev => ({
        ...prev,
        [msg.bed_id]: msg.type === 'bed_locked' ? 'locked'
          : msg.type === 'bed_occupied' ? 'occupied' : 'available',
      }));
    }
  });

  useEffect(() => {
    api.get('/students/my-eligibility/').then(({ data }) => {
      setEligibility(data);
      if (!data.eligible) return;
      if (data.existing_booking?.status === 'confirmed') return;
      api.get('/hostels/available-for-student/').then(r => setHostels(r.data.results || r.data));
    });
    return () => { clearInterval(timerRef.current); };
  }, []);

  // Countdown timer for bed lock
  useEffect(() => {
    if (selectedBed && step === 2) {
      setLockTimer(180);
      timerRef.current = setInterval(() => {
        setLockTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            // Lock expired, unlock & go back
            api.post(`/beds/${selectedBed.id}/unlock/`).catch(() => {});
            setSelectedBed(null);
            setError('Your bed lock has expired. Please select again.');
            setStep(2);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [selectedBed, step]);

  const selectHostel = async (hostel) => {
    setSelectedHostel(hostel);
    setLoading(true);
    const { data } = await api.get(`/hostels/${hostel.id}/rooms-with-availability/`);
    setRooms(data);
    setLoading(false);
    setStep(1);
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    setStep(2);
  };

  const selectBed = async (bed) => {
    if (bed.status !== 'available') return;
    setError('');
    setLoading(true);
    try {
      await api.post(`/beds/${bed.id}/lock/`);
      setSelectedBed(bed);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not lock this bed. Please try another.');
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
    setLoading(true);
    try {
      const { data } = await api.post('/bookings/apply/', {
        bed_id: selectedBed.id,
        phone_number: phone.startsWith('0') ? '254' + phone.slice(1) : phone.replace('+', ''),
      });
      clearInterval(timerRef.current);
      setBookingResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Booking Success ─────────────────────────────────────────────
  if (bookingResult) {
    const b = bookingResult.booking;
    const isDev = bookingResult.payment?.is_dev_bypass;
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          background: isDev ? 'var(--warning-light)' : 'var(--accent-light)',
          border: `1px solid ${isDev ? '#fcd34d' : '#6ee7b7'}`,
          borderRadius: 'var(--radius-xl)', padding: '36px', textAlign: 'center'
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
              ['Hostel', b.hostel_name],
              ['Room', b.room_number],
              ['Bed', b.bed_number],
              ['Academic Year', b.academic_year_name],
              ['Amount', `KES ${parseFloat(b.amount).toLocaleString()}`],
              ['Receipt', bookingResult.payment?.mpesa_receipt_number || '—'],
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

  if (!eligibility) return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>;
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
        <button className="btn btn-primary" onClick={() => navigate('/student/my-booking')}>View Booking</button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 0 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: i > step ? 0.4 : 1,
            }}>
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

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-circle-fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 0: Choose Hostel */}
      {step === 0 && (
        <div>
          <div className="page-header-left mb-4">
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--gray-900)' }}>Available Hostels</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Showing {eligibility.current_academic_year?.name} • {hostels.length} hostels available for your gender</p>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div> : (
            <div className="hostel-grid">
              {hostels.map(h => {
                const occ = ((h.total_beds - h.available_beds) / h.total_beds) * 100;
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
                        {h.has_toilet && <span><i className="bi bi-droplet" /> En-suite</span>}
                      </div>
                      <div className="hostel-availability-bar">
                        <div
                          className={`hostel-availability-fill ${occ > 80 ? 'low' : occ > 50 ? 'medium' : ''}`}
                          style={{ width: `${100 - occ}%` }}
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
          )}
        </div>
      )}

      {/* Step 1: Choose Room */}
      {step === 1 && (
        <div>
          <button className="btn btn-outline btn-sm mb-4" onClick={() => setStep(0)}>
            <i className="bi bi-arrow-left" /> Back to Hostels
          </button>
          <div className="page-header-left mb-4">
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>{selectedHostel?.name} — Rooms</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Select a room with available beds</p>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div> : (
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
                    {r.has_toilet && <span><i className="bi bi-droplet" /> En-suite</span>}
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
                <div className="empty-state"><i className="bi bi-x-circle" /><h3>No Rooms Available</h3></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Choose Bed */}
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
                Locks are released automatically.
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap', fontSize: 12 }}>
                {[
                  { cls: 'available', label: 'Available' },
                  { cls: 'occupied', label: 'Occupied' },
                  { cls: 'locked', label: 'Locked (being booked)' },
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
                      className={`bed-card ${liveStatus}`}
                      onClick={() => liveStatus === 'available' && selectBed(b)}
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
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 3 && selectedBed && (
        <div style={{ maxWidth: 520 }}>
          <div className="card mb-4">
            <div className="card-header">
              <h2>Confirm Your Booking</h2>
              {lockTimer !== null && (
                <span className="timer-badge">
                  <i className="bi bi-clock" />
                  {fmt(lockTimer)}
                </span>
              )}
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 20 }}>
                {[
                  { label: 'Hostel', value: selectedHostel?.name, icon: 'bi-building' },
                  { label: 'Room No.', value: selectedRoom?.room_number, icon: 'bi-door-open' },
                  { label: 'Bed No.', value: selectedBed?.bed_number, icon: 'bi-bounding-box' },
                  { label: 'Amount', value: `KES ${parseFloat(selectedHostel?.monthly_fee || 0).toLocaleString()}`, icon: 'bi-cash-stack' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0', borderBottom: '1px solid var(--gray-100)'
                  }}>
                    <i className={`bi ${item.icon}`} style={{ color: 'var(--primary)', width: 20, textAlign: 'center' }} />
                    <span style={{ fontSize: 13, color: 'var(--gray-500)', flex: 1 }}>{item.label}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">M-Pesa Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    placeholder="e.g. 0712345678 or 254712345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ paddingLeft: 40 }}
                  />
                  <i className="bi bi-phone" style={{
                    position: 'absolute', left: 13, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--gray-400)'
                  }} />
                </div>
                <p className="form-hint">You will receive an STK Push prompt on this number.</p>
              </div>

              {import.meta.env.DEV && (
                <div style={{ padding: '10px 14px', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', fontSize: 12.5, color: '#92400e', marginBottom: 16, border: '1px solid #fcd34d' }}>
                  <i className="bi bi-tools" style={{ marginRight: 6 }} />
                  <strong>Dev Mode:</strong> Payment will be bypassed — no real M-Pesa charge.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    api.post(`/beds/${selectedBed.id}/unlock/`).catch(() => {});
                    setSelectedBed(null);
                    setStep(2);
                    clearInterval(timerRef.current);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleBook}
                  disabled={loading || !phone}
                >
                  {loading ? <span className="spinner" /> : <i className="bi bi-phone" />}
                  {loading ? 'Processing...' : 'Pay via M-Pesa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}