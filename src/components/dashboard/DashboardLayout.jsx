import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ScheduleProgressSidebar from './ScheduleProgressSidebar';
import LogoutConfirmModal from './LogoutConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { getCustomerBookings } from '../../services/bookingService';
import { getCustomerUnifiedNotifications } from '../../services/customerNotificationService';
import { trackCustomerPresence } from '../../services/presenceService';
import { subscribeCustomerRealtimeNotifications } from '../../services/notificationRealtimeService';
import { Bell, X, Sparkles, Camera, CreditCard, Calendar, CheckCircle } from 'lucide-react';

export default function DashboardLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isBookingPage = location.pathname === '/dashboard/book' || location.pathname.startsWith('/dashboard/book/');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveToast, setLiveToast] = useState(null);

  // Broadcast live customer presence while browsing customer portal
  useEffect(() => {
    if (!user) return;
    const cleanup = trackCustomerPresence(user, profile);
    return cleanup;
  }, [user, profile]);

  const loadLayoutData = React.useCallback(async () => {
    if (!user) return;
    try {
      const [bookingsRes, notifsRes] = await Promise.all([
        getCustomerBookings(user.id),
        getCustomerUnifiedNotifications(user.id)
      ]);

      if (bookingsRes?.data) setBookings(bookingsRes.data);
      if (typeof notifsRes?.unreadCount === 'number') setUnreadCount(notifsRes.unreadCount);
    } catch (err) {
      console.warn('DashboardLayout load error:', err);
    }
  }, [user]);

  useEffect(() => {
    loadLayoutData();

    const handleUpdate = () => loadLayoutData();
    window.addEventListener('ekodak_bookings_updated', handleUpdate);
    window.addEventListener('ekodak:customer_notifications_updated', handleUpdate);

    const handleLogoutTrigger = () => setLogoutModalOpen(true);
    window.addEventListener('open-logout-confirm', handleLogoutTrigger);

    const handleOpenSchedule = () => setScheduleOpen(true);
    window.addEventListener('open-schedule-drawer', handleOpenSchedule);

    // Supabase Realtime Channel for instant alerts
    let unsubscribeRealtime = () => {};
    if (user?.id) {
      unsubscribeRealtime = subscribeCustomerRealtimeNotifications(user.id, (newNotif) => {
        setUnreadCount(prev => prev + 1);
        setLiveToast(newNotif);
      });
    }

    return () => {
      window.removeEventListener('ekodak_bookings_updated', handleUpdate);
      window.removeEventListener('ekodak:customer_notifications_updated', handleUpdate);
      window.removeEventListener('open-logout-confirm', handleLogoutTrigger);
      window.removeEventListener('open-schedule-drawer', handleOpenSchedule);
      unsubscribeRealtime();
    };
  }, [loadLayoutData, user?.id]);

  // Auto-dismiss live toast after 6 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 6500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Prevent background scrolling while mobile/tablet sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [sidebarOpen]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Auto-close sidebar drawer on route navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogoutConfirm = async () => {
    await signOut();
    navigate('/login');
  };

  const hasActiveBooking = Boolean(
    bookings && bookings.some(b => 
      b.status !== 'CANCELLED' && 
      b.status !== 'REJECTED' && 
      b.status !== 'COMPLETED'
    )
  );

  // Fallback protection if ProtectedRoute fails
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`min-h-screen ${isBookingPage ? 'booking-gradient-bg text-neutral-100' : 'dashboard-gradient-bg text-neutral-900 dark:text-neutral-100'} flex flex-col font-body relative overflow-x-hidden transition-colors duration-500`}>
      {/* ── Premium Photography Studio Atmosphere with Extensive Gradients ──── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Subtle Photographic Studio Background Image with Multi-stop Gradient Blend */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.07] dark:opacity-[0.14] mix-blend-luminosity dark:mix-blend-screen transition-opacity duration-700"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1920&q=80&auto=format&fit=crop')`,
          }}
        />

        {/* Extensive Radial & Linear Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-100/20 to-neutral-200/40 dark:from-transparent dark:via-neutral-950/40 dark:to-neutral-950/80 transition-colors" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-gold/15 dark:from-gold/20 via-amber-500/5 to-transparent blur-[120px] rounded-full" />

        {/* Moving Ambient Gradient Lighting Orbs */}
        {isBookingPage ? (
          <>
            <div className="absolute -top-40 left-1/4 w-[850px] h-[850px] rounded-full bg-gradient-to-b from-gold/25 via-amber-500/10 to-transparent blur-[140px] animate-float-slow-1" />
            <div className="absolute top-1/3 -right-40 w-[800px] h-[800px] rounded-full bg-gradient-to-bl from-amber-600/15 via-gold/10 to-transparent blur-[150px] animate-float-slow-2" />
            <div className="absolute -bottom-40 -left-40 w-[900px] h-[900px] rounded-full bg-gradient-to-tr from-[#121c2d]/70 via-gold/10 to-transparent blur-[160px] animate-float-slow-1" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-amber-300/30 dark:from-gold/20 via-gold/20 dark:via-amber-500/15 to-transparent blur-[130px] animate-float-slow-1" />
            <div className="absolute top-1/4 -right-40 w-[800px] h-[800px] rounded-full bg-gradient-to-bl from-gold/25 dark:from-amber-600/18 via-amber-400/15 dark:via-gold/12 to-transparent blur-[150px] animate-float-slow-2" />
            <div className="absolute -bottom-40 left-1/4 w-[750px] h-[750px] rounded-full bg-gradient-to-tr from-amber-200/35 dark:from-[#121c2d]/75 via-gold/15 dark:via-gold/10 to-transparent blur-[140px] animate-float-slow-1" />
          </>
        )}
      </div>

      {/* Sidebar Backdrop Overlay (for mobile & tablet, or on desktop when booking and sidebar is revealed) */}
      {sidebarOpen && (
        <div 
          className={`fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-40 transition-opacity animate-fade-in ${isBookingPage ? 'block' : 'lg:hidden'}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Permanently Fixed Sidebar (desktop) / Responsive Slide-out Drawer (mobile & tablet) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl
          transform transition-transform duration-300 ease-in-out flex flex-col h-screen
          ${isBookingPage 
            ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') 
            : (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}
        `}
        aria-label="Studio navigation menu"
      >
        <Sidebar 
          onClose={() => setSidebarOpen(false)} 
          bookings={bookings} 
          unreadCount={unreadCount}
          onRequestLogout={() => setLogoutModalOpen(true)}
        />
      </aside>

      {/* Dedicated Session & Studio Schedule Right Drawer */}
      <ScheduleProgressSidebar
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        bookings={bookings}
      />

      {/* Main Content Column — offset by sidebar width on desktop (lg:pl-64), full-width on booking */}
      <div className={`flex-1 flex flex-col min-w-0 ${isBookingPage ? 'lg:pl-0' : 'lg:pl-64'}`}>
        {/* Sticky Header — remains pinned at top of viewport when scrolling */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          unreadCount={unreadCount}
          onRequestLogout={() => setLogoutModalOpen(true)}
          onToggleSchedule={() => setScheduleOpen(prev => !prev)}
          hasActiveBooking={hasActiveBooking}
        />
        
        {/* Main page content area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet context={{ bookings, refreshBookings: loadLayoutData, requestLogout: () => setLogoutModalOpen(true) }} />
        </main>
      </div>

      {/* Real-time Studio Notification Floating Toast */}
      {liveToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl border-2 border-gold/40 shadow-2xl p-3.5 animate-fade-in font-body">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-gold-dark uppercase tracking-wider">
                  New Studio Notice
                </span>
                <button
                  onClick={() => setLiveToast(null)}
                  className="text-neutral-400 hover:text-primary p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
              <h4 className="text-xs font-bold text-primary truncate mt-0.5">
                {liveToast.title}
              </h4>
              <p className="text-[11px] text-neutral-600 line-clamp-2 mt-0.5 leading-snug">
                {liveToast.message}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    setLiveToast(null);
                    navigate('/dashboard/notifications');
                  }}
                  className="btn-primary py-1 px-2.5 text-xs font-bold rounded-lg shadow-xs"
                >
                  View in Inbox
                </button>
                <button
                  onClick={() => setLiveToast(null)}
                  className="text-xs text-neutral-400 hover:text-neutral-600 px-1.5"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Warning Confirmation Dialog */}
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        userEmail={user?.email}
        userName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''}
      />
    </div>
  );
}

