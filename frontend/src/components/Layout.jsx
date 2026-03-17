import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const pageTitles = {
  '/student/dashboard': 'Dashboard',
  '/student/eligibility': 'Hostel Eligibility',
  '/student/hostels': 'Browse Hostels',
  '/student/book': 'Book a Bed',
  '/student/my-booking': 'My Booking',
  '/student/history': 'My Occupancy History',
  '/student/profile': 'My Profile',
  '/student/change-password': 'Change Password',
  '/warden/dashboard': 'Warden Dashboard',
  '/warden/occupancy': 'Occupancy Map',
  '/warden/hostels': 'Hostel Management',
  '/warden/rooms': 'Rooms & Beds',
  '/warden/bookings': 'All Bookings',
  '/warden/students': 'Students',
  '/warden/history': 'Occupancy History',
  '/warden/reports': 'Reports',
  '/warden/academic-years': 'Academic Years',
  '/warden/profile': 'My Profile',
};

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'HMS';

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} pageTitle={title} />
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}