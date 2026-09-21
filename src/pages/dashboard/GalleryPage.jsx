import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, 
  X, 
  Sparkles, 
  Check, 
  Layers, 
  ZoomIn, 
  Download, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Maximize2,
  Package,
  ArrowRight,
  LayoutGrid
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { SERVICES } from '../../data/servicesData';
import { getServices } from '../../services/contentService';
import Toast from '../../components/ui/Toast';

// ── Verified High-Resolution Sample Imagery for Specific Package Deliverables ──
const getVerifiedSampleImage = (name = '') => {
  const lower = name.toLowerCase();

  // 1. Framed Master / Large Displays (Toga / Academic Portrait)
  if (lower.includes('12x18') || lower.includes('10x12') || lower.includes('12x16') || 
     (lower.includes('crystal wood') && !lower.includes('pilipi') && !lower.includes('family'))) {
    return 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1000&q=85&auto=format&fit=crop';
  }

  // 2. Filipiniana / Barong Formal Portraits
  if (lower.includes('filipiniana') || lower.includes('barong') || lower.includes('pilipiña') || lower.includes('pilipiñana')) {
    return 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1000&q=85&auto=format&fit=crop';
  }

  // 3. Family / Group Milestone Portraits
  if (lower.includes('family') || lower.includes('parent') || lower.includes('group')) {
    return 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=1000&q=85&auto=format&fit=crop';
  }

  // 4. Wallet Size Prints (2R)
  if (lower.includes('wallet') || lower.includes('2r')) {
    return 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1000&q=85&auto=format&fit=crop';
  }

  // 5. Casual Attire Portraits
  if (lower.includes('casual')) {
    return 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=1000&q=85&auto=format&fit=crop';
  }

  // 6. Passport Photos
  if (lower.includes('passport')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&q=85&auto=format&fit=crop';
  }

  // 7. 2x2 / 1x1 ID Photos
  if (lower.includes('2x2') || lower.includes('1x1') || lower.includes('formal attire') || lower.includes('id picture') || lower.includes('tesda')) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&q=85&auto=format&fit=crop';
  }

  // 8. 5x7 Desk Keepsake
  if (lower.includes('5x7')) {
    return 'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=1000&q=85&auto=format&fit=crop';
  }

  // 9. Wedding Photos / Albums
  if (lower.includes('wedding') || lower.includes('album') || lower.includes('book') || lower.includes('canvass')) {
    return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=85&auto=format&fit=crop';
  }

  // Fallback High-Quality Portrait
  return 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1000&q=85&auto=format&fit=crop';
};

// ── Animated Studio Portrait Decorative Art Banner ──
function AnimatedGalleryArt({ className = "" }) {
  return (
    <div className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 240 160"
        className="w-full h-full drop-shadow-2xl overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#996515" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>

        <g className="transition-transform duration-700 hover:scale-[1.02]">
          <rect
            x="24"
            y="14"
            width="192"
            height="132"
            rx="14"
            fill="#171513"
            stroke="url(#goldFrameGrad)"
            strokeWidth="3.5"
          />
          <rect
            x="36"
            y="26"
            width="168"
            height="108"
            rx="9"
            fill="#0f0d0b"
            stroke="#453823"
            strokeWidth="1.2"
          />
          <polygon points="80,52 110,64 80,76 50,64" fill="url(#goldFrameGrad)" />
          <path d="M60,68 L60,84 Q80,96 100,84 L100,68 Z" fill="#1e1c18" stroke="#d4af37" strokeWidth="0.8" />
          <circle cx="80" cy="64" r="2.5" fill="#fef08a" />
          <text x="120" y="66" fill="#fae084" fontSize="10" fontWeight="bold" fontFamily="serif">
            E-KODAK
          </text>
          <text x="120" y="78" fill="#a8a29e" fontSize="7.5" fontFamily="sans-serif">
            Studio Archival Output
          </text>
          <text x="120" y="90" fill="#d4af37" fontSize="7" fontFamily="monospace">
            VERIFIED RESOLUTION
          </text>
        </g>
      </svg>
    </div>
  );
}

