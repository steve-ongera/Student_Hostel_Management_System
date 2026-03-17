import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function WardenProfile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/auth/me/').then(({ data }) => {
      setProfile(data);
      setForm({
        first_name: data.first_name || '',
        last_name:  data.last_name  || '',
        phone:      data.phone      || '',
        email:      data.email      || '',
      });
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/wardens/${profile.warden_id}/`, form);
      setSuccess('Profile updated successfully.');
      setEditing(false);
      refreshUser();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Profile</h1>
          <p>Warden account details</p>
        </div>
        {!editing && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil" /> Edit Profile
          </button>
        )}
      </div>

      {/* Avatar card */}
      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, flexShrink: 0
          }}>
            {(profile.first_name?.[0] || '?')}{(profile.last_name?.[0] || '')}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>
              {profile.full_name || profile.username}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {profile.staff_id}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className="badge badge-primary">Warden</span>
              <span className="badge badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success mb-4">
          <i className="bi bi-check-circle-fill" /> {success}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2><i className="bi bi-person-gear" style={{ marginRight: 8 }} />Profile Details</h2>
        </div>
        <div className="card-body">
          {editing ? (
            <form onSubmit={handleSave}>
              {error && <div className="alert alert-danger mb-4"><i className="bi bi-x-circle" /> {error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-control" value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-control" value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0722..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Staff ID',   profile.staff_id,  'bi-hash'],
                ['Full Name',  profile.full_name,  'bi-person'],
                ['Phone',      profile.phone,      'bi-phone'],
                ['Email',      profile.email,      'bi-envelope'],
                ['Username',   profile.username,   'bi-person-badge'],
                ['Role',       'Warden',           'bi-shield-check'],
              ].map(([label, val, icon]) => (
                <div key={label} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                    <i className={`bi ${icon}`} style={{ marginRight: 4 }} />{label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{val || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}