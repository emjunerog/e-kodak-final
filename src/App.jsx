/**
 * App.jsx
 * =======
 * ROOT APPLICATION ROUTER
 */

import { Routes, Route, Navigate } from "react-router-dom";

// ── Global Components ─────────────────────────────────────────────────────────
import ScrollToTop from "./components/layout/ScrollToTop";
import AIAssistant from "./components/ai/AIAssistant";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute";
import AdminOnlyRoute from "./components/auth/AdminOnlyRoute";
import PhotographerProtectedRoute from "./components/auth/PhotographerProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";

// ── Public Pages ───────────────────────────────────────────────────────────────
import Home from "./pages/Home";
import Services from "./pages/Services";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";

// ── Auth Pages ────────────────────────────────────────────────────────────────
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminLogin from "./pages/auth/AdminLogin";
import AuthCallback from "./pages/auth/AuthCallback";
import PendingApproval from "./pages/auth/PendingApproval";

// ── Customer Dashboard Pages ──────────────────────────────────────────────────
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import BookSessionPage from "./pages/dashboard/BookSessionPage";
import MyBookingsPage from "./pages/dashboard/MyBookingsPage";
import BookingDetailsPage from "./pages/dashboard/BookingDetailsPage";
import GalleryPage from "./pages/dashboard/GalleryPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import ActivityTrailPage from "./pages/dashboard/ActivityTrailPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import BookingProgressPage from "./pages/dashboard/BookingProgressPage";
import PaymentsPage from "./pages/dashboard/PaymentsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

// ── Admin / Staff Pages (Phase 4.1) ───────────────────────────────────────────
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminPhotographers from "./pages/admin/AdminPhotographers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPhotos from "./pages/admin/AdminPhotos";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSmsLogs from "./pages/admin/AdminSmsLogs";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminServices from "./pages/admin/AdminServices";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCMS from "./pages/admin/AdminCMS";
import AdminBookingDetail from "./pages/admin/AdminBookingDetail";
import AdminWorkstation from "./pages/admin/AdminWorkstation";
import AdminStaff from "./pages/admin/AdminStaff";

// ── Photographer Pages (Phase 5) ──────────────────────────────────────────────
import PhotographerLayout from "./components/photographer/PhotographerLayout";
import PhotographerDashboard from "./pages/photographer/PhotographerDashboard";
import PhotographerBookings from "./pages/photographer/PhotographerBookings";
import PhotographerAvailability from "./pages/photographer/PhotographerAvailability";
import PhotographerUploads from "./pages/photographer/PhotographerUploads";
import PhotographerSettings from "./pages/photographer/PhotographerSettings";

// ── Placeholder component for unimplemented routes ────────────────────────────
function ComingSoon({ page }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center px-6">
        <p className="font-body text-gold text-xs uppercase tracking-[0.2em] mb-3">
          Coming Soon
        </p>
        <h1 className="font-heading text-primary text-4xl mb-4">{page}</h1>
        <p className="font-body text-neutral-500 text-base max-w-sm mx-auto">
          This page will be implemented in a future development phase.
        </p>
        <a href="/" className="inline-block mt-6 btn-outline">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}

import { SiteConfigProvider } from "./context/SiteConfigContext";

export default function App() {
  return (
    <SiteConfigProvider>
      <ScrollToTop />
      <AIAssistant />

      <ErrorBoundary>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/"         element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/gallery"  element={<Gallery />} />
          <Route path="/about"    element={<About />} />
          <Route path="/contact"  element={<Contact />} />

          <Route path="/privacy"  element={<Legal slug="privacy" />} />
          <Route path="/terms"    element={<Legal slug="terms" />} />

          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/admin-login" element={<Navigate to="/login" replace />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          <Route path="/pending-approval" element={<PendingApproval />} />

          {/* CUSTOMER DASHBOARD (Protected) */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="book" element={<BookSessionPage />} />
            <Route path="bookings" element={<MyBookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailsPage />} />
            <Route path="progress" element={<BookingProgressPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="activity" element={<ActivityTrailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ADMIN / STAFF DASHBOARD (Phase 4.1 + 4.2) */}
          <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="photographers" element={<AdminPhotographers />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="photos" element={<AdminPhotos />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="sms" element={<AdminSmsLogs />} />
            <Route path="security" element={<AdminOnlyRoute><AdminSecurity /></AdminOnlyRoute>} />
            <Route path="services" element={<AdminOnlyRoute><AdminServices /></AdminOnlyRoute>} />
            <Route path="settings" element={<AdminOnlyRoute><AdminSettings /></AdminOnlyRoute>} />
            <Route path="staff" element={<AdminOnlyRoute><AdminStaff /></AdminOnlyRoute>} />
            <Route path="cms" element={<AdminOnlyRoute><AdminCMS /></AdminOnlyRoute>} />
            <Route path="workstation" element={<AdminWorkstation />} />
          </Route>

          {/* PHOTOGRAPHER MODULE — Phase 5 */}
          <Route path="/photographer" element={<PhotographerProtectedRoute><PhotographerLayout /></PhotographerProtectedRoute>}>
            <Route index element={<PhotographerDashboard />} />
            <Route path="bookings" element={<PhotographerBookings />} />
            <Route path="availability" element={<PhotographerAvailability />} />
            <Route path="uploads" element={<PhotographerUploads />} />
            <Route path="settings" element={<PhotographerSettings />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<ComingSoon page="Page Not Found" />} />
        </Routes>
      </ErrorBoundary>
    </SiteConfigProvider>
  );
}