// ── Stacked Deliverable Set Card (Clean & Space-Efficient) ──
function StackedDeliverableCard({ 
  set, 
  onInspect, 
  isExpanded, 
  onToggle 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const activeRevealed = isExpanded || isHovered;
  const leadItem = set.items[0] || {};
  const isAllReady = set.items.every(item => item.isReady);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-neutral-200/80 dark:border-neutral-800 hover:border-gold/50 dark:hover:border-gold/40 hover:shadow-md transition-all group flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Top: Clean Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-body text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {set.setCode}
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {set.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              {set.items.length} {set.items.length === 1 ? 'deliverable' : 'deliverables'}
            </span>
            {isAllReady ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                In Post-Production
              </span>
            )}
          </div>
        </div>

        {/* Middle: Stacked Verified Photo Deck + Lead Item */}
        <div className="flex items-center gap-3.5">
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
            {set.items.length > 2 && (
              <div className="absolute inset-0 bg-[#161412] dark:bg-[#0c0a09] rounded-xl border border-gold/20 transform rotate-6 translate-x-1.5 -translate-y-1 transition-transform duration-300 group-hover:rotate-12 group-hover:translate-x-2.5 opacity-50 pointer-events-none" />
            )}
            {set.items.length > 1 && (
              <div className="absolute inset-0 bg-[#1e1b18] dark:bg-[#12100e] rounded-xl border border-gold/30 transform -rotate-3 -translate-x-1 -translate-y-0.5 transition-transform duration-300 group-hover:-rotate-8 group-hover:-translate-x-2 opacity-75 pointer-events-none" />
            )}
            <div 
              onClick={() => onInspect(leadItem)}
              className="relative z-10 w-full h-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-gold/40 shadow-xs flex items-center justify-center cursor-pointer transition-transform duration-300 group-hover:scale-105"
            >
              <img
                src={leadItem.displayImage}
                alt={leadItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-gold font-mono">
                ×{set.items.length}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-gold transition-colors truncate">
              {set.name}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 truncate">
              {leadItem.name}
            </p>
          </div>
        </div>

        {/* ── Animated Revealed Deliverable Items Drawer (Clean & Minimal) ── */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            activeRevealed 
              ? 'max-h-[350px] opacity-100 pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-1.5 pt-1">
            {set.items.map((item, idx) => (
              <div
                key={item.slotId || idx}
                className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-between gap-2.5 hover:border-gold/30 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    onClick={() => onInspect(item)}
                    className="w-9 h-9 rounded-lg overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    <img 
                      src={item.displayImage} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.name}
                    </h4>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block truncate">
                      {item.packageName} · {item.tierName}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onInspect(item)}
                  className="px-2.5 py-1 rounded-lg bg-gold/15 hover:bg-gold text-gold hover:text-neutral-950 text-[10px] font-bold transition-all shrink-0 cursor-pointer"
                >
                  Inspect
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="pt-2.5 mt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
        <button
          onClick={() => onInspect(leadItem)}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#d4af37] hover:brightness-105 text-neutral-950 font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ZoomIn size={13} />
          <span>Inspect Deliverables</span>
        </button>

        <button
          onClick={onToggle}
          className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
            isExpanded
              ? 'bg-gold/15 border-gold/40 text-gold'
              : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <X size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [photoOutputs, setPhotoOutputs] = useState([]);
  const [servicesList, setServicesList] = useState(SERVICES);
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('deliverables'); // 'deliverables' | 'inclusions'
  const [viewMode, setViewMode] = useState('stacked'); // 'stacked' | 'grid'
  const [expandedSetIds, setExpandedSetIds] = useState(new Set());

  const toggleSetExpansion = (setId) => {
    setExpandedSetIds(prev => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  // Load Services for Section 2
  useEffect(() => {
    getServices().then(({ data }) => {
      if (data && data.length > 0) {
        setServicesList(data);
      }
    });
  }, []);

  // Load Customer's Bookings and Associated Photo Outputs
  const loadDeliverables = async () => {
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch user bookings with services & tiers
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          event_date,
          status,
          tier_name,
          service_id,
          created_at,
          services:service_id (
            id,
            name,
            tiers,
            inclusions,
            base_price
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (bErr) throw bErr;

      const validBookings = bookings || [];
      setCustomerBookings(validBookings);

      // Select active booking
      const currentBooking = validBookings.length > 0
        ? (selectedBookingId ? validBookings.find(b => b.id === selectedBookingId) || validBookings[0] : validBookings[0])
        : null;

      if (currentBooking) {
        setSelectedBookingId(currentBooking.id);

        // 2. Fetch photo_outputs for this active booking
        const { data: outputs, error: oErr } = await supabase
          .from('photo_outputs')
          .select('*')
          .eq('booking_id', currentBooking.id)
          .order('created_at', { ascending: false });

        if (oErr) throw oErr;
        setPhotoOutputs(outputs || []);
      } else {
        setPhotoOutputs([]);
      }
    } catch (err) {
      console.error('Error loading gallery deliverables:', err);
      setToast({ type: 'error', message: 'Could not fetch photo deliverables' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliverables();
  }, [user?.id, selectedBookingId]);

  // Find currently active booking object
  const activeBooking = useMemo(() => {
    if (!customerBookings || customerBookings.length === 0) return null;
    return customerBookings.find(b => b.id === selectedBookingId) || customerBookings[0];
  }, [customerBookings, selectedBookingId]);

  // ── Derive deliverable items directly from booked package tier highlights in Database ──
  const detectedDeliverableSlots = useMemo(() => {
    if (!activeBooking) return [];

    const tierName = activeBooking.tier_name || '';
    const serviceTiers = activeBooking.services?.tiers || [];
    const matchedTier = serviceTiers.find(
      t => (t.name || '').toLowerCase() === tierName.toLowerCase()
    );

    const rawHighlights = matchedTier?.highlights || activeBooking.services?.inclusions || [];

    // Filter out styling perks that belong to the Inclusions tab
    const physicalItems = rawHighlights.filter(item => {
      const lower = item.toLowerCase();
      if (lower.includes('free make-up') || lower.includes('free make up') || lower.includes('no free make up') || lower.includes('mode of payment')) {
        return false;
      }
      return true;
    });

    const itemsToMap = physicalItems.length > 0 ? physicalItems : rawHighlights;

    return itemsToMap.map((item, index) => ({
      slotId: `slot_${index}`,
      name: item, // 100% EXACT text from the database!
      sampleImage: getVerifiedSampleImage(item),
      packageName: activeBooking.services?.name || 'Studio Photography',
      tierName: tierName || 'Standard'
    }));
  }, [activeBooking]);

  // Match uploaded outputs to discrete deliverable slots
  const mappedDeliverables = useMemo(() => {
    const unassignedOutputs = [...photoOutputs];

    return detectedDeliverableSlots.map((slot, index) => {
      let assignedOutput = null;
      if (unassignedOutputs.length > 0 && index < photoOutputs.length) {
        assignedOutput = unassignedOutputs.shift();
      }

      const isReady = Boolean(assignedOutput);
      const displayImage = assignedOutput?.file_path || slot.sampleImage;

      return {
        ...slot,
        id: slot.slotId,
        isReady,
        uploadedAt: assignedOutput?.created_at || null,
        fileSize: assignedOutput?.file_size || null,
        fileName: assignedOutput?.file_name || `${slot.name}.jpg`,
        displayImage,
        rawOutput: assignedOutput
      };
    });
  }, [detectedDeliverableSlots, photoOutputs]);

  const readyCount = mappedDeliverables.filter(d => d.isReady).length;

  const currentTierHighlights = useMemo(() => {
    if (!activeBooking) return [];
    const tier = activeBooking.services?.tiers?.find(
      t => (t.name || '').toLowerCase() === (activeBooking.tier_name || '').toLowerCase()
    );
    return tier?.highlights || activeBooking.services?.inclusions || [];
  }, [activeBooking]);

  // ── Group mapped deliverables into clean stacked decks ──
  const deliverableSets = useMemo(() => {
    if (!mappedDeliverables || mappedDeliverables.length === 0) return [];

    // 1. Framed & Large Displays
    const framed = mappedDeliverables.filter(d => {
      const l = d.name.toLowerCase();
      return (l.includes('12x18') || l.includes('10x12') || l.includes('12x16') || l.includes('5x7') || (l.includes('frame') && !l.includes('8x10')));
    });

    // 2. 8x10 Portraits
    const portrait8x10 = mappedDeliverables.filter(d => {
      const l = d.name.toLowerCase();
      return l.includes('8x10');
    });

    // 3. Wallet Size Prints
    const wallets = mappedDeliverables.filter(d => {
      const l = d.name.toLowerCase();
      return l.includes('wallet') || l.includes('2r');
    });

    // 4. ID & Passport Photos
    const idPhotos = mappedDeliverables.filter(d => {
      const l = d.name.toLowerCase();
      return l.includes('2x2') || l.includes('passport') || l.includes('1x1') || l.includes('tesda');
    });

    // Identify assigned IDs
    const assignedIds = new Set([
      ...framed.map(i => i.id),
      ...portrait8x10.map(i => i.id),
      ...wallets.map(i => i.id),
      ...idPhotos.map(i => i.id)
    ]);
    const others = mappedDeliverables.filter(d => !assignedIds.has(d.id));

    const sets = [];
    let setCounter = 1;

    if (framed.length > 0) {
      sets.push({
        id: 'set_framed',
        setCode: `#SET-0${setCounter++}`,
        name: 'Framed & Display Prints',
        items: framed
      });
    }

    if (portrait8x10.length > 0) {
      sets.push({
        id: 'set_8x10',
        setCode: `#SET-0${setCounter++}`,
        name: '8x10 Portrait Prints',
        items: portrait8x10
      });
    }

    if (wallets.length > 0) {
      sets.push({
        id: 'set_wallet',
        setCode: `#SET-0${setCounter++}`,
        name: 'Wallet Prints (2R)',
        items: wallets
      });
    }

    if (idPhotos.length > 0) {
      sets.push({
        id: 'set_id',
        setCode: `#SET-0${setCounter++}`,
        name: 'ID & Passport Photos',
        items: idPhotos
      });
    }

    if (others.length > 0) {
      sets.push({
        id: 'set_other',
        setCode: `#SET-0${setCounter++}`,
        name: 'Package Deliverables',
        items: others
      });
    }

    if (sets.length === 0) {
      sets.push({
        id: 'set_all',
        setCode: '#SET-01',
        name: activeBooking?.tier_name ? `${activeBooking.tier_name} Deliverables` : 'Package Deliverables',
        items: mappedDeliverables
      });
    }

    return sets;
  }, [mappedDeliverables, activeBooking]);

  const handleInspect = (item) => {
    setLightbox({
      name: item.name,
      displayImage: item.displayImage,
      packageName: item.packageName,
      tierName: item.tierName,
      isReady: item.isReady,
      fileName: item.fileName
    });
  };

  return (
    <div className="space-y-6 pb-12 font-body max-w-6xl mx-auto animate-fade-in">
      
      {/* ── Premium Luxury Header Banner with Verified Imagery ───────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1917] via-[#141210] to-[#0c0a09] border border-gold/25 p-6 sm:p-7 shadow-xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span>Studio Photo Deliverables</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight leading-tight">
              Package Photo Deliverables
            </h1>
            
            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed font-body">
              {activeBooking?.services?.name || 'Studio Photography Package'} {activeBooking?.tier_name ? `(${activeBooking.tier_name})` : ''} — Preview deliverables, monitor post-production status, and inspect verified high-resolution photo outputs.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={loadDeliverables}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gold ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Deliverables</span>
              </button>
            </div>
          </div>

          {/* Animated Studio Portrait Art */}
          <div className="hidden md:flex shrink-0 items-center justify-center">
            <AnimatedGalleryArt className="w-48 h-32" />
          </div>
        </div>
      </div>

      {/* ── Space-Efficient Uniform KPI Cards Grid ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-body">
        
        {/* Card 1: Total Deliverables */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-gold/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Total Deliverables
            </span>
            <span className="font-heading font-black text-2xl text-primary dark:text-neutral-100 leading-tight mt-0.5 block truncate">
              {mappedDeliverables.length} Items
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              Included in {activeBooking?.tier_name || 'package'}
            </span>
          </div>
        </div>

        {/* Card 2: Release Status */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-emerald-500/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className={`w-11 h-11 rounded-xl ${readyCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 text-amber-600 dark:text-amber-400'} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            {readyCount > 0 ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Output Status
            </span>
            <span className={`font-heading font-black text-2xl leading-tight mt-0.5 block truncate ${readyCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {readyCount > 0 ? `${readyCount} Ready` : 'Post-Production'}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              {readyCount > 0 ? 'Digital download ready' : 'In studio production'}
            </span>
          </div>
        </div>

        {/* Card 3: Active Reservation */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-amber-500/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Booking Ref
            </span>
            <span className="font-heading font-bold text-lg text-primary dark:text-neutral-100 leading-tight mt-0.5 block truncate">
              #{activeBooking?.booking_number || 'N/A'}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              {activeBooking?.services?.name || 'Studio Shoot'}
            </span>
          </div>
        </div>

        {/* Card 4: Booked Package & Tier */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs hover:shadow-xs hover:border-gold/30 transition-all flex items-center gap-3.5 w-full min-h-[88px] group">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 text-gold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block truncate">
              Selected Tier
            </span>
            <span className="font-heading font-bold text-lg text-primary dark:text-neutral-100 leading-tight mt-0.5 block truncate">
              {activeBooking?.tier_name || 'Standard'}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium block truncate mt-0.5">
              {activeBooking?.services?.name || 'Photography'}
            </span>
          </div>
        </div>

      </div>

      {/* ── Navigation Tabs & Order Selector ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('deliverables')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'deliverables'
                ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Photo Deliverables</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'deliverables'
                ? 'bg-gold/20 text-gold'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {mappedDeliverables.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('inclusions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'inclusions'
                ? 'bg-primary dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Package Inclusions & Attire</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'inclusions'
                ? 'bg-gold/20 text-gold'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}>
              {currentTierHighlights.length}
            </span>
          </button>
        </div>

        {/* View Mode & Session Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'deliverables' && deliverableSets.length > 0 && (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80">
              <button
                onClick={() => setViewMode('stacked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'stacked'
                    ? 'bg-white dark:bg-neutral-900 text-primary dark:text-neutral-100 shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                title="Stacked by Decks"
              >
                <Layers size={13} className={viewMode === 'stacked' ? 'text-gold' : ''} />
                <span>Stacked Decks ({deliverableSets.length})</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-neutral-900 text-primary dark:text-neutral-100 shadow-xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
                title="All deliverables grid"
              >
                <LayoutGrid size={13} className={viewMode === 'grid' ? 'text-gold' : ''} />
                <span>All Items ({mappedDeliverables.length})</span>
              </button>
            </div>
          )}

          {/* Order Selector (if multiple bookings) */}
          {customerBookings.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-xs font-medium mr-1">Session:</span>
              {customerBookings.map((b) => {
                const isSelected = b.id === (activeBooking?.id || selectedBookingId);
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBookingId(b.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gold text-neutral-950 font-bold shadow-xs'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-gold/50'
                    }`}
                  >
                    #{b.booking_number}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <RefreshCw className="w-8 h-8 text-gold animate-spin mb-3" />
          <p className="text-xs text-neutral-400 font-medium">Loading verified photo deliverables...</p>
        </div>
      ) : activeTab === 'deliverables' ? (
        /* DELIVERABLES SECTION */
        <div className="space-y-4">

          {mappedDeliverables.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-400">
              <Package className="w-12 h-12 mx-auto mb-3 text-neutral-400" />
              <h3 className="text-base font-bold text-primary dark:text-white">No Deliverables Found</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Please select an active photoshoot booking to preview scheduled package deliverables.
              </p>
            </div>
          ) : viewMode === 'stacked' ? (
            /* ── TACTILE STACKED DELIVERABLE DECKS (Hover to Reveal, Animated & Clean) ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {deliverableSets.map((set) => (
                <StackedDeliverableCard
                  key={set.id}
                  set={set}
                  onInspect={handleInspect}
                  isExpanded={expandedSetIds.has(set.id)}
                  onToggle={() => toggleSetExpansion(set.id)}
                />
              ))}
            </div>
          ) : (
            /* ── Clean & Uniform Flat Deliverable Cards Grid - 2 Columns ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {mappedDeliverables.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-neutral-200/80 dark:border-neutral-800 hover:border-gold/40 dark:hover:border-gold/30 hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* ── Top Row: Deliverable ID + Status ── */}
                    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-xs font-bold text-neutral-800 dark:text-neutral-200 tracking-wide">
                          #DLV-{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-neutral-300 dark:text-neutral-700">·</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                          {item.tierName}
                        </span>
                      </div>

                      {item.isReady ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/25">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          Photo Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                          <Clock size={12} className="text-amber-500 animate-pulse" />
                          In Post-Production
                        </span>
                      )}
                    </div>

                    {/* ── Middle: Verified Thumbnail Preview + Exact DB Item Name ──── */}
                    <div className="flex items-center gap-3.5">
                      <div 
                        onClick={() => handleInspect(item)}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200/70 dark:border-neutral-700 relative cursor-pointer group/thumb flex items-center justify-center"
                      >
                        <img
                          src={item.displayImage}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white">
                          <ZoomIn size={16} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-gold transition-colors">
                          {item.name}
                        </h3>
                        
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-body truncate">
                          {item.packageName} · {item.tierName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Action Buttons ──── */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
                    <button
                      onClick={() => handleInspect(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#d4af37] hover:brightness-105 text-neutral-950 font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ZoomIn size={13} />
                      <span>Inspect Deliverable</span>
                    </button>

                    {item.isReady && (
                      <a
                        href={item.displayImage}
                        download={item.fileName || 'deliverable.jpg'}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Download print file"
                      >
                        <Download size={13} />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PACKAGE INCLUSIONS & ATTIRE TAB */
        <div className="space-y-4">
          <div className="rounded-2xl p-3.5 sm:p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Booked Package Inclusions & Attire Privileges
              </h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Everything included in your selected {activeBooking?.services?.name || 'Studio'} tier ({activeBooking?.tier_name || 'Standard'}).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {currentTierHighlights.map((highlight, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-3 shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Inclusion 0{idx + 1}
                  </span>
                  <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
                    {highlight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LUXURY SECTION DIVIDER ─────────────────────────────────────────── */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-neutral-50 dark:bg-neutral-900 px-6 py-1.5 text-xs font-bold uppercase tracking-widest text-primary dark:text-amber-400 border border-amber-500/30 rounded-full shadow-xs flex items-center gap-2">
            <Layers size={14} className="text-amber-500" />
            <span>Studio Service Packages & Portfolios Below</span>
          </span>
        </div>
      </div>

      {/* ── SECTION 2: STUDIO SERVICES & SAMPLES SHOWCASE ───────────────────── */}
      <section className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold text-xs uppercase tracking-wider">Services Photo Samples</span>
            <span className="text-xs text-neutral-400">· Curated imagery by service package</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-primary dark:text-white">
            Service Package Photo Collections
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-3xl">
            Each photography and cinematography package is tailored with complete styling, lighting, and physical frame inclusions. Explore sample galleries matching our core studio service tiers.
          </p>
        </div>

        {/* Core Service Showcase Panels */}
        <div className="space-y-8">
          {servicesList.map((srv, idx) => (
            <div 
              key={srv.id || srv.slug || idx}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden shadow-xs hover:shadow-md transition-all p-6 sm:p-8"
            >
              <div className="grid lg:grid-cols-12 gap-6 items-center">
                
                {/* Left: Package Synopsis (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Tier 0{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      {srv.category}
                    </span>
                  </div>

                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-primary dark:text-white">
                    {srv.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {srv.description}
                  </p>

                  {/* Highlights / Inclusions preview */}
                  <div className="space-y-1.5 pt-2">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Package Highlights
                    </p>
                    {(srv.inclusions || srv.tiers?.[0]?.highlights)?.slice(0, 3).map((inc, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-3 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase block">Starting from</span>
                      <span className="font-heading text-lg sm:text-xl font-bold text-primary dark:text-white">
                        {srv.tiers?.[0]?.price || "Inquire for quote"}
                      </span>
                    </div>

                    <Link
                      to={`/dashboard/book?service=${srv.slug}`}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold tracking-wide transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Book Package</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>

                {/* Right: Curated Photo Grid (7 cols) */}
                <div className="lg:col-span-7">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(srv.galleryImages || [
                      srv.coverImage,
                      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
                      'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80',
                      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80'
                    ]).slice(0, 6).map((imgUrl, imgIdx) => (
                      <div 
                        key={imgIdx}
                        onClick={() => setLightbox({
                          name: `${srv.name} — Sample Photo 0${imgIdx + 1}`,
                          displayImage: imgUrl,
                          packageName: srv.name,
                          tierName: srv.category || 'Portfolio',
                          isReady: true
                        })}
                        className="group/img relative aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 cursor-pointer shadow-xs hover:shadow-md transition-all"
                      >
                        <img 
                          src={imgUrl} 
                          alt={`${srv.name} Sample ${imgIdx + 1}`} 
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn size={18} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIGHTBOX MODAL (Clean, Verified High-Res Image) ──────────────────── */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightbox(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-stone-900 border border-gold/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-950/80 text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Left Image View */}
            <div className="md:w-3/5 bg-black flex items-center justify-center p-4 max-h-[70vh] md:max-h-[80vh]">
              <img
                src={lightbox.displayImage}
                alt={lightbox.name}
                className="max-h-[60vh] md:max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Right Details Panel */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-stone-800 space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-[10px] font-semibold uppercase tracking-wider mb-2">
                    <Sparkles size={11} /> {lightbox.tierName || 'Package Deliverable'}
                  </div>
                  <h3 className="text-lg sm:text-xl font-heading font-bold text-white leading-snug">
                    {lightbox.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {lightbox.packageName}
                  </p>
                </div>

                <div className="space-y-2.5 text-xs bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Package:</span>
                    <span className="font-semibold text-stone-200 text-right">{lightbox.packageName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Selected Tier:</span>
                    <span className="font-semibold text-stone-200">{lightbox.tierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Status:</span>
                    <span className={`font-semibold ${lightbox.isReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {lightbox.isReady ? 'Photo Ready' : 'In Post-Production'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-800 flex items-center gap-3">
                {lightbox.isReady ? (
                  <a
                    href={lightbox.displayImage}
                    download={lightbox.fileName || 'deliverable.jpg'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gold hover:bg-amber-400 text-neutral-950 text-xs font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download Full Output</span>
                  </a>
                ) : (
                  <div className="flex-1 py-2.5 px-4 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span>In Post-Production</span>
                  </div>
                )}

                <button
                  onClick={() => setLightbox(null)}
                  className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local Toast Component */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
