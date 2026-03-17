import { useState, useEffect } from 'react';
import api from '../../utils/api';

// ── All sub-components OUTSIDE to prevent focus-loss on keystroke ──────────────

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 700 : 520 }} onClick={e => e.stopPropagation()}>
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
          <h3>
            <i className="bi bi-exclamation-triangle" style={{ color: 'var(--danger)', marginRight: 8 }} />
            Confirm Delete
          </h3>
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

// Generic field wrapper — stable reference, never remounts
function F({ label, children, col, hint }) {
  return (
    <div className="form-group" style={col ? { gridColumn: col } : {}}>
      <label className="form-label">{label}</label>
      {children}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}

// Password input with show/hide toggle
function PasswordInput({ value, onChange, placeholder, required, name }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        name={name}
        className="form-control"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder || 'Enter password'}
        required={required}
        style={{ paddingRight: 42 }}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--gray-400)', fontSize: 17, padding: 0, lineHeight: 1,
        }}
        title={show ? 'Hide password' : 'Show password'}
      >
        <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
      </button>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY = {
  reg_number: '', first_name: '', last_name: '', middle_name: '',
  gender: 'M', date_of_birth: '', national_id: '', phone: '', email: '',
  course: '', current_year: 1, current_semester: 1,
  status: 'active', admission_date: '', admission_year: '',
  // user account fields (create only)
  password: '', confirm_password: '', must_change_password: true,
};

const STATUS_BADGE = {
  active: 'badge-success', deferred: 'badge-warning',
  graduated: 'badge-primary', suspended: 'badge-danger',
};
const GENDER_ICON = { M: 'bi-gender-male', F: 'bi-gender-female' };

