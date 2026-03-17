import { useState, useEffect } from 'react';
import api from '../../utils/api';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className={`bi bi-${danger ? 'exclamation-triangle' : 'question-circle'}`}
            style={{ color: danger ? 'var(--danger)' : 'var(--warning)', marginRight: 8 }} />
            Confirm Action
          </h3>
          <button className="modal-close" onClick={onCancel}><i className="bi bi-x" /></button>
        </div>
        <div className="modal-body"><p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{message}</p></div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

const EMPTY = {
  name: '', start_date: '', end_date: '',
  is_current: false, application_open: false,
  application_start: '', application_end: '',
};

export default function AcademicYearsPage() {
  const [years, setYears]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { label, action }

  const fetch = () => {
    setLoading(true);
    api.get('/academic-years/').then(({ data }) => setYears(data.results || data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setError(''); setShowForm(true); };

  const openEdit = (y) => {
    setEditing(y);
    setForm({
      name: y.name, start_date: y.start_date, end_date: y.end_date,
      is_current: y.is_current, application_open: y.application_open,
      application_start: y.application_start || '', application_end: y.application_end || '',
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
        await api.patch(`/academic-years/${editing.id}/`, form);
      } else {
        await api.post('/academic-years/', form);
      }
      setShowForm(false);
      fetch();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'Failed to save academic year.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await api.delete(`/academic-years/${deleteTarget.id}/`);
    setDeleteTarget(null);
    fetch();
  };

  const quickToggle = async (year, field) => {
    await api.patch(`/academic-years/${year.id}/`, { [field]: !year[field] });
    fetch();
  };

  const setAsCurrent = (year) => {
    setConfirmAction({
      label: `Set "${year.name}" as the current academic year? This will unset any other current year.`,
      action: async () => {
        await api.patch(`/academic-years/${year.id}/`, { is_current: true });
        setConfirmAction(null);
        fetch();
      },
      danger: false,
    });
  };

  const toggleApplications = (year) => {
    setConfirmAction({
      label: year.application_open
        ? `Close hostel applications for "${year.name}"? Students will no longer be able to apply.`
        : `Open hostel applications for "${year.name}"? Students will be able to book beds.`,
      action: async () => {
        await quickToggle(year, 'application_open');
        setConfirmAction(null);
      },
      danger: year.application_open,
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Academic Years</h1>
          <p>Manage academic calendar and hostel application windows</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-lg" /> Add Year
        </button>
      </div>

      {/* Current year highlight */}
      {years.filter(y => y.is_current).map(y => (
        <div key={y.id} style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          borderRadius: 'var(--radius-xl)', padding: '20px 28px', color: 'white', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Current Academic Year</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{y.name}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              {y.start_date} → {y.end_date}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              padding: '10px 18px', borderRadius: 'var(--radius-full)',
              background: y.application_open ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }} onClick={() => toggleApplications(y)}>
              <i className={`bi bi-${y.application_open ? 'unlock' : 'lock'}`} style={{ marginRight: 6 }} />
              Applications: {y.application_open ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>
      ))}

      {/* Years table */}
      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Academic Year</th><th>Start Date</th><th>End Date</th>
                  <th>Application Window</th><th>Current</th><th>Applications</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {years.map(y => (
                  <tr key={y.id} style={{ background: y.is_current ? 'var(--primary-light)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-mono)' }}>{y.name}</span>
                        {y.is_current && <span className="badge badge-primary">Current</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{y.start_date}</td>
                    <td style={{ fontSize: 13 }}>{y.end_date}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
                      {y.application_start && y.application_end
                        ? `${y.application_start} → ${y.application_end}`
                        : '—'}
                    </td>
                    <td>
                      {y.is_current ? (
                        <span className="badge badge-primary"><i className="bi bi-check-circle" /> Current</span>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => setAsCurrent(y)}>
                          Set Current
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleApplications(y)}
                        className={`badge ${y.application_open ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
                      >
                        <i className={`bi bi-${y.application_open ? 'unlock' : 'lock'}`} style={{ marginRight: 4 }} />
                        {y.application_open ? 'Open' : 'Closed'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(y)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        {!y.is_current && (
                          <button className="btn btn-sm"
                            style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                            onClick={() => setDeleteTarget(y)} title="Delete">
                            <i className="bi bi-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {years.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>No academic years configured</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal title={editing ? `Edit — ${editing.name}` : 'Add Academic Year'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {error && <div className="alert alert-danger mb-4"><i className="bi bi-x-circle" /> {error}</div>}

              <div className="form-group">
                <label className="form-label">Year Name</label>
                <input className="form-control" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. 2025-2026" disabled={!!editing}
                  style={editing ? { background: 'var(--gray-50)' } : {}} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-control" type="date" required value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-control" type="date" required value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gray-400)', margin: '16px 0 12px' }}>
                Application Window (Optional)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Applications Open From</label>
                  <input className="form-control" type="date" value={form.application_start}
                    onChange={e => setForm({ ...form, application_start: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Applications Close On</label>
                  <input className="form-control" type="date" value={form.application_end}
                    onChange={e => setForm({ ...form, application_end: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 4, flexWrap: 'wrap' }}>
                {[
                  ['is_current', 'Set as Current Year'],
                  ['application_open', 'Applications Open Now'],
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
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Year'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete academic year "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Quick action confirm */}
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.label}
          onConfirm={confirmAction.action}
          onCancel={() => setConfirmAction(null)}
          danger={confirmAction.danger}
        />
      )}
    </div>
  );
}