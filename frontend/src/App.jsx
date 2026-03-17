import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/main.css';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Student
import StudentDashboard from './pages/student/Dashboard';
import BookBed from './pages/student/BookBed';
import { MyBooking, MyHistory, ChangePassword, StudentProfile, EligibilityPage } from './pages/student/StudentPages';

// Warden
import WardenDashboard      from './pages/warden/Dashboard';
import OccupancyMap         from './pages/warden/OccupancyMap';
import HostelsPage          from './pages/warden/HostelsPage';
import RoomsBedsPage        from './pages/warden/RoomsBedsPage';
import StudentsPage         from './pages/warden/StudentsPage';
import BookingsPage         from './pages/warden/BookingsPage';
import OccupancyHistoryPage from './pages/warden/OccupancyHistoryPage';
import AcademicYearsPage    from './pages/warden/AcademicYearsPage';
import ReportsPage          from './pages/warden/ReportsPage';
import WardenProfile        from './pages/warden/WardenProfile';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'admin') return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Student */}
      <Route path="/student/*" element={
        <RequireAuth role="student">
          <Layout>
            <Routes>
              <Route path="dashboard"       element={<StudentDashboard />} />
              <Route path="eligibility"     element={<EligibilityPage />} />
              <Route path="hostels"         element={<BookBed />} />
              <Route path="book"            element={<BookBed />} />
              <Route path="my-booking"      element={<MyBooking />} />
              <Route path="history"         element={<MyHistory />} />
              <Route path="profile"         element={<StudentProfile />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />

      {/* Warden */}
      <Route path="/warden/*" element={
        <RequireAuth role="warden">
          <Layout>
            <Routes>
              <Route path="dashboard"       element={<WardenDashboard />} />
              <Route path="occupancy"       element={<OccupancyMap />} />
              <Route path="hostels"         element={<HostelsPage />} />
              <Route path="rooms"           element={<RoomsBedsPage />} />
              <Route path="students"        element={<StudentsPage />} />
              <Route path="bookings"        element={<BookingsPage />} />
              <Route path="history"         element={<OccupancyHistoryPage />} />
              <Route path="academic-years"  element={<AcademicYearsPage />} />
              <Route path="reports"         element={<ReportsPage />} />
              <Route path="profile"         element={<WardenProfile />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />

      <Route path="/admin/*" element={<Navigate to="/warden/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}