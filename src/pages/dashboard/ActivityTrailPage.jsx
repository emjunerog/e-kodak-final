import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  History,
  Search,
  Camera,
  CheckCircle,
  CreditCard,
  FileText,
  ArrowRight,
  ArrowUpRight,
  QrCode,
  Truck,
  UserCheck,
  Sliders,
  ShieldCheck,
  Check,
  Edit3,
  Download,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CalendarDays,
  Sparkles,
  RefreshCw,
  XCircle,
  X,
  AlertTriangle,
  Clock,
  Fingerprint,
  Zap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ActivityTrailSkeleton, SmartLoadingContainer } from "../../components/dashboard/skeletons";
import { getCustomerBookings, getCustomerActivityAudit, getCachedCustomerBookings } from "../../services/bookingService";
import ClientToolsHub from "../../components/dashboard/ClientToolsHub";
import Toast from "../../components/ui/Toast";

// ── Animated Studio Archival Audit Art Illustration ────────────────────────────
function AnimatedAuditArt({ className = "w-36 h-20" }) {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 240 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(212,175,55,0.22)] animate-float"
      >
        <defs>
          <linearGradient id="auditLedgerGrad" x1="0" y1="0" x2="240" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#25211b" />
            <stop offset="50%" stopColor="#181613" />
            <stop offset="100%" stopColor="#0e0d0b" />
          </linearGradient>

          <linearGradient id="auditGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fae084" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#997a15" />
          </linearGradient>
        </defs>

        {/* Ledger Base */}
        <g>
          <rect
            x="32"
            y="20"
            width="176"
            height="120"
            rx="16"
            fill="url(#auditLedgerGrad)"
            stroke="url(#auditGoldGrad)"
            strokeWidth="1.5"
          />

          {/* Shimmer Light Streak */}
          <path
            d="M 45 20 L 115 20 L 65 140 L 35 140 Z"
            fill="white"
            opacity="0.03"
          />

          {/* Chronometer Clock Dial */}
          <circle cx="70" cy="62" r="22" fill="#12100e" stroke="url(#auditGoldGrad)" strokeWidth="1.2" />
          <circle cx="70" cy="62" r="2" fill="#fae084" />
          <path d="M 70 48 L 70 62 L 80 62" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="70" cy="43" r="1.5" fill="#fae084" />
          <circle cx="89" cy="62" r="1.5" fill="#fae084" />
          <circle cx="70" cy="81" r="1.5" fill="#fae084" />
          <circle cx="51" cy="62" r="1.5" fill="#fae084" />

          {/* Audit Lines / Checklist */}
          <rect x="106" y="46" width="78" height="6" rx="3" fill="#fae084" opacity="0.8" />
          <rect x="106" y="58" width="62" height="5" rx="2.5" fill="#d4af37" opacity="0.5" />
          <rect x="106" y="69" width="70" height="5" rx="2.5" fill="#8c8273" opacity="0.4" />

          {/* Studio Verified Seal / Ribbon */}
          <path d="M 166 94 L 176 104 L 186 94 L 186 128 L 176 120 L 166 128 Z" fill="#997a15" opacity="0.8" />
          <circle cx="176" cy="94" r="14" fill="#1e1a14" stroke="url(#auditGoldGrad)" strokeWidth="1.2" />
          <path d="M 170 94 L 174 98 L 182 89" stroke="#fae084" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Footer Brand */}
          <text x="48" y="114" fill="#d4af37" fontSize="9" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1.2">
            E-KODAK ARCHIVE
          </text>
          <text x="48" y="126" fill="#8c8273" fontSize="7" fontWeight="500" fontFamily="sans-serif">
            VERIFIED TIMELINE LOG
          </text>
        </g>

        {/* Orbiting Sparkles */}
        <g transform="translate(198, 22)">
          <path d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#fae084" />
        </g>
        <g transform="translate(24, 118)">
          <path d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#d4af37" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
}

