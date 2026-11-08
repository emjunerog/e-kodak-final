import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  PieChart as PieChartIcon,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { getEffectivePaymentStatus } from '../../../lib/bookingUtils';
import { peso, compactPeso } from './chartUtils';

// Curated luxury studio palette for the 4 official packages (Rank 1: Signature Kodak Gold)
const SERVICE_COLORS = [
  '#c9a96e', // Kodak Signature Heritage Gold
  '#b45309', // Warm Amber / Bronze
  '#0d9488', // Deep Teal
  '#6366f1', // Studio Indigo
];

/**
 * Individual Circular Pie Graph for each package card
 * Clean, prominent, without text inside
 */
function IndividualPackagePie({ percentage = 0, color = '#c9a96e', size = 52 }) {
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-label={`${Math.round(safePct)}% share`}
    >
      <svg width={size} height={size} className="-rotate-90 transform overflow-visible">
        {/* Background circular track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={safePct > 0 ? `${color}14` : 'transparent'}
          stroke="#ece8e1"
          strokeWidth={strokeWidth}
        />
        {/* Proportional colored arc */}
        {safePct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{
              filter: `drop-shadow(0 0 2px ${color}60)`,
            }}
          />
        )}
      </svg>
    </div>
  );
}

IndividualPackagePie.propTypes = {
  percentage: PropTypes.number,
  color: PropTypes.string,
  size: PropTypes.number,
};

/**
 * Floating Data Tooltip for the Main Donut Circle
 * Compact pill that never covers or collides with the center valuation
 */
function FloatingPackageTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-neutral-700/90 bg-neutral-900/95 px-3 py-1.5 text-white shadow-2xl backdrop-blur-md pointer-events-none font-body whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 z-50">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{
            backgroundColor: item.color,
            boxShadow: `0 0 6px ${item.color}`,
          }}
        />
        <span className="font-bold text-white">
          {item.name.replace(' and Sets', '')}
        </span>
        <span className="font-mono font-bold text-amber-300 ml-1">
          {peso(item.revenue)}
        </span>
      </div>
    </div>
  );
}

FloatingPackageTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

/**
 * Clean Package Card prioritizing the Circle Graph + Header
 * (No percentage inside circle, no "top" badge)
 */
