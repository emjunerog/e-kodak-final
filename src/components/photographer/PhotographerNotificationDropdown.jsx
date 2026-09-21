import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Camera,
  Calendar,
  Sparkles,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getAssignedBookings } from '../../services/photographerService';
import { subscribeCustomerRealtimeNotifications } from '../../services/notificationRealtimeService';

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

export default function PhotographerNotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) return;
    setLoading(true);
    try {
      // 1. Fetch live notifications addressed to this photographer
      const { data: dbNotifs } = await supabase
        .from('notifications')
        .select(`
          id, title, message, notification_type, is_read, created_at, booking_id,
          booking:bookings(id, booking_number)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      // 2. Fetch assigned shoots to generate upcoming shoot call-time notices
      const { data: bookings } = await getAssignedBookings(user.id);
      const bookingNotifs = (bookings || [])
        .filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS')
        .map(b => {
          const bNum = b.booking_number || 'SESSION';
          const cName = b.customer ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim() : 'Client';
          const dateStr = b.event_date ? new Date(b.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'Upcoming';
          return {
            id: `shoot_assigned_${b.id}`,
            booking_id: b.id,
            booking: { id: b.id, booking_number: bNum },
            notification_type: 'SHOOT_ASSIGNED',
            title: `Assigned Shoot: #${bNum}`,
            message: `${cName} · ${b.service?.name || 'Studio Portrait'} scheduled for ${dateStr}${b.preferred_time ? ` at ${b.preferred_time}` : ''}.`,
            created_at: b.updated_at || b.created_at || new Date().toISOString(),
            is_read: false,
            action_url: '/photographer/bookings'
          };
        });

      // Merge and deduplicate
      const list = [...(dbNotifs || []), ...bookingNotifs];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
    } catch (err) {
      console.warn('Photographer notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime notifications for this photographer
    let unsub = () => {};
    if (user?.id) {
      unsub = subscribeCustomerRealtimeNotifications(user.id, () => {
        loadNotifications();
      });
    }

    const handleUpdate = () => loadNotifications();
    window.addEventListener('ekodak:photographer_notifications_updated', handleUpdate);

    return () => {
      unsub();
      window.removeEventListener('ekodak:photographer_notifications_updated', handleUpdate);
    };
  }, [loadNotifications, user?.id]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (notif, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (isSupabaseConfigured && !notif.id.startsWith('shoot_')) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      } catch (err) {
        console.warn('Mark as read error:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
      } catch (err) {
        console.warn('Mark all read error:', err);
      }
    }
  };

  const handleItemClick = (notif) => {
    handleMarkAsRead(notif, { stopPropagation: () => {} });
    setIsOpen(false);
    navigate('/photographer/bookings');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 text-neutral-600 hover:text-primary hover:bg-neutral-100 rounded-xl transition-colors border border-transparent hover:border-neutral-200"
        aria-label="Photographer Notifications"
        title={unreadCount > 0 ? `${unreadCount} unread notices` : 'Studio Notifications'}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold font-body px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-neutral-200 shadow-2xl z-50 overflow-hidden font-body animate-fade-in">
          {/* Header */}
          <div className="p-3 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                <Camera size={12} />
              </div>
              <h3 className="font-heading text-xs font-bold text-primary">
                Photographer Notices
              </h3>
              {unreadCount > 0 && (
                <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] text-neutral-500 hover:text-primary font-semibold flex items-center gap-1"
              >
                <CheckCheck size={12} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 text-xs">
                No active notifications
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3 transition-colors cursor-pointer hover:bg-neutral-50 flex items-start gap-2.5 ${
                    !notif.is_read ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gold/10 text-gold flex items-center justify-center shrink-0 border border-gold/20 mt-0.5">
                    {notif.notification_type === 'SHOOT_ASSIGNED' ? <Calendar size={13} /> : <Sparkles size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-primary truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[9px] text-neutral-400 shrink-0">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 line-clamp-2 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif, e)}
                      className="text-neutral-300 hover:text-gold p-1 shrink-0"
                      title="Mark as read"
                    >
                      <Check size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-neutral-50 border-t border-neutral-100 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/photographer/bookings');
              }}
              className="text-xs font-bold text-gold hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <span>View All Assigned Shoots</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