// ── Relative time helper ──
function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// ── Text Cleaning Helpers (Remove Redundant Words) ──────────────────────────────
function cleanTitle(rawTitle) {
  if (!rawTitle) return "";
  return rawTitle
    .replace(/^Booking Submitted \(#([^)]+)\)/i, "Booking #$1 Registered")
    .replace(/^Customer Action:\s*/i, "")
    .replace(/^Status:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(rawDesc) {
  if (!rawDesc) return "";
  return rawDesc
    .replace(/^Customer adjusted portal preference for\s*/i, "Configured preference for ")
    .replace(/^Customer electronically signed the\s*/i, "Signed ")
    .replace(/^Customer electronically signed\s*/i, "Signed ")
    .replace(/^Customer updated\s*/i, "Updated ")
    .replace(/^Customer selected\s*/i, "Selected ")
    .replace(/^Customer customized their\s*/i, "Configured ")
    .replace(/Photoshoot registered for\s+/i, "Registered for ")
    .replace(/Customer\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Distinct Primary Category Badges ───────────────────────────────────────────
function getCategoryBadge(category, rawCategory, status) {
  const cat = (category || "").toUpperCase();
  const raw = (rawCategory || "").toUpperCase();
  const stat = (status || "").toUpperCase();

  if (cat === "BOOKING") {
    return {
      label: "Booking",
      icon: Camera,
      dot: "bg-gold",
      classes: "bg-gold/15 text-gold-dark dark:text-gold border-gold/40",
    };
  }

  if (cat === "PAYMENT" || raw === "PAYMENT_SUBMIT") {
    return {
      label: "Payment",
      icon: CreditCard,
      dot: "bg-violet-500",
      classes: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    };
  }

  if (cat === "STATUS") {
    if (stat === "COMPLETED" || stat === "CONFIRMED") {
      return {
        label: `Status · ${stat}`,
        icon: CheckCircle,
        dot: "bg-emerald-500",
        classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      };
    }
    if (stat === "CANCELLED" || stat === "REJECTED") {
      return {
        label: `Status · ${stat}`,
        icon: XCircle,
        dot: "bg-rose-500",
        classes: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
      };
    }
    return {
      label: `Status · ${stat || "Update"}`,
      icon: Clock,
      dot: "bg-amber-500",
      classes: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    };
  }

  if (raw === "PROFILE_UPDATE") {
    return {
      label: "Profile Update",
      icon: UserCheck,
      dot: "bg-emerald-500",
      classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    };
  }

  if (raw === "PREFERENCE_UPDATE") {
    return {
      label: "Preference",
      icon: Sliders,
      dot: "bg-blue-500",
      classes: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    };
  }

  if (raw === "SPEC_UPDATE") {
    return {
      label: "Wardrobe & Specs",
      icon: Layers,
      dot: "bg-teal-500",
      classes: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
    };
  }

  if (raw === "DELIVERY_UPDATE") {
    return {
      label: "Delivery Details",
      icon: Truck,
      dot: "bg-indigo-500",
      classes: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    };
  }

  if (raw === "TERMS_SIGN") {
    return {
      label: "Agreement Signed",
      icon: ShieldCheck,
      dot: "bg-amber-500",
      classes: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    };
  }

  return {
    label: raw ? raw.replace(/_/g, " ") : "Update",
    icon: FileText,
    dot: "bg-neutral-400",
    classes: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/25",
  };
}

// ── Clean Structured Changes & Metadata Display ──────────────────────────────
function RenderStructuredChanges({ changes = [], category = "" }) {
  if (!changes || changes.length === 0) return null;

  // Single short change: sleek pill
  if (changes.length === 1) {
    const ch = changes[0];
    const isKeyVal = ch.includes(": ");
    const key = isKeyVal ? ch.split(": ")[0] : null;
    const val = isKeyVal ? ch.split(": ").slice(1).join(": ") : ch;
    const lower = val.toLowerCase();

    const isPositive = /active|verified|consented|agreed|confirmed|completed|paid|saved|updated/i.test(lower);
    const isNegative = /cancel|reject|delete|remove|inactive|disabled|failed/i.test(lower);

    return (
      <div className="pt-1">
        <div className="inline-flex max-w-full items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/10 text-xs shadow-sm">
          {key && (
            <>
              <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-neutral-400 font-body shrink-0">
                {key}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-white/20 shrink-0" />
            </>
          )}
          <span
            className={`font-semibold flex items-center gap-1.5 min-w-0 ${
              isPositive
                ? "text-emerald-700 dark:text-emerald-300"
                : isNegative
                ? "text-rose-600 dark:text-rose-300"
                : "text-neutral-700 dark:text-neutral-200"
            }`}
          >
            {isPositive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
            {isNegative && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
            <span className="truncate">{val}</span>
          </span>
        </div>
      </div>
    );
  }

  // Multiple changes: premium grid
  return (
    <div className="mt-2 rounded-2xl bg-white dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
        {changes.map((ch, idx) => {
          const isKeyVal = ch.includes(": ");
          const key = isKeyVal ? ch.split(": ")[0] : null;
          const val = isKeyVal ? ch.split(": ").slice(1).join(": ") : ch;
          const lower = val.toLowerCase();
          const isPositive = /active|verified|consented|agreed|confirmed|completed|paid/i.test(lower);
          const isNegative = /cancel|reject|delete|remove|inactive|disabled|failed/i.test(lower);

          return (
            <div key={idx} className="min-w-0 rounded-xl px-2.5 py-1.5 hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition-colors">
              {key ? (
                <>
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-neutral-400 block truncate font-body">
                    {key}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {isPositive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                    {isNegative && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 break-words font-body leading-snug">
                      {val}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  <span className="break-words leading-snug">{ch}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────────
export default function ActivityTrailPage() {
  const { user } = useAuth();
  const outletContext = useOutletContext();
  const initialBookings = useMemo(() => {
    if (outletContext?.bookings && Array.isArray(outletContext.bookings)) {
      return outletContext.bookings.filter((b) => !b.is_deleted);
    }
    const cached = getCachedCustomerBookings(user?.id);
    if (cached && Array.isArray(cached)) {
      return cached.filter((b) => !b.is_deleted);
    }
    return [];
  }, [outletContext?.bookings, user?.id]);

  const [bookings, setBookings] = useState(initialBookings);
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(initialBookings.length === 0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Search & Filter
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Grouped logs expand/collapse tracking (Set of group IDs)
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  // Tools Modal (for QR Pass view from activity)
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedBookingForPass, setSelectedBookingForPass] = useState(null);

  const toggleGroup = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const loadTrail = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const { data: bData, error: bErr } = await getCustomerBookings(user.id);
      if (bErr) setError(bErr);
      const customerBookings = (bData || []).filter((b) => !b.is_deleted);
      setBookings(customerBookings);

      const bookingIds = customerBookings.map((b) => b.id).filter(Boolean);
      const { data: auditData, error: aErr } = await getCustomerActivityAudit(user.id, bookingIds);
      if (aErr) setError(aErr);
      setDbEvents(auditData || []);
    } catch (err) {
      console.warn("Error loading activity logs:", err);
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (initialBookings.length > 0) {
      setBookings(initialBookings);
      setLoading(false);
    }
    loadTrail();

    const handleAuditUpdate = () => loadTrail();
    window.addEventListener("ekodak_audit_trail_updated", handleAuditUpdate);

    return () => {
      window.removeEventListener("ekodak_audit_trail_updated", handleAuditUpdate);
    };
  }, [user?.id, loadTrail]);

  // Combine real database records & customer-initiated updates
  // FILTER RULE: If bookings have been deleted from database, strip all booking notifications and ghost booking references
  const allEvents = useMemo(() => {
    const events = [];
    const validBookingIds = new Set((bookings || []).map((b) => b.id));
    const hasActiveBookings = validBookingIds.size > 0;

    // 1. Real booking creation events from bookings table (only if bookings exist in DB)
    bookings.forEach((b) => {
      if (b.created_at) {
        events.push({
          id: `book_created_${b.id}`,
          category: "BOOKING",
          rawCategory: "BOOKING_CREATED",
          title: `Booking #${b.booking_number} Registered`,
          description: `Registered for ${b.service?.name || "Studio Session"}${
            b.tier_name ? ` (${b.tier_name})` : ""
          }${b.event_date ? ` scheduled on ${new Date(b.event_date).toLocaleDateString()}` : ""}.`,
          bookingNumber: b.booking_number,
          bookingId: b.id,
          timestamp: new Date(b.created_at),
          status: b.status,
          icon: Camera,
          source: "DATABASE_BOOKING",
        });
      }
    });

    // 2. Real status changes, payments, notifications & customer action audits
    dbEvents.forEach((ev) => {
      let icon = FileText;
      let cat = ev.category || "STATUS";

      // Notifications strictly belong to Notification History, not Activity Logs
      if (ev.source === "DATABASE_NOTIFICATIONS" || ev.category === "NOTIFICATION") return;

      // Discard booking-related status history if bookings were deleted
      const isBookingRelated =
        ev.category === "BOOKING" ||
        ev.source === "DATABASE_STATUS_HISTORY";

      if (isBookingRelated) {
        if (!hasActiveBookings) return; // Bookings were deleted in database, strip completely
        if (ev.bookingId && !validBookingIds.has(ev.bookingId)) return;
      }

      if (ev.source === "DATABASE_STATUS_HISTORY") {
        cat = "STATUS";
        icon = CheckCircle;
      } else if (ev.source === "DATABASE_PAYMENTS") {
        cat = "PAYMENT";
        icon = CreditCard;
      } else if (ev.source === "CUSTOMER_ACTION") {
        cat = "UPDATES";
        if (ev.category === "PROFILE_UPDATE") icon = UserCheck;
        else if (ev.category === "SPEC_UPDATE") icon = Sliders;
        else if (ev.category === "DELIVERY_UPDATE") icon = Truck;
        else if (ev.category === "TERMS_SIGN") icon = ShieldCheck;
        else if (ev.category === "PAYMENT_SUBMIT") icon = CreditCard;
        else if (ev.category === "PREFERENCE_UPDATE") icon = Sliders;
        else icon = Edit3;
      }

      const matchedBooking = bookings.find((b) => b.id === ev.bookingId);
      const bNumber = matchedBooking ? matchedBooking.booking_number : null;
      const bId = matchedBooking ? matchedBooking.id : null;

      events.push({
        id: ev.id,
        category: cat,
        rawCategory: ev.category,
        title: ev.title,
        description: ev.description,
        changes: ev.changes || [],
        bookingNumber: bNumber,
        bookingId: bId,
        timestamp: new Date(ev.timestamp),
        status: ev.status,
        source: ev.source,
        icon,
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, dbEvents]);

  // Compute category active counts for badges on all filter buttons
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: allEvents.length,
      UPDATES: 0,
      BOOKING: 0,
      STATUS: 0,
      PAYMENT: 0,
    };

    allEvents.forEach((e) => {
      if (
        e.source === "CUSTOMER_ACTION" ||
        e.category === "UPDATES" ||
        e.rawCategory?.includes("UPDATE") ||
        e.rawCategory?.includes("TERMS")
      ) {
        counts.UPDATES++;
      }
      if (e.category === "BOOKING") counts.BOOKING++;
      if (e.category === "STATUS") counts.STATUS++;
      if (e.category === "PAYMENT") counts.PAYMENT++;
    });

    return counts;
  }, [allEvents]);

  // Filtered timeline list
  const filteredEvents = useMemo(() => {
    let list = allEvents;
    if (categoryFilter !== "ALL") {
      if (categoryFilter === "UPDATES") {
        list = list.filter(
          (e) =>
            e.source === "CUSTOMER_ACTION" ||
            e.category === "UPDATES" ||
            e.rawCategory?.includes("UPDATE") ||
            e.rawCategory?.includes("TERMS")
        );
      } else {
        list = list.filter((e) => e.category === categoryFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          (e.changes && e.changes.some((ch) => ch.toLowerCase().includes(q))) ||
          (e.bookingNumber && e.bookingNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEvents, categoryFilter, searchQuery]);

  // Group consecutive identical events into a single entry with occurrences counter
  const groupedEvents = useMemo(() => {
    if (!filteredEvents || filteredEvents.length === 0) return [];

    const groups = [];
    let currentGroup = null;

    filteredEvents.forEach((event) => {
      const isIdentical =
        currentGroup &&
        currentGroup.leadEvent.title === event.title &&
        currentGroup.leadEvent.category === event.category &&
        currentGroup.leadEvent.rawCategory === event.rawCategory &&
        JSON.stringify(currentGroup.leadEvent.changes || []) === JSON.stringify(event.changes || []) &&
        (currentGroup.leadEvent.bookingId || null) === (event.bookingId || null);

      if (isIdentical) {
        currentGroup.occurrences.push(event);
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          id: `group_${event.id}`,
          leadEvent: event,
          occurrences: [event],
        };
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [filteredEvents]);

  const lastActivity = allEvents[0]?.timestamp || null;

  // Handle Export Audit Log to JSON file
  const handleExportAudit = () => {
    try {
      const exportData = {
        exportTimestamp: new Date().toISOString(),
        clientAccount: {
          id: user?.id,
          email: user?.email,
        },
        studioProvider: "E-Kodak Studio Cebu",
        totalRecordedEvents: allEvents.length,
        events: allEvents.map((e) => ({
          timestamp: e.timestamp.toISOString(),
          category: e.category,
          subCategory: e.rawCategory || null,
          title: cleanTitle(e.title),
          description: cleanDescription(e.description),
          changes: e.changes || [],
          bookingNumber: e.bookingNumber || null,
        })),
      };

      const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ekodak_audit_log_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ type: "success", message: "Audit trail transcript exported successfully!" });
    } catch (err) {
      console.error("Export error:", err);
      setToast({ type: "error", message: "Could not export audit log." });
    }
  };

  const handleOpenQR = (bookingId) => {
    const b = bookings.find((item) => item.id === bookingId);
    if (b) {
      setSelectedBookingForPass(b);
      setToolsOpen(true);
    }
  };

  const FILTERS = [
    { id: "ALL", label: "All activity", icon: History },
    { id: "UPDATES", label: "Updates", icon: Sliders },
    { id: "BOOKING", label: "Bookings", icon: Camera },
    { id: "STATUS", label: "Status", icon: CheckCircle },
    { id: "PAYMENT", label: "Payments", icon: CreditCard },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 space-y-5 pb-24 relative animate-fade-in font-body">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-[420px] h-[420px] bg-gold/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-40 -right-16 w-[380px] h-[380px] bg-amber-500/10 blur-[120px] rounded-full" />

      {/* ═══════════ CINEMATIC HERO ═══════════ */}
      <section className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] bg-[#0b0c12]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(201,169,110,0.35),transparent_60%),radial-gradient(800px_circle_at_90%_20%,rgba(217,119,6,0.22),transparent_55%),radial-gradient(700px_circle_at_50%_110%,rgba(56,42,18,0.8),transparent_60%),linear-gradient(160deg,#101218_0%,#0b0c12_45%,#141019_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(80% 90% at 50% 10%, black 40%, transparent 100%)' }}
          />
          <div className="absolute -top-24 right-[8%] w-96 h-96 bg-gold/25 blur-[110px] rounded-full animate-float-slow-1" />
          <div className="absolute -bottom-32 left-[5%] w-[420px] h-[420px] bg-amber-600/20 blur-[120px] rounded-full animate-float-slow-2" />
          <div className="absolute -right-20 -top-20 w-[380px] h-[380px] rounded-full border border-gold/15" />
          <div className="absolute -right-12 -top-12 w-[300px] h-[300px] rounded-full border border-gold/20" />
          <div className="absolute -right-4 -top-4 w-[220px] h-[220px] rounded-full border border-gold/25" />
        </div>

        <div className="relative z-10 p-6 sm:p-9">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[11px] font-body text-white/60">
              <Link to="/dashboard" className="hover:text-gold transition-colors">Dashboard</Link>
              <ChevronRight size={12} />
              <span className="text-gold font-semibold">Activity Logs</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadTrail(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/8 border border-white/15 text-white/80 text-xs font-bold backdrop-blur-md hover:bg-white/15 hover:border-gold/40 transition-all cursor-pointer disabled:opacity-60"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Syncing…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={handleExportAudit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-light via-gold to-gold-dark text-[#1a1408] text-xs font-extrabold shadow-lg shadow-gold/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download size={13} /> Export log
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-col lg:flex-row lg:items-center gap-7">
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="relative shrink-0 hidden sm:block">
                <div className="absolute -inset-2 rounded-[30px] bg-gold/30 blur-xl opacity-50" />
                <div className="relative w-[92px] h-[92px] rounded-[26px] p-[3px] bg-gradient-to-br from-gold-light via-gold to-gold-dark shadow-2xl">
                  <div className="w-full h-full rounded-[23px] bg-[#15161d] flex items-center justify-center text-gold">
                    <History size={34} strokeWidth={1.8} />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl bg-emerald-400 text-[#06251a] flex items-center justify-center shadow-lg ring-4 ring-[#0b0c12]">
                  <ShieldCheck size={15} strokeWidth={2.5} />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#1a1408] bg-gradient-to-r from-gold-light to-gold px-2.5 py-1 rounded-full shadow-md shadow-gold/25">
                    <Sparkles size={11} /> Verified audit trail
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-white/70 bg-white/8 border border-white/12 px-2.5 py-1 rounded-full backdrop-blur-md">
                    <Fingerprint size={11} className="text-gold" /> {user?.email || "Client archive"}
                  </span>
                </div>
                <h1 className="mt-2 font-heading text-3xl sm:text-[40px] leading-[1.05] font-bold text-white tracking-tight">
                  Activity Logs
                </h1>
                <p className="mt-1.5 text-[13px] text-white/60 font-body leading-relaxed max-w-xl">
                  A chronological, tamper-evident record of bookings, payments, status moves and every profile save — studio-grade transparency.
                </p>
                {lastActivity && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/50 font-body bg-white/6 border border-white/10 rounded-full pl-1 pr-3 py-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center"><Clock size={11} /></span>
                    Last activity {timeAgo(lastActivity)} · {new Date(lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            <div className="hidden xl:flex shrink-0 items-center justify-center rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-xl px-6 py-2">
              <AnimatedAuditArt className="w-44 h-24" />
            </div>
          </div>

        </div>
        <div className="relative h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      </section>

      {/* ═══════════ FILTER BAR ═══════════ */}
      <section className="rounded-[24px] bg-white dark:bg-[#12131a] border border-neutral-200/80 dark:border-white/10 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.25)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, keyword, change detail, or booking #…"
              className="w-full pl-11 pr-11 py-3.5 bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 rounded-2xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:ring-4 focus:ring-gold/20 focus:border-gold/60 focus:bg-white dark:focus:bg-white/[0.06] transition-all font-body shadow-sm"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:block text-xs font-bold text-neutral-400 bg-neutral-100 dark:bg-white/8 border border-neutral-200 dark:border-white/10 rounded-lg px-2 py-1">
                {filteredEvents.length} found
              </kbd>
            )}
          </div>
          <Link
            to="/dashboard/bookings"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl bg-neutral-900 dark:bg-white/[0.07] dark:border dark:border-white/10 text-white dark:text-white text-xs font-extrabold hover:opacity-90 transition-all"
          >
            <CalendarDays size={14} className="text-gold" /> View bookings <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/10 overflow-x-auto">
          {FILTERS.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex-1 min-w-[124px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${isActive
                  ? "bg-[#14141b] dark:bg-gradient-to-r dark:from-gold-light dark:to-gold text-white dark:text-[#1a1408] shadow-lg"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10"
                  }`}
              >
                <cat.icon size={14} className={isActive ? "text-gold dark:text-[#1a1408]" : ""} />
                {cat.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${isActive ? "bg-gold text-[#1a1408] dark:bg-black/20 dark:text-[#1a1408]" : "bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {(searchQuery || categoryFilter !== "ALL") && (
          <div className="flex items-center justify-between text-[11px] font-body text-neutral-500">
            <span>
              Showing <strong className="text-neutral-900 dark:text-white">{groupedEvents.length}</strong> entr{groupedEvents.length === 1 ? "y" : "ies"}
              {searchQuery && <> for “<strong className="text-gold-dark dark:text-gold">{searchQuery}</strong>”</>}
            </span>
            <button
              onClick={() => { setCategoryFilter("ALL"); setSearchQuery(""); }}
              className="font-extrabold text-gold-dark dark:text-gold hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </section>

      {/* ═══════════ TIMELINE ═══════════ */}
      <SmartLoadingContainer
        loading={loading}
        hasData={allEvents.length > 0}
        error={error}
        onRetry={() => loadTrail(true)}
        skeleton={<ActivityTrailSkeleton />}
        delayMs={220}
        title="Activity Audit Trail"
      >
        {groupedEvents.length > 0 ? (
        <div className="rounded-[24px] bg-white dark:bg-[#12131a] border border-neutral-200/80 dark:border-white/10 p-5 sm:p-8 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.25)]">
          <div className="relative pl-7 sm:pl-9 space-y-5 before:absolute before:left-[15px] sm:before:left-[19px] before:top-3 before:bottom-3 before:w-[2px] before:rounded-full before:bg-gradient-to-b before:from-gold-light before:via-gold/40 before:to-transparent">
            {groupedEvents.map((group) => {
              const event = group.leadEvent;
              const badge = getCategoryBadge(event.category, event.rawCategory, event.status);
              const BadgeIcon = badge.icon || FileText;
              const isGrouped = group.occurrences.length > 1;
              const isExpanded = expandedGroupIds.has(group.id);

              return (
                <div key={group.id} className="relative">
                  {/* timeline node */}
                  <div className="absolute -left-7 sm:-left-9 top-4 flex items-center justify-center" style={{ width: 32 }}>
                    <span className="absolute w-8 h-8 rounded-full bg-gold/20 blur-md" />
                    <span className="relative w-8 h-8 rounded-2xl bg-[#14141b] dark:bg-gradient-to-br dark:from-gold-light dark:to-gold-dark border-2 border-gold text-gold dark:text-[#1a1408] flex items-center justify-center shadow-lg shadow-gold/20">
                      <BadgeIcon size={13} strokeWidth={2.4} />
                    </span>
                  </div>

                  <article className="group rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-gradient-to-br from-neutral-50/80 to-white dark:from-white/[0.04] dark:to-transparent hover:border-gold/50 hover:shadow-[0_16px_40px_-16px_rgba(201,169,110,0.4)] hover:-translate-y-0.5 transition-all p-4 sm:p-5 space-y-3">
                    {/* header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-neutral-200/70 dark:border-white/8">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs uppercase font-extrabold px-2.5 py-1.5 rounded-xl tracking-[0.1em] border shadow-sm ${badge.classes}`}>
                          <BadgeIcon size={12} className="shrink-0" />
                          {badge.label}
                        </span>
                        {isGrouped && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Layers size={10} /> {group.occurrences.length} grouped
                          </span>
                        )}
                        {event.bookingNumber && (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-neutral-500 bg-neutral-100 dark:bg-white/8 border border-neutral-200 dark:border-white/10 px-2.5 py-1.5 rounded-xl">
                            #{event.bookingNumber}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 font-body bg-neutral-100 dark:bg-white/5 border border-neutral-200/60 dark:border-white/10 px-2.5 py-1.5 rounded-xl">
                        <Clock size={11} />
                        {event.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <span className="text-neutral-300 dark:text-white/20">·</span>
                        {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        <span className="hidden sm:inline text-gold-dark dark:text-gold font-bold">· {timeAgo(event.timestamp)}</span>
                      </span>
                    </div>

                    {/* body */}
                    <div>
                      <h3 className="font-heading font-bold text-[15px] sm:text-base text-neutral-900 dark:text-white leading-snug">
                        {cleanTitle(event.title)}
                      </h3>
                      <p className="text-[13px] text-neutral-500 dark:text-neutral-400 font-body leading-relaxed mt-1">
                        {cleanDescription(event.description)}
                      </p>
                    </div>

                    {event.changes && event.changes.length > 0 && (
                      <RenderStructuredChanges changes={event.changes} category={event.category} />
                    )}

                    {/* grouped drawer */}
                    {isGrouped && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-gold-dark dark:text-gold bg-gold/10 hover:bg-gold/20 border border-gold/25 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? `Hide ${group.occurrences.length} occurrences` : `View all ${group.occurrences.length} occurrences`}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 rounded-2xl bg-neutral-950 dark:bg-black/50 border border-neutral-800 p-3.5 sm:p-4 space-y-3 animate-fade-in">
                            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gold px-1">Occurrence sequence</p>
                            {group.occurrences.map((occ, idx) => {
                              const occBadge = getCategoryBadge(occ.category, occ.rawCategory, occ.status);
                              return (
                                <div key={occ.id || idx} className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-2 hover:border-gold/30 transition-all">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-6 h-6 rounded-lg bg-gold/20 text-gold flex items-center justify-center text-xs font-extrabold shrink-0">
                                        {group.occurrences.length - idx}
                                      </span>
                                      <span className="font-bold text-[13px] text-white truncate">{cleanTitle(occ.title)}</span>
                                      <span className={`hidden sm:inline-flex text-[11px] uppercase font-extrabold px-2 py-0.5 rounded-lg border ${occBadge.classes}`}>
                                        {occBadge.label}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-white/40 font-body">
                                      {occ.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                                      {occ.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/55 leading-relaxed font-body">{cleanDescription(occ.description)}</p>
                                  {occ.changes && occ.changes.length > 0 && (
                                    <RenderStructuredChanges changes={occ.changes} category={occ.category} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* footer */}
                    {event.bookingId && (
                      <div className="pt-3 border-t border-neutral-200/60 dark:border-white/8 flex items-center justify-between gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 font-body">
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {event.bookingNumber ? `Session #${event.bookingNumber}` : `ID ${event.bookingId.substring(0, 8)}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenQR(event.bookingId)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-gold-dark dark:text-gold bg-gold/10 hover:bg-gold/20 border border-gold/25 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            <QrCode size={12} /> Studio Pass
                          </button>
                          <Link
                            to={`/dashboard/bookings/${event.bookingId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 px-3 py-1.5 rounded-xl hover:opacity-90 transition-all"
                          >
                            Manage <ArrowRight size={11} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>

          {/* end cap */}
          <div className="mt-8 flex items-center gap-3 pl-7 sm:pl-9">
            <span className="w-8 h-8 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-400 flex items-center justify-center -ml-8 sm:-ml-9">
              <Check size={14} />
            </span>
            <p className="text-[11px] text-neutral-400 font-body">Beginning of your verified archive · {allEvents.length} total events</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] bg-white dark:bg-[#12131a] border border-dashed border-neutral-300 dark:border-white/15 p-12 sm:p-16 text-center shadow-sm relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 bg-gold/15 blur-[80px] rounded-full" />
          <div className="relative">
            <span className="mx-auto w-16 h-16 rounded-[22px] bg-gradient-to-br from-gold-light to-gold-dark text-[#1a1408] flex items-center justify-center shadow-xl shadow-gold/30">
              <History size={26} />
            </span>
            <h3 className="mt-4 font-heading text-lg font-bold text-neutral-900 dark:text-white">No activity found</h3>
            <p className="text-[13px] text-neutral-500 mt-1 max-w-sm mx-auto font-body leading-relaxed">
              No matching events for this filter. Bookings, payments and profile saves will appear here in real time.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              {(categoryFilter !== "ALL" || searchQuery) && (
                <button
                  onClick={() => { setCategoryFilter("ALL"); setSearchQuery(""); }}
                  className="px-5 py-2.5 rounded-2xl bg-neutral-900 dark:bg-gold text-white dark:text-[#1a1408] text-xs font-extrabold cursor-pointer hover:opacity-90 transition-all"
                >
                  Reset filters
                </button>
              )}
              <Link
                to="/dashboard/bookings"
                className="px-5 py-2.5 rounded-2xl border border-neutral-300 dark:border-white/15 text-xs font-extrabold hover:border-gold transition-all"
              >
                Go to bookings
              </Link>
            </div>
          </div>
        </div>
      )}
      </SmartLoadingContainer>

      {/* QR Pass Modal Tool */}
      <ClientToolsHub
        isOpen={toolsOpen}
        onClose={() => setToolsOpen(false)}
        initialTool="qr"
        bookings={bookings}
        selectedBooking={selectedBookingForPass}
      />
    </div>
  );
}
