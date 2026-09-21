import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  Bell, 
  MessageSquare, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Loader2, 
  CreditCard,
  Camera,
  ExternalLink,
  Sparkles,
  Filter,
  CheckCheck,
  ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getCustomerUnifiedNotifications, 
  markCustomerNotificationAsRead, 
  markAllCustomerNotificationsAsRead 
} from '../../services/customerNotificationService';
import { requestDesktopNotificationPermission } from '../../services/notificationRealtimeService';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours   < 24) return `${hours}h ago`;
  if (days    < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function groupLabel(dateStr) {
  if (!dateStr) return 'Earlier';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1)  return 'Today';
  if (days < 7)  return 'This Week';
  return 'Earlier';
}

const TYPE_META = {
  booking_confirmed:   { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50', badge: 'Confirmed' },
  booking_submitted:   { icon: Calendar,      color: 'text-blue-500',    bg: 'bg-blue-50',    badge: 'Registered' },
  booking_status:      { icon: Bell,          color: 'text-gold',        bg: 'bg-gold/10',    badge: 'Status' },
  payment_recorded:    { icon: CreditCard,    color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'Payment' },
  payment_required:    { icon: CreditCard,    color: 'text-amber-600',   bg: 'bg-amber-50',   badge: 'Due' },
  system_advisory:     { icon: Sparkles,      color: 'text-amber-500',   bg: 'bg-amber-50',   badge: 'Advisory' },
  protocol:            { icon: Camera,        color: 'text-purple-500',  bg: 'bg-purple-50',  badge: 'Protocol' },
  message:             { icon: MessageSquare, color: 'text-indigo-500',  bg: 'bg-indigo-50',  badge: 'Staff' },
  // Admin dispatch types received on customer dashboard
  BROADCAST:           { icon: Sparkles,      color: 'text-purple-600',  bg: 'bg-purple-50',  badge: 'Studio Bulletin' },
  ORDER_READY:         { icon: Camera,        color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'Ready' },
  BOOKING_CONFIRMED:   { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50', badge: 'Confirmed' },
  PAYMENT_RECEIVED:    { icon: CreditCard,    color: 'text-blue-600',    bg: 'bg-blue-50',    badge: 'Verified' },
  // Gallery / proofs ready
  gallery_ready:       { icon: Camera,        color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'Gallery Ready' },
  default:             { icon: Bell,          color: 'text-neutral-500', bg: 'bg-neutral-100', badge: 'Notice' },
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
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'BOOKINGS' | 'PAYMENTS' | 'STUDIO'
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [notifPermState, setNotifPermState] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Load unified notifications (Supabase + Booking Lifecycles)
  const load = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    load();
    // Re-load when admin dispatches a notification to this customer
    const handleCustomerUpdate = () => load();
    window.addEventListener('ekodak:customer_notifications_updated', handleCustomerUpdate);
    return () => window.removeEventListener('ekodak:customer_notifications_updated', handleCustomerUpdate);
  }, [load]);

  // Mark single as read
  const handleMarkAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await markCustomerNotificationAsRead(id, user?.id);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    setMarking(true);
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await markAllCustomerNotificationsAsRead(user.id, unreadIds);
    setMarking(false);
  };

  // Filtered notifications
  const displayedNotifications = notifications.filter(n => {
    if (filter === 'UNREAD')   return !n.is_read;
    if (filter === 'BOOKINGS') return n.category === 'BOOKINGS' || n.notification_type?.startsWith('booking') || n.notification_type === 'BOOKING_CONFIRMED';
    if (filter === 'PAYMENTS') return n.category === 'PAYMENTS' || n.notification_type === 'payment_recorded' || n.notification_type === 'PAYMENT_RECEIVED' || n.notification_type === 'payment_required';
    if (filter === 'GALLERY')  return n.category === 'GALLERY' || n.notification_type === 'gallery_ready' || n.notification_type === 'booking_status' || n.notification_type === 'ORDER_READY';
    if (filter === 'STUDIO')   return n.category === 'STUDIO' || n.notification_type === 'system_advisory' || n.notification_type === 'protocol' || n.notification_type === 'BROADCAST' || n.category === 'BROADCASTS';
    return true;
  });

  // Group notifications by relative date
  const grouped = displayedNotifications.reduce((acc, notif) => {
    const g = groupLabel(notif.created_at);
    if (!acc[g]) acc[g] = [];
    acc[g].push(notif);
    return acc;
  }, {});

  const GROUP_ORDER = ['Today', 'This Week', 'Earlier'];
  const totalUnread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-16">

      {/* ── Editorial Header with Luxury Gradient ─────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-950 via-neutral-900 to-primary p-6 sm:p-8 shadow-xl border border-neutral-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/15 border border-gold/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Bell size={11} /> Studio Notifications Dispatch
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading text-white font-bold tracking-tight flex items-center gap-3">
              Studio Bulletins & Activity
              {totalUnread > 0 && (
                <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold font-body px-2.5 py-0.5 rounded-full shadow-xs">
                  {totalUnread} Unread
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-body max-w-xl leading-relaxed">
              Real-time systematic notices regarding your photoshoot bookings, payment acknowledgments, call-time reminders, and gallery releases.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {typeof window !== 'undefined' && 'Notification' in window && notifPermState !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  const res = await requestDesktopNotificationPermission();
                  setNotifPermState(res);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-all flex items-center gap-1.5 shadow-xs"
                title="Enable browser push alerts on desktop/mobile"
              >
                <Bell size={13} /> Enable Push Alerts
              </button>
            )}
            <button
              onClick={load}
              className="btn-ghost-white py-2 px-3 text-xs flex items-center gap-1.5"
              title="Refresh Notifications"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            {totalUnread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={marking}
                className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5 shadow-md shadow-gold/20"
              >
                <CheckCheck size={14} /> Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: 'ALL',      label: 'All Notices',  count: notifications.length },
            { id: 'UNREAD',   label: 'Unread',       count: totalUnread },
            { id: 'BOOKINGS', label: 'Bookings',     count: notifications.filter(n => n.category === 'BOOKINGS' || n.notification_type?.startsWith('booking') || n.notification_type === 'BOOKING_CONFIRMED').length },
            { id: 'PAYMENTS', label: 'Payments',     count: notifications.filter(n => n.category === 'PAYMENTS' || n.notification_type === 'payment_recorded' || n.notification_type === 'PAYMENT_RECEIVED').length },
            { id: 'GALLERY',  label: 'Gallery',      count: notifications.filter(n => n.category === 'GALLERY' || n.notification_type === 'gallery_ready' || n.notification_type === 'ORDER_READY').length },
            { id: 'STUDIO',   label: 'Studio Ops',   count: notifications.filter(n => n.category === 'STUDIO' || n.notification_type === 'BROADCAST' || n.category === 'BROADCASTS').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === tab.id
                  ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-primary font-bold shadow-xs'
                  : 'bg-neutral-800/80 text-neutral-300 border border-neutral-700 hover:border-gold/40'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-body ${filter === tab.id ? 'bg-primary/20 text-primary' : 'bg-neutral-700 text-neutral-300'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-xs font-body">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-gold" />
          <p className="text-xs text-neutral-400 font-body uppercase tracking-wider">Syncing studio bulletins...</p>
        </div>
      ) : displayedNotifications.length === 0 ? (
        /* Empty state for active filter */
        <div className="bg-white rounded-3xl p-12 border border-neutral-200 text-center flex flex-col items-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4 text-neutral-400">
            <Bell size={26} />
          </div>
          <h3 className="font-heading text-lg text-primary font-bold mb-1">
            {filter === 'UNREAD' ? 'No Unread Notices' : 'No Bulletins Found'}
          </h3>
          <p className="text-neutral-500 font-body text-xs max-w-sm">
            {filter === 'UNREAD'
              ? 'All notifications have been reviewed. You are completely up to date.'
              : 'There are no active records in this category.'}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="btn-outline text-xs mt-4"
            >
              View All Notifications
            </button>
          )}
        </div>
      ) : (
        /* Grouped Notifications List */
        <div className="space-y-8">
          {GROUP_ORDER.filter(g => grouped[g]?.length > 0).map(groupName => (
            <div key={groupName} className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-body">
                  {groupName}
                </h2>
                <span className="text-[11px] text-neutral-400 font-body">
                  {grouped[groupName].length} notice{grouped[groupName].length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2.5">
                {grouped[groupName].map(notif => {
                  const meta = getTypeMeta(notif.notification_type);
                  const Icon = meta.icon;
                  const isExpanded = expandedIds.has(notif.id);

                  return (
                    <div
                      key={notif.id}
                      className={`bg-white dark:bg-neutral-900 rounded-2xl border transition-all overflow-hidden ${
                        notif.is_read
                          ? 'border-neutral-200/90 dark:border-neutral-800 shadow-2xs hover:shadow-sm'
                          : 'border-gold/40 shadow-sm ring-1 ring-gold/20 bg-gradient-to-r from-white via-amber-50/10 to-white dark:from-neutral-900 dark:via-neutral-800/40 dark:to-neutral-900'
                      }`}
                    >
                      {/* Compact Clickable Header: Displays Header text, timestamps, quick mark-as-read, and expand indicator */}
                      <div
                        onClick={() => toggleExpand(notif.id)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Type Icon */}
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color} shadow-2xs`}>
                            <Icon size={16} />
                          </div>

                          {/* Header Text & Badge */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-[10px] font-body font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0 hidden sm:inline-block">
                              {meta.badge}
                            </span>
                            <h3 className={`font-heading text-xs sm:text-sm truncate ${notif.is_read ? 'text-primary dark:text-neutral-200 font-medium' : 'text-primary dark:text-neutral-100 font-bold'}`}>
                              {notif.title}
                            </h3>
                          </div>
                        </div>

                        {/* Right side: Timestamp, Quick Mark as Read button & Chevron */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-[11px] text-neutral-400 font-body whitespace-nowrap">
                            {relativeTime(notif.created_at)}
                          </span>

                          {/* Quick Mark As Read Button */}
                          {!notif.is_read ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notif.id);
                              }}
                              title="Mark as read"
                              className="px-2.5 py-1 text-[11px] font-semibold text-gold bg-gold/15 hover:bg-gold hover:text-primary rounded-lg transition-all flex items-center gap-1 border border-gold/30 shrink-0 active:scale-95"
                            >
                              <Check size={12} />
                              <span className="hidden sm:inline">Mark as read</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-body text-emerald-600 dark:text-emerald-400 hidden sm:inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                              <CheckCheck size={11} /> Read
                            </span>
                          )}

                          {/* Gold unread status pip */}
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full bg-gold shrink-0 shadow-xs animate-pulse" />
                          )}

                          {/* Expand/Collapse Chevron */}
                          <div className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                            <ChevronDown
                              size={15}
                              className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180 text-gold' : ''}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Overall Details (Revealed when clicked) */}
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/60 space-y-3 animate-fade-in text-xs">
                          <p className="text-neutral-700 dark:text-neutral-300 font-body leading-relaxed text-xs sm:text-sm">
                            {notif.message}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                            <div className="flex items-center gap-3 text-neutral-500 font-body text-[11px]">
                              <span>Timestamp: {new Date(notif.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              {notif.booking?.booking_number && (
                                <span className="font-bold text-gold bg-gold/15 px-2 py-0.5 rounded-md">
                                  #{notif.booking.booking_number}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {notif.booking_id && (
                                <Link
                                  to={`/dashboard/bookings/${notif.booking_id}`}
                                  className="btn-outline py-1 px-3 text-xs flex items-center gap-1.5"
                                >
                                  <span>View Session</span>
                                  <ExternalLink size={12} />
                                </Link>
                              )}

                              {!notif.is_read && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="btn-primary py-1 px-3 text-xs flex items-center gap-1.5 shadow-xs"
                                >
                                  <Check size={12} />
                                  <span>Mark as read</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
