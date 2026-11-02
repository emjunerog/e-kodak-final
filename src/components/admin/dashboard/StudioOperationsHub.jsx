import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart3,
  GitBranch,
  Wallet,
  CalendarX2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getEffectivePaymentStatus } from '../../../lib/bookingUtils';
import {
  safeDate,
  startOfWeek,
  addDays,
  peso,
} from './chartUtils';

/* ── Website Color Tokens strictly applied ───────────────────────────────── */
const PALETTE = {
  gold: '#c9a96e',
  goldDark: '#a8843a',
  goldMuted: '#d4b896',
  amber: '#b45309',
  amberWarm: '#d97706',
  emerald: '#059669',
  slate: '#78716c',
  primaryDark: '#1a1a1a',
  neutralBorder: '#ede9e1',
};

/* ── Official 7 Studio Production Stages (Strictly mapped) ────────────────── */
const OFFICIAL_7_TRACKER_STAGES = [
  { step: 1, key: 'PENDING', label: 'Received', fullLabel: 'Booking Received', statuses: ['PENDING', 'RESERVED'] },
  { step: 2, key: 'CONFIRMED', label: 'Approved', fullLabel: 'Approved & Reserved', statuses: ['CONFIRMED', 'PHOTOGRAPHER_ASSIGNED'] },
  { step: 3, key: 'CAPTURE', label: 'Pictorial', fullLabel: 'Ongoing Pictorial', statuses: ['CAPTURE', 'IN_PROGRESS'] },
  { step: 4, key: 'EDITING', label: 'Editing', fullLabel: 'Editing', statuses: ['EDITING'] },
  { step: 5, key: 'RETOUCHING', label: 'Retouch', fullLabel: 'Retouching', statuses: ['RETOUCHING'] },
  { step: 6, key: 'FINALIZED', label: 'Finalized', fullLabel: 'Booking Finalized', statuses: ['FINALIZED', 'PRINTING'] },
  { step: 7, key: 'READY', label: 'Ready', fullLabel: 'Ready for Pickup', statuses: ['READY', 'UNDER_DELIVERY'] },
];

/* ── Mini Circular Progress Ring for Collections Cards ───────────────────── */
function IndividualProgressRing({ percentage = 0, color = PALETTE.gold, size = 40 }) {
  const strokeWidth = 3.8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-label={`${Math.round(safePct)}%`}
    >
      <svg width={size} height={size} className="-rotate-90 transform overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={safePct > 0 ? `${color}14` : 'transparent'}
          stroke="#ede9e1"
          strokeWidth={strokeWidth}
        />
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

IndividualProgressRing.propTypes = {
  percentage: PropTypes.number,
  color: PropTypes.string,
  size: PropTypes.number,
};

/* ── Custom Tooltip for Weekly Intake ─────────────────────────────────────── */
function CustomWeeklyBarTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="z-50 min-w-[160px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3 text-white shadow-xl backdrop-blur-md font-body text-xs pointer-events-none">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
        Week of {data.label}
      </p>
      <div className="flex items-center justify-between gap-3 text-neutral-300">
        <span>Bookings:</span>
        <span className="font-bold text-white">{data.count}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-neutral-300 mt-1">
        <span>Volume:</span>
        <span className="font-mono font-bold text-amber-300">{peso(data.value)}</span>
      </div>
    </div>
  );
}

CustomWeeklyBarTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

/* ── Custom Tooltip for Workflow Distribution Line Chart ──────────────────── */
function CustomWorkflowTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="z-50 min-w-[170px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3 text-white shadow-xl backdrop-blur-md font-body text-xs pointer-events-none">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
        Stage {data.step}: {data.fullLabel}
      </p>
      <div className="flex items-center justify-between gap-3 text-neutral-300">
        <span>Active Orders:</span>
        <span className="font-bold text-white">{data.count} {data.count === 1 ? 'order' : 'orders'}</span>
      </div>
    </div>
  );
}

CustomWorkflowTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

