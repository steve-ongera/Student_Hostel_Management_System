import { useState, useEffect } from 'react';
import api from '../../utils/api';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="bi bi-exclamation-triangle" style={{ color: 'var(--danger)', marginRight: 8 }} />Confirm Delete</h3>
          <button className="modal-close" onClick={onCancel}><i className="bi bi-x" /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}><i className="bi bi-trash" /> Delete</button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_ROOM = { hostel: '', room_number: '', floor: 1, room_type: 'standard', capacity: 4, has_toilet: false, has_kitchen: false, is_active: true, notes: '' };
const EMPTY_BED  = { room: '', bed_number: '', status: 'available' };

export default function RoomsBedsPage() {
  const [hostels, setHostels]         = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [rooms, setRooms]             = useState([]);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [roomBeds, setRoomBeds]       = useState({});   // { roomId: [beds] }
  const [loading, setLoading]         = useState(false);

  // Room modal
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom]   = useState(null);
  const [roomForm, setRoomForm]         = useState(EMPTY_ROOM);
  const [roomError, setRoomError]       = useState('');
  const [savingRoom, setSavingRoom]     = useState(false);
  const [deleteRoom, setDeleteRoom]     = useState(null);

  // Bed modal
  const [showBedForm, setShowBedForm] = useState(false);
  const [editingBed, setEditingBed]   = useState(null);
  const [bedForm, setBedForm]         = useState(EMPTY_BED);
  const [bedError, setBedError]       = useState('');
  const [savingBed, setSavingBed]     = useState(false);
  const [deleteBed, setDeleteBed]     = useState(null);
  const [bedParentRoom, setBedParentRoom] = useState(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/hostels/').then(({ data }) => {
      const list = data.results || data;
      setHostels(list);
      if (list.length) setSelectedHostel(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedHostel) return;
    setLoading(true);
    api.get(`/rooms/?hostel=${selectedHostel}`).then(({ data }) => {
      setRooms(data.results || data);
    }).finally(() => setLoading(false));
  }, [selectedHostel]);

  const loadBeds = (roomId) => {
    if (roomBeds[roomId]) return;
    api.get(`/beds/?room=${roomId}`).then(({ data }) => {
      setRoomBeds(prev => ({ ...prev, [roomId]: data.results || data }));
    });
  };

  const toggleRoom = (room) => {
    if (expandedRoom === room.id) { setExpandedRoom(null); return; }
    setExpandedRoom(room.id);
    loadBeds(room.id);
  };

  const refreshRooms = () => {
    setLoading(true);
    api.get(`/rooms/?hostel=${selectedHostel}`).then(({ data }) => setRooms(data.results || data)).finally(() => setLoading(false));
  };

  const refreshBeds = (roomId) => {
    api.get(`/beds/?room=${roomId}`).then(({ data }) => {
      setRoomBeds(prev => ({ ...prev, [roomId]: data.results || data }));
    });
  };

  // ── Room CRUD ──
  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({ ...EMPTY_ROOM, hostel: selectedHostel });
    setRoomError('');
    setShowRoomForm(true);
  };

  const openEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      hostel: room.hostel || selectedHostel,
      room_number: room.room_number,
      floor: room.floor,
      room_type: room.room_type,
      capacity: room.capacity,
      has_toilet: room.has_toilet,
      has_kitchen: room.has_kitchen,
      is_active: room.is_active,
      notes: room.notes || '',
    });
    setRoomError('');
    setShowRoomForm(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setRoomError('');
    setSavingRoom(true);
    try {
      if (editingRoom) {
        await api.patch(`/rooms/${editingRoom.id}/`, roomForm);
      } else {
        await api.post('/rooms/', roomForm);
      }
      setShowRoomForm(false);
      refreshRooms();
    } catch (err) {
      const d = err.response?.data;
      setRoomError(d ? Object.values(d).flat().join(' ') : 'Failed to save room.');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    await api.delete(`/rooms/${deleteRoom.id}/`);
    setDeleteRoom(null);
    refreshRooms();
  };

  // ── Bed CRUD ──
  const openAddBed = (room) => {
    setBedParentRoom(room);
    setEditingBed(null);
    setBedForm({ ...EMPTY_BED, room: room.id });
    setBedError('');
    setShowBedForm(true);
  };

  const openEditBed = (bed, room) => {
    setBedParentRoom(room);
    setEditingBed(bed);
    setBedForm({ room: bed.room || room.id, bed_number: bed.bed_number, status: bed.status });
    setBedError('');
    setShowBedForm(true);
  };

  const handleSaveBed = async (e) => {
    e.preventDefault();
    setBedError('');
    setSavingBed(true);
    try {
      if (editingBed) {
        await api.patch(`/beds/${editingBed.id}/`, bedForm);
      } else {
        await api.post('/beds/', bedForm);
      }
      setShowBedForm(false);
      refreshBeds(bedParentRoom.id);
    } catch (err) {
      const d = err.response?.data;
      setBedError(d ? Object.values(d).flat().join(' ') : 'Failed to save bed.');
    } finally {
      setSavingBed(false);
    }
  };

  const handleDeleteBed = async () => {
    await api.delete(`/beds/${deleteBed.bed.id}/`);
    setDeleteBed(null);
    refreshBeds(deleteBed.roomId);
  };

  const statusColor = { available: 'var(--accent)', occupied: 'var(--danger)', locked: 'var(--warning)', maintenance: 'var(--gray-400)' };
  const statusBadge = { available: 'badge-success', occupied: 'badge-danger', locked: 'badge-warning', maintenance: 'badge-gray' };

  const filteredRooms = rooms.filter(r =>
    !search || r.room_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Rooms & Beds</h1>
          <p>Manage rooms and individual beds per hostel</p>
        </div>
        <button className="btn btn-primary" onClick={openAddRoom} disabled={!selectedHostel}>
          <i className="bi bi-plus-lg" /> Add Room
        </button>
      </div>

      {/* Hostel selector */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--gray-700)', whiteSpace: 'nowrap' }}>
            <i className="bi bi-building" style={{ marginRight: 6 }} />Select Hostel:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {hostels.map(h => (
              <button
                key={h.id}
                onClick={() => { setSelectedHostel(String(h.id)); setExpandedRoom(null); }}
                className={`btn btn-sm ${String(h.id) === String(selectedHostel) ? 'btn-primary' : 'btn-outline'}`}
              >
                <i className="bi bi-building" /> {h.name}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', flex: '0 1 200px' }}>
            <input className="form-control" placeholder="Filter rooms..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 13 }} />
          </div>
        </div>
      </div>

      {/* Rooms accordion */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredRooms.map(room => (
            <div key={room.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Room header row */}
              <div
                style={{
                  padding: '16px 20px', display: 'flex', alignItems: 'center',
                  gap: 14, cursor: 'pointer', background: expandedRoom === room.id ? 'var(--primary-light)' : 'var(--white)',
                  borderBottom: expandedRoom === room.id ? '1px solid var(--gray-200)' : 'none',
                }}
                onClick={() => toggleRoom(room)}
              >
                <i className={`bi bi-chevron-${expandedRoom === room.id ? 'down' : 'right'}`}
                  style={{ color: 'var(--gray-400)', fontSize: 13, flexShrink: 0 }} />
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {room.room_number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--gray-900)' }}>
                    Room {room.room_number}
                    <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>Floor {room.floor}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-500)', display: 'flex', gap: 12, marginTop: 2 }}>
                    <span><i className="bi bi-bounding-box" /> {room.capacity} beds</span>
                    <span style={{ textTransform: 'capitalize' }}><i className="bi bi-tag" /> {room.room_type}</span>
                    {room.has_toilet && <span><i className="bi bi-droplet" /> En-suite</span>}
                    {room.has_kitchen && <span><i className="bi bi-basket" /> Kitchen</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${room.available_beds_count > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {room.available_beds_count} / {room.capacity} available
                  </span>
                  <span className={`badge ${room.is_active ? 'badge-success' : 'badge-gray'}`}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditRoom(room)} title="Edit room">
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                      onClick={() => setDeleteRoom(room)} title="Delete room">
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Beds panel */}
              {expandedRoom === room.id && (
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>
                      <i className="bi bi-bounding-box" style={{ marginRight: 6 }} />Beds in Room {room.room_number}
                    </span>
                    <button className="btn btn-sm btn-outline" onClick={() => openAddBed(room)}>
                      <i className="bi bi-plus" /> Add Bed
                    </button>
                  </div>

                  {!roomBeds[room.id] ? (
                    <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
                  ) : roomBeds[room.id].length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', fontSize: 13 }}>
                      <i className="bi bi-bounding-box" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                      No beds added yet
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                      {roomBeds[room.id].map(bed => (
                        <div key={bed.id} style={{
                          border: `2px solid ${statusColor[bed.status] || 'var(--gray-200)'}`,
                          borderRadius: 'var(--radius-md)', padding: '12px 14px',
                          background: bed.status === 'occupied' ? 'var(--danger-light)'
                            : bed.status === 'locked' ? 'var(--warning-light)'
                            : bed.status === 'available' ? '#f0fdf4' : 'var(--gray-50)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ fontSize: 20 }}>🛏️</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm" style={{ padding: '3px 7px', background: 'white', border: '1px solid var(--gray-200)', color: 'var(--gray-600)', borderRadius: 4 }}
                                onClick={() => openEditBed(bed, room)}>
                                <i className="bi bi-pencil" style={{ fontSize: 11 }} />
                              </button>
                              <button className="btn btn-sm" style={{ padding: '3px 7px', background: 'var(--danger-light)', border: '1px solid #fca5a5', color: 'var(--danger)', borderRadius: 4 }}
                                onClick={() => setDeleteBed({ bed, roomId: room.id })}>
                                <i className="bi bi-trash" style={{ fontSize: 11 }} />
                              </button>
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
                            Bed {bed.bed_number}
                          </div>
                          <span className={`badge ${statusBadge[bed.status] || 'badge-gray'}`} style={{ marginTop: 4 }}>
                            {bed.status}
                          </span>
                          {bed.current_occupant && (
                            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 6 }}>
                              <i className="bi bi-person-fill" style={{ marginRight: 4 }} />
                              {bed.current_occupant.full_name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredRooms.length === 0 && !loading && (
            <div className="card"><div className="card-body">
              <div className="empty-state">
                <i className="bi bi-door-open" />
                <h3>No Rooms Found</h3>
                <p>Add rooms to this hostel to get started.</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={openAddRoom}>
                  <i className="bi bi-plus-lg" /> Add First Room
                </button>
              </div>
            </div></div>
          )}
        </div>
      )}

      {/* Room Form Modal */}
      {showRoomForm && (
        <Modal title={editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Room'} onClose={() => setShowRoomForm(false)}>
          <form onSubmit={handleSaveRoom}>
            <div className="modal-body">
              {roomError && <div className="alert alert-danger mb-4"><i className="bi bi-x-circle" /> {roomError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Hostel</label>
                  <select className="form-control" value={roomForm.hostel} onChange={e => setRoomForm({ ...roomForm, hostel: e.target.value })} required>
                    <option value="">Select Hostel</option>
                    {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room Number</label>
                  <input className="form-control" value={roomForm.room_number} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} required placeholder="e.g. 101" />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor</label>
                  <input className="form-control" type="number" min={1} value={roomForm.floor} onChange={e => setRoomForm({ ...roomForm, floor: Number(e.target.value) })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (Beds)</label>
                  <select className="form-control" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}>
                    <option value={2}>2 Beds</option>
                    <option value={4}>4 Beds</option>
                    <option value={6}>6 Beds</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room Type</label>
                  <select className="form-control" value={roomForm.room_type} onChange={e => setRoomForm({ ...roomForm, room_type: e.target.value })}>
                    <option value="standard">Standard</option>
                    <option value="ensuite">En-Suite</option>
                    <option value="shared">Shared Facilities</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-control" value={roomForm.notes} onChange={e => setRoomForm({ ...roomForm, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[['has_toilet', 'Has Toilet / En-Suite'], ['has_kitchen', 'Has Kitchen'], ['is_active', 'Active']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!roomForm[key]} onChange={e => setRoomForm({ ...roomForm, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowRoomForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingRoom}>
                {savingRoom ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                {savingRoom ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bed Form Modal */}
      {showBedForm && (
        <Modal title={editingBed ? `Edit Bed ${editingBed.bed_number}` : `Add Bed — Room ${bedParentRoom?.room_number}`} onClose={() => setShowBedForm(false)}>
          <form onSubmit={handleSaveBed}>
            <div className="modal-body">
              {bedError && <div className="alert alert-danger mb-4"><i className="bi bi-x-circle" /> {bedError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Bed Number / Label</label>
                  <input className="form-control" value={bedForm.bed_number} onChange={e => setBedForm({ ...bedForm, bed_number: e.target.value })}
                    required placeholder="e.g. A, B, 1, 2" style={{ textTransform: 'uppercase' }} />
                  <p className="form-hint">Letters (A–F) or numbers (1–6)</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={bedForm.status} onChange={e => setBedForm({ ...bedForm, status: e.target.value })}>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowBedForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingBed}>
                {savingBed ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                {savingBed ? 'Saving...' : editingBed ? 'Update Bed' : 'Add Bed'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Room */}
      {deleteRoom && (
        <ConfirmDialog
          message={`Delete Room ${deleteRoom.room_number}? All beds inside will also be deleted.`}
          onConfirm={handleDeleteRoom}
          onCancel={() => setDeleteRoom(null)}
        />
      )}

      {/* Delete Bed */}
      {deleteBed && (
        <ConfirmDialog
          message={`Delete Bed ${deleteBed.bed.bed_number}? This cannot be undone.`}
          onConfirm={handleDeleteBed}
          onCancel={() => setDeleteBed(null)}
        />
      )}
    </div>
  );
}