import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  History, Search, Camera, CheckCircle, CreditCard,
  Bell, FileText, ArrowRight, QrCode, Loader2, ArrowLeft,
  Truck, UserCheck, Sliders, ShieldCheck, Check, Edit3
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getCustomerBookings, getCustomerActivityAudit } from "../../services/bookingService";
import ClientToolsHub from "../../components/dashboard/ClientToolsHub";

export default function ActivityTrailPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Tools Modal (for QR Pass view from activity)
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedBookingForPass, setSelectedBookingForPass] = useState(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadTrail() {
      try {
        const { data: bData } = await getCustomerBookings(user.id);
        const customerBookings = bData || [];
        if (isMounted) setBookings(customerBookings);

        const bookingIds = customerBookings.map(b => b.id).filter(Boolean);
        const { data: auditData } = await getCustomerActivityAudit(user.id, bookingIds);
        if (isMounted) setDbEvents(auditData || []);
      } catch (err) {
        console.warn("Error loading activity trail:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTrail();

    const handleAuditUpdate = () => loadTrail();
    window.addEventListener('ekodak_audit_trail_updated', handleAuditUpdate);

    return () => { 
      isMounted = false; 
      window.removeEventListener('ekodak_audit_trail_updated', handleAuditUpdate);
    };
  }, [user]);

  // Combine real database records & customer-initiated updates
  const allEvents = useMemo(() => {
    const events = [];

    // 1. Real booking creation events from bookings table
    bookings.forEach((b) => {
      if (b.created_at) {
        events.push({
          id: `book_created_${b.id}`,
          category: "BOOKING",
          title: `Booking Submitted (#${b.booking_number})`,
          description: `Photoshoot registered for ${b.service?.name || "Studio Session"}${b.tier_name ? ` (${b.tier_name})` : ""}${b.event_date ? ` scheduled on ${new Date(b.event_date).toLocaleDateString()}` : ""}.`,
          bookingNumber: b.booking_number,
          bookingId: b.id,
          timestamp: new Date(b.created_at),
          status: b.status,
          icon: Camera,
          source: 'DATABASE_BOOKING'
        });
      }
    });

    // 2. Real status changes, payments, notifications & customer action audits
    dbEvents.forEach((ev) => {
      let icon = FileText;
      let cat = ev.category || "STATUS";

      if (ev.source === "DATABASE_STATUS_HISTORY") {
        cat = "STATUS";
        icon = CheckCircle;
      } else if (ev.source === "DATABASE_PAYMENTS") {
        cat = "PAYMENT";
        icon = CreditCard;
      } else if (ev.source === "DATABASE_NOTIFICATIONS") {
        cat = "NOTIFICATION";
        icon = Bell;
      } else if (ev.source === "CUSTOMER_ACTION") {
        cat = "UPDATES";
        if (ev.category === 'PROFILE_UPDATE') icon = UserCheck;
        else if (ev.category === 'SPEC_UPDATE') icon = Sliders;
        else if (ev.category === 'DELIVERY_UPDATE') icon = Truck;
        else if (ev.category === 'TERMS_SIGN') icon = ShieldCheck;
        else if (ev.category === 'PAYMENT_SUBMIT') icon = CreditCard;
        else if (ev.category === 'PREFERENCE_UPDATE') icon = Sliders;
        else icon = Edit3;
      }

      const matchedBooking = bookings.find(b => b.id === ev.bookingId);
      const bNumber = ev.bookingNumber || matchedBooking?.booking_number || null;

      events.push({
        id: ev.id,
        category: cat,
        rawCategory: ev.category,
        title: ev.title,
        description: ev.description,
        changes: ev.changes || [],
        bookingNumber: bNumber,
        bookingId: ev.bookingId,
        timestamp: new Date(ev.timestamp),
        status: ev.status,
        source: ev.source,
        icon,
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, dbEvents]);

  // Filtered timeline
  const filteredEvents = useMemo(() => {
    let list = allEvents;
    if (categoryFilter !== "ALL") {
      if (categoryFilter === "UPDATES") {
        list = list.filter(e => e.source === "CUSTOMER_ACTION" || e.category === "UPDATES" || e.rawCategory?.includes("UPDATE") || e.rawCategory?.includes("TERMS"));
      } else {
        list = list.filter(e => e.category === categoryFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        (e.changes && e.changes.some(ch => ch.toLowerCase().includes(q))) ||
        (e.bookingNumber && e.bookingNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEvents, categoryFilter, searchQuery]);

  const handleOpenQR = (bookingId) => {
    const b = bookings.find(item => item.id === bookingId);
    if (b) {
      setSelectedBookingForPass(b);
      setToolsOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/dashboard" className="text-xs text-neutral-400 hover:text-gold flex items-center gap-1 transition-colors">
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-bold text-gold uppercase tracking-wider">Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-primary flex items-center gap-2.5">
            <History size={26} className="text-gold" />
            <span>Activity Trail & Audit Log</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-body">
            Real-time chronological log of your studio bookings, status updates, payments, and bulletins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/dashboard/bookings" className="btn-outline py-2 px-3.5 text-xs">
            View Booking Records
          </Link>
          <Link to="/dashboard/book" className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5">
            <Camera size={14} /> Book a Session
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity by event, keyword, or booking #..."
            className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "All Activity" },
            { id: "UPDATES", label: "Client Updates & Saves" },
            { id: "BOOKING", label: "Bookings" },
            { id: "STATUS", label: "Status" },
            { id: "PAYMENT", label: "Payments" },
            { id: "NOTIFICATION", label: "Bulletins" }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-primary text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 size={30} className="animate-spin text-gold" />
          <p className="text-xs text-neutral-400 font-body">Loading studio activity trail...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
            {filteredEvents.map(event => {
              const IconComp = event.icon || FileText;

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-gold flex items-center justify-center text-gold shadow-xs">
                    <IconComp size={10} />
                  </div>

                  <div className="bg-neutral-50/70 group-hover:bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 group-hover:border-gold/30 transition-all shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-primary font-heading">
                          {event.title}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-500 bg-neutral-200/80 px-2 py-0.5 rounded-full uppercase font-body">
                          {event.category === 'UPDATES' ? (event.rawCategory?.replace('_', ' ') || 'CLIENT UPDATE') : event.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-body">
                        {event.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 font-body leading-relaxed">
                      {event.description}
                    </p>

                    {/* Customer Action Changes / Diffs */}
                    {event.changes && event.changes.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-200/60 flex flex-wrap gap-1.5">
                        {event.changes.map((ch, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium"
                          >
                            <Check size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{ch}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {event.bookingId && (
                      <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 font-body text-[11px]">
                          {event.bookingNumber ? `Session #${event.bookingNumber}` : `ID: ${event.bookingId.substring(0, 8)}`}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenQR(event.bookingId)}
                            className="text-gold font-bold hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <QrCode size={12} /> Studio Pass
                          </button>
                          <Link
                            to={`/dashboard/bookings/${event.bookingId}`}
                            className="text-primary font-bold hover:text-gold flex items-center gap-1 text-[11px]"
                          >
                            <span>Manage Booking</span>
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
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center">
          <History size={36} className="mx-auto text-neutral-300 mb-2" />
          <h3 className="font-heading text-base font-bold text-primary">No Activity Records Found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-body">
            No matching events in your studio audit timeline. Check back after placing bookings or receiving updates.
          </p>
        </div>
      )}

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
