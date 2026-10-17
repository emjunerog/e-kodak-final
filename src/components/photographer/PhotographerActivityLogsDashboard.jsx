import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Filter,
  Briefcase,
  ChevronRight,
  UserCheck,
  Upload,
  Layers,
  ArrowUpRight,
  Sparkles,
  MapPin,
  CalendarDays,
  FileCheck2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { normalizeDateStr } from '../../services/photographerService';

function formatTime12h(raw) {
  if (!raw) return '8:00 AM';
  const parts = String(raw).trim().split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return '8:00 AM';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  try {
    const now = Date.now();
    const d = new Date(iso).getTime();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return '';
  }
}

export default function PhotographerActivityLogsDashboard({
  photographerId,
  photographerName = 'Photographer',
}) {
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'AVAILABILITY' | 'BOOKINGS' | 'OUTPUTS'
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Aggregates ALL Photographer Activities, Schedules & Journey Records
  const fetchLogs = useCallback(async () => {
    if (!photographerId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch from admin_activity_logs (availability changes, shifts, working hours, actions)
      const activityPromise = supabase
        .from('admin_activity_logs')
        .select('*')
        .or(`admin_id.eq.${photographerId},entity_id.eq.${photographerId},details->>photographer_id.eq.${photographerId}`)
        .order('created_at', { ascending: false })
        .limit(100);

      // 2. Fetch from photographer_availability (all saved shifts and schedules)
      const availabilityPromise = supabase
        .from('photographer_availability')
        .select('*')
        .eq('photographer_id', photographerId)
        .order('availability_date', { ascending: false })
        .limit(100);

      // 3. Fetch from booking_status_history (actions photographer made on assigned shoots)
      const historyPromise = supabase
        .from('booking_status_history')
        .select('*, booking:bookings(id, booking_number, event_date, preferred_time, service:services(name), location)')
        .eq('changed_by', photographerId)
        .order('created_at', { ascending: false })
        .limit(60);

      // 4. Fetch assigned bookings (journey milestones)
      const bookingsPromise = supabase
        .from('bookings')
        .select('id, booking_number, status, event_date, preferred_time, updated_at, created_at, location, service:services(name)')
        .eq('photographer_id', photographerId)
        .order('updated_at', { ascending: false })
        .limit(50);

      // 5. Fetch workstation_transfers (handoffs, submissions, reschedules)
      const transfersPromise = supabase
        .from('workstation_transfers')
        .select('*, booking:bookings(booking_number, service:services(name))')
        .eq('sender_id', photographerId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Execute queries in parallel
      const [
        actRes,
        availRes,
        histRes,
        bkgsRes,
        transRes,
      ] = await Promise.allSettled([
        activityPromise,
        availabilityPromise,
        historyPromise,
        bookingsPromise,
        transfersPromise,
      ]);

      const combined = [];
      const seenSignatures = new Set();

      // ── Process 1: Database Activity Logs ──────────────────────────────────
      if (actRes.status === 'fulfilled' && !actRes.value.error && Array.isArray(actRes.value.data)) {
        actRes.value.data.forEach((item) => {
          const action = item.action_type || 'ACTIVITY';
          const isError = action.includes('ERROR') || item.status === 'ERROR' || item.level === 'error';
          if (isError) return; // Never show technical code/errors

          let category = 'AVAILABILITY';
          if (action.includes('BOOKING') || action.includes('ASSIGN') || action.includes('STATUS')) {
            category = 'BOOKINGS';
          } else if (action.includes('OUTPUT') || action.includes('TRANSFER') || action.includes('UPLOAD')) {
            category = 'OUTPUTS';
          }

          let title = item.entity_label || item.action_label || formatActionTitle(action);
          let desc = item.description || item.details?.note || 'Photographer activity recorded.';

          if (action.includes('AVAILABILITY_BATCH') || action.includes('BATCH')) {
            title = 'Batch Schedule Updated';
            desc = item.details?.note || 'Bulk calendar shift adjustments applied.';
          } else if (action.includes('AVAILABILITY_TOGGLE')) {
            title = 'General Shift Status Toggled';
            desc = item.details?.is_available ? 'Set status to Available for new shoots.' : 'Set status to Off-Duty for new shoots.';
          } else if (action.includes('RESCHEDULE')) {
            title = 'Shoot Reschedule Requested';
            desc = `Session reschedule requested: ${item.details?.reason || 'Schedule adjustment'}.`;
            category = 'BOOKINGS';
          }

          const sig = `act_${item.id}_${item.created_at}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            combined.push({
              id: `act-${item.id}`,
              category,
              title,
              description: desc,
              timestamp: item.created_at,
              badge: category === 'AVAILABILITY' ? 'Shift Update' : category === 'OUTPUTS' ? 'Output' : 'Booking',
              meta: item.details?.date || item.details?.targetDates?.length ? `${item.details?.targetDates?.length || 1} day(s)` : null,
            });
          }
        });
      }

      // ── Process 2: Real Saved Availability & Shift Schedules ──────────────
      if (availRes.status === 'fulfilled' && !availRes.value.error && Array.isArray(availRes.value.data)) {
        availRes.value.data.forEach((item) => {
          const rawDate = normalizeDateStr(item.availability_date || item.date);
          if (!rawDate) return;

          const isOff = item.status === 'UNAVAILABLE' || item.status === 'off' || item.is_available === false;
          const sTime = formatTime12h(item.start_time);
          const eTime = formatTime12h(item.end_time);

          let dateLabel = rawDate;
          try {
            const dObj = new Date(`${rawDate}T00:00:00`);
            dateLabel = dObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          } catch {}

          const title = isOff
            ? `Off-Duty Scheduled: ${dateLabel}`
            : `Shift Scheduled: ${dateLabel}`;

          const desc = isOff
            ? `Blocked date for photographer (${item.notes || 'Off-duty rest day'}).`
            : `Working hours ${sTime} – ${eTime}. ${item.notes || 'Full Day Available'}.`;

          const sig = `avail_${rawDate}_${item.status}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            combined.push({
              id: `avail-${item.id || rawDate}`,
              category: 'AVAILABILITY',
              title,
              description: desc,
              timestamp: item.created_at || `${rawDate}T08:00:00Z`,
              badge: isOff ? 'Off-Duty' : 'Shift Schedule',
              meta: isOff ? 'Off-Duty' : `${sTime} – ${eTime}`,
            });
          }
        });
      }

      // ── Process 3: Booking Status History ─────────────────────────────────
      if (histRes.status === 'fulfilled' && !histRes.value.error && Array.isArray(histRes.value.data)) {
        histRes.value.data.forEach((item) => {
          const bNum = item.booking?.booking_number || 'Shoot';
          const sName = item.booking?.service?.name || 'Photoshoot';
          const newStatus = (item.status || '').toUpperCase();

          let title = `Booking #${bNum} Updated`;
          let desc = `Updated ${sName} session to ${newStatus}.`;
          let badge = 'Booking';
          let category = 'BOOKINGS';

          if (newStatus === 'COMPLETED') {
            title = `Completed Shoot #${bNum}`;
            desc = `Finished ${sName} session successfully.`;
            badge = 'Completed';
          } else if (newStatus === 'CAPTURE' || newStatus === 'IN_PROGRESS') {
            title = `Started Shoot #${bNum}`;
            desc = `Now shooting ${sName} on location.`;
            badge = 'In Progress';
          } else if (newStatus === 'PHOTOGRAPHER_ASSIGNED' || newStatus === 'CONFIRMED') {
            title = `Accepted Shoot #${bNum}`;
            desc = `Confirmed assignment for ${sName}.`;
            badge = 'Confirmed';
          } else if (newStatus === 'EDITING') {
            title = `Outputs Submitted #${bNum}`;
            desc = `Submitted sample photo outputs for ${sName} for Admin Review.`;
            badge = 'Submitted';
            category = 'OUTPUTS';
          }

          const sig = `hist_${item.id}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            combined.push({
              id: `hist-${item.id}`,
              category,
              title,
              description: item.remarks ? `${desc} (${item.remarks})` : desc,
              timestamp: item.created_at,
              badge,
              meta: item.booking?.event_date || null,
            });
          }
        });
      }

      // ── Process 4: Assigned Bookings (Active Milestones) ───────────────────
      if (bkgsRes.status === 'fulfilled' && !bkgsRes.value.error && Array.isArray(bkgsRes.value.data)) {
        bkgsRes.value.data.forEach((booking) => {
          const bNum = booking.booking_number || 'N/A';
          const sName = booking.service?.name || 'Photoshoot';
          const status = (booking.status || '').toUpperCase();
          const eventDate = booking.event_date ? new Date(booking.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

          let title = `Assigned Shoot #${bNum}`;
          let desc = `Assigned to shoot ${sName}.${eventDate ? ` Scheduled for ${eventDate}.` : ''}`;
          let badge = 'Assigned';
          let category = 'BOOKINGS';

          if (status === 'COMPLETED') {
            title = `Shoot Completed: #${bNum}`;
            desc = `Photoshoot for ${sName} completed.`;
            badge = 'Completed';
          } else if (status === 'CAPTURE') {
            title = `Photoshoot In Progress: #${bNum}`;
            desc = `Currently capturing ${sName}.`;
            badge = 'In Progress';
          } else if (status === 'EDITING' || status === 'PRINTING') {
            title = `Post-Production Stage: #${bNum}`;
            desc = `${sName} is now in ${status.toLowerCase()} phase.`;
            badge = 'Lab Transfer';
            category = 'OUTPUTS';
          }

          const sig = `bkg_${booking.id}_${status}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            combined.push({
              id: `bkg-${booking.id}`,
              category,
              title,
              description: desc,
              timestamp: booking.updated_at || booking.created_at,
              badge,
              meta: eventDate || `#${bNum}`,
            });
          }
        });
      }

      // ── Process 5: Workstation Transfers & Submissions ─────────────────────
      if (transRes.status === 'fulfilled' && !transRes.value.error && Array.isArray(transRes.value.data)) {
        transRes.value.data.forEach((item) => {
          const bNum = item.booking?.booking_number || item.payload?.booking_number || '';
          const title = item.title || `Transfer Handoff: #${bNum}`;
          const desc = item.message || 'Workstation handoff recorded.';

          const isOutput = item.transfer_type === 'OUTPUT_SUBMISSION' || item.transfer_type === 'ORDER_HANDOFF';
          const category = isOutput ? 'OUTPUTS' : 'BOOKINGS';

          const sig = `trans_${item.id}`;
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            combined.push({
              id: `trans-${item.id}`,
              category,
              title,
              description: desc,
              timestamp: item.created_at,
              badge: isOutput ? 'Submission' : 'Transfer',
              meta: bNum ? `#${bNum}` : null,
            });
          }
        });
      }

      // ── Process 6: Local Storage Cache (Immediate local records) ───────────
      try {
        const localKey = `ekodak_photographer_activity_logs_${photographerId}`;
        const cached = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (Array.isArray(cached)) {
          cached.forEach((item) => {
            const sig = `local_${item.description}_${item.created_at}`;
            if (!seenSignatures.has(sig)) {
              seenSignatures.add(sig);
              combined.push({
                id: item.id || `local-${Math.random()}`,
                category: item.action_type?.includes('OUTPUT') ? 'OUTPUTS' : item.action_type?.includes('BOOKING') ? 'BOOKINGS' : 'AVAILABILITY',
                title: item.entity_label || item.action_type || 'Schedule Activity',
                description: item.description || 'Photographer activity committed.',
                timestamp: item.created_at,
                badge: item.action_type?.includes('OUTPUT') ? 'Output' : item.action_type?.includes('BOOKING') ? 'Booking' : 'Shift Update',
                meta: item.details?.dates?.length ? `${item.details.dates.length} date(s)` : null,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Local log read error:', err);
      }

      // Fallback welcome item if completely brand new photographer
      if (combined.length === 0) {
        combined.push({
          id: 'welcome-log',
          category: 'AVAILABILITY',
          title: 'Photographer Portal Ready',
          description: `Schedule active for ${photographerName}. Any shifts, off-duty days, and shoot updates will appear here.`,
          timestamp: new Date().toISOString(),
          badge: 'Ready',
          meta: 'Today',
        });
      }

      // Sort chronological newest first
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(combined);
    } catch (err) {
      console.warn('fetchLogs error:', err);
    } finally {
      setLoading(false);
    }
  }, [photographerId, photographerName]);

  useEffect(() => {
    fetchLogs();

    const handleLogUpdate = () => fetchLogs();
    window.addEventListener('ekodak_audit_trail_updated', handleLogUpdate);
    window.addEventListener('ekodak_photographer_activity', handleLogUpdate);
    window.addEventListener('ekodak:logs-updated', handleLogUpdate);

    return () => {
      window.removeEventListener('ekodak_audit_trail_updated', handleLogUpdate);
      window.removeEventListener('ekodak_photographer_activity', handleLogUpdate);
      window.removeEventListener('ekodak:logs-updated', handleLogUpdate);
    };
  }, [fetchLogs]);

  // Formatter for action strings
  function formatActionTitle(raw) {
    if (!raw) return 'Studio Activity';
    return raw
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Filter logs by dropdown category and search query
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (activeCategory !== 'ALL') {
      result = result.filter((l) => l.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.badge && l.badge.toLowerCase().includes(q)) ||
          (l.meta && l.meta.toLowerCase().includes(q))
      );
    }

    return result;
  }, [logs, activeCategory, searchQuery]);

  // Dynamic Metrics counts
  const metrics = useMemo(() => {
    const total = logs.length;
    const availCount = logs.filter((l) => l.category === 'AVAILABILITY').length;
    const bookingCount = logs.filter((l) => l.category === 'BOOKINGS').length;
    const outputsCount = logs.filter((l) => l.category === 'OUTPUTS').length;
    return { total, availCount, bookingCount, outputsCount };
  }, [logs]);

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-sm overflow-hidden font-body animate-fade-in mt-6">
      {/* ── Dashboard Header ─────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 border-b border-neutral-100 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-gold/40 text-gold flex items-center justify-center shrink-0">
            <History size={20} className="text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-lg font-bold text-white tracking-tight">
                Photographer Activity Ledger
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-gold/20 text-gold border border-gold/30 font-mono">
                My Activities
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              Live activity log of your shift declarations, working hours changes, and shoot assignments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          title="Refresh activity logs"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-gold' : 'text-neutral-400'} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-neutral-200/80 bg-neutral-50/60 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200/80 text-xs">
        {/* KPI Card 1: Total Activities */}
        <div className="p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <History size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Total Activities
            </span>
            <span className="font-heading text-2xl font-bold text-primary block leading-tight">
              {metrics.total}
            </span>
            <span className="text-[11px] text-neutral-500 font-medium block truncate">
              Recorded photographer actions
            </span>
          </div>
        </div>

        {/* KPI Card 2: Shifts & Hours Updates */}
        <div className="p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
            <Calendar size={20} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Shift &amp; Schedule Updates
            </span>
            <span className="font-heading text-2xl font-bold text-emerald-800 block leading-tight">
              {metrics.availCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium block truncate">
              Working hours &amp; off-duty commits
            </span>
          </div>
        </div>

        {/* KPI Card 3: Shoot & Output Sessions */}
        <div className="p-4 sm:p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
            <Camera size={20} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Shoots &amp; Deliveries
            </span>
            <span className="font-heading text-2xl font-bold text-amber-900 block leading-tight">
              {metrics.bookingCount + metrics.outputsCount}
            </span>
            <span className="text-[11px] text-amber-800 font-medium block truncate">
              Assigned sessions &amp; submissions
            </span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls: Single Dropdown Selector ────────── */}
      <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 bg-white">
        {/* Single Dropdown for All Activities, Shift and Hours, Bookings */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="photographer-activity-filter" className="text-xs font-bold text-neutral-500 flex items-center gap-1.5 shrink-0">
            <Filter size={13} className="text-neutral-400" />
            <span>Category:</span>
          </label>
          <select
            id="photographer-activity-filter"
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="h-10 px-3.5 pr-8 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-800 outline-none focus:ring-2 focus:ring-amber-400/40 cursor-pointer shadow-2xs hover:border-neutral-300 transition"
          >
            <option value="ALL">All Activities ({metrics.total})</option>
            <option value="AVAILABILITY">Shift &amp; Schedules ({metrics.availCount})</option>
            <option value="BOOKINGS">Bookings &amp; Shoots ({metrics.bookingCount})</option>
            <option value="OUTPUTS">Outputs &amp; Transfers ({metrics.outputsCount})</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your activities…"
            className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-primary outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>
      </div>

      {/* ── Log List Feed (Organized Human Readable Ledger) ─────────────── */}
      <div className="p-4 sm:p-6 divide-y divide-neutral-100">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">Loading your activity history…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-400 mx-auto mb-2">
              <History size={20} />
            </div>
            <h4 className="text-sm font-bold text-primary">No Activities Found</h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              No matching records found for the selected category or search term.
            </p>
          </div>
        ) : (
          filteredLogs.map((item) => {
            const isAvail = item.category === 'AVAILABILITY';
            const isOutput = item.category === 'OUTPUTS';
            const isOff = (item.badge || '').toLowerCase().includes('off');

            const formattedDate = new Date(item.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            const relTime = formatRelativeTime(item.timestamp);

            return (
              <div
                key={item.id}
                className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3 hover:bg-neutral-50/60 p-2 rounded-2xl transition"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isOff
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs'
                        : isAvail
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs'
                        : isOutput
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs'
                    }`}
                  >
                    {isOff ? (
                      <CalendarDays size={17} className="text-rose-600" />
                    ) : isAvail ? (
                      <Calendar size={17} className="text-emerald-600" />
                    ) : isOutput ? (
                      <Upload size={17} className="text-blue-600" />
                    ) : (
                      <Camera size={17} className="text-amber-700" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-primary">
                        {item.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase ${
                          isOff
                            ? 'bg-rose-100/70 text-rose-800 border border-rose-200'
                            : isAvail
                            ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                            : isOutput
                            ? 'bg-blue-100/70 text-blue-800 border border-blue-200'
                            : 'bg-amber-100/70 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {item.badge || (isAvail ? 'Shift Update' : 'Booking')}
                      </span>

                      {item.meta && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                          {item.meta}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 text-right">
                  <span className="text-[11px] font-semibold text-neutral-600">
                    {formattedDate}
                  </span>
                  {relTime && (
                    <span className="text-xs font-medium text-neutral-400">
                      {relTime}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
