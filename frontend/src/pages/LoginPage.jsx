import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      if (data.must_change_password) {
        navigate(`/${data.role}/change-password?first=true`);
      } else {
        navigate(`/${data.role}/dashboard`);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <i className="bi bi-house-door-fill" />
          </div>
          <div className="login-logo-text">
            <h1>HMS Portal</h1>
            <span>Hostel Management System</span>
          </div>
        </div>

        <h2>Welcome back</h2>
        <p className="subtitle">Sign in with your registration number to continue</p>

        {error && (
          <div className="alert alert-danger mb-4">
            <i className="bi bi-exclamation-circle-fill" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Registration Number / Staff ID</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                placeholder="e.g. SC211/0530/2022"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
                style={{ paddingLeft: 40 }}
              />
              <i className="bi bi-person" style={{
                position: 'absolute', left: 13, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 16
              }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPass ? 'text' : 'password'}
                placeholder="Default: your birth date (DDMMYYYY)"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                style={{ paddingLeft: 40, paddingRight: 40 }}
              />
              <i className="bi bi-lock" style={{
                position: 'absolute', left: 13, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 16
              }} />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: 16
                }}
              >
                <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            <p className="form-hint">
              <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
              Default password is your date of birth in DDMMYYYY format (e.g. 15031998)
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : <i className="bi bi-box-arrow-in-right" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: 28, padding: '14px 18px',
          background: 'var(--gray-50)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--gray-200)', fontSize: 12.5, color: 'var(--gray-500)'
        }}>
          <i className="bi bi-shield-lock" style={{ marginRight: 6 }} />
          Your default password is your birth date (DDMMYYYY). You will be asked to change it on first login.
        </div>
      </div>
    </div>
  );
}