import { useState, useEffect } from 'react';
import api from '../../utils/api';

const EMPTY_FORM = {
  name: '', code: '', gender: 'M', description: '',
  total_floors: 1, has_kitchen: false, has_toilet: false,
  monthly_fee: '', is_active: true,
};

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
          <button className="btn btn-danger" onClick={onConfirm}>
            <i className="bi bi-trash" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');

  const fetchHostels = () => {
    setLoading(true);
    api.get('/hostels/').then(({ data }) => setHostels(data.results || data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHostels();
    api.get('/wardens/').then(({ data }) => setWardens(data.results || data));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };

  const openEdit = (h) => {
    setEditing(h);
    setForm({
      name: h.name, code: h.code, gender: h.gender,
      description: h.description || '', total_floors: h.total_floors,
      has_kitchen: h.has_kitchen, has_toilet: h.has_toilet,
      monthly_fee: h.monthly_fee, is_active: h.is_active,
      warden: h.warden_id || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/hostels/${editing.id}/`, form);
      } else {
        await api.post('/hostels/', form);
      }
      setShowForm(false);
      fetchHostels();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'Failed to save hostel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/hostels/${deleteTarget.id}/`);
      setDeleteTarget(null);
      fetchHostels();
    } catch {
      setDeleteTarget(null);
    }
  };

  const filtered = hostels.filter(h => {
    const q = search.toLowerCase();
    return (!filterGender || h.gender === filterGender)
      && (!search || h.name.toLowerCase().includes(q) || h.code.toLowerCase().includes(q));
  });

  const field = (label, key, type = 'text', opts = {}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className={`form-control${error && !form[key] ? ' error' : ''}`}
        type={type} value={form[key] ?? ''} {...opts}
        onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
      />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Hostel Management</h1>
          <p>{hostels.length} hostels registered</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-lg" /> Add Hostel
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <input className="form-control" placeholder="Search name or code..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          </div>
          <select className="form-control" style={{ flex: '0 1 160px' }} value={filterGender} onChange={e => setFilterGender(e.target.value)}>
            <option value="">All Genders</option>
            <option value="M">Boys</option>
            <option value="F">Girls</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Hostel Name</th><th>Gender</th><th>Floors</th>
                  <th>Amenities</th><th>Fee / Sem</th><th>Beds</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id}>
                    <td className="text-mono font-bold">{h.code}</td>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                    <td>
                      <span className={`badge ${h.gender === 'M' ? 'badge-info' : 'badge-primary'}`}>
                        <i className={`bi bi-gender-${h.gender === 'M' ? 'male' : 'female'}`} />
                        {h.gender === 'M' ? ' Boys' : ' Girls'}
                      </span>
                    </td>
                    <td>{h.total_floors}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {h.has_kitchen && <span className="badge badge-gray"><i className="bi bi-basket" /> Kitchen</span>}
                        {h.has_toilet && <span className="badge badge-gray"><i className="bi bi-droplet" /> En-suite</span>}
                        {!h.has_kitchen && !h.has_toilet && <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>Shared</span>}
                      </div>
                    </td>
                    <td>KES {parseFloat(h.monthly_fee || 0).toLocaleString()}</td>
                    <td>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{h.available_beds}</span>
                      <span style={{ color: 'var(--gray-400)', fontSize: 12 }}> / {h.total_beds}</span>
                    </td>
                    <td>
                      <span className={`badge ${h.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {h.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(h)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                          onClick={() => setDeleteTarget(h)}>
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
                    No hostels found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal title={editing ? `Edit — ${editing.name}` : 'Add New Hostel'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger mb-4">
                  <i className="bi bi-x-circle" />{error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Hostel Name', 'name', 'text', { required: true, placeholder: 'e.g. Kilimanjaro Boys Hostel' })}
                {field('Code', 'code', 'text', { required: true, placeholder: 'e.g. KBH', style: { textTransform: 'uppercase' } })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-control" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="M">Male (Boys)</option>
                    <option value="F">Female (Girls)</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                {field('Total Floors', 'total_floors', 'number', { min: 1, max: 20 })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Monthly Fee (KES)', 'monthly_fee', 'number', { min: 0, placeholder: '4500' })}
                <div className="form-group">
                  <label className="form-label">Warden</label>
                  <select className="form-control" value={form.warden || ''} onChange={e => setForm({ ...form, warden: e.target.value })}>
                    <option value="">— No Warden Assigned —</option>
                    {wardens.map(w => (
                      <option key={w.id} value={w.id}>{w.full_name} ({w.staff_id})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the hostel..." />
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  ['has_kitchen', 'Has Kitchen'],
                  ['has_toilet', 'En-Suite (Has Toilet)'],
                  ['is_active', 'Active'],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                {saving ? 'Saving...' : editing ? 'Update Hostel' : 'Add Hostel'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will also remove all associated rooms and beds.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}