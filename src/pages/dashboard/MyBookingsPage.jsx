import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Camera, 
  Calendar as CalendarIcon, 
  CalendarDays,
  CheckCircle,
  Loader2, 
  ArrowUpDown, 
  Search, 
  Layers, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Plus,
  Bell
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getCustomerBookings } from "../../services/bookingService";
import BookingCard from "../../components/booking/BookingCard";
import ClientHeroBanner from "../../components/dashboard/ClientHeroBanner";
import StudioDropdown from "../../components/ui/StudioDropdown";
import StatCard from "../../components/admin/StatCard";

const FILTER_TABS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

const SORT_OPTIONS = [
  { label: "Newest First",  value: "newest" },
  { label: "Oldest First",  value: "oldest" },
  { label: "Upcoming",      value: "upcoming" },
];

function isScheduleTBD(b) {
  if (!b) return false;
  if (!b.event_date) return true;
  const isSchool = b.student_details?.booking_mode === 'SCHOOL_PARTNER' ||
    (b.notes || '').toLowerCase().includes('school pictorial') ||
    (b.notes || '').toLowerCase().includes('official school partner') ||
    (b.notes || '').toLowerCase().includes('school partner agreement') ||
    (b.notes || '').toLowerCase().includes('tbd');
  return isSchool && !b.event_date;
}

