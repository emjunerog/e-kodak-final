import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Camera,
  CreditCard,
  Calendar,
  Sparkles,
  ExternalLink,
  X,
  Send,
  ArrowRight,
  Clock
} from 'lucide-react';
import {
  getUnifiedAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../../services/adminNotificationService';
import { subscribeAdminRealtimeNotifications } from '../../services/notificationRealtimeService';

const TYPE_CONFIG = {
  ORDER_READY: {
    icon: Camera,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    label: 'Order Ready'
  },
  PAYMENT_RECEIVED: {
    icon: CreditCard,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    label: 'Payment Paid'
  },
  BOOKING_CONFIRMED: {
    icon: Calendar,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    label: 'Confirmed'
  },
  BOOKING_PENDING: {
    icon: Clock,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    label: 'Pending Review'
  },
  BROADCAST: {
    icon: Sparkles,
    color: 'text-gold bg-gold/10 border-gold/30',
    label: 'Broadcast'
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

export default function AdminNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getUnifiedAdminNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to load admin notifications in header:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => loadNotifications();
    window.addEventListener('ekodak:admin_notifications_updated', handleUpdate);
    const unsub = subscribeAdminRealtimeNotifications(() => {
      loadNotifications();
    });

    return () => {
      window.removeEventListener('ekodak:admin_notifications_updated', handleUpdate);
      unsub();
    };
  }, [loadNotifications]);

  // Handle outside click & Escape key
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

  const handleMarkAsRead = async (notif, e) => {
    e.stopPropagation();
    await markNotificationAsRead(notif.id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications);
    loadNotifications();
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.action_url) {
      navigate(notif.action_url);
    } else {
      navigate('/admin/notifications');
    }
  };

  const displayedList = filter === 'UNREAD' 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-full transition-all border outline-none ${
          isOpen
            ? 'bg-neutral-100 text-primary border-gold/40 shadow-xs ring-2 ring-gold/20'
            : 'text-neutral-500 hover:text-primary hover:bg-neutral-100 border-transparent'
        }`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-bold font-body px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Modal / Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 shadow-2xl shadow-neutral-900/15 overflow-hidden z-50 animate-fade-in font-body flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-b border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center text-gold">
                <Bell size={15} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-primary font-heading tracking-wide">
                  Notifications
                </h3>
                <p className="text-[10px] text-neutral-400">
                  {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-gold hover:text-primary flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gold/10 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3.5 pt-2.5 pb-2 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-neutral-500 hover:text-primary hover:bg-neutral-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filter === 'UNREAD'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-neutral-500 hover:text-primary hover:bg-neutral-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="overflow-y-auto divide-y divide-neutral-100 max-h-[380px] pr-0.5">
            {displayedList.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-2">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-semibold text-neutral-600">
                  {filter === 'UNREAD' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {filter === 'UNREAD' ? 'You have no unread studio alerts.' : 'Operational updates will appear here automatically.'}
                </p>
              </div>
            ) : (
              displayedList.slice(0, 15).map((n) => {
                const config = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.BROADCAST;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`p-3 sm:p-3.5 hover:bg-neutral-50/80 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      !n.is_read ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Unread indicator bar */}
                    {!n.is_read && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-r" />
                    )}

                    {/* Category Icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${config.color}`}>
                      <Icon size={14} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`font-bold text-primary truncate ${!n.is_read ? 'font-bold' : 'font-medium'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {n.booking?.booking_number && (
                          <span className="font-mono text-[9px] font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded">
                            #{n.booking.booking_number}
                          </span>
                        )}
                        <span className="text-[9px] font-semibold text-gold uppercase tracking-wider">
                          {config.label}
                        </span>
                        {n.channels && n.channels.length > 0 && (
                          <span className="text-[9px] text-neutral-400">
                            via {n.channels.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(n, e)}
                        className="text-neutral-300 hover:text-gold p-1 shrink-0 rounded"
                        title="Mark as read"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-neutral-50/80 border-t border-neutral-200/80 flex items-center justify-between gap-2 text-xs">
            <Link
              to="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-primary hover:text-gold flex items-center gap-1 transition-colors"
            >
              <span>View All in Center</span>
              <ArrowRight size={12} />
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/notifications?compose=true');
              }}
              className="px-2.5 py-1 rounded-lg bg-gold/15 text-gold font-bold hover:bg-gold/25 transition-all flex items-center gap-1"
            >
              <Send size={11} />
              <span>Compose</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
