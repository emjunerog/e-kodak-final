import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Camera, Calendar, Clock, MapPin, QrCode, CheckCircle2,
  AlertCircle, Smartphone, ArrowRight, Copy, Check, ExternalLink,
  ShieldCheck, RefreshCw, ChevronRight, Package
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { extractTokenFromInput } from '../lib/qr';
import { getStatusBadge, getStatusLabel } from '../lib/bookingUtils';

export default function PublicPassPage() {
  const [searchParams] = useSearchParams();
  const rawQueryToken = searchParams.get('token') || searchParams.get('id') || searchParams.get('bid') || '';
  const token = extractTokenFromInput(rawQueryToken);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPass() {
      if (!token) {
        setLoading(false);
        setError('No pass token provided. Please scan your studio QR code again.');
        return;
      }

      if (!isSupabaseConfigured) {
        setLoading(false);
        setError('Studio database is currently offline. Please check back shortly.');
        return;
      }

      try {
        // Try secure RPC first (bypasses RLS safely for exact token matching)
        try {
          const { data: rpcBooking, error: rpcErr } = await supabase.rpc('get_booking_by_pass_token', {
            lookup_token: token
          });
          if (rpcBooking && !rpcErr) {
            setBooking(rpcBooking);
            return;
          }
        } catch {}

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
        let query = supabase
          .from('bookings')
          .select(`
            id,
            booking_number,
            status,
            payment_status,
            event_date,
            preferred_time,
            location,
            notes,
            created_at,
            service:services!bookings_service_id_fkey (id, name, category),
            customer:profiles!bookings_customer_id_fkey (first_name, last_name)
          `);

        if (isUuid) {
          query = query.or(`booking_token.eq.${token},id.eq.${token}`);
        } else {
          query = query.or(`booking_number.ilike.%${token}%,booking_token.eq.${token}`);
        }

        const { data, error: fetchErr } = await query.limit(1).maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!data) {
          setError('We could not find an active booking pass for this code. Please verify your booking number with studio staff.');
        } else {
          setBooking(data);
        }
      } catch (err) {
        console.error('Public pass lookup error:', err);
        setError('Unable to load pass details right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadPass();
  }, [token]);

  const handleCopyCode = () => {
    const val = booking?.booking_number || token;
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Schedule pending';
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const d = new Date();
      d.setHours(+h, +m);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  const STAGES = [
    { key: 'PENDING', label: 'Received' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PHOTOGRAPHER_ASSIGNED', label: 'Assigned' },
    { key: 'CAPTURE', label: 'Studio Shoot' },
    { key: 'EDITING', label: 'Retouching' },
    { key: 'PRINTING', label: 'Printing' },
    { key: 'READY', label: 'Ready for Pickup' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === booking?.status);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-gold selection:text-primary">
      {/* Top Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:scale-105 transition-transform">
              <Camera size={20} />
            </div>
            <div>
              <span className="font-heading text-lg font-bold text-white tracking-wider">E-KODAK</span>
              <span className="block text-[10px] uppercase font-mono tracking-widest text-gold">Studio Pass</span>
            </div>
          </Link>

          <Link
            to="/login"
            className="text-xs font-medium text-neutral-300 hover:text-gold transition-colors flex items-center gap-1.5"
          >
            <span>Customer Login</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-gold border-t-transparent animate-spin mb-4" />
            <p className="text-sm font-body text-neutral-400">Verifying studio pass details...</p>
          </div>
        ) : error ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <AlertCircle size={28} />
            </div>
            <h1 className="font-heading text-xl font-bold text-white mb-2">Pass Not Found</h1>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
              >
                Return to Home
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-primary text-xs font-semibold transition-colors"
              >
                Contact Studio Desk
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* VIP Studio Pass Ticket Card */}
            <div className="bg-neutral-900/90 border border-gold/30 rounded-3xl overflow-hidden shadow-2xl relative">
              {/* Gold Top Specular Line */}
              <div className="h-1.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

              <div className="p-6 sm:p-8">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
                  <div>
                    <span className="text-[11px] font-mono tracking-widest uppercase text-gold font-semibold">
                      Verified Studio Pass
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mt-1">
                      #{booking.booking_number}
                    </h1>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                      title="Copy Pass Number"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Booking Grid Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-6">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 mt-0.5">
                      <Camera size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Service Package</p>
                      <p className="text-base font-semibold text-white mt-0.5">{booking.service?.name || 'Studio Portrait Session'}</p>
                      {booking.customer && (
                        <p className="text-xs text-neutral-400 mt-0.5">Client: {booking.customer.first_name} {booking.customer.last_name || ''}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 mt-0.5">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Session Schedule</p>
                      <p className="text-base font-semibold text-white mt-0.5">{formatDate(booking.event_date)}</p>
                      {booking.preferred_time && (
                        <p className="text-xs text-gold mt-0.5 flex items-center gap-1">
                          <Clock size={12} />
                          <span>{formatTime(booking.preferred_time)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 sm:col-span-2">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 mt-0.5">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Studio Location</p>
                      <p className="text-sm font-medium text-neutral-200 mt-0.5">
                        {booking.location || 'E-Kodak Photography Studio — 311 Rizal Street, City of Naga, Cebu'}
                      </p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(booking.location || '311 Rizal Street, City of Naga, Cebu')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gold hover:underline mt-1.5"
                      >
                        <span>View directions in Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Progress Milestone Line */}
                <div className="pt-6 border-t border-neutral-800">
                  <p className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-4">Session Milestone</p>
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-800 -translate-y-1/2 z-0" />
                    <div
                      className="absolute top-1/2 left-0 h-0.5 bg-gold -translate-y-1/2 z-0 transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, (currentStageIndex / (STAGES.length - 1)) * 100))}%`,
                      }}
                    />
                    {STAGES.map((s, idx) => {
                      const isPast = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      return (
                        <div key={s.key} className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                              isCurrent
                                ? 'bg-gold border-white scale-125 shadow-lg shadow-gold/50'
                                : isPast
                                ? 'bg-gold border-gold'
                                : 'bg-neutral-900 border-neutral-700'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mt-2 font-mono">
                    <span>Booked</span>
                    <span className="text-gold font-semibold">{STAGES[currentStageIndex]?.label || 'In Progress'}</span>
                    <span>Ready</span>
                  </div>
                </div>
              </div>

              {/* Bottom Mobile Companion App Callout */}
              <div className="bg-neutral-950/80 border-t border-neutral-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 text-center sm:text-left">
                  <div className="w-10 h-10 rounded-2xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Track on the Mobile Companion App</h2>
                    <p className="text-xs text-neutral-400">Save pass, view live status, and get real-time studio updates.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-gold hover:bg-gold-light text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-gold/10"
                  >
                    <QrCode size={15} />
                    <span>Copy Pass Code</span>
                  </button>
                  <Link
                    to="/dashboard"
                    className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Dashboard</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Studio Note / Concierge Footer */}
            <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-gold shrink-0" />
              <span>Present this pass or scan using the E-Kodak Companion app upon arrival at the studio.</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-400">
        <p>&copy; {new Date().getFullYear()} E-Kodak Photography Studio. 311 Rizal Street, City of Naga, Cebu.</p>
      </footer>
    </div>
  );
}