/* ── Custom Tooltip for Collections Donut (Includes hovered 50%, Collected, 875) ─ */
function CustomPaymentTooltip({ active, payload, totalGross = 0 }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item || item.key === 'EMPTY') return null;

  const pct = totalGross > 0 ? Math.round((item.value / totalGross) * 100) : 0;

  return (
    <div className="z-50 min-w-[170px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3 text-white shadow-2xl backdrop-blur-md font-body text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="font-bold text-white truncate">{item.label}</span>
        </div>
        <span className="font-heading font-black text-amber-400 text-xs shrink-0">
          {pct}%
        </span>
      </div>
      <div className="flex justify-between text-neutral-300">
        <span>Orders:</span>
        <span className="font-bold text-white">{item.count} {item.count === 1 ? 'order' : 'orders'}</span>
      </div>
      <div className="flex justify-between text-neutral-300 mt-1">
        <span>Amount:</span>
        <span className="font-mono font-bold text-amber-300">{peso(item.value)}</span>
      </div>
    </div>
  );
}

CustomPaymentTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  totalGross: PropTypes.number,
};

/* ── Empty State ──────────────────────────────────────────────────────────── */
function EmptyState({ text, icon: Icon = CalendarX2 }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2.5 px-4 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/70 bg-amber-50 text-amber-700 shadow-2xs">
        <Icon size={18} />
      </span>
      <p className="max-w-[220px] text-xs leading-relaxed text-neutral-400">{text}</p>
    </div>
  );
}