function PackageKpiCard({
  item,
  isSelected = false,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group/pkg relative flex items-center gap-3 px-3 py-2.5 sm:py-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-amber-400 bg-amber-50/90 ring-1 ring-amber-300 shadow-xs'
          : item.count > 0
            ? 'border-amber-200/90 bg-white hover:border-amber-400 hover:shadow-xs'
            : 'border-neutral-200/70 bg-white/70 hover:border-neutral-300 hover:bg-white opacity-85 hover:opacity-100'
      }`}
      title={`${item.name} · ${item.count} orders (${Math.round(item.exactPct)}%)`}
    >
      {/* 1. THE CIRCLE GRAPH - Enlarged (52px), clean, no text inside */}
      <div className="shrink-0 flex items-center justify-center">
        <IndividualPackagePie
          percentage={item.exactPct}
          color={item.color}
          size={52}
        />
      </div>

      {/* 2. THE HEADER - Clean, no "top" word */}
      <div className="flex items-center min-w-0 flex-1">
        <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate group-hover/pkg:text-amber-800 transition-colors">
          {item.name.replace(' and Sets', '')}
        </span>
      </div>
    </button>
  );
}

PackageKpiCard.propTypes = {
  item: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
};

export default function StudioPackageShareChart({
  bookings = [],
  services = [],
  loading = false,
  onSelectService,
  activeServiceFilter = '',
  isEmbedded = false,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const packageData = useMemo(() => {
    // 1. Ingest actual bookings
    const groups = new Map();
    let totalBookings = 0;
    let totalRevenue = 0;

    bookings.forEach((booking) => {
      const status = String(booking?.status || '').toUpperCase();
      if (status === 'CANCELLED' || status === 'REJECTED') return;

      const effPayStatus = getEffectivePaymentStatus(booking);
      let bookingAmount = 0;
      let isEligible = false;

      // Real data consideration: Full Payment vs Downpayment
      if (effPayStatus === 'PAID') {
        bookingAmount = Number(booking?.total_amount || 0);
        isEligible = bookingAmount > 0;
      } else if (effPayStatus === 'DOWNPAYMENT') {
        const down = Number(booking?.down_payment_amount || 0);
        bookingAmount = down > 0 ? down : (Number(booking?.total_amount || 0) * 0.5);
        isEligible = bookingAmount > 0;
      }

      // Only add up bookings that have an actual downpayment or fullpayment
      if (!isEligible) return;

      const rawName =
        booking?.service?.name ||
        booking?.tier_name ||
        '';
      const serviceId = String(booking?.service?.id || booking?.service_id || '');

      totalBookings += 1;
      totalRevenue += bookingAmount;

      const key = serviceId || rawName.trim().toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { count: 0, revenue: 0, name: rawName.trim() });
      }
      const item = groups.get(key);
      item.count += 1;
      item.revenue += bookingAmount;
    });

    // 2. Ensure official services from the studio catalog are represented as cards
    const catalog =
      services && services.length > 0
        ? services
        : [
            { id: '1', name: 'Senior High Packages and Sets' },
            { id: '4', name: 'College Packages and Sets' },
          ];

    // Map each service to bookings data, then sort descending by bookings count & revenue
    const rawCards = catalog
      .map((svc, index) => {
        const idKey = String(svc.id || '');
        const nameKey = String(svc.name || '').trim().toLowerCase();

        let match = groups.get(idKey);
        if (!match) {
          for (const [k, v] of groups.entries()) {
            if (k === nameKey || (v.name && v.name.toLowerCase() === nameKey)) {
              match = v;
              break;
            }
          }
        }

        const count = match ? match.count : 0;
        const revenue = match ? match.revenue : 0;
        const exactPct = totalBookings > 0 ? (count / totalBookings) * 100 : 0;

        return {
          id: svc.id || `pkg-${index}`,
          name: svc.name,
          count,
          revenue,
          exactPct,
        };
      })
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    // Assign luxury studio palette based on sorted rank (Rank 1 always gets Signature Kodak Gold #c9a96e)
    const fourCards = rawCards.map((item, idx) => ({
      ...item,
      color: SERVICE_COLORS[idx % SERVICE_COLORS.length],
      rank: idx + 1,
    }));

    // Donut chart items: active packages with bookings, or placeholder single-ring if empty
    const donutItems = fourCards.filter((c) => c.count > 0);
    const activeDonut = donutItems.length > 0 ? donutItems : fourCards;
    const avgRevenuePerOrder = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    return {
      allFourCards: fourCards,
      donutItems: activeDonut,
      totalBookings,
      totalRevenue,
      avgRevenuePerOrder,
    };
  }, [bookings, services]);

  const containerClass = isEmbedded
    ? 'relative h-full flex flex-col justify-between font-body'
    : 'relative h-full flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs sm:p-5 font-body';

  return (
    <div className={containerClass}>
      {/* Subheader */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
            <PieChartIcon size={18} />
          </span>
          <h3 className="truncate font-heading text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
            Service Demand
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 flex flex-1 items-center justify-center rounded-xl bg-neutral-50 animate-pulse min-h-[220px]">
          <span className="text-xs text-neutral-400">Loading service demand…</span>
        </div>
      ) : (
        /* 
          Main layout requested by user:
          - Left side: The main circle occupies the space!
          - Right side: Shorter cards matching Image 2 preference, prioritizing the circle over the label!
        */
        <div className="pt-3 flex-1 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 flex-1">
            {/* ── LEFT SIDE: Main Circle (Master Donut Chart) - Enlarged ── */}
            <div className="relative flex-1 flex items-center justify-center min-w-[220px] py-1">
              <div className="relative w-[230px] h-[230px] sm:w-[255px] sm:h-[255px] flex items-center justify-center">
                {/* Concentric ambient background dashed ring */}
                <div className="pointer-events-none absolute h-[216px] w-[216px] sm:h-[240px] sm:w-[240px] rounded-full border border-dashed border-amber-300/40" />

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={<FloatingPackageTooltip />}
                      cursor={{ stroke: 'none' }}
                      isAnimationActive={true}
                      animationDuration={150}
                      position={{ y: 0 }}
                      wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                    />
                    <Pie
                      data={packageData.donutItems}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={98}
                      paddingAngle={packageData.donutItems.length > 1 ? 4 : 0}
                      onClick={(entry) =>
                        onSelectService?.(activeServiceFilter === entry.name ? '' : entry.name)
                      }
                      onMouseEnter={(_, index) => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {packageData.donutItems.map((entry, index) => (
                        <Cell
                          key={`donut-cell-${index}`}
                          fill={entry.count > 0 ? entry.color : '#e7e5e4'}
                          stroke="#ffffff"
                          strokeWidth={hoveredIndex === index ? 3.5 : 2}
                          className="cursor-pointer transition-all duration-200 outline-none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered Donut Readout: Valuation only */}
                <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
                  <span className="font-heading text-2xl sm:text-3xl font-extrabold text-amber-700 tabular-nums tracking-tight">
                    {peso(packageData.totalRevenue)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── RIGHT SIDE: All Four Shorter Cards (header + circle only) ── */}
            <div className="w-full sm:w-[280px] md:w-[310px] shrink-0 flex flex-col justify-between gap-2.5">
              {packageData.allFourCards.map((item) => (
                <PackageKpiCard
                  key={item.id}
                  item={item}
                  isSelected={activeServiceFilter === item.name}
                  onSelect={() => onSelectService?.(activeServiceFilter === item.name ? '' : item.name)}
                />
              ))}
            </div>
          </div>

          {/* Executive Studio Package Demand Metric Strip */}
          <div className="w-full mt-auto pt-3 border-t border-neutral-100 shrink-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-2.5">
                <div className="flex items-center justify-between text-neutral-500 text-[10px] font-semibold">
                  <span>Avg / Order</span>
                  <Receipt size={12} className="text-neutral-400" />
                </div>
                <p className="mt-1 font-mono font-bold text-neutral-800 text-xs sm:text-sm">
                  {peso(packageData.avgRevenuePerOrder)}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-2.5">
                <div className="flex items-center justify-between text-neutral-500 text-[10px] font-semibold">
                  <span>Total Value</span>
                  <TrendingUp size={12} className="text-amber-600" />
                </div>
                <p className="mt-1 font-mono font-bold text-amber-700 text-xs sm:text-sm">
                  {peso(packageData.totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

StudioPackageShareChart.propTypes = {
  bookings: PropTypes.array,
  services: PropTypes.array,
  loading: PropTypes.bool,
  onSelectService: PropTypes.func,
  activeServiceFilter: PropTypes.string,
  isEmbedded: PropTypes.bool,
};
