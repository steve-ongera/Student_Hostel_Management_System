import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/main.css';

// Pages
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import BookBed from './pages/student/BookBed';
import { MyBooking, MyHistory, ChangePassword, StudentProfile, EligibilityPage } from './pages/student/StudentPages';

// Warden pages
import WardenDashboard from './pages/warden/Dashboard';
import OccupancyMap from './pages/warden/OccupancyMap';
import { AllBookings, Students, OccupancyHistory, AcademicYears, Reports } from './pages/warden/WardenPages';

// ── Route Guards ─────────────────────────────────────────────────

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-overlay">
      <span className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'admin') {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

// ── App ───────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Student Routes */}
      <Route path="/student/*" element={
        <RequireAuth role="student">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="eligibility" element={<EligibilityPage />} />
              <Route path="hostels" element={<BookBed />} />
              <Route path="book" element={<BookBed />} />
              <Route path="my-booking" element={<MyBooking />} />
              <Route path="history" element={<MyHistory />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />

      {/* Warden Routes */}
      <Route path="/warden/*" element={
        <RequireAuth role="warden">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<WardenDashboard />} />
              <Route path="occupancy" element={<OccupancyMap />} />
              <Route path="bookings" element={<AllBookings />} />
              <Route path="students" element={<Students />} />
              <Route path="history" element={<OccupancyHistory />} />
              <Route path="academic-years" element={<AcademicYears />} />
              <Route path="reports" element={<Reports />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />

      {/* Admin falls through to warden */}
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