EmptyState.propTypes = {
  text: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

/* ══════════════════════════════════════════════════════════════════════════════
   MASTER COMPONENT: StudioOperationsHub
   Spacious, cohesive master card with Weekly Intake, Workflow Line Chart, and Collections
   ══════════════════════════════════════════════════════════════════════════════ */
export default function StudioOperationsHub({
  bookings = [],
  onSelectStatus,
}) {
  const [hoveredDonutKey, setHoveredDonutKey] = useState(null);

  /* ── 1. Weekly Intake Data (Last 8 Weeks) ────────────────────────────────── */
  const { weeklyData, totalWeeklyCount, totalWeeklyValue } = useMemo(() => {
    const today = new Date();
    const thisWeek = startOfWeek(today);
    const list = [];

    for (let i = 7; i >= 0; i -= 1) {
      const start = addDays(thisWeek, -i * 7);
      const end = addDays(start, 7);
      list.push({
        start,
        end,
        label: start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        count: 0,
        value: 0,
      });
    }

    bookings.forEach((booking) => {
      const created = safeDate(booking?.created_at);
      if (!created) return;
      const week = list.find((item) => created >= item.start && created < item.end);
      if (!week) return;
      week.count += 1;
      week.value += Number(booking.total_amount || 0);
    });

    const totalCount = list.reduce((sum, w) => sum + w.count, 0);
    const totalVal = list.reduce((sum, w) => sum + w.value, 0);

    return {
      weeklyData: list,
      totalWeeklyCount: totalCount,
      totalWeeklyValue: totalVal,
    };
  }, [bookings]);

  /* ── 2. Workflow Distribution Data (7 Production Stages Line Chart) ──────── */
  const { workflowData, totalInPipeline, activeStages } = useMemo(() => {
    const counts = new Map();
    let total = 0;

    bookings.forEach((booking) => {
      const status = String(booking?.status || '').toUpperCase();
      const matched = OFFICIAL_7_TRACKER_STAGES.find((s) => s.statuses.includes(status));
      if (matched) {
        counts.set(matched.step, (counts.get(matched.step) || 0) + 1);
        total += 1;
      }
    });

    const list = OFFICIAL_7_TRACKER_STAGES.map((stage) => {
      const count = counts.get(stage.step) || 0;
      return {
        ...stage,
        count,
      };
    });

    const active = list.filter((s) => s.count > 0);

    return {
      workflowData: list,
      totalInPipeline: total,
      activeStages: active,
    };
  }, [bookings]);

  /* ── 3. Collections Data (Service Demand Split Approach) ──────────────────── */
  const collectionsData = useMemo(() => {
    let gross = 0;
    let paidAmount = 0;
    let downAmount = 0;
    let uncollectedAmount = 0;

    let paidCount = 0;
    let downCount = 0;
    let uncollectedCount = 0;

    bookings.forEach((booking) => {
      const amount = Number(booking.total_amount || 0);
      const effStatus = getEffectivePaymentStatus(booking);
      if (effStatus === 'REFUNDED') return;

      gross += amount;

      if (effStatus === 'PAID') {
        paidAmount += amount;
        paidCount += 1;
      } else if (effStatus === 'DOWNPAYMENT') {
        const settled = Number(booking.down_payment_amount || 0);
        const remaining = Number(booking.remaining_balance ?? Math.max(0, amount - settled));
        const collected = settled > 0 ? Math.min(settled, amount || settled) : Math.max(0, amount - remaining);
        downAmount += collected;
        downCount += 1;

        const balance = Math.max(0, amount - collected);
        if (balance > 0) {
          uncollectedAmount += balance;
          uncollectedCount += 1;
        }
      } else {
        uncollectedAmount += amount;
        uncollectedCount += 1;
      }
    });

    const collectedTotal = paidAmount + downAmount;
    const rate = gross > 0 ? Math.min(100, (collectedTotal / gross) * 100) : 0;

    // Slices for Donut (clean, only active slices)
    const segments = [
      { key: 'DOWNPAYMENT', label: 'Downpayment', value: downAmount, color: PALETTE.gold, count: downCount },
      { key: 'UNPAID', label: 'To be Claimed', value: uncollectedAmount, color: PALETTE.amber, count: uncollectedCount },
      { key: 'PAID', label: 'Paid in Full', value: paidAmount, color: PALETTE.emerald, count: paidCount },
    ];
    const donutSlices = segments.filter((s) => s.value > 0);

    // Cards list for Service Demand style right-hand stack
    const cards = [
      {
        key: 'DOWNPAYMENT',
        label: 'Downpayment',
        count: downCount,
        value: downAmount,
        color: PALETTE.gold,
        pct: gross > 0 ? (downAmount / gross) * 100 : 0,
      },
      {
        key: 'UNPAID',
        label: 'To be Claimed',
        count: uncollectedCount,
        value: uncollectedAmount,
        color: PALETTE.amber,
        pct: gross > 0 ? (uncollectedAmount / gross) * 100 : 0,
      },
      {
        key: 'PAID',
        label: 'Paid in Full',
        count: paidCount,
        value: paidAmount,
        color: PALETTE.emerald,
        pct: gross > 0 ? (paidAmount / gross) * 100 : 0,
      },
    ];

    return {
      gross,
      paidAmount,
      downAmount,
      uncollectedAmount,
      collectedTotal,
      rate,
      donutSlices: donutSlices.length > 0 ? donutSlices : [{ key: 'EMPTY', label: 'None', value: 1, color: '#e7e5e4', count: 0 }],
      cards,
    };
  }, [bookings]);

  return (
    <section className="relative rounded-3xl border border-[#c9a96e]/35 bg-white shadow-xs overflow-hidden font-body ring-1 ring-[#c9a96e]/15">
      {/* Studio Signature Gold Top Accent Line */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-[#c9a96e] to-amber-600" />

      {/* ── UNIFIED 3-ENGINE GRID WITH GENEROUS BREATHING ROOM ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200/80 items-stretch bg-white">

        {/* ── 1. WEEKLY INTAKE (Proper Bar Chart) ── */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full bg-white">
          {/* Header: Clean, direct */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
                <BarChart3 size={17} />
              </span>
              <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Weekly Intake
              </h3>
            </div>
          </div>

          {/* Chart Area filling all available space */}
          {bookings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState text="No booking records yet." icon={BarChart3} />
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[280px] sm:min-h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 16, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="intake-bar-gold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9a96e" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity={0.88} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1ede4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                    axisLine={{ stroke: '#e7e5e4' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (dataMax) => Math.max(dataMax + 1, 3)]}
                    tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomWeeklyBarTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="url(#intake-bar-gold)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                    className="transition-all duration-300 hover:opacity-90"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── 2. WORKFLOW DISTRIBUTION (Spacious Line Chart Counting Orders per Stage) ── */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full bg-gradient-to-br from-[#faf7f2]/40 via-white to-amber-50/15">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
                <GitBranch size={17} />
              </span>
              <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Workflow Distribution
              </h3>
            </div>
          </div>

          {/* Line Chart Area filling all available space */}
          {totalInPipeline === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState text="No bookings currently in workflow." icon={GitBranch} />
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[280px] sm:min-h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={workflowData} margin={{ top: 16, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="workflow-line-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c9a96e" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1ede4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9.5, fill: '#78716c', fontWeight: 600 }}
                    axisLine={{ stroke: '#e7e5e4' }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (dataMax) => Math.max(dataMax + 1, 3)]}
                    tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomWorkflowTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#c9a96e"
                    strokeWidth={2.8}
                    fill="url(#workflow-line-grad)"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const hasOrders = payload && payload.count > 0;
                      return (
                        <circle
                          key={`dot-${payload?.step}`}
                          cx={cx}
                          cy={cy}
                          r={hasOrders ? 5.5 : 2.5}
                          fill={hasOrders ? '#c9a96e' : '#d6d0c4'}
                          stroke={hasOrders ? '#ffffff' : 'transparent'}
                          strokeWidth={hasOrders ? 2 : 0}
                          className={hasOrders ? 'drop-shadow-xs' : ''}
                        />
                      );
                    }}
                    activeDot={{
                      r: 6.5,
                      fill: '#b45309',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── 3. COLLECTIONS (Clean Donut without centered text, data in hover tooltip) ── */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between h-full bg-gradient-to-br from-[#faf7f2]/60 via-white to-amber-50/20">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
                  <Wallet size={17} />
                </span>
                <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                  Collections
                </h3>
              </div>
            </div>

            {/* Service Demand Split Layout: Clean Donut (no text inside) + Ring Cards */}
            {bookings.length === 0 || collectionsData.gross === 0 ? (
              <EmptyState text="No payable orders recorded yet." icon={Wallet} />
            ) : (
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                {/* Left: Enlarged Clean Donut Chart (NO text inside, hover details shown in Tooltip) */}
                <div className="relative h-[150px] w-[150px] sm:h-[160px] sm:w-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomPaymentTooltip totalGross={collectionsData.gross} />} />
                      <Pie
                        data={collectionsData.donutSlices}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={68}
                        paddingAngle={collectionsData.donutSlices.length > 1 ? 3.5 : 0}
                        onMouseEnter={(_, index) => setHoveredDonutKey(collectionsData.donutSlices[index]?.key)}
                        onMouseLeave={() => setHoveredDonutKey(null)}
                      >
                        {collectionsData.donutSlices.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={hoveredDonutKey === entry.key ? 3 : 1.5}
                            className="cursor-pointer transition-all duration-200 outline-none"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Right: Shorter Cards with Individual Circular Rings (Service Demand approach) */}
                <div className="min-w-0 flex-1 w-full space-y-2">
                  {collectionsData.cards.map((card) => (
                    <div
                      key={card.key}
                      className="group/card flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border border-neutral-200/80 bg-white hover:border-amber-400 hover:shadow-xs transition-all text-xs"
                      title={`${card.label}: ${card.count} orders (${peso(card.value)})`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Circular progress ring (clean, no text inside) */}
                        <IndividualProgressRing
                          percentage={card.pct}
                          color={card.color}
                          size={38}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-900 text-xs sm:text-sm truncate leading-tight group-hover/card:text-amber-800 transition-colors">
                            {card.label}
                          </p>
                          <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                            {card.count} {card.count === 1 ? 'order' : 'orders'}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-neutral-900 text-xs sm:text-sm shrink-0 pl-1">
                        {peso(card.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clean minimal balance bar */}
          <div className="mt-4 pt-3.5 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-neutral-500 font-medium">Balance to be Claimed</span>
              <span className="font-mono font-bold text-amber-800 text-sm">
                {peso(collectionsData.uncollectedAmount)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200/70">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${Math.round(collectionsData.rate)}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

StudioOperationsHub.propTypes = {
  bookings: PropTypes.array,
  onSelectStatus: PropTypes.func,
};
