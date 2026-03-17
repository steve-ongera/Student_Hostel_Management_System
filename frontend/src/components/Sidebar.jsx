import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentNav = [
  { section: 'Main', items: [
    { to: '/student/dashboard', icon: 'bi-grid-1x2', label: 'Dashboard' },
    { to: '/student/eligibility', icon: 'bi-shield-check', label: 'Eligibility' },
  ]},
  { section: 'Hostel', items: [
    { to: '/student/hostels', icon: 'bi-building', label: 'Browse Hostels' },
    { to: '/student/book', icon: 'bi-calendar-plus', label: 'Book a Bed' },
    { to: '/student/my-booking', icon: 'bi-bookmark-check', label: 'My Booking' },
  ]},
  { section: 'History', items: [
    { to: '/student/history', icon: 'bi-clock-history', label: 'My History' },
  ]},
  { section: 'Account', items: [
    { to: '/student/profile', icon: 'bi-person-circle', label: 'Profile' },
    { to: '/student/change-password', icon: 'bi-key', label: 'Change Password' },
  ]},
];

const wardenNav = [
  { section: 'Overview', items: [
    { to: '/warden/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    { to: '/warden/occupancy', icon: 'bi-diagram-3', label: 'Occupancy Map' },
  ]},
  { section: 'Management', items: [
    { to: '/warden/hostels', icon: 'bi-building', label: 'Hostels' },
    { to: '/warden/rooms', icon: 'bi-door-open', label: 'Rooms & Beds' },
    { to: '/warden/bookings', icon: 'bi-list-check', label: 'All Bookings' },
    { to: '/warden/students', icon: 'bi-people', label: 'Students' },
  ]},
  { section: 'Records', items: [
    { to: '/warden/history', icon: 'bi-archive', label: 'Occupancy History' },
    { to: '/warden/reports', icon: 'bi-bar-chart-line', label: 'Reports' },
  ]},
  { section: 'Settings', items: [
    { to: '/warden/academic-years', icon: 'bi-calendar3', label: 'Academic Years' },
    { to: '/warden/profile', icon: 'bi-person-gear', label: 'My Profile' },
  ]},
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();
  const nav = user?.role === 'student' ? studentNav : wardenNav;

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <i className="bi bi-house-door-fill" />
        </div>
        <div className="sidebar-logo-text">
          <h1>HMS</h1>
          <span>Hostel Management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map((section) => (
          <div key={section.section}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' active' : ''}`
                }
              >
                <i className={`bi ${item.icon} item-icon`} />
                <span className="item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className="sidebar-item"
          onClick={onToggle}
          style={{ cursor: 'pointer' }}
        >
          <i className={`bi ${collapsed ? 'bi-arrow-right-circle' : 'bi-arrow-left-circle'} item-icon`} />
          <span className="item-label">Collapse</span>
        </div>
      </div>
    </aside>
  );
}