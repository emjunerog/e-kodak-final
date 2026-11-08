/**
 * App.jsx
 * =======
 * ROOT APPLICATION ROUTER
 */

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// ── Global Components ─────────────────────────────────────────────────────────
import ScrollToTop from "./components/layout/ScrollToTop";
import AIAssistant from "./components/ai/AIAssistant";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute";
import AdminOnlyRoute from "./components/auth/AdminOnlyRoute";
import PhotographerProtectedRoute from "./components/auth/PhotographerProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { SiteConfigProvider } from "./context/SiteConfigContext";

// ── Public & Auth Pages (Eagerly loaded for instant first paint) ──────────────
import Home from "./pages/Home";
import Services from "./pages/Services";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import PublicPassPage from "./pages/PublicPassPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthCallback from "./pages/auth/AuthCallback";
import PendingApproval from "./pages/auth/PendingApproval";

// ── Customer Dashboard Pages (Lazy-loaded route chunks) ───────────────────────
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const BookSessionPage = lazy(() => import("./pages/dashboard/BookSessionPage"));
const BookingDetailsPage = lazy(() => import("./pages/dashboard/BookingDetailsPage"));
const SoftCopiesPage = lazy(() => import("./pages/dashboard/SoftCopiesPage"));
const NotificationsPage = lazy(() => import("./pages/dashboard/NotificationsPage"));
const ActivityTrailPage = lazy(() => import("./pages/dashboard/ActivityTrailPage"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const BookingProgressPage = lazy(() => import("./pages/dashboard/BookingProgressPage"));
const PaymentsPage = lazy(() => import("./pages/dashboard/PaymentsPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));

// ── Admin Pages (Lazy-loaded route chunks) ────────────────────────────────────
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminPhotographers = lazy(() => import("./pages/admin/AdminPhotographers"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPhotos = lazy(() => import("./pages/admin/AdminPhotos"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminSmsLogs = lazy(() => import("./pages/admin/AdminSmsLogs"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminBookingDetail = lazy(() => import("./pages/admin/AdminBookingDetail"));
const AdminActivityLogsPage = lazy(() => import("./pages/admin/AdminActivityLogsPage"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminYearbookGenerator = lazy(() => import("./pages/admin/AdminYearbookGenerator"));

// ── Photographer Pages (Lazy-loaded route chunks) ─────────────────────────────
const PhotographerLayout = lazy(() => import("./components/photographer/PhotographerLayout"));
const PhotographerDashboard = lazy(() => import("./pages/photographer/PhotographerDashboard"));
const PhotographerBookings = lazy(() => import("./pages/photographer/PhotographerBookings"));
const PhotographerAvailability = lazy(() => import("./pages/photographer/PhotographerAvailability"));
const PhotographerUploads = lazy(() => import("./pages/photographer/PhotographerUploads"));
const PhotographerActivityLogs = lazy(() => import("./pages/photographer/PhotographerActivityLogs"));
const PhotographerSettings = lazy(() => import("./pages/photographer/PhotographerSettings"));
const PhotographerProfile = lazy(() => import("./pages/photographer/PhotographerProfile"));

function RouteFallback() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full min-h-[65vh] p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse select-none transition-opacity duration-300">
      <div className="h-10 w-48 sm:w-64 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-32 rounded-3xl bg-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60" />
        <div className="h-32 rounded-3xl bg-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60" />
        <div className="h-32 rounded-3xl bg-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/60" />
      </div>
      <div className="h-72 rounded-3xl bg-neutral-200/60 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-800" />
    </div>
  );
}

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

// Helper to preserve query strings on redirect (e.g. payment_status=success)
function RedirectWithSearch({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

export default function App() {
  return (
    <SiteConfigProvider>
      <ScrollToTop />
      <AIAssistant />

      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            <Route path="/privacy" element={<Legal slug="privacy" />} />
            <Route path="/terms" element={<Legal slug="terms" />} />
            <Route path="/pass" element={<PublicPassPage />} />

            {/* Direct aliases & Xendit callback redirects (preserving search parameters) */}
            <Route path="/book" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/book-session" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/booking" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/bookings" element={<RedirectWithSearch to="/dashboard/bookings" />} />
            <Route path="/payment-return" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/payment-success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/payments/success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/payment_success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/payment/success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/checkout-return" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/checkout-success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/checkout/success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/booking-success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/booking/success" element={<RedirectWithSearch to="/dashboard/book" />} />
            <Route path="/tracker" element={<Navigate to="/pass" replace />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<Navigate to="/login" replace />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* CUSTOMER DASHBOARD (Protected) */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="book" element={<BookSessionPage />} />
              <Route path="book-session" element={<BookSessionPage />} />
              <Route path="booking" element={<BookSessionPage />} />
              <Route path="payment-return" element={<BookSessionPage />} />
              <Route path="payment-success" element={<BookSessionPage />} />
              <Route path="checkout-return" element={<BookSessionPage />} />
              <Route path="checkout-success" element={<BookSessionPage />} />
              <Route path="booking-success" element={<BookSessionPage />} />
              <Route path="bookings" element={<BookingDetailsPage />} />
              <Route path="bookings/:id" element={<BookingDetailsPage />} />
              <Route path="progress" element={<BookingProgressPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="soft-copies" element={<SoftCopiesPage />} />
              <Route path="gallery" element={<SoftCopiesPage />} />
              <Route path="activity" element={<ActivityTrailPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* ADMIN DASHBOARD */}
            <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="done-orders" element={<AdminBookings initialSection="COMPLETED" />} />
              <Route path="trash" element={<AdminBookings initialSection="DELETED" />} />
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
              <Route path="yearbook" element={<AdminYearbookGenerator />} />
              <Route path="activity-logs" element={<AdminActivityLogsPage />} />
              <Route path="workstation" element={<Navigate to="/admin/activity-logs" replace />} />
            </Route>

            {/* PHOTOGRAPHER MODULE — Phase 5 */}
            <Route path="/photographer" element={<PhotographerProtectedRoute><PhotographerLayout /></PhotographerProtectedRoute>}>
              <Route index element={<PhotographerDashboard />} />
              <Route path="bookings" element={<PhotographerBookings />} />
              <Route path="availability" element={<PhotographerAvailability />} />
              <Route path="uploads" element={<PhotographerUploads />} />
              <Route path="activity-logs" element={<PhotographerActivityLogs />} />
              <Route path="settings" element={<PhotographerSettings />} />
              <Route path="profile" element={<PhotographerProfile />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<ComingSoon page="Page Not Found" />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </SiteConfigProvider>
  );
}
