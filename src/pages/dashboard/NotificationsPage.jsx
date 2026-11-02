import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CheckCircle,
  Calendar,
  Bell,
  MessageSquare,
  Check,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Camera,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Search,
  X,
  SlidersHorizontal,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationsSkeleton, SmartLoadingContainer } from '../../components/dashboard/skeletons';
import {
  getCustomerUnifiedNotifications,
  markCustomerNotificationAsRead,
  markAllCustomerNotificationsAsRead,
  clearCustomerNotification,
  clearAllCustomerNotifications
} from '../../services/customerNotificationService';
import { requestDesktopNotificationPermission } from '../../services/notificationRealtimeService';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function groupLabel(dateStr) {
  if (!dateStr) return 'Earlier';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days < 7) return 'This Week';
  return 'Earlier';
}

// Minimal understated icon mappings (category colors only through icons)
const TYPE_META = {
  booking_confirmed: { icon: CheckCircle, category: 'Booking', color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70' },
  booking_submitted: { icon: Calendar, category: 'Booking', color: 'text-blue-700 bg-blue-50/90 border-blue-200/70' },
  booking_status: { icon: Bell, category: 'Booking', color: 'text-amber-700 bg-amber-50/90 border-amber-200/70' },
  payment_recorded: { icon: CreditCard, category: 'Payment', color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70' },
  payment_required: { icon: CreditCard, category: 'Payment', color: 'text-amber-700 bg-amber-50/90 border-amber-200/70' },
  system_advisory: { icon: Sparkles, category: 'Studio Update', color: 'text-amber-700 bg-amber-50/90 border-amber-200/70' },
  protocol: { icon: Camera, category: 'Studio Update', color: 'text-purple-700 bg-purple-50/90 border-purple-200/70' },
  message: { icon: MessageSquare, category: 'Studio Update', color: 'text-indigo-700 bg-indigo-50/90 border-indigo-200/70' },
  BROADCAST: { icon: Sparkles, category: 'Studio Update', color: 'text-purple-700 bg-purple-50/90 border-purple-200/70' },
  ORDER_READY: { icon: Camera, category: 'Gallery', color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70' },
  BOOKING_CONFIRMED: { icon: CheckCircle, category: 'Booking', color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70' },
  PAYMENT_RECEIVED: { icon: CreditCard, category: 'Payment', color: 'text-blue-700 bg-blue-50/90 border-blue-200/70' },
  gallery_ready: { icon: Camera, category: 'Gallery', color: 'text-teal-700 bg-teal-50/90 border-teal-200/70' },
  BOOKING_CANCELLED: { icon: AlertCircle, category: 'Booking', color: 'text-rose-700 bg-rose-50/90 border-rose-200/70' },
  BOOKING_DELETED: { icon: AlertCircle, category: 'Booking', color: 'text-rose-700 bg-rose-50/90 border-rose-200/70' },
  default: { icon: Bell, category: 'Notice', color: 'text-neutral-600 bg-neutral-100 border-neutral-200' },
};

function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.default;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);

  // Simplified minimal filters: Tab ('ALL' | 'UNREAD') + Category Dropdown
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'BOOKINGS' | 'PAYMENTS' | 'GALLERY' | 'STUDIO'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeHoveredId, setActiveHoveredId] = useState(null);
  const [notifPermState, setNotifPermState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Live Philippine Time Operating Status (Mon–Sat: 8:00 AM – 5:00 PM PHT)
  const isStudioOpen = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const isSunday = currentDay === 0;
    return !isSunday && currentHour >= 8 && currentHour < 17;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id) => {
    setActiveHoveredId(prev => (prev === id ? null : id));
  };

  // Load unified notifications
  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await getCustomerUnifiedNotifications(user.id);
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Could not refresh studio notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    const handleCustomerUpdate = () => load();
    window.addEventListener('ekodak:customer_notifications_updated', handleCustomerUpdate);
    return () => window.removeEventListener('ekodak:customer_notifications_updated', handleCustomerUpdate);
  }, [load]);

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await markCustomerNotificationAsRead(id, user?.id);
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    setMarking(true);
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await markAllCustomerNotificationsAsRead(user.id, unreadIds);
    setMarking(false);
  };

  // Hover detection: immediately expands this message and automatically closes previous hovered message
  const handleHoverRead = useCallback((notif) => {
    setActiveHoveredId(notif.id);

    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
  }, []);

  // Clear all existing notifications
  const handleClearAll = async () => {
    if (!user) return;
    setMarking(true);
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    setActiveHoveredId(null);
    await clearAllCustomerNotifications(user.id, ids);
    setMarking(false);
  };

  // Clear single notification
  const handleClearSingle = async (notif, e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    setActiveHoveredId(prev => (prev === notif.id ? null : prev));
    await clearCustomerNotification(notif.id, user?.id);
  };

  // Counts
  const totalUnread = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
  const bookingsCount = useMemo(() => notifications.filter(n => n.category === 'BOOKINGS' || n.notification_type?.startsWith('booking') || n.notification_type === 'BOOKING_CONFIRMED' || n.notification_type === 'BOOKING_CANCELLED' || n.notification_type === 'BOOKING_DELETED').length, [notifications]);
  const paymentsCount = useMemo(() => notifications.filter(n => n.category === 'PAYMENTS' || n.notification_type === 'payment_recorded' || n.notification_type === 'PAYMENT_RECEIVED' || n.notification_type === 'payment_required').length, [notifications]);
  const galleryCount = useMemo(() => notifications.filter(n => n.category === 'GALLERY' || n.notification_type === 'gallery_ready' || n.notification_type === 'booking_status' || n.notification_type === 'ORDER_READY').length, [notifications]);
  const studioCount = useMemo(() => notifications.filter(n => n.category === 'STUDIO' || n.notification_type === 'system_advisory' || n.notification_type === 'protocol' || n.notification_type === 'BROADCAST' || n.category === 'BROADCASTS').length, [notifications]);

  // Filtered notifications
  const displayedNotifications = useMemo(() => {
    return notifications.filter(n => {
      // 1. Tab filter (All vs Unread)
      if (tabFilter === 'UNREAD' && n.is_read) return false;

      // 2. Category Dropdown filter
      if (categoryFilter === 'BOOKINGS' && !(n.category === 'BOOKINGS' || n.notification_type?.startsWith('booking') || n.notification_type === 'BOOKING_CONFIRMED' || n.notification_type === 'BOOKING_CANCELLED' || n.notification_type === 'BOOKING_DELETED')) return false;
      if (categoryFilter === 'PAYMENTS' && !(n.category === 'PAYMENTS' || n.notification_type === 'payment_recorded' || n.notification_type === 'PAYMENT_RECEIVED' || n.notification_type === 'payment_required')) return false;
      if (categoryFilter === 'GALLERY' && !(n.category === 'GALLERY' || n.notification_type === 'gallery_ready' || n.notification_type === 'booking_status' || n.notification_type === 'ORDER_READY')) return false;
      if (categoryFilter === 'STUDIO' && !(n.category === 'STUDIO' || n.notification_type === 'system_advisory' || n.notification_type === 'protocol' || n.notification_type === 'BROADCAST' || n.category === 'BROADCASTS')) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = n.title?.toLowerCase().includes(q);
        const messageMatch = n.message?.toLowerCase().includes(q);
        const numberMatch = n.booking?.booking_number?.toLowerCase().includes(q);
        if (!titleMatch && !messageMatch && !numberMatch) return false;
      }

      return true;
    });
  }, [notifications, tabFilter, categoryFilter, searchQuery]);

  // Group by relative date
  const grouped = useMemo(() => {
    return displayedNotifications.reduce((acc, notif) => {
      const g = groupLabel(notif.created_at);
      if (!acc[g]) acc[g] = [];
      acc[g].push(notif);
      return acc;
    }, {});
  }, [displayedNotifications]);

  const GROUP_ORDER = ['Today', 'This Week', 'Earlier'];

  // Contextual actions
  const getContextualAction = (notif) => {
    if (notif.booking_id) {
      return (
        <Link
          to={`/dashboard/bookings/${notif.booking_id}`}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-neutral-300 hover:border-gold hover:text-gold text-neutral-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <span>{['BOOKING_CANCELLED', 'BOOKING_DELETED'].includes(notif.notification_type) ? 'View Status Notice' : 'View Session'}</span>
          <ExternalLink size={12} />
        </Link>
      );
    }
    if (notif.category === 'PAYMENTS' || notif.notification_type?.includes('payment')) {
      return (
        <Link
          to="/dashboard/payments"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-neutral-300 hover:border-gold hover:text-gold text-neutral-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <CreditCard size={12} className="text-gold" />
          <span>View Payments</span>
          <ExternalLink size={12} />
        </Link>
      );
    }
    if (notif.category === 'GALLERY' || notif.notification_type?.includes('gallery') || notif.notification_type === 'ORDER_READY') {
      return (
        <Link
          to="/dashboard/gallery"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-neutral-300 hover:border-gold hover:text-gold text-neutral-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Camera size={12} className="text-gold" />
          <span>View Deliverables</span>
          <ExternalLink size={12} />
        </Link>
      );
    }
    if (notif.category === 'BOOKINGS' || notif.notification_type?.startsWith('booking')) {
      return (
        <Link
          to="/dashboard/bookings"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-neutral-300 hover:border-gold hover:text-gold text-neutral-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Calendar size={12} className="text-gold" />
          <span>My Bookings</span>
          <ExternalLink size={12} />
        </Link>
      );
    }
    return null;
  };

  const categoryLabels = {
    ALL: 'All Categories',
    BOOKINGS: 'Bookings',
    PAYMENTS: 'Payments',
    GALLERY: 'Gallery',
    STUDIO: 'Studio Updates'
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-4 pb-16 font-body animate-fade-in">

      {/* ── 1. Compact Premium E-KODAK Header ─────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#121c2d] border border-neutral-800/90 shadow-sm px-4.5 py-4 sm:px-6 sm:py-4.5 font-body">
        {/* Subtle Ambient Gold Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Left Column: Title & Description */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gold bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                <Bell size={11} className="text-gold" /> Studio Activity Center
              </span>
              {totalUnread > 0 ? (
                <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold font-body px-2.5 py-0.5 rounded-full shadow-xs">
                  {totalUnread} Unread
                </span>
              ) : (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCheck size={11} /> All Caught Up
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-heading text-white font-bold tracking-tight">
              Studio Bulletins & <span className="text-gold italic font-normal">Activity</span>
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 font-body leading-relaxed max-w-xl">
              Stay updated on your bookings, payments, galleries, and studio announcements.
            </p>
          </div>

          {/* Right Column: Studio Open/Closed & Hours, Refresh, Mark All as Read */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-0.5 md:pt-0">
            {/* Compact Studio Operating Status */}
            <div className="inline-flex items-center gap-1.5 text-xs text-neutral-300 bg-neutral-900/85 border border-neutral-700/80 rounded-xl px-3 py-1.5 shadow-xs font-body backdrop-blur-md">
              <span className={`w-2 h-2 rounded-full ${isStudioOpen ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
              <span className="font-semibold text-white">{isStudioOpen ? 'Studio Open' : 'Studio Closed'}</span>
              <span className="text-neutral-600 hidden sm:inline">·</span>
              <span className="text-neutral-400 text-[11px] hidden sm:inline">Mon–Sat 8AM–5PM</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="bg-neutral-900/80 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-700/80 hover:border-neutral-600 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw size={13} className={`text-gold ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Mark All as Read (Visible when unread > 0) */}
            {totalUnread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={marking}
                className="btn-primary py-1.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>Mark all as read</span>
              </button>
            )}

            {/* Clear All Notices */}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={marking}
                className="bg-neutral-900/80 hover:bg-neutral-850 text-neutral-300 hover:text-red-400 border border-neutral-700/80 hover:border-red-900/50 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Clear all notices"
                aria-label="Clear all notices"
              >
                <Trash2 size={13} className="text-red-400" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}

            {/* Push Notifications Toggle */}
            {typeof window !== 'undefined' && 'Notification' in window && notifPermState !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  const res = await requestDesktopNotificationPermission();
                  setNotifPermState(res);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Enable browser push alerts"
              >
                <Bell size={13} />
                <span className="hidden sm:inline">Push Alerts</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Clean Toolbar: All, Unread, Filter Dropdown, and Search ────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
        {/* Filter Controls (All, Unread, Filter Dropdown) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* All */}
          <button
            type="button"
            onClick={() => setTabFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${tabFilter === 'ALL'
                ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200/80 shadow-2xs'
              }`}
          >
            All
          </button>

          {/* Unread */}
          <button
            type="button"
            onClick={() => setTabFilter('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${tabFilter === 'UNREAD'
                ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200/80 shadow-2xs'
              }`}
          >
            <span>Unread</span>
            {totalUnread > 0 && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full font-medium ${tabFilter === 'UNREAD' ? 'bg-gold text-neutral-950 font-bold' : 'bg-neutral-100 text-neutral-600'}`}>
                {totalUnread}
              </span>
            )}
          </button>

          {/* Compact Filter Dropdown (Bookings, Payments, Gallery, Studio) */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${categoryFilter !== 'ALL'
                  ? 'bg-gold/15 text-neutral-900 border border-gold/40 font-semibold'
                  : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200/80 shadow-2xs'
                }`}
            >
              <SlidersHorizontal size={12} className={categoryFilter !== 'ALL' ? 'text-gold' : 'text-neutral-400'} />
              <span>{categoryFilter === 'ALL' ? 'Filter' : categoryLabels[categoryFilter]}</span>
              <ChevronDown size={12} className="text-neutral-400" />
            </button>

            {/* Dropdown Menu */}
            {showFilterDropdown && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-30 font-body animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${categoryFilter === 'ALL' ? 'text-neutral-900 font-semibold bg-neutral-50' : 'text-neutral-600'
                    }`}
                >
                  <span>All Categories</span>
                  <span className="text-neutral-400 text-xs">{notifications.length}</span>
                </button>
                <div className="border-t border-neutral-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('BOOKINGS');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${categoryFilter === 'BOOKINGS' ? 'text-neutral-900 font-semibold bg-neutral-50' : 'text-neutral-600'
                    }`}
                >
                  <span>Bookings</span>
                  <span className="text-neutral-400 text-xs">{bookingsCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('PAYMENTS');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${categoryFilter === 'PAYMENTS' ? 'text-neutral-900 font-semibold bg-neutral-50' : 'text-neutral-600'
                    }`}
                >
                  <span>Payments</span>
                  <span className="text-neutral-400 text-xs">{paymentsCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('GALLERY');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${categoryFilter === 'GALLERY' ? 'text-neutral-900 font-semibold bg-neutral-50' : 'text-neutral-600'
                    }`}
                >
                  <span>Gallery</span>
                  <span className="text-neutral-400 text-xs">{galleryCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('STUDIO');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 cursor-pointer ${categoryFilter === 'STUDIO' ? 'text-neutral-900 font-semibold bg-neutral-50' : 'text-neutral-600'
                    }`}
                >
                  <span>Studio Updates</span>
                  <span className="text-neutral-400 text-xs">{studioCount}</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset Filter if active */}
          {(categoryFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-1.5 py-1 cursor-pointer"
              title="Clear filters"
            >
              Clear
            </button>
          )}
        </div>

        {/* Clean Light Search Field */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bulletins..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-neutral-200/90 rounded-lg text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-gold shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3.5 py-2.5 text-xs">
          <AlertCircle size={14} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 3. Main Notification Container with Space After Each Notification ─ */}
      <SmartLoadingContainer
        loading={loading}
        hasData={notifications.length > 0}
        error={error}
        onRetry={load}
        skeleton={<NotificationsSkeleton />}
        delayMs={220}
        title="Studio Notifications"
      >
        {displayedNotifications.length === 0 ? (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-12 text-center flex flex-col items-center max-w-sm mx-auto shadow-xs">
          <Bell size={20} className="text-neutral-300 mb-2" />
          <h3 className="text-sm font-semibold text-neutral-800 mb-0.5">
            No notifications
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-body">
            {tabFilter === 'UNREAD'
              ? 'You are all caught up. No unread studio notices.'
              : 'There are no notices matching your current filter.'}
          </p>
        </div>
      ) : (
        /* Notifications List with Clean Space After Each Notification */
        <div className="space-y-5">
          {GROUP_ORDER.filter(g => grouped[g]?.length > 0).map((groupName) => (
            <div key={groupName} className="space-y-2.5">
              {/* Subtle Text Separator with Item Count */}
              <div className="px-1 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>{groupName}</span>
                <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                  {grouped[groupName].length}
                </span>
              </div>

              {/* Items Spaced with Clear Separation */}
              <div className="space-y-2.5" onMouseLeave={() => setActiveHoveredId(null)}>
                {grouped[groupName].map(notif => {
                  const meta = getTypeMeta(notif.notification_type);
                  const Icon = meta.icon;
                  const isExpanded = activeHoveredId === notif.id;

                  return (
                    <div
                      key={notif.id}
                      onMouseEnter={() => handleHoverRead(notif)}
                      className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-2xs group ${notif.is_read
                          ? 'bg-white hover:bg-neutral-50/80 border-neutral-200/80'
                          : 'bg-[#fffdfa] hover:bg-[#faf4e6] border-gold/40 shadow-xs'
                        }`}
                    >
                      {/* Scannable Row: icon → title + preview → timestamp → unread dot / chevron */}
                      <div
                        onClick={() => toggleExpand(notif.id)}
                        className="px-4.5 sm:px-5 py-3.5 sm:py-4 flex items-start sm:items-center justify-between gap-3.5 sm:gap-4 cursor-pointer select-none"
                      >
                        {/* 1. Small Understated Icon */}
                        <div className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${meta.color} shadow-2xs mt-0.5 sm:mt-0`}>
                          <Icon size={15} />
                        </div>

                        {/* 2. Title + Preview (Comfortable spacing for long notifications) */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm tracking-tight leading-snug ${notif.is_read ? 'text-neutral-700 font-medium' : 'text-neutral-900 font-bold'}`}>
                              {notif.title}
                            </h3>
                            <span className="hidden sm:inline-block text-xs text-neutral-400 font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                              (Hovered to read)
                            </span>
                          </div>
                          {notif.message && (
                            <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                          )}
                        </div>

                        {/* 3. Timestamp → Unread Dot → Chevron */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-1 mt-0.5 sm:mt-0">
                          <span className="text-[11px] font-medium text-neutral-400 whitespace-nowrap">
                            {relativeTime(notif.created_at)}
                          </span>

                          {/* Subtle Unread Dot */}
                          {!notif.is_read ? (
                            <span
                              className="w-2 h-2 rounded-full bg-gold shrink-0 shadow-2xs ring-2 ring-gold/20"
                              title="Unread bulletin"
                            />
                          ) : (
                            <span className="w-2 h-2 shrink-0" />
                          )}

                          {/* Chevron */}
                          <ChevronDown
                            size={15}
                            className={`text-neutral-400 group-hover:text-neutral-700 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-gold' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Smooth Expanding Section: closes previous smoothly when transfer occurs */}
                      <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                          }`}
                      >
                        <div className="overflow-hidden">
                          <div className="px-4.5 sm:px-6 pb-5 pt-3.5 bg-[#faf8f5] dark:bg-neutral-850/80 border-t border-neutral-100 dark:border-neutral-800 space-y-3.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-200 font-body">
                            <p className="leading-relaxed whitespace-pre-line text-neutral-800 dark:text-neutral-100">
                              {notif.message}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-neutral-200/70 dark:border-neutral-700 text-xs">
                              {/* Metadata only revealed when expanded */}
                              <div className="flex items-center gap-2 text-neutral-400 text-[11px] flex-wrap">
                                <span>{new Date(notif.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                <span>·</span>
                                <span>{meta.category}</span>
                                {notif.booking?.booking_number && (
                                  <>
                                    <span>·</span>
                                    <span className="font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-200/50 dark:bg-neutral-800 px-1.5 py-0.2 rounded border border-neutral-200 dark:border-neutral-700">
                                      #{notif.booking.booking_number}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {getContextualAction(notif)}

                                {!notif.is_read && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsRead(notif.id);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                  >
                                    <Check size={12} className="text-gold" />
                                    <span>Mark read</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => handleClearSingle(notif, e)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Dismiss notice"
                                >
                                  <Trash2 size={12} />
                                  <span>Dismiss</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      </SmartLoadingContainer>
    </div>
  );
}
