import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerPaymentService } from '../../services/customerPaymentService';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Receipt, 
  ArrowUpRight, 
  ChevronRight, 
  ShieldCheck, 
  Smartphone, 
  Building2, 
  Store, 
  RefreshCw,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Info,
  QrCode,
  ArrowRight,
  Wallet,
  Coins,
  FileCheck,
  Percent,
  Camera
} from 'lucide-react';
import Toast from '../../components/ui/Toast';
import { recordCustomerAction } from '../../services/customerAuditService';

// ── Animated Vectorized Financial Art Illustration ──────────────────────────────
function AnimatedPaymentArt({ className = "w-44 h-32" }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 240 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(212,175,55,0.25)] animate-float"
      >
        <defs>
          {/* Card Gradients */}
          <linearGradient id="cardGrad" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2c2720" />
            <stop offset="45%" stopColor="#1a1815" />
            <stop offset="100%" stopColor="#12100e" />
          </linearGradient>

          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fae084" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#997a15" />
          </linearGradient>

          <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="accentLine" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0" />
            <stop offset="50%" stopColor="#d4af37" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fae084" stopOpacity="0" />
          </linearGradient>

          <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Glow Aura */}
        <ellipse cx="120" cy="80" rx="90" ry="50" fill="url(#glowGrad)" className="animate-pulse" />

        {/* Background Card */}
        <rect
          x="35"
          y="15"
          width="170"
          height="110"
          rx="14"
          fill="#171513"
          stroke="#3d372e"
          strokeWidth="1.2"
          transform="rotate(6 120 70)"
          opacity="0.6"
        />

        {/* Main Floating Card */}
        <g transform="rotate(-3 115 80)">
          <rect
            x="25"
            y="25"
            width="185"
            height="115"
            rx="16"
            fill="url(#cardGrad)"
            stroke="url(#goldGrad)"
            strokeWidth="1.5"
          />

          {/* Shimmer Light Streak */}
          <path
            d="M 35 26 L 120 26 L 60 139 L 26 139 Z"
            fill="white"
            opacity="0.04"
          />

          {/* Metallic EMV Chip */}
          <rect
            x="45"
            y="52"
            width="28"
            height="22"
            rx="4"
            fill="url(#goldGrad)"
            stroke="#5c4912"
            strokeWidth="0.8"
          />
          <path d="M 45 63 L 73 63 M 59 52 L 59 74" stroke="#7a631d" strokeWidth="0.8" />

          {/* Contactless Signal Waves */}
          <path d="M 85 58 A 8 8 0 0 1 85 68" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M 89 54 A 14 14 0 0 1 89 72" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M 93 50 A 20 20 0 0 1 93 76" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />

          {/* Cardholder & Brand Branding */}
          <text x="45" y="112" fill="#d4af37" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1.2">
            E-KODAK STUDIO
          </text>
          <text x="45" y="125" fill="#8c8273" fontSize="7" fontWeight="500" fontFamily="sans-serif" letterSpacing="0.8">
            VERIFIED SETTLEMENT PASS
          </text>

          {/* Holographic Hologram Ring */}
          <circle cx="178" cy="112" r="14" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.7" />
          <circle cx="188" cy="112" r="14" fill="none" stroke="#fae084" strokeWidth="1.2" opacity="0.5" />
        </g>

        {/* Orbiting Golden Star 1 */}
        <g transform="translate(195, 20)" className="animate-bounce">
          <path d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill="#fae084" />
        </g>

        {/* Orbiting Golden Star 2 */}
        <g transform="translate(25, 125)">
          <path d="M 0 -5 L 1.5 -1.5 L 5 0 L 1.5 1.5 L 0 5 L -1.5 1.5 L -5 0 L -1.5 -1.5 Z" fill="#d4af37" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

