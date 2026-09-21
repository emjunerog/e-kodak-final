import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Camera, 
  Calendar as CalendarIcon, 
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
import StudioDropdown from "../../components/ui/StudioDropdown";

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

  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState("All");
  const [sort,     setSort]     = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSort, setShowSort] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("all");

  useEffect(() => {
    if (!user) return;
    getCustomerBookings(user.id).then(({ data, error }) => {
      if (error) setError(error.message);
      else       setBookings(data || []);
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
        const notesMatch = b.notes?.toLowerCase().includes(q);
        return numMatch || svcMatch || tierMatch || schoolMatch || batchMatch || notesMatch;
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
    <div className="animate-fade-in max-w-6xl mx-auto pb-12 space-y-6">

      {/* ── Header with StudioDropdown Layout ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5 relative z-30">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
            <CalendarIcon className="text-gold" size={20} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-primary dark:text-white tracking-tight leading-none mb-1">
              My Studio Bookings
            </h1>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 font-body">
              Welcome back, <strong className="text-primary dark:text-neutral-200">{profile?.first_name || user?.email}</strong> · You have <strong className="text-gold font-bold">{bookings.length}</strong> registered session{bookings.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>

        {/* StudioDropdown and Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {bookings.length > 0 && (
            <div className="flex items-center gap-2.5 bg-[#faf9f6] dark:bg-neutral-900 p-1.5 pr-2 pl-3.5 rounded-full border border-gold/20 shadow-xs shrink-0">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 font-body uppercase tracking-wider">Order:</span>
              <div className="relative z-30">
                <StudioDropdown
                  value={selectedOrder}
                  onChange={(val) => setSelectedOrder(val)}
                  options={[
                    { value: "all", label: `All Orders (${bookings.length})` },
                    ...bookings.map(b => {
                      const customerName = profile?.first_name 
                        ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
                        : (profile?.full_name || user?.user_metadata?.full_name || 'Customer');
                      return {
                        value: b.id,
                        label: `#${b.booking_number} · ${customerName}`
                      };
                    })
                  ]}
                  align="right"
                  triggerClassName="text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-[#fdfbf7] dark:bg-neutral-800 hover:bg-white transition-colors py-1.5 pl-3 pr-7 rounded-xl border-2 border-gold/20 focus:outline-none focus:border-gold/40 cursor-pointer font-body w-full sm:w-auto min-w-[260px] sm:min-w-[290px] shadow-xs"
                />
              </div>
            </div>
          )}

          <Link
            to="/dashboard/progress"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold font-body text-xs font-bold transition-colors border border-gold/30 shadow-2xs"
          >
            <Layers size={14} />
            <span>Progress Tracker</span>
          </Link>

          <Link 
            to="/dashboard/book" 
            className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 shadow-xs whitespace-nowrap font-body rounded-xl font-bold"
          >
            <Plus size={14} />
            <span>Book New Session</span>
          </Link>
        </div>
      </div>

      {/* ── Space-Efficient KPI Stat Bar (Uniform Bootstrap Sizing) ──────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 text-xs font-body">
        
        {/* Card 1: Total Bookings */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-gold/30 transition-all flex items-center gap-3.5 w-full min-h-[84px] group/kpi">
          <div 
            className="has-tooltip w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0 cursor-pointer group-hover/kpi:scale-110 group-hover/kpi:rotate-6 transition-all duration-300"
            title="Total Bookings: All registered sessions"
          >
            <Camera size={20} />
            <div className="tooltip-bubble">
              <span className="font-semibold block text-gold">Total Portfolio</span>
              <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                All booked sessions across your account
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Total Bookings
            </span>
            <span className="font-heading font-black text-2xl text-primary dark:text-white leading-tight mt-0.5 block">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Card 2: Pending Review */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-amber-500/30 transition-all flex items-center gap-3.5 w-full min-h-[84px] group/kpi">
          <div 
            className="has-tooltip w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 cursor-pointer group-hover/kpi:scale-110 group-hover/kpi:-rotate-12 transition-all duration-300"
            title="Pending Review: Sessions awaiting admin review or schedule announcement"
          >
            <Clock size={20} />
            <div className="tooltip-bubble">
              <span className="font-semibold block text-amber-300">Pending Review</span>
              <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                Awaiting staff review or date announcement
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Pending Review
            </span>
            <span className="font-heading font-black text-2xl text-amber-600 dark:text-amber-400 leading-tight mt-0.5 block">
              {stats.pending}
            </span>
          </div>
        </div>

        {/* Card 3: Photographer Assigned (Formerly Confirmed Bay) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-emerald-500/30 transition-all flex items-center gap-3.5 w-full min-h-[84px] group/kpi">
          <div 
            className="has-tooltip w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 cursor-pointer group-hover/kpi:scale-110 group-hover/kpi:rotate-6 transition-all duration-300"
            title="Photographer Assigned: Confirmed sessions with assigned personnel"
          >
            <CheckCircle2 size={20} />
            <div className="tooltip-bubble">
              <span className="font-semibold block text-emerald-300">Staff Assigned</span>
              <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                Camera bay and studio photographer confirmed
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Photographer Assigned
            </span>
            <span className="font-heading font-black text-2xl text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5 block">
              {stats.photographerAssigned}
            </span>
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-blue-500/30 transition-all flex items-center gap-3.5 w-full min-h-[84px] group/kpi">
          <div 
            className="has-tooltip w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 cursor-pointer group-hover/kpi:scale-110 group-hover/kpi:-rotate-6 transition-all duration-300"
            title="Completed: Finalized sessions and claimed portrait packages"
          >
            <Layers size={20} />
            <div className="tooltip-bubble">
              <span className="font-semibold block text-blue-300">Completed Sessions</span>
              <span className="block text-[10px] text-neutral-300 font-normal leading-tight mt-0.5">
                Shoot & post-production successfully completed
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Completed
            </span>
            <span className="font-heading font-black text-2xl text-blue-600 dark:text-blue-400 leading-tight mt-0.5 block">
              {stats.completed}
            </span>
          </div>
        </div>

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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-body text-neutral-400 hover:text-primary dark:hover:text-white"
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
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
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
