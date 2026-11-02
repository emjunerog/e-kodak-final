import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  Camera,
  Sparkles,
  ArrowRight,
  X,
  Trash2,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerUnifiedNotifications,
  markCustomerNotificationAsRead,
  markAllCustomerNotificationsAsRead,
  clearCustomerNotification,
  clearAllCustomerNotifications
} from '../../services/customerNotificationService';

const TYPE_CONFIG = {
  booking_confirmed: {
    icon: CheckCircle2,
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    label: 'Booking Confirmed'
  },
  booking_submitted: {
    icon: Calendar,
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    label: 'Booking Received'
  },
  booking_status: {
    icon: Layers,
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    label: 'Booking Update'
  },
  payment_recorded: {
    icon: CreditCard,
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    label: 'Payment Confirmed'
  },
  payment_required: {
    icon: CreditCard,
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    label: 'Payment Pending'
  },
  gallery_ready: {
    icon: Camera,
    color: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    label: 'Deliverables Ready'
  },
  ORDER_READY: {
    icon: Camera,
    color: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    label: 'Deliverables Ready'
  },
  message: {
    icon: Sparkles,
    color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    label: 'Studio Notice'
  },
  default: {
    icon: Bell,
    color: 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
    label: 'Studio Notice'
  }
};

function timeAgo(dateString) {
  if (!dateString) return '—';
  const diffSec = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function CustomerNotificationDropdown({ unreadCount: parentUnreadCount = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(parentUnreadCount);
  const [expandedId, setExpandedId] = useState(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await getCustomerUnifiedNotifications(user.id);
      setNotifications(res?.data || []);
      setUnreadCount(typeof res?.unreadCount === 'number' ? res.unreadCount : 0);
    } catch (err) {
      console.warn('Failed to load customer notifications:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('ekodak:customer_notifications_updated', handleUpdate);
    return () => window.removeEventListener('ekodak:customer_notifications_updated', handleUpdate);
  }, [loadNotifications]);

  // Keep unreadCount synchronized with parent if provided
  useEffect(() => {
    if (typeof parentUnreadCount === 'number') {
      setUnreadCount(parentUnreadCount);
    }
  }, [parentUnreadCount]);

  // Click outside and Escape key listeners
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Hover detection: immediately expands full message and marks as read
  const handleItemHover = async (notif) => {
    setExpandedId(notif.id);
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await markCustomerNotificationAsRead(notif.id, user?.id);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      await markCustomerNotificationAsRead(notif.id, user?.id);
    }
    setIsOpen(false);
    if (notif.action_url) {
      navigate(notif.action_url);
    } else if (notif.booking_id) {
      navigate(`/dashboard/bookings/${notif.booking_id}`);
    } else {
      navigate('/dashboard/notifications');
    }
  };

  const handleMarkAsRead = async (notif, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await markCustomerNotificationAsRead(notif.id, user?.id);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllCustomerNotificationsAsRead(user?.id, unreadIds);
  };

  const handleClearAll = async () => {
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    setUnreadCount(0);
    setExpandedId(null);
    await clearAllCustomerNotifications(user?.id, ids);
  };

  const handleClearSingle = async (notif, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    if (!notif.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    await clearCustomerNotification(notif.id, user?.id);
  };

  const displayedList = filter === 'UNREAD'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button (matches exact header icon layout) */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) loadNotifications();
        }}
        aria-label="Studio Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={unreadCount > 0 ? `${unreadCount} unread notices` : 'Studio Notifications'}
        className={`relative h-9 w-9 flex items-center justify-center rounded-full transition-all border outline-none cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-white/[0.14] text-white border-gold/40 shadow-xs ring-2 ring-gold/20'
            : 'text-neutral-300 hover:text-white hover:bg-white/[0.08] border-white/[0.08] hover:border-white/[0.15]'
        }`}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold font-body px-1 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-xs animate-pulse pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Modal / Panel */}
      {isOpen && (
        <div 
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-full mt-2 w-84 sm:w-96 backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 border border-neutral-200/90 dark:border-neutral-700/80 ring-1 ring-black/5 dark:ring-white/10 rounded-2xl shadow-2xl shadow-neutral-900/15 dark:shadow-black/60 overflow-hidden z-50 animate-fade-in font-body flex flex-col max-h-[85vh]"
        >
          {/* Panel Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center text-gold border border-gold/30 shrink-0">
                <Bell size={15} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-primary dark:text-neutral-100 font-heading tracking-wide">
                  Notifications
                </h3>
                <p className="text-xs text-neutral-400">
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-gold hover:text-primary dark:hover:text-gold-light flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gold/10 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-neutral-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Clear all notices"
                  aria-label="Clear all notices"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-primary dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Close notification panel"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3.5 pt-2.5 pb-2 bg-neutral-50/60 dark:bg-neutral-900/60 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List with Hover Auto-Expand and Reading */}
          <div 
            onMouseLeave={() => setExpandedId(null)}
            className="overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 max-h-[360px] pr-0.5 scrollbar-thin"
          >
            {displayedList.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-2">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {filter === 'UNREAD' ? 'All caught up!' : 'No notices to display'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {filter === 'UNREAD' ? 'You have no unread studio notices.' : 'Studio bulletins and updates will appear here.'}
                </p>
              </div>
            ) : (
              displayedList.slice(0, 15).map((notif) => {
                const config = TYPE_CONFIG[notif.notification_type] || TYPE_CONFIG.default;
                const Icon = config.icon;
                const isHoveredOrExpanded = expandedId === notif.id;

                return (
                  <div
                    key={notif.id}
                    onMouseEnter={() => handleItemHover(notif)}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3 sm:p-3.5 hover:bg-neutral-50/90 dark:hover:bg-neutral-800/60 transition-all duration-300 cursor-pointer flex items-start gap-3 relative group ${
                      !notif.is_read
                        ? 'bg-amber-50/30 dark:bg-amber-950/20'
                        : ''
                    }`}
                  >
                    {/* Unread Left Border Highlight */}
                    {!notif.is_read && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-r" />
                    )}

                    {/* Category Icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${config.color} mt-0.5`}>
                      <Icon size={14} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-xs space-y-0.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-primary dark:text-neutral-100 truncate ${!notif.is_read ? 'font-bold' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        <span className="text-xs text-neutral-400 shrink-0">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>

                      {/* Message preview: smoothly opens entire message when hovered, automatically closes other */}
                      <p className={`text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed transition-all duration-300 ${
                        isHoveredOrExpanded ? 'whitespace-pre-line line-clamp-none' : 'line-clamp-2'
                      }`}>
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {notif.booking?.booking_number && (
                          <span className="font-mono text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.2 rounded border border-neutral-200 dark:border-neutral-700">
                            #{notif.booking.booking_number}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-gold uppercase tracking-wider">
                          {config.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Mark read & dismiss */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif, e)}
                          className="text-neutral-300 hover:text-gold p-1 rounded transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleClearSingle(notif, e)}
                        className="text-neutral-300 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Dismiss notification"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer with "View all notifications" redirect link */}
          <div className="p-3 bg-neutral-50/90 dark:bg-neutral-900/90 border-t border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="font-bold text-primary dark:text-neutral-100 hover:text-gold dark:hover:text-gold flex items-center gap-1.5 transition-colors group cursor-pointer"
            >
              <span>View all notifications</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform text-gold" />
            </Link>

            <span className="text-xs text-neutral-400">
              Hover notice to read
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

CustomerNotificationDropdown.propTypes = {
  unreadCount: PropTypes.number
};
