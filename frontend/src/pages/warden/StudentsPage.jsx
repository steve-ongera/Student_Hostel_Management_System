import { useState, useEffect } from 'react';
import api from '../../utils/api';

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 680 : 520 }} onClick={e => e.stopPropagation()}>
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
          <h3><i className="bi bi-exclamation-triangle" style={{ color: 'var(--danger)', marginRight: 8 }} />Confirm</h3>
          <button className="modal-close" onClick={onCancel}><i className="bi bi-x" /></button>
        </div>
        <div className="modal-body"><p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{message}</p></div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}><i className="bi bi-trash" /> Delete</button>
        </div>
      </div>
    </div>
  );
}

const EMPTY = {
  reg_number: '', first_name: '', last_name: '', middle_name: '',
  gender: 'M', date_of_birth: '', national_id: '', phone: '', email: '',
  course: '', current_year: 1, current_semester: 1,
  status: 'active', admission_date: '', admission_year: '',
};

export default function StudentsPage() {
  const [students, setStudents]   = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]       = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear]     = useState('');

  const fetch = () => {
    setLoading(true);
    api.get('/students/').then(({ data }) => setStudents(data.results || data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
    api.get('/courses/').then(({ data }) => setCourses(data.results || data)).catch(() =>
      api.get('/students/').then(() => {}) // fallback
    );
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setError(''); setShowForm(true); };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      reg_number: s.reg_number, first_name: s.first_name,
      last_name: s.last_name, middle_name: s.middle_name || '',
      gender: s.gender, date_of_birth: s.date_of_birth,
      national_id: s.national_id || '', phone: s.phone, email: s.email,
      course: s.course || '', current_year: s.current_year,
      current_semester: s.current_semester, status: s.status,
      admission_date: s.admission_date, admission_year: s.admission_year,
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
        await api.patch(`/students/${editing.id}/`, form);
      } else {
        // Create user first, then student
        const payload = { ...form, create_user: true };
        await api.post('/students/', payload);
      }
      setShowForm(false);
      fetch();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await api.delete(`/students/${deleteTarget.id}/`);
    setDeleteTarget(null);
    fetch();
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      (!filterGender || s.gender === filterGender) &&
      (!filterStatus || s.status === filterStatus) &&
      (!filterYear   || String(s.current_year) === filterYear) &&
      (!search || s.reg_number?.toLowerCase().includes(q) ||
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q))
    );
  });

  const genderIcon = { M: 'bi-gender-male', F: 'bi-gender-female' };
  const statusBadge = { active: 'badge-success', deferred: 'badge-warning', graduated: 'badge-primary', suspended: 'badge-danger' };

  const F = ({ label, children, col }) => (
    <div className="form-group" style={col ? { gridColumn: col } : {}}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Students</h1>
          <p>{filtered.length} of {students.length} students</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-person-plus" /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <input className="form-control" placeholder="Search name, reg no, email..."
              value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          </div>
          {[
            { val: filterGender, set: setFilterGender, opts: [['', 'All Genders'], ['M', 'Male'], ['F', 'Female']] },
            { val: filterStatus, set: setFilterStatus, opts: [['', 'All Statuses'], ['active', 'Active'], ['deferred', 'Deferred'], ['graduated', 'Graduated'], ['suspended', 'Suspended']] },
            { val: filterYear,   set: setFilterYear,   opts: [['', 'All Years'], ['1', 'Year 1'], ['2', 'Year 2'], ['3', 'Year 3'], ['4', 'Year 4']] },
          ].map((f, i) => (
            <select key={i} className="form-control" style={{ flex: '0 1 150px' }} value={f.val} onChange={e => f.set(e.target.value)}>
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <div style={{ padding: 60, textAlign: 'center' }}><span className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Reg No.</th><th>Name</th><th>Gender</th><th>Course</th>
                  <th>Year</th><th>Semester</th><th>Phone</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="text-mono" style={{ fontSize: 12.5 }}>{s.reg_number}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.full_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-400)' }}>{s.email}</div>
                    </td>
                    <td>
                      <i className={`bi ${genderIcon[s.gender] || 'bi-person'}`}
                        style={{ color: s.gender === 'M' ? 'var(--info)' : 'var(--primary)', fontSize: 16 }} />
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--gray-500)', maxWidth: 160 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.course_name}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.current_year}</td>
                    <td style={{ textAlign: 'center' }}>{s.current_semester}</td>
                    <td style={{ fontSize: 12.5 }}>{s.phone}</td>
                    <td><span className={`badge ${statusBadge[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setViewStudent(s)} title="View details">
                          <i className="bi bi-eye" />
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                          onClick={() => setDeleteTarget(s)} title="Delete">
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>No students match filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal title={editing ? `Edit — ${editing.full_name}` : 'Add New Student'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave}>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {error && <div className="alert alert-danger mb-4"><i className="bi bi-x-circle" /> {error}</div>}

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gray-400)', marginBottom: 12 }}>Personal Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="First Name"><input className="form-control" required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="e.g. Alice" /></F>
                <F label="Last Name"><input className="form-control" required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="e.g. Kamau" /></F>
                <F label="Middle Name"><input className="form-control" value={form.middle_name} onChange={e => setForm({ ...form, middle_name: e.target.value })} placeholder="Optional" /></F>
                <F label="Gender">
                  <select className="form-control" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </F>
                <F label="Date of Birth">
                  <input className="form-control" type="date" required value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                  <p className="form-hint">This is the default login password (DDMMYYYY)</p>
                </F>
                <F label="National ID">
                  <input className="form-control" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} placeholder="e.g. 34567890" />
                </F>
                <F label="Phone">
                  <input className="form-control" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0712345678" />
                </F>
                <F label="Email">
                  <input className="form-control" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="student@hms.ac.ke" />
                </F>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gray-400)', margin: '20px 0 12px' }}>Academic Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Registration Number" col={editing ? undefined : '1 / -1'}>
                  <input className="form-control" required value={form.reg_number} disabled={!!editing}
                    onChange={e => setForm({ ...form, reg_number: e.target.value })}
                    placeholder="e.g. SC211/0530/2024" style={editing ? { background: 'var(--gray-50)', color: 'var(--gray-400)' } : {}} />
                  <p className="form-hint">Format: XX999/9999/9999</p>
                </F>
                <F label="Course">
                  <select className="form-control" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
                    <option value="">— Select Course —</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </F>
                <F label="Current Year">
                  <select className="form-control" value={form.current_year} onChange={e => setForm({ ...form, current_year: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </F>
                <F label="Current Semester">
                  <select className="form-control" value={form.current_semester} onChange={e => setForm({ ...form, current_semester: Number(e.target.value) })}>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </F>
                <F label="Status">
                  <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {['active', 'deferred', 'graduated', 'suspended'].map(s => (
                      <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </F>
                <F label="Admission Date">
                  <input className="form-control" type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} />
                </F>
                <F label="Admission Year">
                  <input className="form-control" value={form.admission_year} onChange={e => setForm({ ...form, admission_year: e.target.value })} placeholder="e.g. 2024-2025" />
                </F>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" /> : <i className="bi bi-check-lg" />}
                {saving ? 'Saving...' : editing ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Student Detail Modal */}
      {viewStudent && (
        <Modal title="Student Details" onClose={() => setViewStudent(null)} wide>
          <div className="modal-body">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24, padding: '16px 20px', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
                {viewStudent.first_name?.[0]}{viewStudent.last_name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{viewStudent.full_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gray-500)' }}>{viewStudent.reg_number}</div>
                <span className={`badge ${statusBadge[viewStudent.status] || 'badge-gray'}`} style={{ marginTop: 6 }}>{viewStudent.status}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Gender', viewStudent.gender === 'M' ? 'Male' : 'Female', 'bi-person'],
                ['Date of Birth', viewStudent.date_of_birth, 'bi-calendar'],
                ['Phone', viewStudent.phone, 'bi-phone'],
                ['Email', viewStudent.email, 'bi-envelope'],
                ['Course', viewStudent.course_name, 'bi-mortarboard'],
                ['Year & Semester', `Year ${viewStudent.current_year}, Sem ${viewStudent.current_semester}`, 'bi-layers'],
                ['Admission Year', viewStudent.admission_year, 'bi-calendar-check'],
                ['National ID', viewStudent.national_id || '—', 'bi-card-text'],
              ].map(([label, val, icon]) => (
                <div key={label} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    <i className={`bi ${icon}`} style={{ marginRight: 4 }} />{label}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-800)', wordBreak: 'break-word' }}>{val || '—'}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setViewStudent(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => { openEdit(viewStudent); setViewStudent(null); }}>
              <i className="bi bi-pencil" /> Edit Student
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete student "${deleteTarget.full_name}" (${deleteTarget.reg_number})? This will also remove their account and all associated data.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}