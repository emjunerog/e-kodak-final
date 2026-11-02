import React, { useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  TrendingUp,
  CalendarDays,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  RANGE_OPTIONS,
  buildTimeline,
  buildPreviousSeries,
  peso,
  compactPeso,
  compactNumber,
} from './chartUtils';

/**
 * Smooth an array of numbers using a Gaussian-like bell window.
 * Ensures the peak matches the true max, baseline stays at 0, and transitions are rounded and non-pointy.
 */
function getSmoothedValues(rawNumbers = []) {
  if (rawNumbers.length <= 2) return rawNumbers;
  const max = Math.max(...rawNumbers, 0);
  if (max === 0) return rawNumbers.map(() => 0);

  // 5-point bell weights for natural curvature
  const kernel = [0.15, 0.45, 1, 0.45, 0.15];
  const mid = 2;

  const smoothed = rawNumbers.map((_, i) => {
    let sum = 0;
    let weight = 0;
    for (let k = 0; k < kernel.length; k++) {
      const idx = i + (k - mid);
      if (idx >= 0 && idx < rawNumbers.length) {
        sum += rawNumbers[idx] * kernel[k];
        weight += kernel[k];
      }
    }
    return weight > 0 ? sum / weight : 0;
  });

  const maxSmoothed = Math.max(...smoothed, 0);
  const scale = maxSmoothed > 0 ? max / maxSmoothed : 1;
  return smoothed.map((v) => Math.max(0, Math.round(v * scale * 100) / 100));
}

/**
 * Metric KPI Box with embedded functional sparkline micro-graph
 */
