import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen dashboard-gradient-bg flex flex-col font-body">
      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Permanently Fixed Sidebar (stays fixed on screen while content scrolls) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 shadow-sm
          transform transition-transform duration-300 ease-in-out flex flex-col h-screen
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar 
          onClose={() => setSidebarOpen(false)} 
          bookings={bookings} 
          onRequestLogout={() => setLogoutModalOpen(true)}
        />
      </aside>

      {/* Dedicated Session & Studio Schedule Right Drawer */}
      <ScheduleProgressSidebar
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        bookings={bookings}
      />

      {/* Main Content Column — offset by sidebar width on desktop (lg:pl-64) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
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
                <span className="text-[10px] font-bold text-gold-dark uppercase tracking-wider">
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
                  className="btn-primary py-1 px-2.5 text-[10.5px] font-bold rounded-lg shadow-xs"
                >
                  View in Inbox
                </button>
                <button
                  onClick={() => setLiveToast(null)}
                  className="text-[10.5px] text-neutral-400 hover:text-neutral-600 px-1.5"
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

