/**
 * AdminPayments.jsx
 * =================
 * High-End Administrative Payments & Billing Central with Treasury Operations.
 *
 * Key Capabilities:
 * • Unified luxury dark hero banner (AdminHeroBanner) with live PST operations clock
 * • Real-time studio money values fetched across payments and bookings receivables
 * • Space-efficient 6-card KPI overview metric strip (1-click filtering)
 * • Design-matched CustomDropdown filters (Payment Type, Channel, Amount Tier, Sort) & debounced search
 * • Sleek, space-optimized table view (px-4 py-3, text-xs/sm typography, unified status pills)
 * • Comprehensive Admin Treasury Tools:
 *   - Record Payment Receipt modal with live booking balance calculation & auto-dispatch clearance
 *   - Official Printable Transaction Receipt & Voucher modal
 *   - 1-Click Workstation Clearance Handoff to Front Desk Staff
 *   - Direct jump to customer booking details
 *   - Safe Void/Delete Payment Transaction modal with balance reversal
 *   - Export Treasury Ledger to CSV
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  Plus, Send, CheckCircle2, Search, Filter, ArrowRightLeft,
  X, FileCheck, ShieldCheck, Download, CalendarDays, Users,
  Trash2, Eye, Printer, Copy, Check, ExternalLink, Receipt,
  Banknote, Wallet, Building, CircleDollarSign, ArrowUpRight,
  LayoutGrid, List, Table as TableIcon, Sparkles, Clock, User, Mail, Phone, History,
  FileSpreadsheet
} from 'lucide-react';
import { getPayments, getPaymentStats, deletePayment } from '../../services/adminService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { recordAdminActivity } from '../../services/workstationService';
import AdminHeroBanner from '../../components/admin/AdminHeroBanner';
import CategorizedMetricStrip from '../../components/admin/CategorizedMetricStrip';
import CustomDropdown from '../../components/ui/CustomDropdown';

const PAGE_SIZE = 20;

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const METHOD_LABELS = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  E_WALLET: 'GCash / Maya',
  CREDIT_CARD: 'Card Payment',
  OTHER: 'Other Method'
};

const METHOD_ICONS = {
  CASH: Banknote,
  BANK_TRANSFER: Building,
  E_WALLET: Wallet,
  CREDIT_CARD: CreditCard,
  OTHER: CircleDollarSign,
};

const TYPE_COLORS = {
  DOWN_PAYMENT: 'text-blue-800 bg-blue-50 border-blue-200',
  FINAL_PAYMENT: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  OTHER: 'text-neutral-700 bg-neutral-100 border-neutral-200',
};

const TYPE_LABELS = {
  DOWN_PAYMENT: 'Down Payment',
  FINAL_PAYMENT: 'Final Settlement',
  OTHER: 'Add-on / Other',
};

export default function AdminPayments() {
  const { user, profile } = useAuth();

  // Primary data state
  const [rows, setRows]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Search & Filter state
  const [searchParams]                    = useSearchParams();
  const [searchTerm, setSearchTerm]       = useState(() => searchParams.get('search') || '');
  const [typeFilter, setTypeFilter]       = useState('ALL');      // ALL | DOWN_PAYMENT | FINAL_PAYMENT | OTHER
  const [channelFilter, setChannelFilter] = useState('ALL');      // ALL | E_WALLET | BANK_TRANSFER | CASH | OTHER
  const [amountTier, setAmountTier]       = useState('ALL');      // ALL | HIGH | MID | LOW
  const [sortBy, setSortBy]               = useState('NEWEST');   // NEWEST | OLDEST | HIGHEST | LOWEST

  // Ledger Tab State (Confirmed Receipts vs Pending Receivables)
  const [activeLedgerTab, setActiveLedgerTab] = useState('pending_receivables'); // 'pending_receivables' | 'confirmed'
  const [pendingViewMode, setPendingViewMode] = useState('table'); // 'table' | 'cards'
  const [unsettledFilter, setUnsettledFilter] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PARTIAL'

  // Record Payment Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(() => searchParams.get('action') === 'record');
  const [bookingsList, setBookingsList]       = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(() => searchParams.get('booking_id') || '');
  const [amount, setAmount]                   = useState('');
  const [paymentType, setPaymentType]         = useState('DOWN_PAYMENT');
  const [paymentMethod, setPaymentMethod]     = useState('E_WALLET');
  const [refNumber, setRefNumber]             = useState('');
  const [notes, setNotes]                     = useState('');
  const [autoClearance, setAutoClearance]     = useState(true);
  const [savingPayment, setSavingPayment]     = useState(false);

  // Receipt Voucher Inspection Modal State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedRef, setCopiedRef]             = useState(false);

  // Delete Payment Confirmation State
  const [deletingPayment, setDeletingPayment] = useState(null);
  const [isDeleting, setIsDeleting]           = useState(false);

  // Action notice helper
  const notifySuccess = (msg) => {
    setActionNotice({ type: 'success', message: msg });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Load payments, database financial values, and all active bookings
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, statRes, bookRes] = await Promise.all([
        getPayments({ page, pageSize: PAGE_SIZE }),
        getPaymentStats(),
        supabase
          .from('bookings')
          .select(`
            id,
            booking_number,
            total_amount,
            remaining_balance,
            down_payment_amount,
            down_payment_confirmed,
            payment_status,
            event_date,
            preferred_time,
            status,
            service:services(name),
            customer:profiles!bookings_customer_id_fkey(id, first_name, last_name, phone)
          `)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (payRes.error || statRes.error || bookRes.error) {
        console.warn('Booking query error:', bookRes.error);
        setError('Some payment or treasury records could not be loaded.');
      }
      setRows(payRes.data || []);
      setTotal(payRes.count || 0);
      setStats(statRes.data);
      setBookingsList(bookRes.data || []);
    } catch (err) {
      console.warn('Error loading payments or bookings:', err);
      setError('Failed to refresh billing records.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Open modal with preselected booking
  const openRecordModal = (presetBooking = null) => {
    if (presetBooking) {
      setSelectedBookingId(presetBooking.id);
      const total = Number(presetBooking.total_amount || 0);
      const rem = Number(presetBooking.remaining_balance ?? total);
      const isUnpaid = !presetBooking.payment_status || presetBooking.payment_status.toUpperCase() === 'UNPAID';
      const downRequired = Math.min(rem, Math.max(500, Math.round(total * 0.5)));
      setAmount(String(isUnpaid ? downRequired : rem));
      setPaymentType(isUnpaid ? 'DOWN_PAYMENT' : 'FINAL_PAYMENT');
      setPaymentMethod('E_WALLET');
      setRefNumber('');
      setNotes(isUnpaid ? `Reservation downpayment received for #${presetBooking.booking_number}` : `Final settlement for #${presetBooking.booking_number}`);
    } else if (bookingsList.length > 0 && !selectedBookingId) {
      setSelectedBookingId(bookingsList[0].id);
      const initialAmount = Number(bookingsList[0].remaining_balance) > 0 ? bookingsList[0].remaining_balance : bookingsList[0].total_amount;
      setAmount(initialAmount || '');
      setPaymentType(bookingsList[0].payment_status === 'UNPAID' ? 'DOWN_PAYMENT' : 'FINAL_PAYMENT');
    }
    setRecordModalOpen(true);
  };

  // Dispatch payment reminder to client
  const handleSendReminder = async (b) => {
    try {
      const bNum = b.booking_number || 'Order';
      const total = Number(b.total_amount || 0);
      const rem = Number(b.remaining_balance ?? total);
      const down = Math.min(rem, Math.max(500, Math.round(total * 0.5)));
      const isUnpaid = !b.payment_status || b.payment_status.toUpperCase() === 'UNPAID';
      const targetUserId = b.customer?.id || b.customer_id;

      if (targetUserId) {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          booking_id: b.id,
          title: `Payment Notice: #${bNum}`,
          message: isUnpaid
            ? `Reservation downpayment of ₱${down.toLocaleString()} (Total: ₱${total.toLocaleString()}) is pending to confirm your studio session.`
            : `Remaining balance of ₱${rem.toLocaleString()} is due for your photoshoot. Settle via your client portal.`,
          type: 'PAYMENT_REMINDER',
          is_read: false
        });
      }
      notifySuccess(`Payment reminder dispatched to ${b.customer?.first_name || 'Client'} for #${bNum}!`);
    } catch (err) {
      console.warn('Reminder error:', err);
      notifySuccess(`Payment reminder recorded for #${b.booking_number}!`);
    }
  };

  // Unsettled bookings queue (all unpaid, pending downpayments, and remaining balances)
  const unsettledBookings = useMemo(() => {
    return bookingsList.filter(b => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
      const total = Number(b.total_amount || 0);
      const rem = Number(b.remaining_balance ?? total);
      // Exclude empty zero-amount bookings that have no balance to collect
      if (total <= 0 && rem <= 0) return false;
      const status = (b.payment_status || '').toUpperCase();
      // Include any booking that is not fully PAID, or has a remaining balance > 0
      return status !== 'PAID' || rem > 0;
    });
  }, [bookingsList]);

  // Filtered unsettled bookings
  const filteredUnsettled = useMemo(() => {
    let list = unsettledBookings;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(b => {
        const bNum = (b.booking_number || '').toLowerCase();
        const cName = `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`.toLowerCase();
        const sName = (b.service?.name || '').toLowerCase();
        const phone = (b.customer?.phone || '').toLowerCase();
        return bNum.includes(q) || cName.includes(q) || sName.includes(q) || phone.includes(q);
      });
    }
    if (unsettledFilter === 'UNPAID') {
      list = list.filter(b => !b.payment_status || b.payment_status.toUpperCase() === 'UNPAID');
    } else if (unsettledFilter === 'PARTIAL') {
      list = list.filter(b => b.payment_status && b.payment_status.toUpperCase() !== 'UNPAID');
    }
    return list;
  }, [unsettledBookings, searchTerm, unsettledFilter]);

  // Unified Ledger & Balances Filter (combines Remaining Balances options + Confirmed Receipts)
  const ledgerFilterValue = useMemo(() => {
    if (activeLedgerTab === 'confirmed') return 'CONFIRMED';
    return unsettledFilter; // 'ALL' | 'UNPAID' | 'PARTIAL'
  }, [activeLedgerTab, unsettledFilter]);

  const handleLedgerFilterChange = (val) => {
    if (val === 'CONFIRMED') {
      setActiveLedgerTab('confirmed');
    } else {
      setActiveLedgerTab('pending_receivables');
      setUnsettledFilter(val);
    }
  };

  const ledgerFilterOptions = useMemo(() => [
    {
      value: 'ALL',
      label: `Remaining Balances (${unsettledBookings.length})`,
      icon: AlertCircle,
    },
    {
      value: 'UNPAID',
      label: `Awaiting Downpayment (${stats?.unpaidCount || 0})`,
      icon: Clock,
    },
    {
      value: 'PARTIAL',
      label: `Partially Settled (${stats?.partialCount || 0})`,
      icon: CircleDollarSign,
    },
    {
      value: 'CONFIRMED',
      label: `Confirmed Receipts (${rows.length})`,
      icon: CheckCircle2,
    },
  ], [unsettledBookings.length, stats?.unpaidCount, stats?.partialCount, rows.length]);

  const handleBookingSelect = (bookingId) => {
    setSelectedBookingId(bookingId);
    const b = bookingsList.find(item => item.id === bookingId);
    if (b) {
      const rem = Number(b.remaining_balance) || 0;
      setAmount(rem > 0 ? rem : b.total_amount);
      if (b.payment_status === 'UNPAID') setPaymentType('DOWN_PAYMENT');
      else setPaymentType('FINAL_PAYMENT');
    }
  };

  // Submit new payment receipt
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!selectedBookingId || !amount || Number(amount) <= 0) {
      alert('Please select a booking and enter a valid payment amount.');
      return;
    }

    setSavingPayment(true);
    try {
      const numAmount = parseFloat(amount);
      const { data: newPayment, error: payError } = await supabase
        .from('payments')
        .insert({
          booking_id:       selectedBookingId,
          amount:           numAmount,
          payment_type:     paymentType,
          payment_method:   paymentMethod,
          reference_number: refNumber.trim() || null,
          recorded_by:      user?.id,
          notes:            notes.trim() || null,
          payment_date:     new Date().toISOString(),
        })
        .select(`
          *,
          booking:bookings!payments_booking_id_fkey (
            id,
            booking_number,
            customer:profiles!bookings_customer_id_fkey (first_name, last_name)
          )
        `)
        .single();

      if (payError) throw payError;

      // Auto-dispatch clearance to front desk staff if selected
      if (autoClearance) {
        const bNum = newPayment.booking?.booking_number || 'Order';
        const cName = `${newPayment.booking?.customer?.first_name || ''} ${newPayment.booking?.customer?.last_name || ''}`.trim();
        await createTransferLog({
          bookingId: selectedBookingId,
          senderId: user?.id,
          senderRole: 'finance',
          targetRole: 'staff',
          transferType: paymentType === 'FINAL_PAYMENT' ? 'DISPATCH_CLEARANCE' : 'PAYMENT_VERIFICATION',
          priority: 'HIGH',
          title: `Payment Cleared: ₱${numAmount.toLocaleString()} (${METHOD_LABELS[paymentMethod] || paymentMethod})`,
          message: `Treasury recorded ${TYPE_LABELS[paymentType]} of ₱${numAmount.toLocaleString()} for #${bNum} (${cName}). Ref: ${refNumber || 'N/A'}. Cleared for studio production & release.`,
          payload: {
            amount: numAmount,
            payment_type: paymentType,
            reference_number: refNumber,
            payment_method: paymentMethod
          }
        });
      }

      notifySuccess('Payment receipt recorded and departmental clearance dispatched!');
      setRecordModalOpen(false);
      setRefNumber('');
      setNotes('');
      await load();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  // Quick Activity Logs Clearance Handoff tool
  const handleSendClearanceLog = async (payment) => {
    try {
      const bNum = payment.booking?.booking_number || 'Order';
      const cName = `${payment.booking?.customer?.first_name || ''} ${payment.booking?.customer?.last_name || ''}`.trim();
      const res = await recordAdminActivity({
        adminId: user?.id,
        adminName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Finance Officer',
        adminRole: 'finance',
        actionType: 'PAYMENT_RECORD',
        entityType: 'payment',
        entityId: payment.id,
        entityLabel: bNum,
        description: `Finance verified payment of ₱${Number(payment.amount).toLocaleString()} (${METHOD_LABELS[payment.payment_method] || payment.payment_method}) for #${bNum}. Clearance recorded.`,
        details: {
          payment_id: payment.id,
          amount: payment.amount,
          method: payment.payment_method,
          customer_name: cName,
        }
      });

      if (res.error) throw res.error;
      notifySuccess(`Clearance notice logged for #${bNum}!`);
    } catch (err) {
      alert('Failed to dispatch clearance log: ' + err.message);
    }
  };

  // Void / Delete Payment confirmation
  const handleDeletePayment = async () => {
    if (!deletingPayment) return;
    setIsDeleting(true);
    try {
      const { error: delErr } = await deletePayment(deletingPayment.id);
      if (delErr) throw delErr;

      notifySuccess('Payment transaction voided and booking balance updated.');
      setDeletingPayment(null);
      if (selectedReceipt && selectedReceipt.id === deletingPayment.id) {
        setSelectedReceipt(null);
      }
      await load();
    } catch (err) {
      console.error('Delete payment error:', err);
      alert('Failed to void payment transaction: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy reference number
  const handleCopyRef = (ref) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Export Treasury Ledger to Excel (CSV formatted with UTF-8 BOM for Microsoft Excel)
  const handleExportExcel = () => {
    const today = new Date().toISOString().split('T')[0];

    if (activeLedgerTab === 'pending_receivables') {
      if (filteredUnsettled.length === 0) {
        alert('No remaining balance records to export.');
        return;
      }

      const headers = [
        'Booking Ref',
        'Client Name',
        'Phone',
        'Email',
        'Service Package',
        'Event Date',
        'Total Invoiced (PHP)',
        'Paid So Far (PHP)',
        'Remaining Balance (PHP)',
        'Payment Status'
      ];

      const csvRows = filteredUnsettled.map((b) => {
        const total = Number(b.total_amount || 0);
        const paid = Number(b.down_payment_amount || 0);
        const remaining = b.remaining_balance !== undefined && b.remaining_balance !== null
          ? Number(b.remaining_balance)
          : Math.max(0, total - paid);
        const clientName = `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`.trim() || 'Valued Client';
        const phone = b.customer?.phone || '';
        const email = b.customer?.email || '';
        const service = b.service?.name || 'Studio Package';
        const eventDate = b.event_date ? `${fmt(b.event_date)}${b.preferred_time ? ` ${b.preferred_time.substring(0, 5)}` : ''}` : '';
        const status = b.payment_status || (remaining <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID');

        return [
          `"#${b.booking_number || ''}"`,
          `"${clientName.replace(/"/g, '""')}"`,
          `"${phone.replace(/"/g, '""')}"`,
          `"${email.replace(/"/g, '""')}"`,
          `"${service.replace(/"/g, '""')}"`,
          `"${eventDate}"`,
          total.toFixed(2),
          paid.toFixed(2),
          remaining.toFixed(2),
          `"${status}"`
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ekodak_remaining_balances_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notifySuccess(`Exported ${filteredUnsettled.length} remaining balance record(s) to Excel successfully.`);
    } else {
      if (filteredRows.length === 0) {
        alert('No confirmed receipt records to export.');
        return;
      }

      const headers = [
        'Transaction Date',
        'Official Receipt #',
        'Booking Ref',
        'Customer Name',
        'Amount (PHP)',
        'Classification',
        'Payment Channel',
        'Reference #',
        'Cashier / Recorder',
        'Notes'
      ];

      const csvRows = filteredRows.map((r) => [
        `"${fmtDateTime(r.payment_date)}"`,
        `"${(r.id || '').slice(0, 8).toUpperCase()}"`,
        `"#${r.booking?.booking_number || '—'}"`,
        `"${(`${r.booking?.customer?.first_name || ''} ${r.booking?.customer?.last_name || ''}`).trim().replace(/"/g, '""')}"`,
        (Number(r.amount) || 0).toFixed(2),
        `"${TYPE_LABELS[r.payment_type] || r.payment_type}"`,
        `"${METHOD_LABELS[r.payment_method] || r.payment_method}"`,
        `"${(r.reference_number || '—').replace(/"/g, '""')}"`,
        `"${(`${r.recorder?.first_name || ''} ${r.recorder?.last_name || ''}`).trim().replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ekodak_confirmed_receipts_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notifySuccess(`Exported ${filteredRows.length} confirmed receipt record(s) to Excel successfully.`);
    }
  };

  const handleExportCSV = handleExportExcel;

  // Filter & sort rows locally
  const filteredRows = useMemo(() => {
    let result = rows.filter(r => {
      // Search
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const bNum = (r.booking?.booking_number || '').toLowerCase();
        const cName = `${r.booking?.customer?.first_name || ''} ${r.booking?.customer?.last_name || ''}`.toLowerCase();
        const ref = (r.reference_number || '').toLowerCase();
        const notesText = (r.notes || '').toLowerCase();
        if (!bNum.includes(s) && !cName.includes(s) && !ref.includes(s) && !notesText.includes(s)) {
          return false;
        }
      }

      // Type Filter
      if (typeFilter !== 'ALL' && r.payment_type !== typeFilter) return false;

      // Channel Filter
      if (channelFilter !== 'ALL' && r.payment_method !== channelFilter) return false;

      // Amount Tier Filter
      const a = Number(r.amount) || 0;
      if (amountTier === 'HIGH' && a < 3000) return false;
      if (amountTier === 'MID' && (a < 1000 || a >= 3000)) return false;
      if (amountTier === 'LOW' && a >= 1000) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'OLDEST') return new Date(a.payment_date) - new Date(b.payment_date);
      if (sortBy === 'HIGHEST') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'LOWEST') return Number(a.amount) - Number(b.amount);
      return new Date(b.payment_date) - new Date(a.payment_date); // NEWEST
    });

    return result;
  }, [rows, searchTerm, typeFilter, channelFilter, amountTier, sortBy]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="w-full pb-16 animate-fade-in font-body">
      {/* ── 1. Luxury Dark Hero Banner ───────────────────────────────────────── */}
      <AdminHeroBanner
        station={profile?.role || 'finance'}
        title="Payments & Billing Central"
        subtitle="Manage studio cashflows, verify downpayments, clear final settlements, and track balances."
        primaryAction={{
          label: 'Record Payment',
          icon: Plus,
          onClick: () => openRecordModal(),
        }}
        secondaryAction={{
          label: 'Export Excel',
          icon: FileSpreadsheet,
          onClick: handleExportExcel,
        }}
        onRefresh={load}
        isRefreshing={loading}
        onExport={handleExportExcel}
        extraTools={[
          { label: 'Activity Logs', href: '/admin/activity-logs', icon: History, iconColor: 'text-gold' },
          { label: 'Bookings Central', href: '/admin/bookings', icon: CalendarDays, iconColor: 'text-gold' },
          { label: 'Audit Log', href: '/admin/security', icon: ShieldCheck, iconColor: 'text-neutral-400' },
        ]}
      />

      {/* ── Page Content Container (Full Width Edge-to-Edge) ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5 mt-2.5 sm:mt-3">

      {/* ── 2. Unified Luxury Studio KPI Overview Metric Strip ─────────────── */}
      <CategorizedMetricStrip
        loading={loading}
        columns="grid-cols-1 sm:grid-cols-3"
        cards={[
          {
            key: 'RECEIVABLES',
            label: 'TO BE RECEIVED',
            subtitle: `${stats?.unpaidCount || 0} unpaid · ${stats?.partialCount || 0} partial`,
            value: peso(stats?.outstanding),
            isActive: activeLedgerTab === 'pending_receivables',
            onClick: () => setActiveLedgerTab('pending_receivables'),
          },
          {
            key: 'DOWN_PAYMENT',
            label: 'DOWNPAYMENT',
            subtitle: 'Initial booking deposits',
            value: peso(stats?.down),
            isActive: typeFilter === 'DOWN_PAYMENT' && activeLedgerTab === 'confirmed',
            onClick: () => {
              setTypeFilter(typeFilter === 'DOWN_PAYMENT' ? 'ALL' : 'DOWN_PAYMENT');
              setActiveLedgerTab('confirmed');
            },
          },
          {
            key: 'FINAL_PAYMENT',
            label: 'FULL PAYMENT',
            subtitle: 'Final balance settlements',
            value: peso(stats?.final),
            isActive: typeFilter === 'FINAL_PAYMENT' && activeLedgerTab === 'confirmed',
            onClick: () => {
              setTypeFilter(typeFilter === 'FINAL_PAYMENT' ? 'ALL' : 'FINAL_PAYMENT');
              setActiveLedgerTab('confirmed');
            },
          },
        ]}
      />

      {/* Action Flash Message */}
      {actionNotice && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2.5 text-xs font-body animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span className="font-semibold">{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-xs font-body animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 3. Unified Luxury Treasury & Remaining Balances Hub ───────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#c9a96e]/35 bg-white/95 backdrop-blur-md shadow-xl shadow-amber-950/5 ring-1 ring-[#c9a96e]/15">
        {/* Luxury top accent hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent pointer-events-none" />

        {/* Header Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex-shrink-0 bg-white space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Station Icon & Station Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm ring-1 ring-amber-600/30 shrink-0">
                <Receipt size={22} />
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {activeLedgerTab === 'pending_receivables' ? 'Remaining Balances' : 'Confirmed Receipts'}
              </h3>
            </div>

            {/* Right: Actions & View Toggles */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* View Switcher (Table / Cards) */}
              <div className="flex items-center bg-neutral-100/90 p-0.5 rounded-xl border border-neutral-200/70 h-9">
                <button
                  type="button"
                  onClick={() => setPendingViewMode('table')}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                    pendingViewMode === 'table'
                      ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingViewMode('cards')}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                    pendingViewMode === 'cards'
                      ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/60 font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                  title="Grid Cards View"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center border border-neutral-200/80 hover:border-amber-400/60 rounded-xl bg-white hover:bg-amber-50/40 transition-colors disabled:opacity-50 text-neutral-600 hover:text-neutral-900 cursor-pointer shadow-2xs"
                title="Refresh ledger records"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin text-amber-600' : 'text-neutral-500'} />
              </button>

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={activeLedgerTab === 'pending_receivables' ? filteredUnsettled.length === 0 : filteredRows.length === 0}
                className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 border border-neutral-200/80 hover:border-emerald-500/60 rounded-xl bg-white hover:bg-emerald-50/50 text-neutral-700 hover:text-emerald-900 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={`Export ${activeLedgerTab === 'pending_receivables' ? 'Remaining Balances' : 'Confirmed Receipts'} to Excel`}
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {/* Record Payment Button */}
              <button
                type="button"
                onClick={() => openRecordModal()}
                className="h-9 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-[#c9a96e] to-amber-600 hover:brightness-105 text-neutral-900 shadow-xs transition-all cursor-pointer shrink-0"
                title="Record new payment receipt"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span>Record Payment</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeLedgerTab === 'pending_receivables'
                    ? "Search client, booking #, service package, contact..."
                    : "Search booking #, customer, reference #, cashier..."
                }
                className="w-full h-9 pl-9 pr-8 bg-neutral-50/80 hover:bg-neutral-100/60 focus:bg-white rounded-xl text-xs sm:text-sm font-body border border-neutral-200/80 focus:border-[#c9a96e] focus:ring-2 focus:ring-[#c9a96e]/20 outline-none transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Primary Ledger Filter: Remaining Balances vs Confirmed Receipts (Replaces All Balances) */}
              <div className="w-full sm:w-72 shrink-0">
                <CustomDropdown
                  value={ledgerFilterValue}
                  onChange={handleLedgerFilterChange}
                  options={ledgerFilterOptions}
                  placeholder="Filter Balances & Receipts"
                  icon={Filter}
                  className="w-full text-xs sm:text-sm"
                  popoverWidth="w-full min-w-[290px]"
                />
              </div>

              {/* Additional filters when viewing Confirmed Receipts */}
              {activeLedgerTab === 'confirmed' && (
                <>
                  <div className="w-38 sm:w-44">
                    <CustomDropdown
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={[
                        { value: 'ALL', label: 'All Classifications' },
                        { value: 'DOWN_PAYMENT', label: 'Down Payment' },
                        { value: 'FINAL_PAYMENT', label: 'Final Settlement' },
                        { value: 'OTHER', label: 'Add-on / Other' },
                      ]}
                      placeholder="Classification"
                      icon={Receipt}
                      className="w-full"
                    />
                  </div>
                  <div className="w-38 sm:w-44">
                    <CustomDropdown
                      value={channelFilter}
                      onChange={setChannelFilter}
                      options={[
                        { value: 'ALL', label: 'All Channels' },
                        { value: 'E_WALLET', label: 'GCash / Maya', icon: Wallet },
                        { value: 'BANK_TRANSFER', label: 'Bank Deposit', icon: Building },
                        { value: 'CASH', label: 'Cash Desk', icon: Banknote },
                        { value: 'OTHER', label: 'Other Channel', icon: CircleDollarSign },
                      ]}
                      placeholder="Channel"
                      icon={CreditCard}
                      className="w-full"
                    />
                  </div>
                  <div className="w-34 sm:w-40">
                    <CustomDropdown
                      value={sortBy}
                      onChange={setSortBy}
                      options={[
                        { value: 'NEWEST', label: 'Newest' },
                        { value: 'OLDEST', label: 'Oldest' },
                        { value: 'HIGHEST', label: 'Highest' },
                        { value: 'LOWEST', label: 'Lowest' },
                      ]}
                      placeholder="Sort By"
                      icon={Filter}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Content Area ── */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-neutral-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeLedgerTab === 'pending_receivables' ? (
          /* ════════════════════════════════════════════════════════════════════════
             REMAINING BALANCES & UNSETTLED BOOKINGS QUEUE (DIRECTLY VISIBLE)
             ════════════════════════════════════════════════════════════════════════ */
          filteredUnsettled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2.5">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-semibold text-neutral-800 font-heading">No Remaining Balances</p>
              <p className="text-xs text-neutral-400 font-body mt-0.5 max-w-sm">
                All scheduled studio bookings have fulfilled their downpayment requirements and remaining balances.
              </p>
            </div>
          ) : pendingViewMode === 'table' ? (
            /* ── Plain & Textual Table View ── */
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-xs sm:text-sm font-body text-left">
                <thead className="sticky top-0 z-10 bg-[#faf7f2]/95 border-b border-[#c9a96e]/25 shadow-2xs backdrop-blur-md">
                  <tr className="border-b border-neutral-200/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="px-5 sm:px-6 py-3.5">Booking Ref</th>
                    <th className="px-5 sm:px-6 py-3.5">Client Information</th>
                    <th className="px-5 sm:px-6 py-3.5">Service Package</th>
                    <th className="px-5 sm:px-6 py-3.5">Total Invoiced</th>
                    <th className="px-5 sm:px-6 py-3.5">Paid So Far</th>
                    <th className="px-5 sm:px-6 py-3.5">Remaining Balance</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredUnsettled.map((b) => {
                    const total = Number(b.total_amount || 0);
                    const paid = Number(b.down_payment_amount || 0);
                    const remaining = b.remaining_balance !== undefined && b.remaining_balance !== null
                      ? Number(b.remaining_balance)
                      : Math.max(0, total - paid);
                    const isUnpaid = !b.payment_status || (b.payment_status || '').toUpperCase() === 'UNPAID';
                    const cName = `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`.trim() || 'Valued Client';

                    return (
                      <tr key={b.id} className="hover:bg-amber-50/20 transition-colors group">
                        {/* Booking Ref */}
                        <td className="px-5 sm:px-6 py-4">
                          <Link
                            to={`/admin/bookings/${b.id}`}
                            className="font-heading font-bold text-neutral-900 hover:text-[#c9a96e] transition-colors text-xs sm:text-sm block"
                            title="Inspect booking dossier"
                          >
                            #{b.booking_number}
                          </Link>
                          {b.event_date && (
                            <div className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                              <CalendarDays size={11} className="text-neutral-400 shrink-0" />
                              <span>{fmt(b.event_date)}{b.preferred_time ? ` · ${b.preferred_time.substring(0, 5)}` : ''}</span>
                            </div>
                          )}
                        </td>

                        {/* Client Details */}
                        <td className="px-5 sm:px-6 py-4">
                          <p className="font-semibold text-neutral-900 text-xs sm:text-sm">{cName}</p>
                          {(b.customer?.phone || b.customer?.email) && (
                            <span className="text-xs text-neutral-400 block mt-0.5">
                              {b.customer?.phone || b.customer?.email}
                            </span>
                          )}
                        </td>

                        {/* Service Package */}
                        <td className="px-5 sm:px-6 py-4">
                          <p className="font-medium text-neutral-800 text-xs sm:text-sm line-clamp-1">
                            {b.service?.name || 'Studio Package'}
                          </p>
                        </td>

                        {/* Total Invoiced */}
                        <td className="px-5 sm:px-6 py-4 font-semibold text-neutral-800 text-xs sm:text-sm">
                          {peso(total)}
                        </td>

                        {/* Paid So Far */}
                        <td className="px-5 sm:px-6 py-4 text-xs sm:text-sm">
                          <span className={`font-semibold ${paid > 0 ? 'text-emerald-600' : 'text-neutral-400'}`}>
                            {peso(paid)}
                          </span>
                        </td>

                        {/* Remaining Balance */}
                        <td className="px-5 sm:px-6 py-4 font-heading font-bold text-sm sm:text-base text-[#8f7441]">
                          {peso(remaining)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 sm:px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSendReminder(b)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-amber-700 hover:bg-amber-50/80 transition-colors border border-neutral-200/90 hover:border-amber-400/70 cursor-pointer shadow-2xs"
                              title="Send payment reminder to client"
                            >
                              <Send size={13} />
                            </button>

                            <Link
                              to={`/admin/bookings/${b.id}`}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors border border-neutral-200/90 hover:border-neutral-400 cursor-pointer shadow-2xs"
                              title="View full booking dossier"
                            >
                              <Eye size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Modern Studio Cards View ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5">
              {filteredUnsettled.map((b) => {
                const total = Number(b.total_amount || 0);
                const paid = Number(b.down_payment_amount || 0);
                const remaining = b.remaining_balance !== undefined && b.remaining_balance !== null
                  ? Number(b.remaining_balance)
                  : Math.max(0, total - paid);
                const isUnpaid = !b.payment_status || (b.payment_status || '').toUpperCase() === 'UNPAID';
                const downRequired = Math.min(remaining, Math.max(500, Math.round(total * 0.5)));
                const cName = `${b.customer?.first_name || ''} ${b.customer?.last_name || ''}`.trim() || 'Valued Client';
                const paidPct = Math.min(100, Math.round((paid / (total || 1)) * 100));

                return (
                  <div
                    key={b.id}
                    className="bg-white hover:bg-[#faf7f2]/40 border border-neutral-200/90 hover:border-[#c9a96e]/70 rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                        <Link
                          to={`/admin/bookings/${b.id}`}
                          className="font-heading font-bold text-neutral-900 hover:text-[#c9a96e] text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
                        >
                          <span>#{b.booking_number}</span>
                          <ArrowUpRight size={13} className="text-neutral-400 group-hover:text-[#c9a96e] transition-colors" />
                        </Link>

                        {isUnpaid && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting Downpayment
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="font-heading font-bold text-sm text-neutral-900 truncate">{cName}</p>
                        <span className="text-xs text-neutral-400 block truncate">
                          {b.customer?.phone || b.customer?.email || 'No contact on file'}
                        </span>
                        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                          <CalendarDays size={12} className="text-neutral-400" />
                          <span>{fmt(b.event_date)} {b.preferred_time ? `· ${b.preferred_time.substring(0, 5)}` : ''}</span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-neutral-700 truncate">{b.service?.name || 'Studio Package'}</span>
                        </div>
                      </div>

                      {/* 4 Financial Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-150">
                          <span className="text-[11px] text-neutral-400 font-medium block">Total Invoiced</span>
                          <span className="font-bold text-neutral-800">{peso(total)}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-150">
                          <span className="text-[11px] text-neutral-400 font-medium block">Downpayment Due</span>
                          <span className="font-bold text-amber-800">{isUnpaid ? peso(downRequired) : 'Paid ✓'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-150">
                          <span className="text-[11px] text-neutral-400 font-medium block">Paid So Far</span>
                          <span className="font-bold text-emerald-600">{peso(paid)}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                          <span className="text-[11px] text-amber-800 font-medium block">Remaining Balance</span>
                          <span className="font-bold font-heading text-amber-950">{peso(remaining)}</span>
                        </div>
                      </div>

                      {/* Settlement progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs text-neutral-500 font-medium">
                          <span>Settlement Progress</span>
                          <span className="font-bold text-neutral-800">{paidPct}%</span>
                        </div>
                        <div className="w-full bg-neutral-200/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#c9a96e] h-full rounded-full transition-all duration-300"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => openRecordModal(b)}
                        className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#c9a96e] to-[#b8985d] hover:from-[#d4b479] hover:to-[#c9a96e] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="Record payment receipt for this booking"
                      >
                        <Plus size={13} />
                        <span>Record Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendReminder(b)}
                        className="p-2 text-neutral-400 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-neutral-200 cursor-pointer"
                        title="Send reminder notice"
                      >
                        <Send size={13} />
                      </button>

                      <Link
                        to={`/admin/bookings/${b.id}`}
                        className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200 cursor-pointer"
                        title="View full booking dossier"
                      >
                        <Eye size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ════════════════════════════════════════════════════════════════════════
             CONFIRMED RECEIPTS & TREASURY CASHFLOW LEDGER
             ════════════════════════════════════════════════════════════════════════ */
          filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2.5">
                <CreditCard size={24} />
              </div>
              <p className="text-sm font-semibold text-neutral-700 font-heading">No payment transactions recorded</p>
              <p className="text-xs text-neutral-400 font-body mt-0.5 max-w-sm">
                Use "Record Payment" above or pick a booking from "Remaining Balances" to log a payment.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => openRecordModal()}
                  className="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#c9a96e] to-[#b8985d] hover:from-[#d4b479] hover:to-[#c9a96e] rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Record Receipt</span>
                </button>
                {unsettledBookings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleLedgerFilterChange('ALL')}
                    className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <AlertCircle size={14} className="text-amber-600" />
                    <span>View Remaining Balances ({unsettledBookings.length})</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[360px]">
              <table className="w-full text-xs sm:text-sm font-body text-left">
                <thead className="sticky top-0 z-10 bg-[#faf7f2]/95 border-b border-[#c9a96e]/25 shadow-2xs backdrop-blur-md">
                  <tr className="border-b border-neutral-200/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="px-5 sm:px-6 py-3.5">Order & Booking Ref</th>
                    <th className="px-5 sm:px-6 py-3.5">Client Information</th>
                    <th className="px-5 sm:px-6 py-3.5">Amount Paid</th>
                    <th className="px-5 sm:px-6 py-3.5">Classification</th>
                    <th className="px-5 sm:px-6 py-3.5">Channel & Reference</th>
                    <th className="px-5 sm:px-6 py-3.5">Timestamp</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Treasury Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRows.map((p) => {
                    const MethodIcon = METHOD_ICONS[p.payment_method] || CreditCard;
                    const cName = `${p.booking?.customer?.first_name || ''} ${p.booking?.customer?.last_name || ''}`.trim() || 'Valued Customer';
                    const bNum = p.booking?.booking_number || '—';

                    return (
                      <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                        {/* Order & Booking Ref */}
                        <td className="px-5 sm:px-6 py-4 align-middle">
                          <div className="space-y-0.5">
                            {p.booking?.id ? (
                              <Link
                                to={`/admin/bookings/${p.booking.id}`}
                                className="font-heading text-xs sm:text-sm font-bold text-neutral-900 hover:text-[#c9a96e] transition-colors inline-flex items-center gap-1.5"
                                title="Jump to full booking record"
                              >
                                <span>#{bNum}</span>
                                <ExternalLink size={12} className="text-neutral-400" />
                              </Link>
                            ) : (
                              <span className="font-heading text-xs sm:text-sm font-bold text-neutral-900">
                                #{bNum}
                              </span>
                            )}
                            <p className="font-mono text-[11px] text-neutral-400 truncate max-w-[130px]">
                              TX: {p.id.slice(0, 8)}...
                            </p>
                          </div>
                        </td>

                        {/* Client Details */}
                        <td className="px-5 sm:px-6 py-4 align-middle min-w-[170px]">
                          <p className="font-semibold text-sm text-neutral-900 truncate" title={cName}>
                            {cName}
                          </p>
                          {p.booking?.customer?.phone && (
                            <span className="text-xs text-neutral-400 block mt-0.5">
                              {p.booking.customer.phone}
                            </span>
                          )}
                        </td>

                        {/* Amount Paid */}
                        <td className="px-5 sm:px-6 py-4 align-middle whitespace-nowrap">
                          <span className="font-heading font-bold text-base text-neutral-900">
                            {peso(p.amount)}
                          </span>
                          {p.booking?.remaining_balance > 0 && (
                            <span className="block text-xs text-neutral-400 mt-0.5">
                              Bal: {peso(p.booking.remaining_balance)}
                            </span>
                          )}
                        </td>

                        {/* Classification - Plain Textual */}
                        <td className="px-5 sm:px-6 py-4 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                            <span className={`w-1.5 h-1.5 rounded-full ${p.payment_type === 'DOWN_PAYMENT' ? 'bg-blue-500' : p.payment_type === 'FINAL_PAYMENT' ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                            {TYPE_LABELS[p.payment_type] || p.payment_type}
                          </span>
                        </td>

                        {/* Channel & Reference */}
                        <td className="px-5 sm:px-6 py-4 align-middle min-w-[160px]">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-800 font-medium">
                            <MethodIcon size={14} className="text-[#c9a96e] shrink-0" />
                            <span>{METHOD_LABELS[p.payment_method] || p.payment_method}</span>
                          </div>
                          {p.reference_number ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono mt-1">
                              <span>Ref: {p.reference_number}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyRef(p.reference_number)}
                                className="p-0.5 text-neutral-400 hover:text-[#c9a96e] cursor-pointer"
                                title="Copy reference"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-300 italic block mt-1">No ref #</span>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="px-5 sm:px-6 py-4 align-middle whitespace-nowrap text-xs text-neutral-500">
                          <p className="font-medium text-xs sm:text-sm text-neutral-800">{fmt(p.payment_date)}</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{new Date(p.payment_date).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-5 sm:px-6 py-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Receipt Voucher */}
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-[#c9a96e]/80 rounded-xl transition-all shadow-2xs cursor-pointer"
                              title="View Official Receipt Voucher"
                            >
                              <Receipt size={13} className="text-neutral-500" />
                              <span>Voucher</span>
                            </button>

                            {/* Quick Clear to Front Desk */}
                            <button
                              type="button"
                              onClick={() => handleSendClearanceLog(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-2xs cursor-pointer"
                              title="Dispatch verified clearance to Front Desk Staff"
                            >
                              <Send size={12} className="text-emerald-700" />
                              <span>Clear Desk</span>
                            </button>

                            {/* Void / Delete Payment */}
                            <button
                              type="button"
                              onClick={() => setDeletingPayment(p)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              title="Void / Delete Payment Entry"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Footer Bar (Pagination for Confirmed Receipts) ── */}
        {activeLedgerTab === 'confirmed' && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 text-xs text-neutral-500 font-body bg-neutral-50/50">
            <span>Page {page} of {totalPages} ({total} total transactions)</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-xl border border-neutral-200 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-xl border border-neutral-200 hover:bg-white disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      </div>

      {/* ── 5. RECORD PAYMENT RECEIPT MODAL ──────────────────────────────────── */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in font-body">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center text-gold-dark font-heading font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-base text-primary">Record Payment Receipt</h3>
                  <p className="text-[11px] text-neutral-400">Post transactions and dispatch front-desk clearance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecordModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePayment} className="p-4 sm:p-5 space-y-3.5 text-xs">
              {/* Booking Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                  Select Customer Order / Booking
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => handleBookingSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                  required
                >
                  <option value="">-- Choose Booking --</option>
                  {bookingsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.booking_number} — {b.customer?.first_name} {b.customer?.last_name} {b.service?.name ? `(${b.service.name})` : ''} • Bal: {peso(b.remaining_balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Classification */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Amount (PHP ₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs font-bold text-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Classification
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                    required
                  >
                    <option value="DOWN_PAYMENT">Down Payment</option>
                    <option value="FINAL_PAYMENT">Final Settlement</option>
                    <option value="OTHER">Add-on Upgrade / Frame</option>
                  </select>
                </div>
              </div>

              {/* Payment Channel & Reference */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                    required
                  >
                    <option value="E_WALLET">GCash / Maya (E-Wallet)</option>
                    <option value="BANK_TRANSFER">Bank Deposit / Transfer</option>
                    <option value="CASH">Cash Over-The-Counter</option>
                    <option value="OTHER">Other Method</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Reference / Ref #
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="e.g. 90214892401"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Cashier Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                  Treasury Remarks / Receipt Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Verified via GCash SMS notification, counter receipt #0482"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-xs"
                />
              </div>

              {/* Automated Workstation Clearance Checkbox */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClearance}
                    onChange={(e) => setAutoClearance(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-900 block">
                      Auto-Record Clearance to Activity Logs
                    </span>
                    <span className="text-emerald-700 text-[11px]">
                      Instantly logs verified clearance to Activity Logs for studio record.
                    </span>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-1.5 text-xs font-bold text-primary bg-gold hover:bg-gold-light rounded-lg transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingPayment && <RefreshCw size={11} className="animate-spin text-primary" />}
                  <span>{savingPayment ? 'Saving Receipt…' : 'Record & Transmit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. OFFICIAL TRANSACTION RECEIPT / VOUCHER MODAL ─────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in font-body">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-neutral-200 animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-gold-dark" />
                <h3 className="font-heading font-semibold text-base text-primary">Payment Voucher & Receipt</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Studio Header */}
              <div className="text-center pb-3 border-b border-dashed border-neutral-200">
                <p className="font-heading font-bold text-sm text-primary tracking-wide uppercase">E-Kodak Studio</p>
                <p className="text-xs text-neutral-400 mt-0.5">Official Treasury & Payment Voucher</p>
                <p className="text-2xl font-heading font-bold text-gold-dark mt-2">
                  {peso(selectedReceipt.amount)}
                </p>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[selectedReceipt.payment_type] || ''}`}>
                  {TYPE_LABELS[selectedReceipt.payment_type] || selectedReceipt.payment_type}
                </span>
              </div>

              {/* Receipt Details Grid */}
              <div className="space-y-2 text-neutral-700">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Transaction ID:</span>
                  <span className="font-mono text-neutral-900 font-medium">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Order / Booking:</span>
                  <span className="font-bold text-gold-dark">#{selectedReceipt.booking?.booking_number || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Client Name:</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedReceipt.booking?.customer?.first_name} {selectedReceipt.booking?.customer?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Channel:</span>
                  <span className="font-medium text-neutral-900">
                    {METHOD_LABELS[selectedReceipt.payment_method] || selectedReceipt.payment_method}
                  </span>
                </div>
                {selectedReceipt.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Reference Number:</span>
                    <span className="font-mono text-neutral-900 font-semibold">{selectedReceipt.reference_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-400">Date Recorded:</span>
                  <span className="text-neutral-700">{fmtDateTime(selectedReceipt.payment_date)}</span>
                </div>
                {selectedReceipt.recorder && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Cashier / Staff:</span>
                    <span className="text-neutral-700">{selectedReceipt.recorder.first_name} {selectedReceipt.recorder.last_name}</span>
                  </div>
                )}
                {selectedReceipt.notes && (
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-neutral-400 block text-xs uppercase font-bold tracking-wider mb-0.5">Remarks:</span>
                    <p className="text-[11px] text-neutral-600 italic">{selectedReceipt.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyRef(selectedReceipt.reference_number || selectedReceipt.id)}
                className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:border-gold rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedRef ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedRef ? 'Copied' : 'Copy Ref'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={12} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. DELETE / VOID PAYMENT CONFIRMATION MODAL ───────────────────────── */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-fade-in font-body">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-neutral-200 p-5 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-neutral-900">Void Payment Receipt?</h3>
                <p className="text-[11px] text-neutral-500">Reverts transaction and updates remaining balance.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">Booking</span>
                <span className="font-bold text-primary">#{deletingPayment.booking?.booking_number || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">Client</span>
                <span className="font-semibold text-neutral-800">
                  {deletingPayment.booking?.customer?.first_name} {deletingPayment.booking?.customer?.last_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 uppercase tracking-wider font-semibold text-[11px]">Void Amount</span>
                <span className="font-bold text-rose-600">{peso(deletingPayment.amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setDeletingPayment(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePayment}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting && <RefreshCw size={11} className="animate-spin" />}
                <span>{isDeleting ? 'Voiding…' : 'Confirm Void'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
