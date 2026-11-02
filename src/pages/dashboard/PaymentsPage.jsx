import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { customerPaymentService } from '../../services/customerPaymentService';
import { PaymentsSkeleton, SmartLoadingContainer } from '../../components/dashboard/skeletons';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  ArrowRight, 
  ShieldCheck, 
  Smartphone, 
  Building2, 
  Store, 
  RefreshCw,
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  Layers, 
  Coins, 
  Percent, 
  Wifi,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from '../../components/ui/Toast';
import { recordCustomerAction } from '../../services/customerAuditService';
import ClientHeroBanner from '../../components/dashboard/ClientHeroBanner';

export default function PaymentsPage() {
  const { user, profile } = useAuth();
  
  const [billingData, setBillingData] = useState({
    summary: { totalInvoiced: 0, totalPaid: 0, totalBalance: 0, pendingCount: 0 },
    bookings: [],
    payments: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  
  // Payment Modal States
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState('downpayment'); // 'downpayment' | 'full' | 'custom'
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [customAmount, setCustomAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Method specifics
  const [selectedBank, setSelectedBank] = useState('bdo');
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  
  // Receipt View Modal
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const loadBilling = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await customerPaymentService.getCustomerBillingOverview(user.id);
      if (res.success) {
        setBillingData(res);
        if (res.bookings && res.bookings.length > 0) {
          setSelectedBookingId(prev => {
            if (prev && res.bookings.some(b => b.id.toString() === prev.toString())) {
              return prev;
            }
            const firstUnpaid = res.bookings.find(b => b.payment_status !== 'paid');
            return firstUnpaid ? firstUnpaid.id : res.bookings[0].id;
          });
        }
      } else {
        setError(new Error(res.error || 'Could not retrieve payment records'));
        showToast('Could not retrieve payment records', 'error');
      }
    } catch (err) {
      console.error(err);
      setError(err);
      showToast('Error loading billing records', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBilling();
  }, [user?.id, loadBilling]);

  // Active selected booking derived from billingData
  const activeBooking = useMemo(() => {
    if (!billingData.bookings || billingData.bookings.length === 0) return null;
    return billingData.bookings.find(b => b.id.toString() === selectedBookingId?.toString()) || billingData.bookings[0] || null;
  }, [billingData.bookings, selectedBookingId]);

  // Financial calculations for active booking
  const activeFinancials = useMemo(() => {
    if (!activeBooking) {
      return {
        total: 0,
        downPaid: 0,
        remaining: 0,
        suggestedDown: 0,
        downpaymentPrice: 0,
        paidPct: 0,
        isDownPaid: false,
        isFullyPaid: false,
        payableAmount: 0,
      };
    }
    const total = parseFloat(activeBooking.total_amount) || 1750;

    // Cross-match recorded payments for this booking
    const bIdStr = String(activeBooking.id || '');
    const bRefStr = String(activeBooking.booking_number || activeBooking.booking_reference || '');
    const matchingPayments = (billingData.payments || []).filter((p) => {
      const pBookingId = String(p.booking_id || '');
      const pRef = String(p.booking_reference || p.reference_number || '');
      return (
        pBookingId === bIdStr ||
        (bRefStr && pRef.includes(bRefStr)) ||
        (bRefStr && pBookingId === bRefStr)
      );
    });

    const paymentsSum = matchingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const recordedDown = parseFloat(activeBooking.down_payment_amount) || 0;

    // Detect if booking has advanced status or confirmed downpayment in database
    const rawStatus = String(activeBooking.status || '').toUpperCase();
    const isAdvancedStatus = [
      'CONFIRMED',
      'PHOTOGRAPHER_ASSIGNED',
      'CAPTURE',
      'IN_PROGRESS',
      'EDITING',
      'RETOUCHING',
      'FINALIZED',
      'PRINTING',
      'READY',
      'UNDER_DELIVERY',
      'COMPLETED'
    ].includes(rawStatus);

    const rawPayStatus = String(activeBooking.payment_status || '').toUpperCase();
    const isPartialOrDown = ['DOWNPAYMENT', 'DOWN_PAYMENT', 'PARTIAL', 'PARTIALLY_PAID'].includes(rawPayStatus);

    const isDownConfirmed = Boolean(activeBooking.down_payment_confirmed) || Boolean(activeBooking.confirmed_at) || isAdvancedStatus || isPartialOrDown || recordedDown > 0;

    // 50% deposit requirement (₱875)
    const downpaymentPrice = activeBooking.downpayment_price || Math.round(total * 0.5) || 875;

    // If downpayment is confirmed or payments exist, recognize paid downpayment
    const downPaid = Math.max(
      recordedDown,
      paymentsSum,
      isDownConfirmed ? downpaymentPrice : 0
    );

    // Remaining payment is total minus settled downpayment (e.g. 1750 - 875 = 875)
    const remaining = Math.max(0, total - downPaid);
    const isDownPaid = isDownConfirmed || downPaid >= downpaymentPrice || (total > 0 && remaining < total && downPaid > 0);
    const isFullyPaid = rawPayStatus === 'PAID' || rawPayStatus === 'FULLY_PAID' || (total > 0 && remaining <= 0);

    const paidPct = Math.min(100, Math.round((downPaid / (total || 1)) * 100));

    // The remaining payment amount payable right now (₱875 if downpayment settled; ₱875 if downpayment due)
    const payableAmount = isFullyPaid ? 0 : (isDownPaid ? remaining : downpaymentPrice);

    return { total, downPaid, remaining, suggestedDown: downpaymentPrice, downpaymentPrice, paidPct, isDownPaid, isFullyPaid, payableAmount };
  }, [activeBooking, billingData.payments]);

  const [submissionTimeElapsed, setSubmissionTimeElapsed] = useState(0);
  const [networkQuality, setNetworkQuality] = useState({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLowSignal: false,
    effectiveType: '4g',
    rtt: 0
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const effectiveType = conn?.effectiveType || '4g';
      const rtt = conn?.rtt || 0;
      const isLowSignal = !isOnline || effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || rtt > 400;
      setNetworkQuality({ isOnline, isLowSignal, effectiveType, rtt });
    };

    updateNetworkInfo();
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);
    const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
    if (conn) conn.addEventListener('change', updateNetworkInfo);
    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (conn) conn.removeEventListener('change', updateNetworkInfo);
    };
  }, []);

  useEffect(() => {
    let timer;
    if (submitting) {
      setSubmissionTimeElapsed(0);
      timer = setInterval(() => {
        setSubmissionTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      setSubmissionTimeElapsed(0);
    }
    return () => clearInterval(timer);
  }, [submitting]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenPayModal = (booking, preferredPlan = 'downpayment') => {
    setSelectedBooking(booking);
    setPaymentPlan(preferredPlan);
    setCustomAmount('');
    setReferenceNumber('');
    setCustomerNotes('');
    setShowQRPreview(false);
  };

  const handleGenerateReceipt = (booking) => {
    if (!booking) return;
    const bId = booking.id;
    const bNum = booking.booking_number || booking.booking_reference;
    const matchingPayments = billingData.payments.filter(
      p => String(p.booking_id || '') === String(bId || '') ||
           (bNum && String(p.booking_reference || p.reference_number || '').includes(bNum))
    );

    setActiveReceipt({
      receiptNumber: `EK-REC-${bNum || 'STMT'}-${Date.now().toString(36).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
      bookingNumber: bNum || 'BK-2026-00001',
      clientName: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user?.email || 'Valued Studio Client'),
      packageName: booking?.services?.name || booking?.service?.name || booking?.tier_name || 'Senior High Packages and Sets',
      tierName: booking?.tier_name || 'Set A',
      eventDate: booking?.event_date || booking?.session_date || 'Schedule To Be Announced',
      location: booking?.place || booking?.location || 'E-Kodak Studio · 311 Rizal Street, City of Naga, Cebu',
      total: activeFinancials.total,
      downpaymentPrice: activeFinancials.downpaymentPrice,
      downPaid: activeFinancials.downPaid,
      remaining: activeFinancials.remaining,
      payments: matchingPayments,
      isFullyPaid: activeFinancials.isFullyPaid,
      isDownPaid: activeFinancials.isDownPaid
    });
  };

  const handleViewPaymentReceipt = (payment) => {
    const matchingBooking = billingData.bookings.find(b => String(b.id) === String(payment.booking_id)) || activeBooking;
    const bNum = matchingBooking?.booking_number || matchingBooking?.booking_reference || payment.booking_reference;
    setActiveReceipt({
      receiptNumber: payment.reference_number || `REF-${payment.id?.slice(0, 8)}`,
      issuedAt: payment.payment_date || payment.created_at || new Date().toISOString(),
      bookingNumber: bNum || 'BK-2026-00001',
      clientName: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (user?.email || 'Valued Studio Client'),
      packageName: payment.package_name || matchingBooking?.services?.name || 'Senior High Packages and Sets',
      tierName: matchingBooking?.tier_name || 'Set A',
      eventDate: matchingBooking?.event_date || 'Schedule To Be Announced',
      location: matchingBooking?.place || matchingBooking?.location || 'E-Kodak Studio · 311 Rizal Street, City of Naga, Cebu',
      total: matchingBooking?.total_amount || activeFinancials.total,
      downpaymentPrice: matchingBooking?.downpayment_price || activeFinancials.downpaymentPrice,
      downPaid: parseFloat(payment.amount || 0),
      remaining: activeFinancials.remaining,
      payments: [payment],
      isFullyPaid: activeFinancials.isFullyPaid,
      isDownPaid: activeFinancials.isDownPaid
    });
  };

  // Accurate financials for booking selected in modal
  const selectedBookingFinancials = useMemo(() => {
    if (!selectedBooking) return { total: 0, downPaid: 0, remaining: 0, suggestedDown: 0, downpaymentPrice: 0 };
    const total = parseFloat(selectedBooking.total_amount) || 1750;
    const bIdStr = String(selectedBooking.id || '');
    const bRefStr = String(selectedBooking.booking_number || selectedBooking.booking_reference || '');
    const matchingPayments = (billingData.payments || []).filter((p) => {
      const pBookingId = String(p.booking_id || '');
      const pRef = String(p.booking_reference || p.reference_number || '');
      return (
        pBookingId === bIdStr ||
        (bRefStr && pRef.includes(bRefStr)) ||
        (bRefStr && pBookingId === bRefStr)
      );
    });

    const paymentsSum = matchingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const recordedDown = parseFloat(selectedBooking.down_payment_amount) || 0;

    const rawStatus = String(selectedBooking.status || '').toUpperCase();
    const isAdvancedStatus = [
      'CONFIRMED',
      'PHOTOGRAPHER_ASSIGNED',
      'CAPTURE',
      'IN_PROGRESS',
      'EDITING',
      'RETOUCHING',
      'FINALIZED',
      'PRINTING',
      'READY',
      'UNDER_DELIVERY',
      'COMPLETED'
    ].includes(rawStatus);

    const rawPayStatus = String(selectedBooking.payment_status || '').toUpperCase();
    const isPartialOrDown = ['DOWNPAYMENT', 'DOWN_PAYMENT', 'PARTIAL', 'PARTIALLY_PAID'].includes(rawPayStatus);

    const isDownConfirmed = Boolean(selectedBooking.down_payment_confirmed) || Boolean(selectedBooking.confirmed_at) || isAdvancedStatus || isPartialOrDown || recordedDown > 0;
    const downpaymentPrice = selectedBooking.downpayment_price || Math.round(total * 0.5) || 875;
    const downPaid = Math.max(recordedDown, paymentsSum, isDownConfirmed ? downpaymentPrice : 0);
    const remaining = Math.max(0, total - downPaid);
    const suggestedDown = downpaymentPrice;

    return { total, downPaid, remaining, suggestedDown, downpaymentPrice };
  }, [selectedBooking, billingData.payments]);

  // Payment amount calculation
  const calculatedPayAmount = useMemo(() => {
    if (!selectedBooking) return 0;
    const { remaining, suggestedDown } = selectedBookingFinancials;

    if (paymentPlan === 'downpayment') {
      return suggestedDown;
    }
    if (paymentPlan === 'full') {
      return remaining;
    }
    if (paymentPlan === 'custom') {
      const parsed = parseFloat(customAmount) || 0;
      return Math.min(remaining, Math.max(0, parsed));
    }
    return remaining;
  }, [selectedBooking, selectedBookingFinancials, paymentPlan, customAmount]);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    if (calculatedPayAmount <= 0) {
      showToast('Please enter a valid payment amount (minimum ₱100)', 'warning');
      return;
    }

    if (paymentMethod !== 'counter' && !referenceNumber.trim()) {
      showToast('Please enter your transaction reference number from your receipt', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await customerPaymentService.submitPayment({
        bookingId: selectedBooking.id,
        amount: calculatedPayAmount,
        paymentType: paymentPlan === 'downpayment' ? 'downpayment' : 'full',
        paymentMethod,
        referenceNumber: referenceNumber.trim() || `STUDIO-COUNTER-${Date.now().toString(36).toUpperCase()}`,
        notes: customerNotes,
        recordedBy: null
      });

      if (res.success) {
        if (user?.id) {
          recordCustomerAction({
            userId: user.id,
            category: 'PAYMENT_SUBMIT',
            title: `Payment submitted for #${selectedBooking.booking_number || selectedBooking.booking_reference}`,
            description: `Submitted ₱${calculatedPayAmount.toLocaleString()} via ${paymentMethod.toUpperCase()}`,
            bookingId: selectedBooking.id,
            meta: {
              amount: calculatedPayAmount,
              method: paymentMethod,
              reference: referenceNumber.trim()
            }
          });
        }
        showToast('Payment submitted successfully! Studio desk will verify.', 'success');
        setSelectedBooking(null);
        await loadBilling();
      } else {
        showToast(res.error || 'Failed to submit payment', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Payment processing failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col font-body pb-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ── Client Hero Banner (Consistent with Soft-copies) ───────────────────── */}
      <ClientHeroBanner
        bookings={billingData.bookings}
        selectedBooking={activeBooking}
        title={
          <span className="inline-flex items-baseline">
            <span>Payments & </span>
            <span className="font-heading italic font-light bg-gradient-to-r from-amber-200 via-gold to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
              Invoices
            </span>
          </span>
        }
      />

      <div className="w-full flex-1 flex flex-col px-2 sm:px-4 lg:px-6 pt-1 sm:pt-2 animate-fade-in">
        {/* ── Main Dashboard Content ────────────────────────────────────────── */}
        <SmartLoadingContainer
          loading={loading}
          hasData={billingData.bookings.length > 0 || billingData.payments.length > 0}
          error={error}
          onRetry={loadBilling}
          skeleton={<PaymentsSkeleton />}
          delayMs={220}
          title="Payments & Invoices"
        >
          {!activeBooking ? (
              <div className="rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 border-t-2 sm:border-t-[3px] border-t-amber-500 p-12 sm:p-16 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 pointer-events-none" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-2">
                  Payments & Invoices
                </p>
                <h3 className="font-heading font-bold text-2xl sm:text-3xl text-neutral-900 dark:text-white">
                  No booking invoices yet
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Once you book a studio photography session, your invoices, downpayment requirements, and payment schedule will appear here.
                </p>
                <Link
                  to="/dashboard/book"
                  className="mt-6 inline-flex px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                >
                  Book a session
                </Link>
              </div>
            ) : (
              <>
                <section
                aria-label="Payments and Invoices"
                className="flex-1 flex flex-col rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 border-t-2 sm:border-t-[3px] border-t-amber-500 px-5 sm:px-8 lg:px-10 py-7 sm:py-10 shadow-xs relative overflow-hidden min-h-[520px] lg:min-h-[580px]"
              >
                {/* Top Orange Accent Outline */}
                <div className="absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 pointer-events-none" />

                {/* ── 50 / 50 Split: Left (Status & Session) | Right (Category & Settlement Card) ── */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

                  {/* ── LEFT HALF: Centered Booking Number, Headline, Sentence & Package/Tier ── */}
                  <div className="lg:col-span-6 flex flex-col justify-center items-center text-center lg:pr-10 lg:border-r border-neutral-100 dark:border-neutral-800/80 my-auto py-6">
                    {/* Centered Booking Number */}
                    {billingData.bookings.length > 1 ? (
                      <div className="mb-3">
                        <select
                          value={selectedBookingId || ''}
                          onChange={(e) => setSelectedBookingId(e.target.value)}
                          aria-label="Select booking invoice"
                          className="text-[11.5px] font-mono font-bold uppercase tracking-[0.2em] bg-neutral-100 dark:bg-neutral-900 text-amber-600 dark:text-amber-500 px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer focus:outline-hidden focus:border-amber-500 text-center"
                        >
                          {billingData.bookings.map((b) => (
                            <option key={b.id} value={b.id}>
                              #{b.booking_number || b.booking_reference || `BK-${b.id.slice(0, 8)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-[11px] sm:text-[12px] font-mono font-bold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-500 mb-3">
                        #{activeBooking?.booking_number || activeBooking?.booking_reference || 'BK-2026-00001'}
                      </p>
                    )}

                    <h2 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[52px] text-neutral-900 dark:text-white leading-[1.1] tracking-tight">
                      {activeFinancials.isFullyPaid ? (
                        <>Your booking is<br />fully settled.</>
                      ) : activeFinancials.isDownPaid ? (
                        <>Your deposit is<br />confirmed.</>
                      ) : (
                        <>Your downpayment<br />is required.</>
                      )}
                    </h2>

                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-normal leading-relaxed mt-4 max-w-md mx-auto">
                      {activeFinancials.isFullyPaid
                        ? 'All invoices and packages for this session have been settled in full. You have zero outstanding balance.'
                        : activeFinancials.isDownPaid
                          ? 'Your photographer schedule and studio bay are secured. You can settle the remaining balance anytime before or during your photoshoot.'
                          : 'To secure your photographer schedule and studio bay, a 50% reservation deposit is required. Settle your downpayment directly or choose to pay in full.'}
                    </p>

                    {/* Package, Tier & Place / Venue neatly positioned below the sentence */}
                    <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-center gap-6 sm:gap-8 text-xs flex-wrap">
                      <div className="text-center">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
                          Package
                        </p>
                        <p className="font-bold text-neutral-900 dark:text-white mt-1">
                          {activeBooking?.services?.name || activeBooking?.tier_name || 'Senior High Packages and Sets'}
                        </p>
                      </div>

                      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

                      <div className="text-center">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
                          Tier
                        </p>
                        <p className="font-bold text-neutral-900 dark:text-white mt-1">
                          {activeBooking?.tier_name || 'Set A'}
                        </p>
                      </div>

                      <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

                      <div className="text-center max-w-[200px]">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
                          Place / Venue
                        </p>
                        <p className="font-bold text-neutral-900 dark:text-white mt-1 truncate" title={activeBooking?.place || activeBooking?.location}>
                          {activeBooking?.place || activeBooking?.location || 'E-Kodak Studio · City of Naga, Cebu'}
                        </p>
                      </div>

                      {(activeBooking?.event_date || activeBooking?.session_date) && (
                        <>
                          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />
                          <div className="text-center">
                            <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
                              Schedule
                            </p>
                            <p className="font-bold text-neutral-900 dark:text-white mt-1">
                              {activeBooking.event_date || activeBooking.session_date}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT HALF: Folder Category directly above the card ── */}
                  <div className="lg:col-span-6 flex flex-col justify-center my-auto py-6">
                    {/* Category & Refresh positioned directly above the card */}
                    <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
                      <div>
                        <p className="text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400 dark:text-neutral-500 mb-1">
                          Billing Category
                        </p>
                        <div className="font-heading italic text-3xl sm:text-4xl lg:text-[38px] text-amber-500 dark:text-amber-400 leading-none">
                          {activeFinancials.isFullyPaid
                            ? 'Fully Settled'
                            : activeFinancials.isDownPaid
                              ? 'Balance Due'
                              : 'Pending'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={loadBilling}
                        title="Refresh billing records"
                        aria-label="Refresh billing records"
                        className="h-8 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/80 inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0 mb-0.5"
                      >
                        <RefreshCw size={12} className={loading ? 'animate-spin text-amber-500' : ''} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {/* Direct Financial Summary (No inner cards, No settlement progress) */}
                    <div className="relative overflow-hidden bg-[#fcfaf4] dark:bg-[#161513] border border-amber-200/90 dark:border-amber-900/40 rounded-2xl sm:rounded-3xl p-7 sm:p-10 flex flex-col justify-between gap-8 shadow-2xs">
                      {/* Top Shimmer Light Beam Sweep */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                        className="absolute top-0 left-0 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none"
                      />

                      {/* Direct Financial Presentation: Remaining Payment & Package Full Price */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-6 pt-2">
                        {/* Remaining Payment / Downpayment */}
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500 mb-1.5">
                            {activeFinancials.isFullyPaid
                              ? 'Remaining Payment'
                              : activeFinancials.isDownPaid
                                ? 'Remaining Payment'
                                : 'Payable Downpayment'}
                          </p>
                          <div className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
                            ₱{activeFinancials.payableAmount.toLocaleString()}
                          </div>
                          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                            {activeFinancials.isFullyPaid
                              ? 'Your booking is settled in full. Zero remaining balance.'
                              : activeFinancials.isDownPaid
                                ? `50% downpayment (₱${activeFinancials.downPaid.toLocaleString()}) settled · Remaining balance due before or during photoshoot.`
                                : `50% downpayment (₱${activeFinancials.downpaymentPrice.toLocaleString()}) required upon booking.`}
                          </p>
                        </div>

                        {/* Package Full Price */}
                        <div className="sm:text-right shrink-0 sm:border-l sm:border-neutral-200/80 sm:dark:border-neutral-800 sm:pl-8">
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-1.5">
                            Package Full Price
                          </p>
                          <div className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                            ₱{activeFinancials.total.toLocaleString()}
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">
                            {activeBooking?.services?.name || activeBooking?.tier_name || 'Full studio session'}
                          </p>
                        </div>
                      </div>

                      {/* Subtle Divider Line */}
                      <div className="w-full h-px bg-amber-200/70 dark:bg-amber-900/40" />

                      {/* Direct Action Row: Pay Now & Generate Receipt */}
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        {!activeFinancials.isFullyPaid && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(activeBooking, activeFinancials.isDownPaid ? 'full' : 'downpayment')}
                            className="flex-1 w-full sm:w-auto h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer group"
                          >
                            <CreditCard size={15} />
                            <span>
                              {activeFinancials.isDownPaid ? 'Pay remaining balance' : 'Pay remaining downpayment'}
                            </span>
                          </button>
                        )}

                        {/* Customer Generate Receipt Action */}
                        <button
                          type="button"
                          onClick={() => handleGenerateReceipt(activeBooking)}
                          className="w-full sm:w-auto h-12 px-6 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-98 shrink-0"
                          title="Generate official printable receipt & billing statement"
                        >
                          <Receipt size={14} className="text-amber-500" />
                          <span>Generate Receipt</span>
                        </button>
                      </div>
                    </div>

                    {/* Subtle bottom note on the right with generous breathing room */}
                    <div className="mt-8 sm:mt-10 text-[11.5px] sm:text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-2 px-1">
                      <ShieldCheck size={13} className="text-amber-500 shrink-0" />
                      <span>All payment transactions and official receipts sync automatically in real time.</span>
                    </div>
                  </div>

                </div>
              </section>

              {/* ── Receipt History displayed after the customer paid his whole payment ── */}
              {activeFinancials.isFullyPaid && (
                <section
                  aria-label="Payment Receipts and History"
                  className="mt-6 sm:mt-8 flex-1 flex flex-col rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#111215] border border-neutral-200/80 dark:border-neutral-800/80 border-t-2 sm:border-t-[3px] border-t-emerald-500 px-5 sm:px-8 lg:px-10 py-7 sm:py-9 shadow-xs relative overflow-hidden animate-fade-in"
                >
                  <div className="absolute top-0 inset-x-0 h-1 sm:h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 pointer-events-none" />

                  <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-heading font-bold text-xl sm:text-2xl text-neutral-900 dark:text-white">
                          Payment Receipts & History
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Paid in Full
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Verified electronic receipts and transaction ledger records issued for your completed studio booking.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadBilling}
                      className="h-8 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/80 inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin text-amber-500' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {billingData.payments.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-xs">
                      Your booking is marked as paid in full. Click &quot;Generate Receipt&quot; above to view or print your official studio receipt.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-[#faf9f6] dark:bg-neutral-900/60 shadow-2xs">
                      <table className="w-full text-left text-xs font-body">
                        <thead>
                          <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold text-[11px]">
                            <th className="p-4">Reference No.</th>
                            <th className="p-4">Package & Session</th>
                            <th className="p-4">Payment Method</th>
                            <th className="p-4">Plan Type</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Amount Paid</th>
                            <th className="p-4 text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/60 text-neutral-700 dark:text-neutral-300">
                          {billingData.payments.map((p) => {
                            const payDate = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A';

                            return (
                              <tr key={p.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-colors">
                                <td className="p-4">
                                  <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                                    <span>{p.reference_number || `REF-${p.id.slice(0, 8)}`}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(p.reference_number, p.id)}
                                      className="text-neutral-400 hover:text-amber-500 transition-colors cursor-pointer"
                                      title="Copy Reference"
                                    >
                                      {copiedKey === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <div className="font-bold text-neutral-900 dark:text-neutral-100">{p.package_name}</div>
                                  <div className="text-[11px] text-neutral-400">{p.booking_reference}</div>
                                </td>

                                <td className="p-4">
                                  <span className="capitalize px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold inline-flex items-center gap-1 border border-neutral-200 dark:border-neutral-700">
                                    {p.payment_method === 'gcash' && <Smartphone className="w-3 h-3 text-blue-500" />}
                                    {p.payment_method === 'maya' && <Smartphone className="w-3 h-3 text-emerald-500" />}
                                    {p.payment_method === 'bank_transfer' && <Building2 className="w-3 h-3 text-amber-500" />}
                                    {p.payment_method === 'counter' && <Store className="w-3 h-3 text-purple-500" />}
                                    {p.payment_method?.replace('_', ' ') || 'Online'}
                                  </span>
                                </td>

                                <td className="p-4">
                                  <span className="text-neutral-500 dark:text-neutral-400 capitalize font-medium">
                                    {p.payment_type?.replace('_', ' ') || 'Installment'}
                                  </span>
                                </td>

                                <td className="p-4 text-neutral-500 dark:text-neutral-400 font-medium">
                                  {payDate}
                                </td>

                                <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                  ₱{parseFloat(p.amount || 0).toLocaleString()}
                                </td>

                                <td className="p-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleViewPaymentReceipt(p)}
                                    className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-neutral-950 text-amber-600 dark:text-amber-400 transition-all border border-amber-500/25 cursor-pointer"
                                    title="View Official Receipt"
                                  >
                                    <Receipt className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </SmartLoadingContainer>

        {/* ── CUSTOMER PAYMENT ESTABLISHMENT MODAL ───────────────────────────── */}
        {selectedBooking && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedBooking(null)}
          >
            <div 
              className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-neutral-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block mb-1">
                    Establish Payment
                  </span>
                  <h3 className="text-xl font-heading font-black text-neutral-900 dark:text-white leading-tight">
                    {selectedBooking.services?.name || selectedBooking.tier_name || 'Studio Photography'}
                  </h3>
                  <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex-wrap">
                    <span>Booking Ref: <strong className="text-amber-600 dark:text-amber-400">#{selectedBooking.booking_number || selectedBooking.booking_reference}</strong></span>
                    <span>•</span>
                    <span>Place: <strong className="text-neutral-800 dark:text-neutral-200">{selectedBooking.place || selectedBooking.location || 'E-Kodak Studio'}</strong></span>
                    <span>•</span>
                    <span>Package: <strong className="text-neutral-800 dark:text-neutral-200">₱{selectedBookingFinancials.total.toLocaleString()}</strong></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-5">
                
                {/* Step 1: Establish Payment Plan */}
                <div>
                  <label className="text-xs font-bold text-neutral-900 dark:text-neutral-200 block mb-2 uppercase tracking-wider text-[11px]">
                    1. Establish What You Wish to Pay
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option A: 50% Downpayment */}
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('downpayment')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                        paymentPlan === 'downpayment'
                          ? 'bg-amber-500/15 border-amber-500 text-neutral-900 dark:text-white shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Downpayment
                        </span>
                        <Percent className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="text-base font-black text-neutral-900 dark:text-white">
                        ₱{selectedBookingFinancials.suggestedDown.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
                        50% deposit to lock in camera bay & schedule
                      </p>
                    </button>

                    {/* Option B: Full Balance Settlement */}
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('full')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                        paymentPlan === 'full'
                          ? 'bg-amber-500/15 border-amber-500 text-neutral-900 dark:text-white shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Full Settlement
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="text-base font-black text-neutral-900 dark:text-white">
                        ₱{selectedBookingFinancials.remaining.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
                        100% full payment, zero balance on shoot day
                      </p>
                    </button>

                    {/* Option C: Custom Installment */}
                    <button
                      type="button"
                      onClick={() => setPaymentPlan('custom')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                        paymentPlan === 'custom'
                          ? 'bg-blue-500/15 border-blue-500 text-neutral-900 dark:text-white shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                          Custom Amount
                        </span>
                        <Coins className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="text-base font-black text-neutral-900 dark:text-white">
                        {customAmount ? `₱${Number(customAmount).toLocaleString()}` : 'Flexible'}
                      </div>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
                        Enter any partial installment amount
                      </p>
                    </button>
                  </div>

                  {/* Custom Amount Field Input if selected */}
                  {paymentPlan === 'custom' && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 animate-fade-in space-y-2">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                        Enter Installment Amount (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-500">₱</span>
                        <input
                          type="number"
                          min="100"
                          max={selectedBookingFinancials.remaining || selectedBookingFinancials.total}
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="e.g. 1000"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      {/* Quick Chip Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {[500, 1000, 1500, 2000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCustomAmount(String(amt))}
                            className="px-2.5 py-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-700 hover:bg-amber-500/20 hover:text-amber-500 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                          >
                            +₱{amt.toLocaleString()}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCustomAmount(String(selectedBookingFinancials.remaining || selectedBookingFinancials.total))}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Max Balance
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Establish Payment Method */}
                <div>
                  <label className="text-xs font-bold text-neutral-900 dark:text-neutral-200 block mb-2 uppercase tracking-wider text-[11px]">
                    2. Establish Your Payment Method
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'gcash', name: 'GCash', icon: Smartphone, tag: 'QR Ph / E-Wallet', color: 'text-blue-500', activeBorder: 'border-blue-500 bg-blue-500/10' },
                      { id: 'maya', name: 'Maya', icon: Smartphone, tag: 'QR Ph / E-Wallet', color: 'text-emerald-500', activeBorder: 'border-emerald-500 bg-emerald-500/10' },
                      { id: 'bank_transfer', name: 'Bank Transfer', icon: Building2, tag: 'BDO / BPI InstaPay', color: 'text-amber-500', activeBorder: 'border-amber-500 bg-amber-500/10' },
                      { id: 'counter', name: 'Studio Counter', icon: Store, tag: 'Pay In-Person', color: 'text-purple-500', activeBorder: 'border-purple-500 bg-purple-500/10' },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 border text-center transition-all cursor-pointer ${
                            isSelected
                              ? `${m.activeBorder} text-neutral-900 dark:text-white font-bold shadow-xs`
                              : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${m.color}`} />
                          <span className="text-xs font-bold leading-tight">{m.name}</span>
                          <span className="text-[11px] text-neutral-400 font-normal leading-none">{m.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Instructions & Account Details Card */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-3">
                  {paymentMethod === 'gcash' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-500 text-white font-black text-xs flex items-center justify-center">
                            G
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white">GCash Official Merchant</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowQRPreview(!showQRPreview)}
                          className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{showQRPreview ? 'Hide QR' : 'Show QR Ph'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300 text-xs">
                        <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                          <div>
                            <span className="text-[11px] text-neutral-400 block uppercase">GCash Mobile No.</span>
                            <span className="font-bold text-neutral-900 dark:text-white">0917-555-5632</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('09175555632', 'gcash_num')}
                            className="p-1 rounded-md text-neutral-400 hover:text-amber-500 cursor-pointer"
                          >
                            {copiedKey === 'gcash_num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[11px] text-neutral-400 block uppercase">Account Name</span>
                          <span className="font-bold text-neutral-900 dark:text-white truncate block">E-KODAK PHOTO STUDIO CORP</span>
                        </div>
                      </div>

                      {showQRPreview && (
                        <div className="p-4 bg-white rounded-2xl border border-blue-500/30 text-center animate-fade-in flex flex-col items-center">
                          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 mb-2">
                            <QrCode className="w-36 h-36 text-blue-600" />
                          </div>
                          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Scan with any bank or e-wallet via QR Ph</p>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'maya' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                            M
                          </div>
                          <span className="font-bold text-neutral-900 dark:text-white">Maya Business Account</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300 text-xs">
                        <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                          <div>
                            <span className="text-[11px] text-neutral-400 block uppercase">Maya Mobile No.</span>
                            <span className="font-bold text-neutral-900 dark:text-white">0928-888-5632</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('09288885632', 'maya_num')}
                            className="p-1 rounded-md text-neutral-400 hover:text-amber-500 cursor-pointer"
                          >
                            {copiedKey === 'maya_num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[11px] text-neutral-400 block uppercase">Account Name</span>
                          <span className="font-bold text-neutral-900 dark:text-white truncate block">E-KODAK STUDIOS PH</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank_transfer' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => setSelectedBank('bdo')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedBank === 'bdo' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          BDO Unibank
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBank('bpi')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedBank === 'bpi' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          BPI Bank
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                          <span className="text-[11px] text-neutral-400 block uppercase">
                            {selectedBank === 'bdo' ? 'BDO Current Account' : 'BPI Checking Account'}
                          </span>
                          <span className="font-bold text-neutral-900 dark:text-white font-mono text-sm">
                            {selectedBank === 'bdo' ? '0048-2801-9921' : '3021-9942-12'}
                          </span>
                          <span className="text-xs text-neutral-400 block">E-Kodak Digital Services Inc.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedBank === 'bdo' ? '004828019921' : '3021994212', 'bank_num')}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-500/20 hover:text-amber-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'bank_num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'counter' && (
                    <div className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-xs">
                      <p className="font-medium">
                        You may pay directly in person at our studio reception desk (Cash, Debit, or Credit Card).
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Our front desk staff will verify your booking number and immediately hand you an official printed receipt.
                      </p>
                    </div>
                  )}

                  {/* Calculation Summary Bar */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between font-body text-xs">
                    <span className="font-bold text-neutral-500 dark:text-neutral-400">Total Payable Now:</span>
                    <span className="font-black text-lg text-amber-500">
                      ₱{calculatedPayAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Step 3: Transaction / Reference Number Input */}
                {paymentMethod !== 'counter' && (
                  <div>
                    <label className="text-xs font-bold text-neutral-900 dark:text-neutral-200 block mb-1">
                      Transaction / Reference Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. 100293849182, MP-99238, or Transfer Ref #"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-bold focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-xs text-neutral-400 mt-1 block">
                      Found on your GCash/Maya confirmation SMS or bank mobile receipt.
                    </span>
                  </div>
                )}

                {/* Optional Notes */}
                <div>
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                    Customer Billing Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="e.g. Sent from John's GCash account..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    disabled={submitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold tracking-wide transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Registering Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Register ₱{calculatedPayAmount.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── AUTHENTIC THERMAL STUDIO RECEIPT SLIP MODAL ─────────────────────── */}
        {activeReceipt && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
            onClick={() => setActiveReceipt(null)}
          >
            <div 
              className="relative w-full max-w-[380px] sm:max-w-[410px] bg-[#fffdf9] text-neutral-900 border border-neutral-300 shadow-2xl font-mono mx-auto my-auto overflow-hidden text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Serrated Sawtooth Edge (Physical Receipt Paper Tear) */}
              <div className="w-full h-3 bg-neutral-950 overflow-hidden flex text-[#fffdf9]">
                <svg className="w-full h-3" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <polygon points="0,10 5,0 10,10 15,0 20,10 25,0 30,10 35,0 40,10 45,0 50,10 55,0 60,10 65,0 70,10 75,0 80,10 85,0 90,10 95,0 100,10" fill="currentColor" />
                </svg>
              </div>

              <div className="p-5 sm:p-7 space-y-3.5">
                {/* Close X (Top Right corner) */}
                <div className="flex justify-end print:hidden -mt-1 -mr-1">
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(null)}
                    aria-label="Close receipt"
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Studio Header & Registration */}
                <div className="text-center pt-1 pb-3 border-b-2 border-dashed border-neutral-400">
                  <div className="flex items-center justify-center gap-1.5 mb-1 text-amber-700">
                    <Camera size={18} />
                    <span className="font-heading font-black tracking-widest text-base text-neutral-950">E-KODAK STUDIOS</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Official Photography Receipt</p>
                  <p className="text-[9px] text-neutral-500 mt-0.5">TIN: 402-991-824-000 • POS STATION 01</p>
                  <p className="text-[9px] text-neutral-600 font-medium">311 Rizal Street, City of Naga, Cebu</p>
                </div>

                {/* Receipt Metadata */}
                <div className="py-1.5 space-y-1 text-[11px] border-b border-dashed border-neutral-300 text-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">RECEIPT NO:</span>
                    <span className="font-bold text-neutral-950 font-mono">{activeReceipt.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">DATE:</span>
                    <span>{new Date(activeReceipt.issuedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">BOOKING REF:</span>
                    <span className="font-bold text-amber-700">#{activeReceipt.bookingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">CLIENT:</span>
                    <span className="font-bold truncate max-w-[200px] text-neutral-950">{activeReceipt.clientName}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-neutral-500 shrink-0">VENUE / PLACE:</span>
                    <span className="font-semibold text-right max-w-[200px] text-neutral-950 leading-tight" title={activeReceipt.location}>
                      {activeReceipt.location}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">SESSION DATE:</span>
                    <span className="truncate max-w-[200px]">{activeReceipt.eventDate}</span>
                  </div>
                </div>

                {/* Itemized Line Items */}
                <div className="py-1.5 space-y-1.5 border-b border-dashed border-neutral-300 text-[11px]">
                  <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase pb-1 border-b border-neutral-200">
                    <span>ITEM DESCRIPTION</span>
                    <span>AMOUNT (PHP)</span>
                  </div>
                  <div className="flex justify-between items-start pt-1">
                    <div className="pr-2">
                      <span className="font-bold block text-neutral-950">{activeReceipt.packageName}</span>
                      <span className="text-[10px] text-neutral-500">Tier: {activeReceipt.tierName}</span>
                    </div>
                    <span className="font-bold text-neutral-950 shrink-0">₱{activeReceipt.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Ledger & Balances including Package Total, Downpayment Prices, Amount Paid & Balance */}
                <div className="py-1.5 space-y-1.5 text-[11px] border-b-2 border-dashed border-neutral-400">
                  <div className="flex justify-between text-neutral-800">
                    <span className="text-neutral-500">PACKAGE TOTAL:</span>
                    <span className="font-bold text-neutral-950">₱{activeReceipt.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-amber-900">
                    <span className="text-neutral-500">50% DOWNPAYMENT:</span>
                    <span className="font-semibold">₱{(activeReceipt.downpaymentPrice || Math.round(activeReceipt.total * 0.5)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span className="font-semibold">AMOUNT PAID:</span>
                    <span className="font-bold">₱{activeReceipt.downPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black pt-1.5 border-t border-neutral-300 text-neutral-950">
                    <span>BALANCE REMAINING:</span>
                    <span className={activeReceipt.remaining > 0 ? 'text-amber-800' : 'text-emerald-700'}>
                      ₱{activeReceipt.remaining.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Breakdown / Subledger if payments on file */}
                {activeReceipt.payments && activeReceipt.payments.length > 0 && (
                  <div className="py-1 space-y-1 border-b border-dashed border-neutral-300 text-[10px]">
                    <span className="text-neutral-500 font-bold uppercase block mb-1">TRANSACTION BREAKDOWN:</span>
                    {activeReceipt.payments.map((p, idx) => (
                      <div key={p.id || idx} className="flex justify-between text-neutral-700">
                        <span>{p.payment_method?.toUpperCase() || 'ONLINE'} ({p.reference_number || `REF-${p.id?.slice(0, 6)}`})</span>
                        <span className="font-bold text-neutral-950">₱{parseFloat(p.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Official Stamp & Simulated Barcode */}
                <div className="py-2 text-center space-y-2.5">
                  {/* Rubber Stamp */}
                  <div className="inline-block border-2 border-red-600 text-red-600 px-3 py-1 font-black text-[10.5px] uppercase tracking-widest rotate-[-3deg] shadow-2xs">
                    ★ OFFICIAL RECEIPT · VERIFIED ★
                  </div>

                  {/* Simulated Thermal Barcode */}
                  <div className="flex flex-col items-center pt-1">
                    <div className="flex items-center gap-[2px] h-8">
                      {[2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,2,1,4,2,1,3,1,2,4,1,3,2,1,4,1,2,3,1,2].map((w, idx) => (
                        <div key={idx} className="h-full bg-neutral-900" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <span className="text-[8.5px] text-neutral-500 tracking-[0.25em] mt-1 font-mono">
                      * {activeReceipt.receiptNumber} *
                    </span>
                  </div>

                  <p className="text-[9.5px] text-neutral-500 uppercase tracking-wider font-semibold">
                    THANK YOU FOR CHOOSING E-KODAK!
                  </p>
                  <p className="text-[8.5px] text-neutral-400">
                    Retain this receipt for studio check-in & deliverable release.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 pb-1 flex items-center justify-center gap-2 border-t border-dashed border-neutral-300 print:hidden font-body">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(null)}
                    className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Bottom Serrated Sawtooth Edge (Physical Receipt Paper Tear) */}
              <div className="w-full h-3 bg-neutral-950 overflow-hidden flex text-[#fffdf9]">
                <svg className="w-full h-3" preserveAspectRatio="none" viewBox="0 0 100 10">
                  <polygon points="0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ── Low Network Signal Safeguard & Safe Payment Processing Overlay ── */}
        <AnimatePresence>
          {submitting && (networkQuality.isLowSignal || submissionTimeElapsed >= 1) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[99999] bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.92, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: -10 }}
                transition={{ type: "spring", damping: 26, stiffness: 320 }}
                className="bg-neutral-900 border border-amber-500/40 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden"
              >
                <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping" />
                  <span className="absolute inset-2 rounded-full bg-amber-400/20 animate-pulse" />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-neutral-950 shadow-lg relative z-10">
                    <Wifi size={28} className="animate-pulse" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Safe Payment Protection Active</span>
                </div>

                <h3 className="font-heading font-extrabold text-xl text-white tracking-tight mb-2">
                  Processing Secure Payment
                </h3>

                <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed mb-5">
                  Low or fluctuating network connection detected. We are holding your transaction state securely to avoid duplicate charges or unissued payment receipts.
                </p>

                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden mb-3 border border-neutral-700/60 shadow-inner">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300 rounded-full"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    style={{ width: "65%" }}
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>Please do not close or refresh this page.</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
