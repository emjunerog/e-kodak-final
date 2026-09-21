import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  Send,
  Sparkles,
  Mail,
  Camera,
  CreditCard,
  Calendar,
  Clock,
  Search,
  X,
  Eye,
  ExternalLink,
  ShieldCheck,
  User,
  Users,
  Smartphone,
  Check,
  ChevronDown,
  Trash2,
  Copy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import StudioDropdown from '../../components/ui/StudioDropdown';
import {
  getUnifiedAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteAdminNotification,
  dispatchMultiChannelNotification,
  generateAIEmailTemplate,
  buildStudioEmailHtml
} from '../../services/adminNotificationService';
import { getDirectEmailUrl, copyRichHtmlToClipboard } from '../../services/notificationRealtimeService';
import { getRecentBookings } from '../../services/adminService';

const fmt = (d) => (!d ? '—' : new Date(d).toLocaleString('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));

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

const TYPE_BADGES = {
  ORDER_READY: {
    icon: Camera,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    label: 'Order Ready'
  },
  PAYMENT_RECEIVED: {
    icon: CreditCard,
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    label: 'Payment Verified'
  },
  BOOKING_CONFIRMED: {
    icon: Calendar,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    label: 'Booking Confirmed'
  },
  BOOKING_PENDING: {
    icon: Clock,
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    label: 'Pending Review'
  },
  BROADCAST: {
    icon: Sparkles,
    color: 'bg-gold/15 text-gold-dark border-gold/30',
    label: 'Studio Bulletin'
  }
};

// ─── Reusable Notification Row ────────────────────────────────────────────────
function NotificationRow({ n, typeConfig, onInspect, onToggleRead, onNavigate, onDelete, onPreviewEmail }) {
  const Icon = typeConfig.icon;

  // Channel status chips
  const channelChips = (n.channels || []).map(ch => {
    const styles = {
      'In-App': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Email':  'bg-blue-50 text-blue-700 border-blue-200',
      'SMS':    'bg-amber-50 text-amber-700 border-amber-200',
    }[ch] || 'bg-neutral-100 text-neutral-600 border-neutral-200';
    return (
      <span key={ch} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${styles}`}>
        ✓ {ch}
      </span>
    );
  });

  return (
    <div
      className={`bg-white rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 sm:p-4 hover:border-gold/40 hover:shadow-warm-sm ${
        !n.is_read
          ? 'border-l-4 border-l-gold border-neutral-200/90 bg-amber-50/10'
          : 'border-neutral-200/80'
      }`}
    >
      {/* Left: icon + content */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${typeConfig.color}`}>
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            {n.booking?.booking_number && (
              <span className="font-mono text-[9.5px] font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200">
                #{n.booking.booking_number}
              </span>
            )}
            {!n.is_read && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                Unread
              </span>
            )}
            <span className="text-[10px] text-neutral-400 ml-auto">{timeAgo(n.created_at)}</span>
          </div>

          <h4 className="text-sm font-bold text-primary leading-snug line-clamp-1">{n.title}</h4>
          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>

          {/* Footer: recipient + channel chips */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] text-neutral-500">
              To: <strong className="text-neutral-700">{n.recipient_name || n.recipient_group || 'All Users'}</strong>
              {n.recipient_count > 1 && (
                <span className="text-[9px] text-neutral-400 ml-1">({n.recipient_count} recipients)</span>
              )}
            </span>
            <div className="flex items-center gap-1">{channelChips}</div>
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap sm:items-center sm:gap-1 pt-1 sm:pt-0">
        {onPreviewEmail && (
          <button
            type="button"
            onClick={onPreviewEmail}
            className="p-1.5 text-gold-dark hover:text-primary hover:bg-gold/15 rounded-lg transition-colors border border-gold/30 text-[10px] flex items-center gap-1 font-semibold"
            title="Review & Preview Branded Email Layout"
          >
            <Mail size={12} className="text-gold" />
            <span className="hidden sm:inline">Preview Email</span>
          </button>
        )}

        <button
          type="button"
          onClick={onInspect}
          className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200/80 text-[10px] flex items-center gap-1"
          title="View Details & Dossier"
        >
          <Eye size={13} />
          <span className="hidden sm:inline">Details</span>
        </button>

        <button
          type="button"
          onClick={onToggleRead}
          className={`p-1.5 rounded-lg transition-colors border text-[10px] flex items-center gap-1 ${
            n.is_read
              ? 'text-neutral-400 border-neutral-200 hover:text-primary hover:bg-neutral-50'
              : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
          }`}
          title={n.is_read ? 'Unread' : 'Mark Read'}
        >
          <Check size={12} />
          <span className="hidden sm:inline">{n.is_read ? 'Read' : 'Mark'}</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-neutral-200 hover:border-red-200 text-[10px] flex items-center gap-1"
            title="Delete this notice / announcement"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}

        {n.recipient_email && (
          <a
            href={getDirectEmailUrl({
              to: n.recipient_email,
              subject: n.title,
              body: n.message,
              preferGmail: true
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 text-[10px] flex items-center gap-1"
            title={`Email ${n.recipient_name || 'Client'} via Gmail`}
          >
            <Mail size={12} />
            <span className="hidden sm:inline">Email</span>
          </a>
        )}

        {n.action_url && (
          <button
            type="button"
            onClick={onNavigate}
            className="p-1.5 text-gold hover:text-primary hover:bg-gold/10 rounded-lg transition-colors border border-gold/30 text-[10px]"
            title="Open Resource"
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminNotifications() {

  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Core state
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    unreadCount: 0,
    ordersReadyCount: 0,
    paymentsCount: 0,
    bookingsCount: 0,
    broadcastsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ORDERS' | 'PAYMENTS' | 'BOOKINGS' | 'BROADCASTS' | 'STAFF'
  const [onlyUnread, setOnlyUnread] = useState(false);

  // Modals & Banners
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [inspectModalNotif, setInspectModalNotif] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [previewEmailModalOpen, setPreviewEmailModalOpen] = useState(false);
  const [previewEmailData, setPreviewEmailData] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Compact Compose Form State
  const [recipientGroup, setRecipientGroup] = useState('SPECIFIC_CUSTOMER'); // 'SPECIFIC_CUSTOMER' | 'ALL_CUSTOMERS' | 'ALL_STAFF' | 'ALL_PHOTOGRAPHERS'
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('ORDER_READY');
  const [channels, setChannels] = useState({ inApp: true, email: true, sms: false });

  // AI Hover Tool State
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiTemplateType, setAiTemplateType] = useState('ORDER_READY');
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const aiMenuRef = useRef(null);

  // Email & SMS State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailHeadline, setEmailHeadline] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCta, setEmailCta] = useState('View Studio Portal');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsGateway, setSmsGateway] = useState('semaphore');
  const [sendingDispatch, setSendingDispatch] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifData, bookRes] = await Promise.all([
        getUnifiedAdminNotifications(),
        getRecentBookings(40)
      ]);

      setNotifications(notifData.notifications || []);
      setStats({
        totalCount: notifData.totalCount || 0,
        unreadCount: notifData.unreadCount || 0,
        ordersReadyCount: notifData.ordersReadyCount || 0,
        paymentsCount: notifData.paymentsCount || 0,
        bookingsCount: notifData.bookingsCount || 0,
        broadcastsCount: notifData.broadcastsCount || 0
      });

      const bookingsList = bookRes.data || [];
      setRecentBookings(bookingsList);

      // Auto-select first booking if not selected
      if (!selectedBookingId && bookingsList.length > 0) {
        const first = bookingsList[0];
        setSelectedBookingId(first.id);
        fillCustomerDetailsFromBooking(first);
      }
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBookingId]);

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(location.search);
    if (params.get('compose') === 'true') {
      setComposeModalOpen(true);
    }

    const handleUpdate = () => loadData();
    window.addEventListener('ekodak:admin_notifications_updated', handleUpdate);
    window.addEventListener('ekodak:customer_notifications_updated', handleUpdate);
    return () => {
      window.removeEventListener('ekodak:admin_notifications_updated', handleUpdate);
      window.removeEventListener('ekodak:customer_notifications_updated', handleUpdate);
    };
  }, [loadData, location.search]);

  // Selected Booking Object
  const selectedBooking = useMemo(() => {
    return recentBookings.find(b => String(b.id) === String(selectedBookingId)) || null;
  }, [recentBookings, selectedBookingId]);

  // Detected Customer & Payment Details Dossier
  const detectedDetails = useMemo(() => {
    if (!selectedBooking) return null;
    const b = selectedBooking;
    const cName = b.customer 
      ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
      : (b.customer_name || 'Client');
    const email = b.customer?.email || 'No email on file';
    const phone = b.customer?.phone || 'No mobile on file';
    const service = b.service?.name || b.tier_name || 'Graduation Portrait Session';
    const total = Number(b.total_amount || 0);
    const down = Number(b.down_payment_amount || 0);
    const remaining = Number(b.remaining_balance ?? (total - down));
    const payStatus = b.payment_status || 'UNPAID';
    const dateStr = b.event_date 
      ? new Date(b.event_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date TBD';
    const timeStr = b.preferred_time ? `at ${b.preferred_time}` : '';

    return {
      name: cName,
      email,
      phone,
      bookingNumber: b.booking_number,
      service,
      schedule: `${dateStr} ${timeStr}`.trim(),
      totalFormatted: `₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      downFormatted: `₱${down.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      remainingFormatted: `₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      payStatus,
      status: b.status || 'PENDING'
    };
  }, [selectedBooking]);

  // Fill customer details and auto-generate template with real detected data
  const fillCustomerDetailsFromBooking = useCallback(async (b, templateType = aiTemplateType) => {
    if (!b) return;
    const cName = b.customer 
      ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
      : 'Client';
    const email = b.customer?.email || '';
    const phone = b.customer?.phone || '';
    const service = b.service?.name || b.tier_name || 'Graduation Portrait';
    const total = Number(b.total_amount || 0);
    const down = Number(b.down_payment_amount || 0);
    const remaining = Number(b.remaining_balance ?? (total - down));
    const totalStr = `₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    const remStr = `₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    const dateStr = b.event_date 
      ? new Date(b.event_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Scheduled Date';

    setTargetName(cName);
    setTargetEmail(email);
    setTargetPhone(phone);

    try {
      const res = await generateAIEmailTemplate({
        type: templateType,
        customerName: cName,
        bookingNumber: b.booking_number,
        serviceName: service,
        eventDate: dateStr,
        amount: totalStr,
        remainingBalance: remStr
      });

      setEmailSubject(res.subject);
      setEmailHeadline(res.headline);
      setEmailBody(res.body);
      setEmailCta(res.callToAction);
      setTitle(res.subject);
      setMessage(res.body);
      setSmsMessage(res.smsText);

      if (templateType === 'ORDER_READY') setNotificationType('ORDER_READY');
      else if (templateType === 'PAYMENT_CONFIRMED') setNotificationType('PAYMENT_RECEIVED');
      else if (templateType === 'SHOOT_REMINDER' || templateType === 'SCHEDULE_UPDATE') setNotificationType('BOOKING_CONFIRMED');
      else setNotificationType('BROADCAST');
    } catch (e) {
      console.warn('Auto template error:', e);
    }
  }, [aiTemplateType]);

  // Dropdown options for StudioDropdown
  const bookingDropdownOptions = useMemo(() => {
    return recentBookings.map((b) => {
      const cName = b.customer 
        ? `${b.customer.first_name || ''} ${b.customer.last_name || ''}`.trim()
        : 'Client';
      const email = b.customer?.email || 'No email';
      const service = b.service?.name || b.tier_name || 'Portrait Session';
      const remaining = Number(b.remaining_balance ?? 0);
      const payStatus = b.payment_status || 'UNPAID';

      return {
        value: b.id,
        label: `#${b.booking_number} — ${cName}`,
        desc: `${service} · ${email} · Rem: ₱${remaining.toLocaleString()} (${payStatus})`,
        badge: payStatus,
        colorBadge: payStatus === 'PAID' ? 'bg-emerald-500' : (payStatus === 'DOWNPAYMENT_PAID' ? 'bg-blue-500' : 'bg-amber-500')
      };
    });
  }, [recentBookings]);

  // Handle selection of booking from StudioDropdown
  const handleSelectBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    const b = recentBookings.find(item => String(item.id) === String(bookingId));
    if (b) {
      fillCustomerDetailsFromBooking(b, aiTemplateType);
    }
  };

  // Generate AI template on template switch or custom prompt
  const handleApplyTemplate = async (templatePreset) => {
    setAiTemplateType(templatePreset);
    setGeneratingAi(true);
    try {
      const b = selectedBooking;
      const bNumber = b?.booking_number || 'BK-2026-0001';
      const sName = b?.service?.name || b?.tier_name || 'Graduation Portrait';
      const totalStr = b?.total_amount ? `₱${Number(b.total_amount).toLocaleString()}` : '₱1,500.00';
      const remStr = b?.remaining_balance !== undefined ? `₱${Number(b.remaining_balance).toLocaleString()}` : '₱0.00';
      const dateStr = b?.event_date 
        ? new Date(b.event_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Scheduled Date';

      const result = await generateAIEmailTemplate({
        type: templatePreset,
        prompt: customAiPrompt.trim(),
        customerName: targetName || 'Valued Client',
        bookingNumber: bNumber,
        serviceName: sName,
        eventDate: dateStr,
        amount: totalStr,
        remainingBalance: remStr
      });

      setEmailSubject(result.subject);
      setEmailHeadline(result.headline);
      setEmailBody(result.body);
      setEmailCta(result.callToAction);
      setTitle(result.subject);
      setMessage(result.body);
      setSmsMessage(result.smsText);

      if (templatePreset === 'ORDER_READY') setNotificationType('ORDER_READY');
      else if (templatePreset === 'PAYMENT_CONFIRMED') setNotificationType('PAYMENT_RECEIVED');
      else if (templatePreset === 'SHOOT_REMINDER' || templatePreset === 'SCHEDULE_UPDATE') setNotificationType('BOOKING_CONFIRMED');
      else setNotificationType('BROADCAST');
    } catch (e) {
      console.error('Template generator error:', e);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Submit Multi-Channel Dispatch
  const handleSendDispatch = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide a notification title and message.');
      return;
    }
    if (!channels.inApp && !channels.email && !channels.sms) {
      alert('Please select at least one delivery channel (In-App, Email, or SMS).');
      return;
    }

    setSendingDispatch(true);
    try {
      const emailHtml = channels.email 
        ? buildStudioEmailHtml({
            subject: emailSubject || title,
            headline: emailHeadline || title,
            body: emailBody || message,
            callToAction: emailCta || 'View Studio Portal',
            customerName: targetName || 'Client',
            bookingNumber: selectedBooking?.booking_number || 'STUDIO'
          })
        : '';

      const result = await dispatchMultiChannelNotification({
        recipientGroup,
        recipientName: targetName || recipientGroup,
        recipientEmail: targetEmail,
        recipientPhone: targetPhone,
        // Pass the actual customer profile ID so fan-out inserts user_id correctly
        specificCustomerId: recipientGroup === 'SPECIFIC_CUSTOMER' ? (selectedBooking?.customer_id || selectedBooking?.customer?.id || null) : null,
        bookingId: selectedBookingId || null,
        bookingNumber: selectedBooking?.booking_number || '',
        title: title.trim(),
        message: message.trim(),
        notificationType,
        channels,
        emailSubject: emailSubject || title,
        emailHtml,
        smsMessage: smsMessage || message,
        smsGateway
      });

      const recipCount = result?.recipientsHit ?? 0;
      const emailStatus = result?.emailStatus === 'sent' ? '(email sent ✓)' : channels.email ? '(email queued)' : '';
      const channelStr = [channels.inApp && 'In-App', channels.email && 'Email', channels.sms && 'SMS'].filter(Boolean).join(', ');
      setActionSuccessMsg(`Dispatched to ${targetName || recipientGroup}${recipCount > 1 ? ` (${recipCount} recipients)` : ''} via ${channelStr} ${emailStatus}`.trim());
      setTimeout(() => setActionSuccessMsg(null), 4500);

      setComposeModalOpen(false);
      setCustomAiPrompt('');
      loadData();
    } catch (err) {
      console.error('Dispatch error:', err);
      alert('Failed to dispatch notification: ' + err.message);
    } finally {
      setSendingDispatch(false);
    }
  };

  // Filtered Notifications Feed
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (onlyUnread && n.is_read) return false;
      if (activeTab === 'ORDERS'   && n.notification_type !== 'ORDER_READY') return false;
      if (activeTab === 'PAYMENTS' && n.notification_type !== 'PAYMENT_RECEIVED') return false;
      if (activeTab === 'BOOKINGS' && !n.notification_type?.includes('BOOKING') && n.category !== 'BOOKINGS') return false;
      if (activeTab === 'BROADCASTS' && n.notification_type !== 'BROADCAST' && n.category !== 'BROADCASTS') return false;
      if (activeTab === 'STAFF' && !['admin','staff','finance','photographer'].includes(n.recipient_role)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.booking?.booking_number || '').toLowerCase().includes(q) ||
        (n.recipient_name || '').toLowerCase().includes(q) ||
        (n.recipient_email || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, activeTab, onlyUnread, searchQuery]);

  // Group filtered notifications by category for section headers
  const groupedNotifications = useMemo(() => {
    if (activeTab !== 'ALL') return null; // Only group in ALL view
    const groups = {};
    filteredNotifications.forEach(n => {
      const cat = n.category || 'BROADCASTS';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(n);
    });
    return groups;
  }, [filteredNotifications, activeTab]);

  // Bulk mark all read
  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications);
    loadData();
  };

  // Single mark read toggle
  const handleToggleRead = async (notif) => {
    await markNotificationAsRead(notif.id);
    loadData();
  };

  // Delete a notification/announcement
  const handleDeleteNotification = async (id, notificationTitle = '') => {
    const isConfirm = window.confirm(
      `Are you sure you want to delete this notification?\n\n"${notificationTitle || 'Selected notification'}"\n\nThis will remove it from all notification feeds.`
    );
    if (!isConfirm) return;

    try {
      await deleteAdminNotification(id);
      setActionSuccessMsg('Notification removed successfully.');
      setTimeout(() => setActionSuccessMsg(null), 3500);
      loadData();
      if (inspectModalNotif?.id === id) {
        setInspectModalNotif(null);
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      alert('Error deleting notification: ' + err.message);
    }
  };

  // Open Preview for a specific notification row or inspect modal
  const handleOpenPreviewForNotif = (notif) => {
    setPreviewEmailData({
      subject: notif.title,
      headline: notif.title,
      body: notif.message,
      callToAction: notif.notification_type === 'ORDER_READY' 
        ? 'View & Download Gallery' 
        : notif.notification_type === 'PAYMENT_RECEIVED'
        ? 'View Digital Receipt'
        : 'View Studio Portal',
      customerName: notif.recipient_name || 'Valued Client',
      bookingNumber: notif.booking?.booking_number || 'STUDIO',
      recipientEmail: notif.recipient_email || ''
    });
    setPreviewEmailModalOpen(true);
  };

  // Open Preview for the active compose draft
  const handleOpenComposePreview = () => {
    setPreviewEmailData({
      subject: emailSubject || title || 'E-Kodak Studio Notification',
      headline: emailHeadline || title || 'E-Kodak Studio Notification',
      body: emailBody || message || 'Notification details will appear here.',
      callToAction: emailCta || 'View Studio Portal',
      customerName: targetName || 'Valued Client',
      bookingNumber: selectedBooking?.booking_number || 'STUDIO',
      recipientEmail: targetEmail || ''
    });
    setPreviewEmailModalOpen(true);
  };

  // Copy rich HTML layout to clipboard (for pasting into Gmail compose)
  const handleCopyEmailLayout = async (htmlToCopy) => {
    const ok = await copyRichHtmlToClipboard(htmlToCopy);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3500);
    } else {
      alert('Unable to copy automatically. Please copy the text from the preview.');
    }
  };

  // Open in Gmail with template
  const handleOpenInGmailWithTemplate = async (data, htmlToCopy) => {
    await copyRichHtmlToClipboard(htmlToCopy);
    const gmailUrl = getDirectEmailUrl({
      to: data?.recipientEmail || '',
      subject: data?.subject || '',
      body: `Hi ${data?.customerName || 'there'},\n\n[Tip: Press Ctrl+V (Paste) right here in Gmail to insert the luxury studio formatted email design!]\n\n${data?.body || ''}`,
      preferGmail: true
    });
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-6 pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Administrative Hero Banner ────────────────────────────── */}
      <AdminHeroBanner
        station="admin"
        badgeLabel="Communications & Dispatch Hub"
        badgeIcon={Bell}
        userName={profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}
        title="Notifications & Multi-Channel Dispatch"
        subtitle="Automated customer alerts, one-tap AI emails, and SMS bulletins with live customer & payment detection."
        statusSummary={`${stats.totalCount} Total Alerts · ${stats.unreadCount} Unread · ${stats.ordersReadyCount} Orders Ready · ${stats.paymentsCount} Payments Verified`}
        primaryAction={{
          label: 'Compose Dispatch',
          icon: Send,
          onClick: () => setComposeModalOpen(true)
        }}
        secondaryAction={{
          label: 'Mark All Read',
          icon: CheckCheck,
          onClick: handleMarkAllRead
        }}
        onRefresh={loadData}
        isRefreshing={loading}
      />

      {/* Action Success Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-fade-in shadow-warm-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 2. Metric Overview Strip (4 Spacious Luxury Cards) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 border border-gold/30">
              <Bell size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              SYSTEM-WIDE
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Bulletins</p>
            <p className="text-2xl font-bold font-heading text-primary mt-0.5">{stats.totalCount}</p>
            <p className="text-xs text-neutral-500 mt-1">Operational dispatch history</p>
          </div>
        </div>

        <div 
          onClick={() => setOnlyUnread(!onlyUnread)}
          className={`bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            onlyUnread ? 'border-gold ring-2 ring-gold/25 shadow-warm-sm' : 'border-neutral-200/80 hover:border-gold/40 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <AlertCircle size={20} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${stats.unreadCount > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {stats.unreadCount > 0 ? 'NEEDS REVIEW' : 'ALL READ'}
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Unread Notices</p>
            <p className="text-2xl font-bold font-heading text-amber-600 mt-0.5">{stats.unreadCount}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {onlyUnread ? 'Showing unread filter (Click to reset)' : 'Click to filter unread alerts only'}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Camera size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={11} /> AUTO TRIGGER
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Automated Milestones</p>
            <p className="text-2xl font-bold font-heading text-emerald-700 mt-0.5">
              {stats.ordersReadyCount + stats.paymentsCount}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {stats.ordersReadyCount} orders ready · {stats.paymentsCount} payments verified
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-gold/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Sparkles size={20} />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              3 CHANNELS
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Foundations</p>
            <p className="text-sm font-bold text-primary mt-0.5">In-App · AI Email · SMS</p>
            <p className="text-xs text-neutral-500 mt-1">Semaphore & PhilSMS gateway foundation</p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Toolbar ────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white via-neutral-50/60 to-neutral-100/30 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL',        label: `All (${stats.totalCount})` },
              { id: 'ORDERS',     label: `Orders (${stats.ordersReadyCount})`, icon: Camera },
              { id: 'PAYMENTS',   label: `Payments (${stats.paymentsCount})`, icon: CreditCard },
              { id: 'BOOKINGS',   label: `Bookings (${stats.bookingsCount})`, icon: Calendar },
              { id: 'BROADCASTS', label: `Broadcasts (${stats.broadcastsCount})`, icon: Sparkles },
              { id: 'STAFF',      label: `Staff (${stats.staffCount ?? 0})`, icon: ShieldCheck },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/60'
                  }`}
                >
                  {tab.icon && <tab.icon size={13} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search alerts, clients, bookings..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary text-xs"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyUnread(!onlyUnread)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                onlyUnread
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <AlertCircle size={13} />
              Unread Only
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-200/60">
          <span>
            Showing <strong>{filteredNotifications.length}</strong> alerts · Automated real-time studio dispatch active
          </span>
          <button
            onClick={() => setComposeModalOpen(true)}
            className="text-xs font-semibold text-gold hover:text-primary flex items-center gap-1 transition-colors"
          >
            <Sparkles size={13} />
            Compose Multi-Channel Dispatch
          </button>
        </div>
      </div>

      {/* ── 4. Main Notifications Feed ─────────────────────────────────────── */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-6 space-y-3 bg-white rounded-2xl border border-neutral-200/80 shadow-xs">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-100/80 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <Bell size={22} />
            </div>
            <h3 className="font-heading text-base font-bold text-primary">
              {activeTab === 'STAFF' ? 'No Staff Notifications' :
               activeTab === 'BROADCASTS' ? 'No Broadcasts Sent Yet' :
               'No notifications match your filter'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {searchQuery || onlyUnread || activeTab !== 'ALL'
                ? 'Try adjusting your search or category filters.'
                : 'Your studio notification center is up to date.'}
            </p>
            <button
              onClick={() => setComposeModalOpen(true)}
              className="mt-4 btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 shadow-xs"
            >
              <Send size={13} />
              Compose Dispatch
            </button>
          </div>
        ) : activeTab === 'ALL' && groupedNotifications ? (
          /* ── Categorized view with section dividers (ALL tab only) ── */
          ['ORDERS', 'PAYMENTS', 'BOOKINGS', 'BROADCASTS'].map(cat => {
            const rows = groupedNotifications[cat];
            if (!rows || rows.length === 0) return null;
            const catMeta = {
              ORDERS:     { label: 'Orders & Deliverables', icon: Camera,     color: 'text-emerald-700', bg: 'bg-emerald-50' },
              PAYMENTS:   { label: 'Financial & Payments',  icon: CreditCard, color: 'text-blue-700',   bg: 'bg-blue-50' },
              BOOKINGS:   { label: 'Booking Lifecycle',      icon: Calendar,   color: 'text-amber-700',  bg: 'bg-amber-50' },
              BROADCASTS: { label: 'Admin Broadcasts',       icon: Sparkles,   color: 'text-purple-700', bg: 'bg-purple-50' },
            }[cat];
            const CatIcon = catMeta.icon;
            return (
              <div key={cat} className="space-y-2">
                {/* Category Section Header */}
                <div className="flex items-center gap-2 px-1 pt-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${catMeta.bg} ${catMeta.color}`}>
                    <CatIcon size={13} />
                  </div>
                  <h3 className={`text-[11px] font-bold uppercase tracking-wider ${catMeta.color}`}>{catMeta.label}</h3>
                  <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">{rows.length}</span>
                  <div className="flex-1 h-px bg-neutral-200/70" />
                </div>
                {rows.map(n => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    typeConfig={TYPE_BADGES[n.notification_type] || TYPE_BADGES.BROADCAST}
                    onInspect={() => setInspectModalNotif(n)}
                    onToggleRead={() => handleToggleRead(n)}
                    onNavigate={() => navigate(n.action_url)}
                    onDelete={() => handleDeleteNotification(n.id, n.title)}
                    onPreviewEmail={() => handleOpenPreviewForNotif(n)}
                  />
                ))}
              </div>
            );
          })
        ) : (
          /* ── Filtered tab view — flat list ── */
          filteredNotifications.map((n) => (
            <NotificationRow
              key={n.id}
              n={n}
              typeConfig={TYPE_BADGES[n.notification_type] || TYPE_BADGES.BROADCAST}
              onInspect={() => setInspectModalNotif(n)}
              onToggleRead={() => handleToggleRead(n)}
              onNavigate={() => navigate(n.action_url)}
              onDelete={() => handleDeleteNotification(n.id, n.title)}
              onPreviewEmail={() => handleOpenPreviewForNotif(n)}
            />
          ))
        )}
      </div>

      {/* ── 5. ULTRA-COMPACT 2-COLUMN DISPATCH MODAL WITH IN-BODY HOVER AI TOOLS ── */}
      {composeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-neutral-200 shadow-2xl flex flex-col font-body overflow-hidden h-[88vh] max-h-[700px] min-h-[520px]">
            {/* Compact Modal Header */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-b border-neutral-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                  <Send size={13} />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-primary leading-tight">
                    Multi-Channel Dispatch
                  </h3>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    In-App, Branded Email, and Telco SMS with auto-detected client balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComposeModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form: Compact 2-Column Grid */}
            <form onSubmit={handleSendDispatch} className="p-3.5 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-3 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch flex-1 min-h-0">
                {/* ── LEFT COLUMN: Audience & Auto-Detected Dossier (5 cols) ── */}
                <div className="lg:col-span-5 space-y-2.5 lg:border-r lg:border-neutral-200/80 lg:pr-3.5 flex flex-col overflow-y-auto pr-1">
                  {/* Compact Recipient Group Selector */}
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Recipient Audience
                    </label>
                    <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-0.5 rounded-xl text-xs">
                      {[
                        { id: 'SPECIFIC_CUSTOMER', label: 'Client' },
                        { id: 'ALL_CUSTOMERS', label: 'Customers' },
                        { id: 'ALL_STAFF', label: 'Staff & Ops' },
                        { id: 'FINANCE_TEAM', label: 'Finance' },
                        { id: 'ALL_PHOTOGRAPHERS', label: 'Photographers' },
                        { id: 'ALL_USERS', label: 'All Users' },
                      ].map(aud => (
                        <button
                          key={aud.id}
                          type="button"
                          onClick={() => setRecipientGroup(aud.id)}
                          className={`py-1 px-1 rounded-lg font-semibold transition-all text-[9.5px] text-center truncate ${
                            recipientGroup === aud.id
                              ? 'bg-primary text-white shadow-xs'
                              : 'text-neutral-600 hover:text-primary'
                          }`}
                        >
                          {aud.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Channels Inline Pills */}
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Delivery Channels
                    </label>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <label className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer text-[10px] transition-all ${
                        channels.inApp ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : 'bg-white text-neutral-400 border-neutral-200'
                      }`}>
                        <input
                          type="checkbox"
                          checked={channels.inApp}
                          onChange={e => setChannels({ ...channels, inApp: e.target.checked })}
                          className="sr-only"
                        />
                        <Bell size={11} />
                        <span>In-App</span>
                      </label>

                      <label className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer text-[10px] transition-all ${
                        channels.email ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold' : 'bg-white text-neutral-400 border-neutral-200'
                      }`}>
                        <input
                          type="checkbox"
                          checked={channels.email}
                          onChange={e => setChannels({ ...channels, email: e.target.checked })}
                          className="sr-only"
                        />
                        <Mail size={11} />
                        <span>Email</span>
                      </label>

                      <label className={`py-1 px-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer text-[10px] transition-all ${
                        channels.sms ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold' : 'bg-white text-neutral-400 border-neutral-200'
                      }`}>
                        <input
                          type="checkbox"
                          checked={channels.sms}
                          onChange={e => setChannels({ ...channels, sms: e.target.checked })}
                          className="sr-only"
                        />
                        <Smartphone size={11} />
                        <span>SMS</span>
                      </label>
                    </div>
                  </div>

                  {/* Booking Selection with StudioDropdown */}
                  {recipientGroup === 'SPECIFIC_CUSTOMER' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          Select Client Booking
                        </label>
                        <span className="text-[9px] text-neutral-400">
                          {recentBookings.length} Bookings
                        </span>
                      </div>

                      {/* Custom Searchable StudioDropdown */}
                      <StudioDropdown
                        value={selectedBookingId}
                        onChange={handleSelectBooking}
                        options={bookingDropdownOptions}
                        placeholder="Search client booking..."
                        searchable={true}
                        className="w-full"
                        triggerClassName="py-1 text-xs rounded-xl border-neutral-300 bg-white"
                      />

                      {/* Compact Detected Customer Dossier */}
                      {detectedDetails && (
                        <div className="p-2 bg-gradient-to-br from-amber-50/40 via-white to-neutral-50 rounded-xl border border-amber-200/70 text-xs space-y-1.5 animate-fade-in shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                              <User size={10} className="text-gold" />
                              Detected Client Dossier
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              #{detectedDetails.bookingNumber}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <div className="bg-white/80 p-1 rounded-lg border border-neutral-200/60 truncate">
                              <span className="text-neutral-400 block text-[7.5px] uppercase">Client Name</span>
                              <strong className="text-primary truncate block text-[10px]">{detectedDetails.name}</strong>
                            </div>
                            <div className="bg-white/80 p-1 rounded-lg border border-neutral-200/60 truncate">
                              <span className="text-neutral-400 block text-[7.5px] uppercase">Email Address</span>
                              <span className="text-neutral-700 truncate block text-[10px]">{detectedDetails.email}</span>
                            </div>
                            <div className="bg-white/80 p-1 rounded-lg border border-neutral-200/60 truncate">
                              <span className="text-neutral-400 block text-[7.5px] uppercase">Phone</span>
                              <span className="text-neutral-700 truncate block text-[10px]">{detectedDetails.phone}</span>
                            </div>
                            <div className="bg-white/80 p-1 rounded-lg border border-neutral-200/60 truncate">
                              <span className="text-neutral-400 block text-[7.5px] uppercase">Studio Package</span>
                              <span className="text-neutral-700 truncate block text-[10px]">{detectedDetails.service}</span>
                            </div>
                          </div>

                          <div className="px-2 py-1 rounded-lg bg-amber-50/90 border border-amber-200/60 text-[9.5px] flex items-center justify-between">
                            <span className="text-neutral-600">Remaining Balance:</span>
                            <strong className="text-gold-dark font-mono font-bold">{detectedDetails.remainingFormatted} ({detectedDetails.payStatus})</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs space-y-1">
                      <div className="flex items-center gap-1 font-bold text-neutral-700 text-[10px]">
                        <Users size={12} className="text-gold" />
                        <span>Broadcast Target</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-snug">
                        {recipientGroup === 'ALL_CUSTOMERS' && 'Will dispatch to all customer accounts across chosen channels.'}
                        {recipientGroup === 'ALL_STAFF' && 'Will broadcast to all active studio administrators, frontdesk staff, and operations crew.'}
                        {recipientGroup === 'FINANCE_TEAM' && 'Will notify the studio finance and accounting officers regarding ledgers and payments.'}
                        {recipientGroup === 'ALL_PHOTOGRAPHERS' && 'Will alert all studio photographers and lab specialists.'}
                        {recipientGroup === 'ALL_USERS' && 'Will broadcast an all-hands bulletin to everyone across the studio.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── RIGHT COLUMN: Title, In-Body AI Hover Tool, & Message (7 cols) ── */}
                <div className="lg:col-span-7 flex flex-col gap-2 min-h-0 flex-1">
                  {/* Title / Subject Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                        Notification Title / Subject
                      </label>
                      {channels.email && (
                        <button
                          type="button"
                          onClick={handleOpenComposePreview}
                          className="text-[9.5px] font-bold text-gold hover:text-primary flex items-center gap-1"
                        >
                          <Eye size={10} />
                          Preview Email
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={title}
                      onChange={e => {
                        setTitle(e.target.value);
                        setEmailSubject(e.target.value);
                      }}
                      required
                      placeholder="e.g. Your Graduation Portrait Proofs are Ready!"
                      className="w-full px-3 py-1.5 bg-neutral-50/60 border border-neutral-200 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white"
                    />
                  </div>

                  {/* ── INTEGRATED MESSAGE BODY WITH EMBEDDED HOVER AI ICON ── */}
                  <div className="flex flex-col flex-1 gap-1 min-h-0">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                        Message Body
                      </label>
                      <span className="text-[9px] text-neutral-400">
                        In-App &amp; Email
                      </span>
                    </div>

                    {/* Integrated Textarea Container */}
                    <div className="relative rounded-xl border border-neutral-200 bg-neutral-50/60 focus-within:bg-white focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/30 transition-all flex flex-col flex-1 min-h-[140px]">
                      <textarea
                        value={message}
                        onChange={e => {
                          setMessage(e.target.value);
                          setEmailBody(e.target.value);
                        }}
                        required
                        placeholder="Type notification message here, or hover over the ✨ AI icon to insert live client templates..."
                        className="flex-1 w-full p-2.5 pr-10 bg-transparent text-xs font-body outline-none leading-relaxed resize-none text-primary placeholder:text-neutral-400 min-h-[100px]"
                      />

                      {/* ── EMBEDDED AI HOVER ICON BUTTON ──────────────────── */}
                      <div
                        ref={aiMenuRef}
                        className="absolute top-2 right-2 z-20"
                        onMouseEnter={() => setAiMenuOpen(true)}
                        onMouseLeave={() => setAiMenuOpen(false)}
                      >
                        <button
                          type="button"
                          onClick={() => setAiMenuOpen(prev => !prev)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            aiMenuOpen
                              ? 'bg-gold text-white shadow-md ring-2 ring-gold/30 scale-105'
                              : 'bg-gold/15 text-gold hover:bg-gold hover:text-white border border-gold/30 shadow-2xs'
                          }`}
                          title="AI Templates: Hover to view tools"
                        >
                          <Sparkles size={12} className={generatingAi ? "animate-spin" : ""} />
                        </button>

                        {/* Floating Tool Popover Anchored to the Icon */}
                        {aiMenuOpen && (
                          <div 
                            className="absolute right-0 top-full mt-1 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200 shadow-2xl p-2.5 z-50 animate-fade-in font-body space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gold-dark flex items-center gap-1">
                                <Sparkles size={11} className="text-gold" />
                                AI Template Tools
                              </span>
                              <span className="text-[8px] text-neutral-400 bg-neutral-100 px-1 py-0.2 rounded font-semibold">
                                Live Injections
                              </span>
                            </div>

                            {/* Quick Presets */}
                            <div className="space-y-0.5">
                              {[
                                { id: 'ORDER_READY', label: '📸 Order & Proofs Ready' },
                                { id: 'PAYMENT_CONFIRMED', label: '💳 Payment Received & Receipt' },
                                { id: 'SHOOT_REMINDER', label: '⏰ Shoot Day Call-Time' },
                                { id: 'SCHEDULE_UPDATE', label: '📅 Reschedule & Update' },
                                { id: 'STUDIO_ANNOUNCEMENT', label: '📢 Studio Season Bulletin' },
                              ].map(t => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    handleApplyTemplate(t.id);
                                    setAiMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg text-[10.5px] transition-colors flex items-center justify-between ${
                                    aiTemplateType === t.id
                                      ? 'bg-gold/15 text-gold-dark font-bold'
                                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary'
                                  }`}
                                >
                                  <span>{t.label}</span>
                                  {aiTemplateType === t.id && <Check size={11} className="text-gold" />}
                                </button>
                              ))}
                            </div>

                            {/* Custom AI Instruction Bar */}
                            <div className="pt-1.5 border-t border-neutral-100 space-y-1">
                              <span className="text-[9px] font-bold text-neutral-500 block">Custom AI Prompt:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={customAiPrompt}
                                  onChange={e => setCustomAiPrompt(e.target.value)}
                                  placeholder="e.g. Free 8x10 print apology..."
                                  className="w-full px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-[10.5px] outline-none focus:ring-1 focus:ring-gold"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleApplyTemplate(aiTemplateType);
                                      setAiMenuOpen(false);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleApplyTemplate(aiTemplateType);
                                    setAiMenuOpen(false);
                                  }}
                                  disabled={generatingAi}
                                  className="btn-primary py-1 px-2 text-[10px] shrink-0 flex items-center gap-1"
                                >
                                  {generatingAi ? <RefreshCw size={9} className="animate-spin" /> : <Sparkles size={9} />}
                                  <span>Draft</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compact SMS Section (Only shown if SMS is active) */}
                  {channels.sms && (
                    <div className="p-2 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-1 animate-fade-in text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 flex items-center gap-1 text-[9.5px]">
                          <Smartphone size={11} className="text-amber-600" />
                          Direct SMS Payload:
                        </span>
                        <span className="text-[8.5px] text-neutral-500 font-mono">
                          {smsMessage.length} / 160 chars ({Math.ceil(smsMessage.length / 160) || 1} credit)
                        </span>
                      </div>

                      <input
                        type="text"
                        value={smsMessage}
                        onChange={e => setSmsMessage(e.target.value)}
                        placeholder="Short SMS text..."
                        className="w-full px-2 py-1 bg-white border border-neutral-200 rounded-lg text-[10.5px] font-mono outline-none focus:ring-1 focus:ring-gold"
                      />

                      <div className="flex items-center justify-between text-[8.5px] text-neutral-500 pt-0.5">
                        <div className="flex items-center gap-1">
                          <span>Gateway:</span>
                          <select
                            value={smsGateway}
                            onChange={e => setSmsGateway(e.target.value)}
                            className="bg-white border border-neutral-200 rounded px-1 py-0.5 text-[8.5px] font-semibold outline-none"
                          >
                            <option value="semaphore">Semaphore PH</option>
                            <option value="philsms">PhilSMS</option>
                            <option value="twilio">Twilio Global</option>
                          </select>
                        </div>
                        <span className="text-emerald-700 font-bold">✓ Telco Active</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ultra-Compact Footer Actions */}
              <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[9.5px] text-neutral-400 truncate">
                  Target: <strong className="text-neutral-700">{targetName || recipientGroup}</strong>
                  {channels.email && targetEmail && ` · ${targetEmail}`}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {channels.email && targetEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        const htmlToCopy = buildStudioEmailHtml({
                          subject: emailSubject || title || 'E-Kodak Studio Notification',
                          headline: emailHeadline || title || 'E-Kodak Studio Notification',
                          body: emailBody || message || '',
                          callToAction: emailCta || 'View Studio Portal',
                          customerName: targetName || 'Valued Client',
                          bookingNumber: selectedBooking?.booking_number || 'STUDIO'
                        });
                        handleOpenInGmailWithTemplate({
                          recipientEmail: targetEmail,
                          subject: emailSubject || title,
                          customerName: targetName,
                          body: emailBody || message
                        }, htmlToCopy);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Copies branded email layout and opens pre-filled Gmail compose in 1 click"
                    >
                      <Mail size={12} className="text-blue-600" />
                      <span>Open in Gmail</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setComposeModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={sendingDispatch}
                    className="btn-primary py-1.5 px-3.5 text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    {sendingDispatch ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                    <span>Dispatch All</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Branded HTML Email Preview Modal ────────────────────────────── */}
      {previewEmailModalOpen && (() => {
        const activeEmailData = previewEmailData || {
          subject: emailSubject || title || 'E-Kodak Studio Notification',
          headline: emailHeadline || title || 'E-Kodak Studio Notification',
          body: emailBody || message || 'Notification content will appear here...',
          callToAction: emailCta || 'View Studio Portal',
          customerName: targetName || 'Valued Client',
          bookingNumber: selectedBooking?.booking_number || 'STUDIO',
          recipientEmail: targetEmail || ''
        };

        const renderedPreviewHtml = buildStudioEmailHtml({
          subject: activeEmailData.subject,
          headline: activeEmailData.headline,
          body: activeEmailData.body,
          callToAction: activeEmailData.callToAction,
          customerName: activeEmailData.customerName,
          bookingNumber: activeEmailData.bookingNumber
        });

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl flex flex-col font-body max-h-[92vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-b border-neutral-200/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30 shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm sm:text-base font-bold text-primary leading-tight flex items-center gap-2">
                      Live Branded HTML Email Preview
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Gmail Ready
                      </span>
                    </h4>
                    <p className="text-[10.5px] text-neutral-400 leading-tight">
                      Exact luxury layout delivered to customer inboxes with 100% inline CSS
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewEmailModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-primary rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Email Metadata Strip */}
              <div className="px-5 py-2.5 bg-neutral-50 border-b border-neutral-200/60 flex items-center justify-between gap-2 text-xs flex-wrap shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[11px] text-neutral-500">
                    To: <strong className="text-neutral-800">{activeEmailData.customerName}</strong>
                    {activeEmailData.recipientEmail && (
                      <span className="text-neutral-400 ml-1 font-mono text-[10.5px]">({activeEmailData.recipientEmail})</span>
                    )}
                  </span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-[11px] text-neutral-500 truncate">
                    Subject: <strong className="text-neutral-800">{activeEmailData.subject}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-neutral-600 bg-white px-2 py-0.5 rounded-md border border-neutral-200 shrink-0">
                  #{activeEmailData.bookingNumber || 'STUDIO'}
                </span>
              </div>

              {/* Email Canvas Preview Container */}
              <div className="p-4 sm:p-6 bg-[#f7f6f2] overflow-y-auto flex-1 flex justify-center items-start min-h-0 shadow-inner">
                <div
                  className="w-full max-w-[580px] bg-white rounded-2xl shadow-xl overflow-hidden border border-[#e8e5dc] transition-all"
                  dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                />
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3 bg-white border-t border-neutral-200/80 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopyEmailLayout(renderedPreviewHtml)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                      copySuccess
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                        : 'bg-gold/10 text-gold-dark hover:bg-gold hover:text-white border-gold/30 shadow-2xs'
                    }`}
                    title="Copy formatted rich HTML layout to clipboard so you can paste (Ctrl+V) directly into Gmail compose"
                  >
                    {copySuccess ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copySuccess ? 'Layout Copied! Paste in Gmail (Ctrl+V)' : 'Copy Formatted Layout for Gmail'}</span>
                  </button>

                  {activeEmailData.recipientEmail && (
                    <button
                      type="button"
                      onClick={() => handleOpenInGmailWithTemplate(activeEmailData, renderedPreviewHtml)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-2 transition-all shadow-2xs"
                      title="Copies formatted email to clipboard and opens Gmail compose pre-addressed"
                    >
                      <Mail size={14} className="text-blue-600" />
                      <span>Open in Gmail</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewEmailModalOpen(false)}
                  className="btn-primary px-5 py-2 text-xs font-semibold shrink-0"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 7. Inspect Notification Details Modal ──────────────────────────── */}
      {inspectModalNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-neutral-200 shadow-2xl space-y-4 font-body">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-widest">
                  Alert Inspection &amp; Review
                </span>
                <h3 className="font-heading text-base font-bold text-primary mt-0.5">
                  {inspectModalNotif.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectModalNotif(null)}
                className="p-1.5 text-neutral-400 hover:text-primary rounded-lg hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs space-y-2">
              <p className="text-neutral-700 leading-relaxed font-body">
                {inspectModalNotif.message}
              </p>

              <div className="pt-2 border-t border-neutral-200/60 grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
                <div>
                  <span className="text-neutral-400 block">Created / Sent:</span>
                  <span className="font-semibold text-primary">{fmt(inspectModalNotif.created_at)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Recipient:</span>
                  <span className="font-semibold text-primary">{inspectModalNotif.recipient_name || 'System Wide'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Channels:</span>
                  <span className="font-semibold text-gold">{inspectModalNotif.channels?.join(', ') || 'In-App'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Booking Link:</span>
                  <span className="font-semibold text-primary">{inspectModalNotif.booking?.booking_number ? `#${inspectModalNotif.booking.booking_number}` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleDeleteNotification(inspectModalNotif.id, inspectModalNotif.title);
                }}
                className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Delete this notice from all feeds"
              >
                <Trash2 size={13} />
                <span>Delete Notice</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenPreviewForNotif(inspectModalNotif);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-gold/40 bg-gold/10 text-gold-dark hover:bg-gold hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Review & Preview Branded Email Layout"
                >
                  <Mail size={13} />
                  <span>Preview Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleToggleRead(inspectModalNotif);
                    setInspectModalNotif(null);
                  }}
                  className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {inspectModalNotif.is_read ? 'Mark Unread' : 'Mark Read'}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectModalNotif(null)}
                  className="btn-primary px-4 py-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