// ── Expandable Icon Badge (Space-saving: Icon-only when closed, expands on hover) ──
function ExpandableBadge({
  icon: Icon,
  dotColor,
  text,
  className = "",
  iconClassName = "",
  title = ""
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(prev => !prev)}
      className={`group/pill inline-flex items-center h-6 px-1.5 rounded-full border transition-all duration-300 ease-in-out cursor-pointer hover:px-2.5 overflow-hidden shadow-2xs select-none ${className}`}
      title={title || text}
    >
      {dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      {Icon && (
        <Icon size={12} className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'scale-110' : 'group-hover/pill:scale-110'} ${dotColor ? 'ml-1' : ''} ${iconClassName}`} />
      )}
      <span
        className={`overflow-hidden whitespace-nowrap text-[10px] font-body font-bold uppercase tracking-wider transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-w-[300px] opacity-100 ml-1.5'
            : 'max-w-0 opacity-0 ml-0 group-hover/pill:max-w-[300px] group-hover/pill:opacity-100 group-hover/pill:ml-1.5'
        }`}
      >
        {text}
      </span>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [billingData, setBillingData] = useState({
    bookings: [],
    payments: [],
    summary: { totalInvoiced: 0, totalPaid: 0, totalBalance: 0, pendingCount: 0, paidCount: 0 }
  });

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState('downpayment'); // 'downpayment' | 'full' | 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gcash'); // 'gcash' | 'maya' | 'bank_transfer' | 'counter'
  const [selectedBank, setSelectedBank] = useState('bdo'); // 'bdo' | 'bpi'
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ type, message });

  // Load Billing Information
  const loadBilling = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await customerPaymentService.getCustomerBillingData(user.id);
      if (res.success) {
        setBillingData(res);
      } else {
        showToast('Could not retrieve payment records', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading billing records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [user?.id]);

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

  // Payment amount calculation
  const calculatedPayAmount = useMemo(() => {
    if (!selectedBooking) return 0;
    const total = parseFloat(selectedBooking.total_amount) || 0;
    const downPaid = parseFloat(selectedBooking.down_payment_amount) || 0;
    const remaining = selectedBooking.remaining_balance !== undefined && selectedBooking.remaining_balance !== null
      ? parseFloat(selectedBooking.remaining_balance)
      : Math.max(0, total - downPaid);

    if (paymentPlan === 'downpayment') {
      // 50% reservation deposit, min 500
      return Math.min(remaining, Math.max(500, Math.round(total * 0.5)));
    }
    if (paymentPlan === 'full') {
      return remaining;
    }
    if (paymentPlan === 'custom') {
      const parsed = parseFloat(customAmount) || 0;
      return Math.min(remaining, Math.max(0, parsed));
    }
    return remaining;
  }, [selectedBooking, paymentPlan, customAmount]);

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
            title: `Payment Submitted: ₱${calculatedPayAmount.toLocaleString()} (${paymentPlan === 'full' ? 'Full Settlement' : paymentPlan === 'custom' ? 'Custom Installment' : 'Downpayment'})`,
            description: `Customer submitted payment via ${paymentMethod.toUpperCase()}${referenceNumber ? ` · Ref: ${referenceNumber}` : ''} for session #${selectedBooking.booking_number}.`,
            changes: [
              `Amount: ₱${calculatedPayAmount.toLocaleString()}`,
              `Plan: ${paymentPlan}`,
              `Channel: ${paymentMethod.toUpperCase()}`,
              referenceNumber ? `Reference: ${referenceNumber}` : 'Studio Reception Counter'
            ],
            bookingId: selectedBooking.id,
            bookingNumber: selectedBooking.booking_number
          });
        }

        showToast(
          paymentPlan === 'full' 
            ? 'Full balance successfully registered!' 
            : 'Payment registered! Your booking status has been updated.',
          'success'
        );
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
    <div className="space-y-6 pb-12 font-body max-w-6xl mx-auto animate-fade-in">
      
      {/* ── Premium Luxury Header Banner with Animated Vector Art ───────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1917] via-[#141210] to-[#0c0a09] border border-gold/25 p-6 sm:p-7 shadow-xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5 text-gold" />
              <span>Studio Billing & Settlements</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight leading-tight">
              Payments & Invoices
            </h1>
            
            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed font-body">
              Establish your preferred payment schedule, deposit your reservation downpayment, settle remaining balances, and access official verified receipts.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={loadBilling}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold transition-all shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gold ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Records</span>
              </button>
            </div>
          </div>

          {/* Animated Vectorized Art */}
          <div className="hidden md:flex shrink-0 items-center justify-center">
            <AnimatedPaymentArt className="w-48 h-32" />
          </div>
        </div>
      </div>

      {/* ── Space-Efficient Uniform KPI Cards Grid (Bootstrap Style) ──────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-body">
        
        {/* Card 1: Total Invoiced */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-gold/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Total Invoiced
            </span>
            <span className="font-heading font-black text-2xl text-primary dark:text-neutral-100 leading-tight mt-0.5 block truncate">
              ₱{billingData.summary.totalInvoiced.toLocaleString()}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              Across {billingData.bookings.length} studio session{billingData.bookings.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-emerald-500/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Total Paid to Date
            </span>
            <span className="font-heading font-black text-2xl text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5 block truncate">
              ₱{billingData.summary.totalPaid.toLocaleString()}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              {billingData.summary.paidCount} verified transaction{billingData.summary.paidCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-amber-500/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Outstanding Balance
            </span>
            <span className="font-heading font-black text-2xl text-amber-600 dark:text-amber-400 leading-tight mt-0.5 block truncate">
              ₱{billingData.summary.totalBalance.toLocaleString()}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              {billingData.summary.pendingCount > 0 ? `${billingData.summary.pendingCount} pending balance(s)` : 'All cleared'}
            </span>
          </div>
        </div>

        {/* Card 4: Verification Status */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-blue-500/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Verification Status
            </span>
            <span className="font-heading font-bold text-lg text-primary dark:text-neutral-100 leading-tight mt-0.5 block truncate">
              Instant Audit Log
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              Official OR issued upon payment
            </span>
          </div>
        </div>

      </div>

      {/* ── Navigation Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Pending Invoices & Balance</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'pending'
                ? 'bg-gold/20 text-gold'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {billingData.bookings.filter(b => b.payment_status !== 'paid').length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Payment Receipts & History</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'history'
                ? 'bg-gold/20 text-gold'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {billingData.payments.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
          <p className="text-xs text-neutral-400 font-medium">Retrieving verified studio billing records...</p>
        </div>
      ) : activeTab === 'pending' ? (
        /* PENDING INVOICES SECTION */
        <div className="space-y-5">
          
          {/* Policy Banner - Clean Customer Dashboard Card */}
          <div className="rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Studio Downpayment Policy</span>
                  <span className="px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[9px] font-bold uppercase tracking-wider border border-gold/25">
                    50% Required
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  To secure your photographer schedule and studio bay, a 50% downpayment is required upon booking. The remaining balance can be settled anytime before or during your photoshoot.
                </p>
              </div>
            </div>
          </div>

          {billingData.bookings.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <h3 className="text-base font-bold text-primary dark:text-white">No Booking Invoices Yet</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Once you book a studio photography package, your invoices, downpayment requirements, and payment schedule will appear here.
              </p>
            </div>
          ) : billingData.bookings.filter(b => b.payment_status !== 'paid').length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-500/25">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">All Bookings Fully Settled!</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                You have no outstanding balances or pending downpayments. Thank you for booking with E-Kodak Studio!
              </p>
            </div>
          ) : (
            /* Clean & Uniform Invoice Cards Grid */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {billingData.bookings
                .filter((b) => b.payment_status !== 'paid')
                .map((b) => {
                  const total = parseFloat(b.total_amount) || 0;
                  const downPaid = parseFloat(b.down_payment_amount) || 0;
                  const remaining = b.remaining_balance !== undefined && b.remaining_balance !== null
                    ? parseFloat(b.remaining_balance)
                    : Math.max(0, total - downPaid);
                  const isDownPaid = b.down_payment_confirmed || downPaid > 0;
                  const suggestedDown = Math.min(remaining, Math.max(500, Math.round(total * 0.5)));
                  const paidPct = Math.min(100, Math.round((downPaid / (total || 1)) * 100));

                  return (
                    <div
                      key={b.id}
                      className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-neutral-200/80 dark:border-neutral-800 hover:border-gold/40 dark:hover:border-gold/30 hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3.5">
                        {/* ── Top Row: Booking ID + Badges ────────────────── */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-body text-xs font-bold text-neutral-800 dark:text-neutral-200 tracking-wide">
                              #{b.booking_number || b.booking_reference || `BK-${b.id.slice(0, 8)}`}
                            </span>
                            {b.tier_name && (
                              <span className="px-2 py-0.5 rounded-md bg-gold/10 border border-gold/25 text-gold text-[10px] font-bold">
                                {b.tier_name}
                              </span>
                            )}
                          </div>

                          {isDownPaid ? (
                            <ExpandableBadge
                              icon={CheckCircle2}
                              dotColor="bg-emerald-500"
                              text="Downpayment Confirmed"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/20"
                              iconClassName="text-emerald-600 dark:text-emerald-400"
                              title="Downpayment Confirmed · Slot secured"
                            />
                          ) : (
                            <ExpandableBadge
                              icon={Clock}
                              dotColor="bg-amber-500 animate-pulse"
                              text="Pending Downpayment"
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/20"
                              iconClassName="text-amber-600 dark:text-amber-400"
                              title="Pending Downpayment · 50% deposit required"
                            />
                          )}
                        </div>

                        {/* ── Middle: Cover Image + Package & Schedule ──── */}
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#faf9f6] dark:bg-neutral-800 shrink-0 border border-neutral-200/70 dark:border-neutral-700 relative">
                            {b.services?.cover_image ? (
                              <img 
                                src={b.services.cover_image} 
                                alt={b.services?.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600">
                                <Camera size={20} className="text-gold/60 mb-0.5" />
                                <span className="text-[8px] font-body uppercase text-neutral-400 font-bold">Studio</span>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-gold transition-colors truncate">
                              {b.services?.name || 'Studio Photography Package'}
                            </h3>
                            
                            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-body">
                              <Calendar size={13} className="text-gold shrink-0" />
                              <span className="truncate">{b.event_date || b.session_date || 'Schedule To Be Announced'}</span>
                              {b.preferred_time && (
                                <>
                                  <span>•</span>
                                  <Clock size={13} className="text-gold shrink-0" />
                                  <span>{b.preferred_time.substring(0, 5)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Unified Financial Strip (Zero Clutter) ─────────── */}
                        <div className="rounded-xl bg-[#faf9f6] dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 p-2.5 grid grid-cols-4 divide-x divide-neutral-200/70 dark:divide-neutral-700/60 font-body text-center">
                          <div className="px-1">
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Total</span>
                            <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5 block tabular-nums">
                              ₱{total.toLocaleString()}
                            </span>
                          </div>
                          <div className="px-1">
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Deposit</span>
                            <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5 block tabular-nums">
                              ₱{suggestedDown.toLocaleString()}
                            </span>
                          </div>
                          <div className="px-1">
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Paid</span>
                            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block tabular-nums">
                              ₱{downPaid.toLocaleString()}
                            </span>
                          </div>
                          <div className="px-1">
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Balance</span>
                            <span className={`text-xs sm:text-sm font-bold mt-0.5 block tabular-nums ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                              ₱{remaining.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* ── Settlement Progress Bar ─────────────────────── */}
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex justify-between items-center text-[10px] font-body">
                            <span className="text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                              <Layers size={11} className="text-gold" />
                              <span>Settlement Progress</span>
                            </span>
                            <span className="text-gold font-bold text-xs">{paidPct}%</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60 shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-gold-dark via-gold to-yellow-300 rounded-full transition-all duration-700 shadow-sm"
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── Uniform Action Buttons ─────────────────────────── */}
                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPayModal(b, isDownPaid ? 'full' : 'downpayment')}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gold hover:bg-gold-dark text-neutral-950 font-body text-xs font-bold tracking-wide transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer group/btn"
                        >
                          <CreditCard size={14} className="group-hover/btn:scale-110 transition-transform" />
                          <span>
                            {isDownPaid 
                              ? `Establish Balance Settlement · ₱${remaining.toLocaleString()}` 
                              : `Establish Downpayment · ₱${suggestedDown.toLocaleString()}`}
                          </span>
                          <ArrowRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>

                        {!isDownPaid && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(b, 'full')}
                            className="py-2.5 px-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-body text-xs font-semibold transition-all border border-neutral-200/60 dark:border-neutral-700 whitespace-nowrap cursor-pointer"
                            title="Pay full balance now"
                          >
                            Settle in Full
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* PAYMENT RECEIPTS & HISTORY SECTION */
        <div className="space-y-4">
          {billingData.payments.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <h3 className="text-base font-bold text-primary dark:text-white">No Recorded Payments Yet</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Completed downpayments and settled balances will appear here along with official studio reference numbers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <table className="w-full text-left text-xs font-body">
                <thead>
                  <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="p-4">Reference No.</th>
                    <th className="p-4">Package & Session</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Plan Type</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Amount Paid</th>
                    <th className="p-4 text-center">E-Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-700 dark:text-neutral-300">
                  {billingData.payments.map((p) => {
                    const payDate = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A';

                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-primary dark:text-white flex items-center gap-1.5">
                            <span>{p.reference_number || `REF-${p.id.slice(0, 8)}`}</span>
                            <button
                              onClick={() => copyToClipboard(p.reference_number, p.id)}
                              className="text-neutral-400 hover:text-gold transition-colors"
                              title="Copy Reference"
                            >
                              {copiedKey === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-primary dark:text-neutral-200">{p.package_name}</div>
                          <div className="text-[11px] text-neutral-400">{p.booking_reference}</div>
                        </td>

                        <td className="p-4">
                          <span className="capitalize px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold inline-flex items-center gap-1 border border-neutral-200 dark:border-neutral-700">
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
                            onClick={() => setActiveReceipt(p)}
                            className="p-1.5 rounded-xl bg-gold/10 hover:bg-gold hover:text-primary text-gold transition-all border border-gold/25"
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
        </div>
      )}

      {/* ── CUSTOMER PAYMENT ESTABLISHMENT MODAL (Clean, Friendly & Guided) ─────── */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedBooking(null)}
        >
          <div 
            className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-neutral-900 border border-gold/30 p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider block mb-1">
                  Establish Payment
                </span>
                <h3 className="text-xl font-heading font-black text-primary dark:text-white leading-tight">
                  {selectedBooking.services?.name || 'Studio Photography'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Booking Reference: <strong className="text-gold">#{selectedBooking.booking_number || selectedBooking.booking_reference}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-primary dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-5">
              
              {/* Step 1: Establish Payment Plan */}
              <div>
                <label className="text-xs font-bold text-primary dark:text-neutral-200 block mb-2 uppercase tracking-wider text-[11px]">
                  1. Establish What You Wish to Pay
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option A: 50% Downpayment */}
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('downpayment')}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                      paymentPlan === 'downpayment'
                        ? 'bg-amber-500/15 border-amber-500 text-primary dark:text-white shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Downpayment
                      </span>
                      <Percent className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="text-base font-black text-primary dark:text-white">
                      ₱{Math.min(
                        parseFloat(selectedBooking.remaining_balance || selectedBooking.total_amount),
                        Math.max(500, Math.round((parseFloat(selectedBooking.total_amount) || 0) * 0.5))
                      ).toLocaleString()}
                    </div>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
                      50% deposit to lock in camera bay & wardrobe
                    </p>
                  </button>

                  {/* Option B: Full Balance Settlement */}
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('full')}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                      paymentPlan === 'full'
                        ? 'bg-gold/15 border-gold text-primary dark:text-white shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                        Full Settlement
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <div className="text-base font-black text-primary dark:text-white">
                      ₱{(
                        selectedBooking.remaining_balance !== undefined && selectedBooking.remaining_balance !== null
                          ? parseFloat(selectedBooking.remaining_balance)
                          : parseFloat(selectedBooking.total_amount) - (parseFloat(selectedBooking.down_payment_amount) || 0)
                      ).toLocaleString()}
                    </div>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
                      100% full payment, zero balance on shoot day
                    </p>
                  </button>

                  {/* Option C: Custom Installment */}
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('custom')}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                      paymentPlan === 'custom'
                        ? 'bg-blue-500/15 border-blue-500 text-primary dark:text-white shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                        Custom Amount
                      </span>
                      <Coins className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="text-base font-black text-primary dark:text-white">
                      {customAmount ? `₱${Number(customAmount).toLocaleString()}` : 'Flexible'}
                    </div>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight">
                      Enter any partial installment amount
                    </p>
                  </button>
                </div>

                {/* Custom Amount Field Input if selected */}
                {paymentPlan === 'custom' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 animate-fade-in space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                      Enter Installment Amount (₱)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gold">₱</span>
                      <input
                        type="number"
                        min="100"
                        max={parseFloat(selectedBooking.remaining_balance || selectedBooking.total_amount)}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-primary dark:text-white text-sm font-bold focus:outline-none focus:border-gold"
                      />
                    </div>
                    {/* Quick Chip Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[500, 1000, 1500, 2000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomAmount(String(amt))}
                          className="px-2.5 py-1 rounded-lg bg-neutral-200/80 dark:bg-neutral-700 hover:bg-gold/20 hover:text-gold text-[10px] font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                          +₱{amt.toLocaleString()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomAmount(String(parseFloat(selectedBooking.remaining_balance || selectedBooking.total_amount)))}
                        className="px-2.5 py-1 rounded-lg bg-gold/15 text-gold text-[10px] font-bold transition-colors"
                      >
                        Max Balance
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Establish Payment Method */}
              <div>
                <label className="text-xs font-bold text-primary dark:text-neutral-200 block mb-2 uppercase tracking-wider text-[11px]">
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
                            ? `${m.activeBorder} text-primary dark:text-white font-bold shadow-xs`
                            : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-700'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${m.color}`} />
                        <span className="text-xs font-bold leading-tight">{m.name}</span>
                        <span className="text-[9px] text-neutral-400 font-normal leading-none">{m.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Instructions & Account Details Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-3">
                
                {/* Method-specific breakdown */}
                {paymentMethod === 'gcash' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-500 text-white font-black text-xs flex items-center justify-center">
                          G
                        </div>
                        <span className="font-bold text-primary dark:text-white">GCash Official Merchant</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQRPreview(!showQRPreview)}
                        className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{showQRPreview ? 'Hide QR' : 'Show QR Ph'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300 text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-neutral-400 block uppercase">GCash Mobile No.</span>
                          <span className="font-bold text-primary dark:text-white">0917-555-5632</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('09175555632', 'gcash_num')}
                          className="p-1 rounded-md text-neutral-400 hover:text-gold"
                        >
                          {copiedKey === 'gcash_num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[9px] text-neutral-400 block uppercase">Account Name</span>
                        <span className="font-bold text-primary dark:text-white truncate block">E-KODAK PHOTO STUDIO CORP</span>
                      </div>
                    </div>

                    {showQRPreview && (
                      <div className="p-4 bg-white rounded-2xl border border-blue-500/30 text-center animate-fade-in flex flex-col items-center">
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 mb-2">
                          <QrCode className="w-36 h-36 text-blue-600" />
                        </div>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Scan with any bank or e-wallet via QR Ph</p>
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
                        <span className="font-bold text-primary dark:text-white">Maya Business Account</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-300 text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-neutral-400 block uppercase">Maya Mobile No.</span>
                          <span className="font-bold text-primary dark:text-white">0928-888-5632</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard('09288885632', 'maya_num')}
                          className="p-1 rounded-md text-neutral-400 hover:text-gold"
                        >
                          {copiedKey === 'maya_num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[9px] text-neutral-400 block uppercase">Account Name</span>
                        <span className="font-bold text-primary dark:text-white truncate block">E-KODAK STUDIOS PH</span>
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
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          selectedBank === 'bdo' ? 'bg-primary text-white dark:bg-white dark:text-primary' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        BDO Unibank
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBank('bpi')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          selectedBank === 'bpi' ? 'bg-primary text-white dark:bg-white dark:text-primary' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        BPI Bank
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-neutral-400 block uppercase">
                          {selectedBank === 'bdo' ? 'BDO Current Account' : 'BPI Checking Account'}
                        </span>
                        <span className="font-bold text-primary dark:text-white font-mono text-sm">
                          {selectedBank === 'bdo' ? '0048-2801-9921' : '3021-9942-12'}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">E-Kodak Digital Services Inc.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedBank === 'bdo' ? '004828019921' : '3021994212', 'bank_num')}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-gold/20 hover:text-gold text-xs font-semibold flex items-center gap-1"
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
                  <span className="font-black text-lg text-gold">
                    ₱{calculatedPayAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Step 3: Transaction / Reference Number Input */}
              {paymentMethod !== 'counter' && (
                <div>
                  <label className="text-xs font-bold text-primary dark:text-neutral-200 block mb-1">
                    Transaction / Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. 100293849182, MP-99238, or Transfer Ref #"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary dark:text-white text-xs font-bold focus:border-gold focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary dark:text-white text-xs focus:border-gold focus:outline-none"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:text-primary dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold tracking-wide transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
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

      {/* ── OFFICIAL RECEIPT VIEW MODAL ─────────────────────────────────────── */}
      {activeReceipt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveReceipt(null)}
        >
          <div 
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-gold/30 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gold/10 border border-gold/25 text-gold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-primary dark:text-white">Official Studio Receipt</h3>
                  <p className="text-[11px] text-neutral-400 font-body">E-Kodak Photography Services</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-primary dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3 text-xs font-body">
              <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700/60 pb-2">
                <span className="text-neutral-400">Receipt Ref:</span>
                <span className="font-bold text-primary dark:text-white">{activeReceipt.reference_number || `REF-${activeReceipt.id.slice(0, 8)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Booking Reference:</span>
                <span className="font-bold text-gold">{activeReceipt.booking_reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Package:</span>
                <span className="text-primary dark:text-neutral-200 font-semibold">{activeReceipt.package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Payment Plan:</span>
                <span className="capitalize text-primary dark:text-neutral-200 font-semibold">{activeReceipt.payment_type?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Channel / Method:</span>
                <span className="capitalize text-primary dark:text-neutral-200 font-semibold">{activeReceipt.payment_method?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Date & Timestamp:</span>
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                  {new Date(activeReceipt.payment_date || activeReceipt.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-neutral-200 dark:border-neutral-700/80 text-sm font-bold">
                <span className="text-primary dark:text-white">Amount Settled:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black text-base">
                  ₱{parseFloat(activeReceipt.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 rounded-xl bg-primary dark:bg-neutral-100 text-white dark:text-primary hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Toast Component */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