function TrajectoryKpiCard({
  label,
  value,
  tooltip,
  icon: Icon,
  tone = 'text-neutral-900',
  sparkData = [],
  strokeColor = '#c9a96e',
  sparkId,
  tooltipFormatter,
}) {
  return (
    <div
      className="group relative flex flex-1 flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-2.5 sm:p-3 shadow-2xs transition-all hover:border-amber-300 hover:shadow-xs"
      title={tooltip}
    >
      <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-neutral-500">
        <span className="truncate">{label}</span>
        <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-neutral-50 text-neutral-400 group-hover:text-amber-700 group-hover:bg-amber-50/80 transition-colors">
          <Icon size={12} className="sm:w-3.5 sm:h-3.5" />
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        <p className={`font-heading text-lg sm:text-xl font-bold tracking-tight tabular-nums shrink-0 ${tone}`}>
          {value}
        </p>

        {/* Prioritized Sparkline Micro-graph */}
        <div className="flex-1 h-9 sm:h-10 min-w-[95px] max-w-[145px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 1, left: 1, bottom: 0 }}>
              <defs>
                <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  const displayVal = item.rawVal !== undefined ? item.rawVal : payload[0].value ?? 0;
                  return (
                    <div className="rounded-md border border-neutral-700/80 bg-neutral-900/95 px-2 py-1 text-[10px] text-white shadow-lg backdrop-blur-md pointer-events-none z-50 font-body">
                      <p className="text-neutral-400 text-[9px]">{item.label}</p>
                      <p className="font-bold text-amber-300">
                        {tooltipFormatter ? tooltipFormatter(displayVal) : displayVal}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="val"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${sparkId})`}
                dot={false}
                activeDot={{ r: 3.5, fill: strokeColor, stroke: '#ffffff', strokeWidth: 1.5 }}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

TrajectoryKpiCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tooltip: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  tone: PropTypes.string,
  sparkData: PropTypes.array,
  strokeColor: PropTypes.string,
  sparkId: PropTypes.string.isRequired,
  tooltipFormatter: PropTypes.func,
};

/**
 * Custom Recharts Tooltip with booking details and delta comparisons
 */
function CustomTrajectoryTooltip({ active, payload, label, metric, compare }) {
  if (!active || !payload || !payload.length) return null;

  const current = payload.find((p) => p.dataKey === 'value');
  const previous = payload.find((p) => p.dataKey === 'compareValue');
  const data = current?.payload;

  if (!data) return null;

  const val = data.rawVal !== undefined ? data.rawVal : current.value || 0;
  const prevVal = data.rawCompareVal !== undefined ? data.rawCompareVal : previous?.value || 0;
  const isRev = metric === 'revenue';

  const delta = prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : val > 0 ? 100 : 0;
  const isPositive = delta >= 0;

  return (
    <div className="z-50 min-w-[210px] max-w-[280px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md font-body">
      {/* Date Header */}
      <div className="border-b border-neutral-800 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
          {data.fullLabel || label}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-heading text-lg font-bold text-white">
            {isRev ? peso(val) : `${val} ${val === 1 ? 'booking' : 'bookings'}`}
          </span>
          {isRev && (
            <span className="text-[10px] text-neutral-400">
              {data.count} {data.count === 1 ? 'shoot' : 'shoots'}
            </span>
          )}
        </div>
      </div>

      {/* Compare Period Delta */}
      {compare && previous && (
        <div className="mt-2 flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-neutral-800/60 border border-neutral-700/50">
          <span className="text-[10px] text-neutral-400">Prior window:</span>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-neutral-300 text-[11px]">
              {isRev ? compactPeso(prevVal) : prevVal}
            </span>
            <span
              className={`flex items-center text-[10px] font-bold ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(Math.round(delta))}%
            </span>
          </div>
        </div>
      )}

      {/* Client Bookings List on this point */}
      {data.bookings && data.bookings.length > 0 && (
        <div className="mt-2 pt-2 border-t border-neutral-800">
          <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
            Reservations ({data.bookings.length})
          </p>
          <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {data.bookings.slice(0, 4).map((b) => (
              <li key={b.id} className="text-[11px] flex items-center justify-between text-neutral-300">
                <span className="truncate pr-2">
                  {b.customer?.first_name} {b.customer?.last_name || ''}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-amber-400 font-bold">
                  {peso(b.total_amount)}
                </span>
              </li>
            ))}
            {data.bookings.length > 4 && (
              <li className="text-[10px] text-neutral-500 italic">
                + {data.bookings.length - 4} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

CustomTrajectoryTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  metric: PropTypes.string,
  compare: PropTypes.bool,
};

export default function StudioRevenueTrendChart({
  bookings = [],
  loading = false,
  isEmbedded = false,
}) {
  const [range, setRange] = useState('ALL');
  const [metric, setMetric] = useState('revenue');
  const [compare, setCompare] = useState(false);
  const gradientId = useId().replace(/:/g, '');

  const timeline = useMemo(() => buildTimeline(bookings, range), [bookings, range]);
  const previous = useMemo(
    () => (compare ? buildPreviousSeries(bookings, range, timeline) : null),
    [bookings, range, timeline, compare]
  );

  const buckets = timeline.buckets;
  const hasRangeData = timeline.visibleBookings > 0;

  /* ── Financial calculations strictly from active timeline records ─────── */
  const financials = useMemo(() => {
    let gross = 0;
    let collected = 0;
    let count = 0;

    buckets.forEach((bucket) => {
      gross += bucket.revenue;
      collected += bucket.collected;
      count += bucket.count;
    });

    const rate = gross > 0 ? Math.round((collected / gross) * 100) : 0;
    const avg = count > 0 ? gross / count : 0;
    return { gross, collected, rate, avg, count };
  }, [buckets]);

  /* ── Chart data for Recharts with smooth, non-pointy curvature ─────────── */
  const chartData = useMemo(() => {
    const rawValues = buckets.map((b) => (metric === 'revenue' ? b.revenue : b.count));
    const smoothedValues = getSmoothedValues(rawValues);

    const rawCompareValues = previous?.values?.length
      ? previous.values.map((v) => (metric === 'revenue' ? v.revenue : v.count))
      : [];
    const smoothedCompare = rawCompareValues.length
      ? getSmoothedValues(rawCompareValues)
      : [];

    return buckets.map((bucket, index) => {
      return {
        label: bucket.label,
        fullLabel: bucket.fullLabel,
        value: smoothedValues[index],
        rawVal: rawValues[index],
        compareValue: smoothedCompare.length ? smoothedCompare[index] : null,
        rawCompareVal: rawCompareValues[index] ?? null,
        revenue: bucket.revenue,
        count: bucket.count,
        collected: bucket.collected,
        bookings: bucket.bookings || [],
      };
    });
  }, [buckets, previous, metric]);

  /* ── Sparkline series for KPI cards (smoothed for non-pointy look) ───── */
  const sparkRevenue = useMemo(() => {
    const raw = buckets.map((b) => b.revenue);
    const smoothed = getSmoothedValues(raw);
    return buckets.map((b, i) => ({ label: b.label, val: smoothed[i], rawVal: raw[i] }));
  }, [buckets]);

  const sparkVolume = useMemo(() => {
    const raw = buckets.map((b) => b.count);
    const smoothed = getSmoothedValues(raw);
    return buckets.map((b, i) => ({ label: b.label, val: smoothed[i], rawVal: raw[i] }));
  }, [buckets]);

  const sparkAvg = useMemo(() => {
    const raw = buckets.map((b) => (b.count > 0 ? Math.round(b.revenue / b.count) : 0));
    const smoothed = getSmoothedValues(raw);
    return buckets.map((b, i) => ({ label: b.label, val: smoothed[i], rawVal: raw[i] }));
  }, [buckets]);

  const sparkClearance = useMemo(() => {
    const raw = buckets.map((b) => b.collected);
    const smoothed = getSmoothedValues(raw);
    return buckets.map((b, i) => ({ label: b.label, val: smoothed[i], rawVal: raw[i] }));
  }, [buckets]);

  const formatTick = (val) => (metric === 'revenue' ? compactPeso(val) : compactNumber(val));

  const containerClass = isEmbedded
    ? 'relative h-full flex flex-col font-body'
    : 'relative h-full flex flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs sm:p-5 font-body';

  return (
    <div className={containerClass}>
      {/* Background aesthetic tint */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-amber-50/70 via-white to-transparent" />

      {/* ── Header: Adjusted Prominent Title & Controls (No Live Sync, No subtitle) ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-neutral-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
            <TrendingUp size={18} />
          </span>
          <h3 className="truncate font-heading text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
            Revenue &amp; Booking Trajectory
          </h3>
        </div>

        {/* Top Controls: 3 range options & Icon-only Compare button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Time range selector - 3 options */}
          <div className="flex items-center rounded-xl border border-neutral-200/80 bg-neutral-50 p-0.5">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`h-7 rounded-lg px-2.5 text-[11px] font-bold transition-all cursor-pointer ${
                  range === option.key
                    ? 'bg-white text-neutral-900 shadow-xs ring-1 ring-neutral-200/70'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title={`Filter trajectory to ${option.label}`}
                aria-pressed={range === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Compare toggle - Icon only */}
          <button
            type="button"
            onClick={() => setCompare((prev) => !prev)}
            title={
              compare
                ? 'Disable comparison with previous period'
                : 'Compare trajectory with previous period'
            }
            aria-label="Compare trajectory with previous period"
            aria-pressed={compare}
            className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border transition-all cursor-pointer ${
              compare
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
            }`}
          >
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Main Layout: Graph on Left, Dedicated KPI Cards Column on Right ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 flex-1 items-stretch">
        {/* Left Column: Graph Area */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          {/* Graph Subheader: Active Metric & In-Graph Revenue / Bookings Toggle */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-700">
                {metric === 'revenue' ? 'Revenue Trajectory' : 'Booking Sessions'}
              </span>
              {compare && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400">
                  <span className="inline-block w-2.5 border-b-2 border-dashed border-neutral-400" />
                  prior window
                </span>
              )}
            </div>

            {/* Metric Mode Toggle situated directly in the graph area */}
            <div className="flex items-center rounded-xl border border-neutral-200/80 bg-neutral-50 p-0.5">
              <button
                type="button"
                onClick={() => setMetric('revenue')}
                className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-all cursor-pointer ${
                  metric === 'revenue'
                    ? 'bg-white text-amber-800 shadow-xs ring-1 ring-amber-200/70'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Show monetary revenue amounts (₱)"
                aria-pressed={metric === 'revenue'}
              >
                <Receipt size={12} />
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setMetric('count')}
                className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold transition-all cursor-pointer ${
                  metric === 'count'
                    ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200/70'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Show booking session counts"
                aria-pressed={metric === 'count'}
              >
                <CalendarDays size={12} />
                Bookings
              </button>
            </div>
          </div>

          {/* Recharts Canvas */}
          <div className="relative flex flex-1 flex-col min-h-[250px] h-[250px] lg:h-[290px]">
            {loading ? (
              <div className="flex h-full flex-1 items-center justify-center rounded-xl bg-neutral-50 animate-pulse">
                <span className="text-xs text-neutral-400">Loading live booking trajectory…</span>
              </div>
            ) : chartData.length === 0 || !hasRangeData ? (
              <div className="flex h-full flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70 px-6 text-center">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/70 bg-amber-50 text-amber-600">
                  <CalendarDays size={18} />
                </span>
                <p className="text-xs font-bold text-neutral-700">No booking activity in this window</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-neutral-400">
                  Select a wider range or wait for incoming client reservations.
                </p>
              </div>
            ) : (
              <div className="h-full w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`${gradientId}-rev`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={metric === 'revenue' ? '#d97706' : '#4f46e5'}
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor={metric === 'revenue' ? '#f59e0b' : '#6366f1'}
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#f1ede4" vertical={false} />

                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#78716c', fontWeight: 500 }}
                      axisLine={{ stroke: '#e7e5e4' }}
                      tickLine={false}
                    />

                    <YAxis
                      tickFormatter={formatTick}
                      tick={{ fontSize: 10, fill: '#78716c', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip
                      content={
                        <CustomTrajectoryTooltip metric={metric} compare={compare} />
                      }
                    />

                    {compare && (
                      <Area
                        type="monotone"
                        dataKey="compareValue"
                        stroke="#a8a29e"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fill="none"
                        isAnimationActive={false}
                      />
                    )}

                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metric === 'revenue' ? '#d97706' : '#4f46e5'}
                      strokeWidth={2.5}
                      fill={`url(#${gradientId}-rev)`}
                      activeDot={{
                        r: 5,
                        fill: metric === 'revenue' ? '#b45309' : '#4338ca',
                        stroke: '#ffffff',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dedicated Space for KPI Cards with Functional Micro-graphs */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2 sm:gap-2.5">
          <TrajectoryKpiCard
            label="Revenue"
            value={peso(financials.gross)}
            tooltip="Total gross revenue in this timeframe"
            icon={Receipt}
            tone="text-neutral-900"
            sparkData={sparkRevenue}
            strokeColor="#c9a96e"
            sparkId={`${gradientId}-kpi-rev`}
            tooltipFormatter={peso}
          />
          <TrajectoryKpiCard
            label="Bookings"
            value={financials.count}
            tooltip="Total customer bookings placed within this period"
            icon={CalendarDays}
            tone="text-neutral-900"
            sparkData={sparkVolume}
            strokeColor="#b45309"
            sparkId={`${gradientId}-kpi-vol`}
            tooltipFormatter={(v) => `${v} booking${v === 1 ? '' : 's'}`}
          />
          <TrajectoryKpiCard
            label="Average Order"
            value={peso(financials.avg)}
            tooltip="Average order value per client reservation in this period"
            icon={Sparkles}
            tone="text-neutral-900"
            sparkData={sparkAvg}
            strokeColor="#c9a96e"
            sparkId={`${gradientId}-kpi-avg`}
            tooltipFormatter={peso}
          />
          <TrajectoryKpiCard
            label="Collection Rate"
            value={`${financials.rate}%`}
            tooltip="Percentage of gross revenue collected as payments or downpayments"
            icon={Wallet}
            tone="text-emerald-700"
            sparkData={sparkClearance}
            strokeColor="#059669"
            sparkId={`${gradientId}-kpi-clear`}
            tooltipFormatter={peso}
          />
        </div>
      </div>
    </div>
  );
}

StudioRevenueTrendChart.propTypes = {
  bookings: PropTypes.array,
  loading: PropTypes.bool,
  isEmbedded: PropTypes.bool,
};
