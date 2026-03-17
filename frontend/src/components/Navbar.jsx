import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Navbar({ collapsed, onToggle, pageTitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    api.get('/notifications/?is_read=false').then(({ data }) => {
      setNotifications(data.results || data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const unread = notifications.filter(n => !n.is_read).length;
  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <header className={`navbar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        <button className="navbar-toggle" onClick={onToggle}>
          <i className="bi bi-list" />
        </button>
        <span className="navbar-title">{pageTitle}</span>
      </div>

      <div className="navbar-right" ref={menuRef}>
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="navbar-icon-btn"
            onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false); }}
            title="Notifications"
          >
            <i className="bi bi-bell" />
            {unread > 0 && <span className="badge-dot" />}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              width: '320px', background: 'var(--white)',
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)', zIndex: 300, overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', fontWeight: 700, fontSize: 14 }}>
                Notifications {unread > 0 && <span className="badge badge-primary" style={{ marginLeft: 6 }}>{unread}</span>}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                    <i className="bi bi-bell-slash" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                    No notifications
                  </div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n.id} style={{
                    padding: '12px 18px', borderBottom: '1px solid var(--gray-50)',
                    background: n.is_read ? 'transparent' : 'var(--primary-light)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <div
            className="navbar-avatar"
            onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}
            title={user?.full_name}
          >
            {user?.photo
              ? <img src={user.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials
            }
          </div>

          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '44px',
              width: '220px', background: 'var(--white)',
              border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)', zIndex: 300, overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)' }}>{user?.full_name || user?.username}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                  {user?.reg_number || user?.staff_id || user?.role}
                </div>
              </div>
              {[
                { icon: 'bi-person', label: 'My Profile', path: `/${user?.role}/profile` },
                { icon: 'bi-key', label: 'Change Password', path: `/${user?.role}/change-password` },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={() => { navigate(item.path); setShowMenu(false); }}
                  style={{
                    padding: '11px 16px', display: 'flex', alignItems: 'center',
                    gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--gray-700)',
                    transition: 'background 200ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className={`bi ${item.icon}`} />
                  {item.label}
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--gray-100)' }}>
                <div
                  onClick={handleLogout}
                  style={{
                    padding: '11px 16px', display: 'flex', alignItems: 'center',
                    gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--danger)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="bi bi-box-arrow-right" />
                  Logout
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}