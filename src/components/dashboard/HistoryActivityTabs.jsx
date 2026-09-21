import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, MapPin, CheckCircle, ArrowRight,
  Search, QrCode, FileText, Camera, CreditCard,
  ChevronRight, History, Bell, Loader2,
  Truck, UserCheck, Sliders, ShieldCheck, Check, Edit3
} from "lucide-react";
import { getStatusBadge, getStatusLabel, getPaymentLabel, getProgressSteps } from "../../lib/bookingUtils";
import { getCustomerActivityAudit } from "../../services/bookingService";
import StudioDropdown from "../ui/StudioDropdown";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function HistoryActivityTabs({
  bookings = [],
  onOpenQRPass,
  user,
  profile: _profile
}) {
  const [activeTab, setActiveTab] = useState("active"); // "active" | "records" | "logs"
  
  // Records Tab state
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  // Activity Logs Tab state
  const [logCategory, setLogCategory] = useState("ALL");
  const [logSearch, setLogSearch] = useState("");

  // Real database audit events fetched from Supabase
  const [dbAuditEvents, setDbAuditEvents] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAudit() {
      if (!user?.id) return;
      setLoadingAudit(true);
      try {
        const bookingIds = bookings.map(b => b.id).filter(Boolean);
        const { data } = await getCustomerActivityAudit(user.id, bookingIds);
        if (isMounted) {
          setDbAuditEvents(data || []);
        }
      } catch (err) {
        console.warn("Could not load activity audit:", err);
      } finally {
        if (isMounted) setLoadingAudit(false);
      }
    }
    loadAudit();

    const handleAuditUpdate = () => loadAudit();
    window.addEventListener('ekodak_audit_trail_updated', handleAuditUpdate);

    return () => { 
      isMounted = false; 
      window.removeEventListener('ekodak_audit_trail_updated', handleAuditUpdate);
    };
  }, [user?.id, bookings]);

  // Active bookings (Pending, Confirmed, Photographer Assigned, In Progress, Ready)
  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status !== "COMPLETED" && b.status !== "CANCELLED" && b.status !== "REJECTED");
  }, [bookings]);

  // Filtered booking records
  const filteredRecords = useMemo(() => {
    let list = bookings;
    if (statusFilter !== "ALL") {
      list = list.filter(b => b.status?.toUpperCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(b => 
        b.booking_number?.toLowerCase().includes(q) ||
        b.service?.name?.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === "event") return new Date(a.event_date || 0) - new Date(b.event_date || 0);
      return 0;
    });
  }, [bookings, statusFilter, searchQuery, sortOrder]);

  // Combined authentic activity logs from database records
  const activityLogs = useMemo(() => {
    const logs = [];

    // 1. Real booking submissions from bookings table
    bookings.forEach((b) => {
      if (b.created_at) {
        logs.push({
          id: `book_submit_${b.id}`,
          category: "BOOKING",
          title: `Booking Submitted (#${b.booking_number})`,
          description: `Photoshoot booked for ${b.service?.name || "Studio Portrait"}${b.tier_name ? ` (${b.tier_name})` : ""}${b.event_date ? ` · Target date: ${new Date(b.event_date).toLocaleDateString()}` : ""}.`,
          bookingNumber: b.booking_number,
          bookingId: b.id,
          timestamp: new Date(b.created_at),
          status: b.status,
          icon: Camera
        });
      }
    });

    // 2. Real database events from booking_status_history, payments, notifications & customer action audits
    dbAuditEvents.forEach((ev) => {
      let icon = FileText;
      let category = ev.category || "ACTIVITY";

      if (ev.source === "DATABASE_STATUS_HISTORY") {
        category = "STATUS";
        icon = CheckCircle;
      } else if (ev.source === "DATABASE_PAYMENTS") {
        category = "PAYMENT";
        icon = CreditCard;
      } else if (ev.source === "DATABASE_NOTIFICATIONS") {
        category = "NOTIFICATION";
        icon = Bell;
      } else if (ev.source === "CUSTOMER_ACTION") {
        category = "UPDATES";
        if (ev.category === 'PROFILE_UPDATE') icon = UserCheck;
        else if (ev.category === 'SPEC_UPDATE') icon = Sliders;
        else if (ev.category === 'DELIVERY_UPDATE') icon = Truck;
        else if (ev.category === 'TERMS_SIGN') icon = ShieldCheck;
        else if (ev.category === 'PAYMENT_SUBMIT') icon = CreditCard;
        else if (ev.category === 'PREFERENCE_UPDATE') icon = Sliders;
        else icon = Edit3;
      }

      // Locate associated booking number if not present
      const matchedBooking = bookings.find(b => b.id === ev.bookingId);
      const bookingNumber = ev.bookingNumber || matchedBooking?.booking_number || null;

      logs.push({
        id: ev.id,
        category,
        rawCategory: ev.category,
        title: ev.title,
        description: ev.description,
        changes: ev.changes || [],
        bookingNumber,
        bookingId: ev.bookingId,
        timestamp: new Date(ev.timestamp),
        status: ev.status,
        source: ev.source,
        icon
      });
    });

    // Sort chronologically descending (newest first)
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, dbAuditEvents]);

  // Filtered activity logs
  const filteredLogs = useMemo(() => {
    let list = activityLogs;
    if (logCategory !== "ALL") {
      if (logCategory === "UPDATES") {
        list = list.filter(l => l.source === "CUSTOMER_ACTION" || l.category === "UPDATES" || l.rawCategory?.includes("UPDATE") || l.rawCategory?.includes("TERMS"));
      } else {
        list = list.filter(l => l.category === logCategory);
      }
    }
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim();
      list = list.filter(l => 
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        (l.changes && l.changes.some(ch => ch.toLowerCase().includes(q))) ||
        (l.bookingNumber && l.bookingNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activityLogs, logCategory, logSearch]);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm overflow-hidden animate-fade-in">
      
      {/* ── Top Tabs Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200/90 bg-neutral-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-white text-primary shadow-sm"
                : "text-neutral-500 hover:text-primary"
            }`}
          >
            <Calendar size={14} className={activeTab === "active" ? "text-gold" : ""} />
            <span>Active Sessions</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-body ${
              activeTab === "active" ? "bg-gold/15 text-gold-dark" : "bg-neutral-300 text-neutral-600"
            }`}>
              {activeBookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "records"
                ? "bg-white text-primary shadow-sm"
                : "text-neutral-500 hover:text-primary"
            }`}
          >
            <History size={14} className={activeTab === "records" ? "text-gold" : ""} />
            <span>Booking Records</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-body ${
              activeTab === "records" ? "bg-gold/15 text-gold-dark" : "bg-neutral-300 text-neutral-600"
            }`}>
              {bookings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "logs"
                ? "bg-white text-primary shadow-sm"
                : "text-neutral-500 hover:text-primary"
            }`}
          >
            <FileText size={14} className={activeTab === "logs" ? "text-gold" : ""} />
            <span>Activity Trail</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-body ${
              activeTab === "logs" ? "bg-gold/15 text-gold-dark" : "bg-neutral-300 text-neutral-600"
            }`}>
              {activityLogs.length}
            </span>
          </button>
        </div>

        {/* Tab Sub-Action */}
        <div className="flex items-center gap-2">
          {activeTab === "active" && (
            <Link to="/dashboard/book" className="btn-primary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5">
              <Camera size={14} /> Book Another Session
            </Link>
          )}
          {activeTab === "records" && (
            <Link to="/dashboard/bookings" className="text-xs font-bold text-gold hover:text-gold-dark flex items-center gap-1">
              <span>Full Management</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Tab Content 1: ACTIVE SESSIONS ──────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="p-5 sm:p-6 space-y-5">
          {activeBookings.length > 0 ? (
            activeBookings.map((b) => {
              const days = daysUntil(b.event_date);
              const steps = getProgressSteps(b.status);

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${getStatusBadge(b.status)}`}>
                        {getStatusLabel(b.status)}
                      </span>
                      <span className="text-xs text-neutral-400 font-body">
                        #{b.booking_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {days !== null && days >= 0 && (
                        <span className="text-xs font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Clock size={12} /> {days === 0 ? "Today!" : `${days} days away`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenQRPass(b)}
                        className="btn-outline py-1 px-2.5 text-xs flex items-center gap-1.5"
                        title="View Studio QR Pass"
                      >
                        <QrCode size={13} className="text-gold" /> Studio Pass
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-5 mb-5">
                    <div>
                      <h4 className="font-heading text-lg font-bold text-primary">
                        {b.service?.name || "Studio Portrait Session"}
                      </h4>
                      {b.tier_name && (
                        <p className="text-xs text-gold-dark font-medium mt-0.5">
                          Package: {b.tier_name}
                        </p>
                      )}
                      <p className="text-xs text-neutral-500 mt-2 font-body">
                        Total: ₱{Number(b.total_amount || 0).toLocaleString()} · {getPaymentLabel(b.payment_status)}
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-neutral-600">
                      <p className="flex items-center gap-2">
                        <Calendar size={14} className="text-gold shrink-0" />
                        <span>
                          {b.event_date
                            ? new Date(b.event_date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
                            : "Date to be confirmed"}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock size={14} className="text-gold shrink-0" />
                        <span>{b.preferred_time ? `${b.preferred_time.substring(0, 5)} Call Time` : "Standard Call Time"}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin size={14} className="text-gold shrink-0" />
                        <span className="truncate">{b.location || "E-Kodak Studio, Cebu"}</span>
                      </p>
                    </div>

                    <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                          Assigned Photographer
                        </span>
                        {b.photographer ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold font-heading">
                              {b.photographer.profile?.first_name?.charAt(0) || "P"}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-primary">
                                {b.photographer.profile?.first_name} {b.photographer.profile?.last_name}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {b.photographer.specialization || "Studio Specialist"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500 italic">
                            Assignment in progress by studio management
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                        <Link
                          to={`/dashboard/bookings/${b.id}`}
                          className="text-xs font-semibold text-primary hover:text-gold flex items-center gap-1 transition-colors"
                        >
                          <span>Manage Details</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Visual Session Step Tracker */}
                  <div className="pt-4 border-t border-neutral-100">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 shrink-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            step.completed
                              ? "bg-emerald-500 text-white shadow-xs"
                              : step.current
                              ? "bg-gold text-primary ring-2 ring-gold/30 animate-pulse"
                              : "bg-neutral-200 text-neutral-500"
                          }`}>
                            {step.completed ? "✓" : idx + 1}
                          </div>
                          <span className={`text-xs whitespace-nowrap ${
                            step.current ? "font-bold text-primary" : step.completed ? "text-neutral-700" : "text-neutral-400"
                          }`}>
                            {step.label}
                          </span>
                          {idx < steps.length - 1 && (
                            <div className={`w-6 sm:w-10 h-0.5 ${step.completed ? "bg-emerald-400" : "bg-neutral-200"}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mx-auto mb-3">
                <Calendar size={28} />
              </div>
              <h3 className="font-heading text-lg font-bold text-primary mb-1">No Active Sessions</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4 font-body">
                You do not have any pending or upcoming photoshoots scheduled right now.
              </p>
              <Link to="/dashboard/book" className="btn-primary inline-flex text-xs">
                Schedule a Photoshoot Now
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content 2: BOOKING RECORDS ─────────────────────────────────── */}
      {activeTab === "records" && (
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter by booking number, package, location..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-primary text-white"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort Order */}
            <div className="w-36 shrink-0">
              <StudioDropdown
                value={sortOrder}
                onChange={setSortOrder}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'event', label: 'Shoot Date' },
                ]}
                triggerClassName="py-1.5 px-2.5 text-xs font-medium"
              />
            </div>
          </div>

          {/* Records Table / Cards */}
          {filteredRecords.length > 0 ? (
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden">
              {filteredRecords.map((b) => (
                <div key={b.id} className="p-4 hover:bg-neutral-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0 mt-0.5">
                      <Camera size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-primary font-heading">
                          {b.service?.name || "Session"}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(b.status)}`}>
                          {getStatusLabel(b.status)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-body mt-0.5">
                        #{b.booking_number} · Booked {new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-primary font-body">
                        ₱{Number(b.total_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {b.event_date ? new Date(b.event_date).toLocaleDateString() : "Date TBD"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenQRPass(b)}
                      className="p-1.5 text-neutral-500 hover:text-gold hover:bg-gold/10 rounded-xl border border-neutral-200 transition-colors"
                      title="View QR Pass"
                    >
                      <QrCode size={15} />
                    </button>

                    <Link
                      to={`/dashboard/bookings/${b.id}`}
                      className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1"
                    >
                      <span>View</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-neutral-400 text-xs font-body">
              No booking records match your criteria.
            </p>
          )}
        </div>
      )}

      {/* ── Tab Content 3: ACTIVITY TRAIL (AUTHENTIC DATABASE AUDIT) ───────── */}
      {activeTab === "logs" && (
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Search activity records by event, keyword, or booking number..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "ALL", label: "All Activity" },
                { id: "UPDATES", label: "Client Updates" },
                { id: "BOOKING", label: "Bookings" },
                { id: "STATUS", label: "Status" },
                { id: "PAYMENT", label: "Payments" },
                { id: "NOTIFICATION", label: "Bulletins" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setLogCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    logCategory === cat.id
                      ? "bg-primary text-white"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loadingAudit && (
            <div className="flex items-center justify-center py-4 gap-2 text-xs text-neutral-400">
              <Loader2 size={14} className="animate-spin text-gold" />
              <span>Synchronizing latest studio database records...</span>
            </div>
          )}

          {/* Timeline Feed */}
          {filteredLogs.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
              {filteredLogs.map(log => {
                const IconComponent = log.icon || FileText;

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-gold flex items-center justify-center text-gold shadow-xs">
                      <IconComponent size={10} />
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 hover:border-gold/30 transition-all shadow-xs">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-primary">
                            {log.title}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded uppercase font-body">
                            {log.category === 'UPDATES' ? (log.rawCategory?.replace('_', ' ') || 'CLIENT UPDATE') : log.category}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-body whitespace-nowrap">
                          {log.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {log.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 font-body">
                        {log.description}
                      </p>

                      {/* Customer Action Changes / Diffs */}
                      {log.changes && log.changes.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-neutral-100 flex flex-wrap gap-1.5">
                          {log.changes.map((ch, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-medium"
                            >
                              <Check size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{ch}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {log.bookingId && (
                        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                          <span className="text-neutral-400 font-body">
                            {log.bookingNumber ? `Session: #${log.bookingNumber}` : `Session ID: ${log.bookingId.substring(0, 8)}...`}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const matched = bookings.find(b => b.id === log.bookingId);
                                if (matched) onOpenQRPass(matched);
                              }}
                              className="text-gold font-bold hover:underline flex items-center gap-1"
                            >
                              <QrCode size={11} /> Pass
                            </button>
                            <Link to={`/dashboard/bookings/${log.bookingId}`} className="text-primary font-bold hover:text-gold flex items-center gap-1">
                              <span>Details</span>
                              <ArrowRight size={11} />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-neutral-400 text-xs font-body">
              No activity logs match your search.
            </p>
          )}
        </div>
      )}

    </div>
  );
}

HistoryActivityTabs.propTypes = {
  bookings: PropTypes.array,
  onOpenQRPass: PropTypes.func.isRequired,
  user: PropTypes.object,
  profile: PropTypes.object,
};