// ── Main Component ─────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students, setStudents]         = useState([]);
  const [courses, setCourses]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [viewStudent, setViewStudent]   = useState(null);
  const [form, setForm]                 = useState(EMPTY);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]             = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear]     = useState('');

  // ── Data loading ─────────────────────────────────────────────────────────────

  const fetchStudents = () => {
    setLoading(true);
    api.get('/students/')
      .then(({ data }) => setStudents(data.results || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    api.get('/courses/')
      .then(({ data }) => setCourses(data.results || data))
      .catch(() => setCourses([]));
  }, []);

  // ── Stable onChange helpers (prevent stale closures) ─────────────────────────

  const set    = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm(prev => ({ ...prev, [key]: Number(e.target.value) }));
  const setBool = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.checked }));

  // ── Open modals ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      reg_number:          s.reg_number,
      first_name:          s.first_name,
      last_name:           s.last_name,
      middle_name:         s.middle_name      || '',
      gender:              s.gender,
      date_of_birth:       s.date_of_birth    || '',
      national_id:         s.national_id      || '',
      phone:               s.phone            || '',
      email:               s.email            || '',
      course:              s.course           || '',
      current_year:        s.current_year,
      current_semester:    s.current_semester,
      status:              s.status,
      admission_date:      s.admission_date   || '',
      admission_year:      s.admission_year   || '',
      // password fields not shown when editing
      password: '', confirm_password: '', must_change_password: false,
    });
    setError('');
    setShowForm(true);
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side password validation (add mode only)
    if (!editing) {
      if (!form.password) {
        setError('Password is required.');
        return;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (form.password !== form.confirm_password) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        // Edit: send everything except password fields
        const { password, confirm_password, must_change_password, ...updateData } = form;
        await api.patch(`/students/${editing.id}/`, updateData);
      } else {
        // Create: send full form including password
        const { confirm_password, ...createData } = form;
        await api.post('/students/', createData);
      }
      setShowForm(false);
      fetchStudents();
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object') {
        const msgs = Object.entries(d)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ');
        setError(msgs);
      } else {
        setError('Failed to save student. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/students/${deleteTarget.id}/`);
      fetchStudents();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not delete. Student may have active bookings.';
      alert(msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      (!filterGender || s.gender === filterGender) &&
      (!filterStatus || s.status === filterStatus) &&
      (!filterYear   || String(s.current_year) === filterYear) &&
      (!search ||
        s.reg_number?.toLowerCase().includes(q) ||
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q))
    );
  });

  // ── Section divider ───────────────────────────────────────────────────────────

  const SectionLabel = ({ text }) => (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '1px', color: 'var(--gray-400)',
      margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {text}
      <div style={{ flex: 1, height: 1, background: 'var(--gray-100)' }} />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
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
            <input
              className="form-control"
              placeholder="Search name, reg no, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
            <i className="bi bi-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          </div>
          <select className="form-control" style={{ flex: '0 1 150px' }} value={filterGender} onChange={e => setFilterGender(e.target.value)}>
            <option value="">All Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
          <select className="form-control" style={{ flex: '0 1 150px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="deferred">Deferred</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
          </select>
          <select className="form-control" style={{ flex: '0 1 150px' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
          {(search || filterGender || filterStatus || filterYear) && (
            <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setFilterGender(''); setFilterStatus(''); setFilterYear(''); }}>
              <i className="bi bi-x" /> Clear
            </button>
          )}
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
                  <th>Reg No.</th><th>Name</th><th>G</th><th>Course</th>
                  <th>Year</th><th>Sem</th><th>Phone</th><th>Status</th><th>Actions</th>
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
                      <i className={`bi ${GENDER_ICON[s.gender] || 'bi-person'}`}
                        style={{ color: s.gender === 'M' ? 'var(--info)' : '#ec4899', fontSize: 16 }} />
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 150 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.course_name || '—'}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.current_year}</td>
                    <td style={{ textAlign: 'center' }}>{s.current_semester}</td>
                    <td style={{ fontSize: 12.5 }}>{s.phone}</td>
                    <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setViewStudent(s)} title="View details">
                          <i className="bi bi-eye" />
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-sm"
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid #fca5a5' }}
                          onClick={() => setDeleteTarget(s)} title="Delete">
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
                    No students match your filters
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <Modal
          title={editing ? `Edit Student — ${editing.full_name}` : 'Add New Student'}
          onClose={() => setShowForm(false)}
          wide
        >
          <form onSubmit={handleSave} autoComplete="off">
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

              {error && (
                <div className="alert alert-danger mb-4">
                  <i className="bi bi-exclamation-circle-fill" />
                  <span style={{ flex: 1 }}>{error}</span>
                  <button type="button" onClick={() => setError('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18 }}>
                    <i className="bi bi-x" />
                  </button>
                </div>
              )}

              {/* ── LOGIN ACCOUNT (add mode only) ── */}
              {!editing && (
                <>
                  <SectionLabel text="Login Account" />
                  <div style={{
                    background: 'var(--primary-light)', borderRadius: 'var(--radius-md)',
                    padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--primary-dark)',
                    border: '1px solid #bfdbfe',
                  }}>
                    <i className="bi bi-info-circle" style={{ marginRight: 6 }} />
                    The <strong>Registration Number</strong> is used as the login username.
                    Set a strong password for the student's account.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <F label="Password" hint="Minimum 6 characters">
                      <PasswordInput
                        name="password"
                        value={form.password}
                        onChange={set('password')}
                        placeholder="Set account password"
                        required
                      />
                    </F>
                    <F label="Confirm Password">
                      <PasswordInput
                        name="confirm_password"
                        value={form.confirm_password}
                        onChange={set('confirm_password')}
                        placeholder="Re-enter password"
                        required
                      />
                    </F>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.must_change_password}
                        onChange={setBool('must_change_password')}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>
                        <strong>Force password change on first login</strong>
                        <span style={{ color: 'var(--gray-400)', marginLeft: 6 }}>(recommended)</span>
                      </span>
                    </label>
                  </div>
                </>
              )}

              {/* ── PERSONAL INFO ── */}
              <SectionLabel text="Personal Information" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="First Name">
                  <input className="form-control" required value={form.first_name} onChange={set('first_name')} placeholder="e.g. Alice" />
                </F>
                <F label="Last Name">
                  <input className="form-control" required value={form.last_name} onChange={set('last_name')} placeholder="e.g. Kamau" />
                </F>
                <F label="Middle Name">
                  <input className="form-control" value={form.middle_name} onChange={set('middle_name')} placeholder="Optional" />
                </F>
                <F label="Gender">
                  <select className="form-control" value={form.gender} onChange={set('gender')}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </F>
                <F label="Date of Birth" hint={!editing ? 'Note: default password uses DOB (DDMMYYYY)' : undefined}>
                  <input className="form-control" type="date" required value={form.date_of_birth} onChange={set('date_of_birth')} />
                </F>
                <F label="National ID">
                  <input className="form-control" value={form.national_id} onChange={set('national_id')} placeholder="e.g. 34567890" />
                </F>
                <F label="Phone">
                  <input className="form-control" required value={form.phone} onChange={set('phone')} placeholder="e.g. 0712345678" />
                </F>
                <F label="Email">
                  <input className="form-control" type="email" required value={form.email} onChange={set('email')} placeholder="student@hms.ac.ke" />
                </F>
              </div>

              {/* ── ACADEMIC INFO ── */}
              <SectionLabel text="Academic Information" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Registration Number" col={editing ? undefined : '1 / -1'}
                   hint="Format: XX999/9999/9999 — also used as login username">
                  <input
                    className="form-control"
                    required
                    value={form.reg_number}
                    onChange={set('reg_number')}
                    disabled={!!editing}
                    placeholder="e.g. SC211/0530/2024"
                    style={editing ? { background: 'var(--gray-50)', color: 'var(--gray-500)', cursor: 'not-allowed' } : {}}
                  />
                </F>
                <F label="Course">
                  {courses.length === 0 ? (
                    <div style={{
                      padding: '10px 14px', border: '1.5px solid var(--gray-300)',
                      borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--gray-400)',
                      background: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Loading courses...
                    </div>
                  ) : (
                    <select className="form-control" value={form.course} onChange={set('course')}>
                      <option value="">— Select Course —</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </F>
                <F label="Current Year">
                  <select className="form-control" value={form.current_year} onChange={setNum('current_year')}>
                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </F>
                <F label="Current Semester">
                  <select className="form-control" value={form.current_semester} onChange={setNum('current_semester')}>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </F>
                <F label="Status">
                  <select className="form-control" value={form.status} onChange={set('status')}>
                    {['active', 'deferred', 'graduated', 'suspended'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </F>
                <F label="Admission Date">
                  <input className="form-control" type="date" value={form.admission_date} onChange={set('admission_date')} />
                </F>
                <F label="Admission Year">
                  <input className="form-control" value={form.admission_year} onChange={set('admission_year')} placeholder="e.g. 2024-2025" />
                </F>
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : (
                  <><i className={`bi ${editing ? 'bi-check-lg' : 'bi-person-plus'}`} />
                  {editing ? 'Update Student' : 'Create Student Account'}</>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Detail Modal ── */}
      {viewStudent && (
        <Modal title="Student Details" onClose={() => setViewStudent(null)} wide>
          <div className="modal-body">
            {/* Profile header */}
            <div style={{
              display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24,
              padding: '18px 20px', background: 'linear-gradient(135deg, var(--primary-light), #dbeafe)',
              borderRadius: 'var(--radius-lg)', border: '1px solid #bfdbfe',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 800, flexShrink: 0,
              }}>
                {viewStudent.first_name?.[0]}{viewStudent.last_name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{viewStudent.full_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--gray-500)', marginTop: 3 }}>
                  <i className="bi bi-person-badge" style={{ marginRight: 5 }} />{viewStudent.reg_number}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span className={`badge ${STATUS_BADGE[viewStudent.status] || 'badge-gray'}`}>{viewStudent.status}</span>
                  <span className={`badge ${viewStudent.gender === 'M' ? 'badge-info' : 'badge-primary'}`}>
                    {viewStudent.gender === 'M' ? 'Male' : 'Female'}
                  </span>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Date of Birth',  viewStudent.date_of_birth,  'bi-calendar'],
                ['Phone',          viewStudent.phone,           'bi-phone'],
                ['Email',          viewStudent.email,           'bi-envelope'],
                ['National ID',    viewStudent.national_id || '—', 'bi-card-text'],
                ['Course',         viewStudent.course_name || '—', 'bi-mortarboard'],
                ['Year & Sem',     `Year ${viewStudent.current_year}, Semester ${viewStudent.current_semester}`, 'bi-layers'],
                ['Admission Year', viewStudent.admission_year || '—', 'bi-calendar-check'],
                ['Admission Date', viewStudent.admission_date || '—', 'bi-calendar2-plus'],
              ].map(([label, val, icon]) => (
                <div key={label} style={{
                  padding: '12px 14px', background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)',
                }}>
                  <div style={{ fontSize: 10.5, color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>
                    <i className={`bi ${icon}`} style={{ marginRight: 4 }} />{label}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gray-800)', wordBreak: 'break-word' }}>
                    {val || '—'}
                  </div>
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

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.full_name}" (${deleteTarget.reg_number})? Their login account and all associated data will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}