export default function MyBookingsPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();

  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && FILTER_TABS.some(t => t.toLowerCase() === tabParam.toLowerCase())) {
      return FILTER_TABS.find(t => t.toLowerCase() === tabParam.toLowerCase());
    }
    return "All";
  });
  const [sort,     setSort]     = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSort, setShowSort] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("all");

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && FILTER_TABS.some(t => t.toLowerCase() === tabParam.toLowerCase())) {
      const matched = FILTER_TABS.find(t => t.toLowerCase() === tabParam.toLowerCase());
      if (matched) setFilter(matched);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    getCustomerBookings(user.id).then(({ data, error }) => {
      if (error) setError(error.message);
      else       setBookings((data || []).filter(b => !b.is_deleted));
      setLoading(false);
    });
  }, [user]);

  // ── Stat metrics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = bookings.length;
    // Orders with schedule to be announced belong to pending
    const pending = bookings.filter(b => 
      b.status?.toUpperCase() === "PENDING" || 
      (isScheduleTBD(b) && b.status?.toUpperCase() !== "COMPLETED" && b.status?.toUpperCase() !== "CANCELLED")
    ).length;
    const photographerAssigned = bookings.filter(b => 
      b.status?.toUpperCase() === "PHOTOGRAPHER_ASSIGNED" || 
      !!b.photographer_id || 
      !!b.photographer
    ).length;
    const completed = bookings.filter(b => b.status?.toUpperCase() === "COMPLETED").length;
    return { total, pending, photographerAssigned, completed };
  }, [bookings]);

  // ── Filtered + sorted bookings ──────────────────────────────────────────────
  const displayedBookings = useMemo(() => {
    let result = bookings;

    // Filter by selected order from dropdown if active
    if (selectedOrder !== "all") {
      result = result.filter(b => b.id.toString() === selectedOrder.toString());
    }

    if (filter === "Pending") {
      result = result.filter(b => 
        b.status?.toUpperCase() === "PENDING" || 
        (isScheduleTBD(b) && b.status?.toUpperCase() !== "COMPLETED" && b.status?.toUpperCase() !== "CANCELLED")
      );
    } else if (filter === "Confirmed") {
      result = result.filter(b => 
        b.status?.toUpperCase() === "CONFIRMED" || 
        b.status?.toUpperCase() === "PHOTOGRAPHER_ASSIGNED"
      );
    } else if (filter === "Completed") {
      result = result.filter(b => b.status?.toUpperCase() === "COMPLETED");
    } else if (filter === "Cancelled") {
      result = result.filter(b => b.status?.toUpperCase() === "CANCELLED" || b.status?.toUpperCase() === "REJECTED");
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => {
        const numMatch = b.booking_number?.toLowerCase().includes(q);
        const svcMatch = b.service?.name?.toLowerCase().includes(q);
        const tierMatch = b.tier_name?.toLowerCase().includes(q);
        const schoolMatch = b.student_details?.school?.toLowerCase().includes(q);
        const batchMatch = b.student_details?.section?.toLowerCase().includes(q);
        const participantMatch = b.participant_details?.full_name?.toLowerCase().includes(q);
        const studentMatch = b.student_details?.student_name?.toLowerCase().includes(q);
        const notesMatch = b.notes?.toLowerCase().includes(q);
        return numMatch || svcMatch || tierMatch || schoolMatch || batchMatch || participantMatch || studentMatch || notesMatch;
      });
    }

    if (sort === "newest") {
      result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "oldest") {
      result = [...result].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === "upcoming") {
      result = [...result]
        .filter(b => b.event_date)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    }

    return result;
  }, [bookings, selectedOrder, filter, sort, searchQuery]);

  // ── Count per filter ────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    return {
      All: bookings.length,
      Pending: bookings.filter(b => 
        b.status?.toUpperCase() === "PENDING" || 
        (isScheduleTBD(b) && b.status?.toUpperCase() !== "COMPLETED" && b.status?.toUpperCase() !== "CANCELLED")
      ).length,
      Confirmed: bookings.filter(b => 
        b.status?.toUpperCase() === "CONFIRMED" || 
        b.status?.toUpperCase() === "PHOTOGRAPHER_ASSIGNED"
      ).length,
      Completed: bookings.filter(b => b.status?.toUpperCase() === "COMPLETED").length,
      Cancelled: bookings.filter(b => b.status?.toUpperCase() === "CANCELLED" || b.status?.toUpperCase() === "REJECTED").length,
    };
  }, [bookings]);

  if (loading) {
    return (
      <div className="h-full min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={36} />
        <span className="text-xs font-body text-neutral-400 mt-3">Loading Session Portfolio...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-screen-2xl mx-auto w-full pb-12 space-y-6">

      {/* -- Unified Luxury Dark Hero Banner with Live Philippine Time & Quick Tools -- */}
      <ClientHeroBanner 
        bookings={bookings} 
        extraActions={
          <Link
            to="/dashboard/progress"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold/15 hover:bg-gold/25 text-gold text-xs font-bold transition-all border border-gold/40 shadow-xs shrink-0"
            title="Open Studio Progress Tracker"
          >
            <Layers size={15} />
            <span>Progress Tracker</span>
          </Link>
        }
      />

      {/* -- Order Selector (Rendered compactly only when active orders exist) -- */}
      {bookings.length > 0 && (
        <div className="flex items-center gap-2.5 bg-[#faf9f6] dark:bg-neutral-900 p-2 pr-3 pl-4 rounded-2xl border border-gold/20 shadow-xs w-fit">
          <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 font-body uppercase tracking-wider">Filtered Order:</span>
          <div className="relative z-30">
            <StudioDropdown
              value={selectedOrder}
              onChange={(val) => setSelectedOrder(val)}
              options={[
                { value: "all", label: `All Orders (${bookings.length})` },
                ...bookings.map(b => {
                  const isSomeoneElse = b.participant_details?.booking_for === 'someone_else';
                  const targetName = b.participant_details?.full_name || b.student_details?.student_name || (
                    profile?.first_name 
                      ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
                      : (profile?.full_name || user?.user_metadata?.full_name || 'Customer')
                  );
                  const labelSuffix = isSomeoneElse ? ` (For: ${b.participant_details.full_name})` : '';
                  return {
                    value: b.id,
                    label: `#${b.booking_number} · ${targetName}${labelSuffix}`
                  };
                })
              ]}
              align="left"
              triggerClassName="text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 transition-colors py-1.5 pl-3 pr-7 rounded-xl border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:border-gold cursor-pointer font-body min-w-[260px] sm:min-w-[290px] shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* ── Overview Metrics Strip (Matching DashboardHome Standard) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Sessions"
          value={stats.total}
          icon={CalendarDays}
          color="blue"
        />
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Confirmed Shoots"
          value={stats.confirmed}
          icon={Camera}
          color="gold"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* ── Search + Filter + Sort Bar ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-3 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3 font-body">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by Booking #, Package, School, Batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-body rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-gold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-body text-neutral-400 hover:text-primary dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0 flex items-center justify-end">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-body text-neutral-700 dark:text-neutral-300 hover:border-gold transition-colors"
            >
              <ArrowUpDown size={13} className="text-gold" />
              <span>{SORT_OPTIONS.find(o => o.value === sort)?.label}</span>
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1 z-30 min-w-[150px] text-xs font-body">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { setSort(o.value); setShowSort(false); }}
                    className={`w-full text-left px-3.5 py-2 transition-colors ${
                      sort === o.value ? "text-gold font-bold bg-gold/5" : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar pt-1 border-t border-neutral-100 dark:border-neutral-800">
          {FILTER_TABS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                relative px-3 py-1.5 rounded-xl text-xs font-body font-medium whitespace-nowrap transition-all flex items-center gap-1.5
                ${filter === f
                  ? "bg-primary dark:bg-neutral-100 text-white dark:text-primary font-bold shadow-2xs"
                  : "bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60"}
              `}
            >
              <span>{f}</span>
              {counts[f] > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.2 rounded-full ${
                  filter === f
                    ? "bg-white/20 dark:bg-black/20 text-white dark:text-primary"
                    : "bg-neutral-200/80 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                }`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-body border border-red-200 dark:border-red-900/50">
          Error loading session bookings: {error}
        </div>
      )}

      {/* ── Bookings List / Empty State ──────────────────────────────────────── */}
      {displayedBookings.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 shadow-xs border border-neutral-200/80 dark:border-neutral-800 border-dashed text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 text-neutral-400 border border-neutral-200/60 dark:border-neutral-700">
            <CalendarIcon size={28} className="text-gold" />
          </div>
          <h2 className="font-heading text-xl text-primary dark:text-white font-bold mb-2">
            {searchQuery ? "No matching sessions found" : filter === "All" ? "No bookings yet" : `No ${filter.toLowerCase()} bookings`}
          </h2>
          <p className="font-body text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
            {searchQuery
              ? `No sessions matched "${searchQuery}". Try searching by another keyword or clear the search.`
              : filter === "All"
              ? "You have not reserved any graduation photography sessions. Browse our studio packages to get started!"
              : `You do not have any sessions with status "${filter}".`}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="btn-outline py-2 px-4 text-xs font-body"
            >
              Clear Search Query
            </button>
          ) : (
            <Link to="/dashboard/book" className="btn-primary py-2 px-5 text-xs inline-flex items-center gap-2 font-body">
              <Camera size={15} /> Book a Session
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map(booking => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

    </div>
  );
}
