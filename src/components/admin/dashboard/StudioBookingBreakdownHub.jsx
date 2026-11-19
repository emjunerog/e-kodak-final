import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Layers,
  Users,
  GraduationCap,
  CalendarX2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const PALETTE = {
  gold: '#c9a96e',
  amber: '#b45309',
  teal: '#0d9488',
  indigo: '#6366f1',
};

function IndividualMiniRing({ percentage = 0, color = PALETTE.gold, size = 38 }) {
  const strokeWidth = 3.6;
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
          fill={safePct > 0 ? `${color}18` : `${color}0d`}
          stroke={safePct > 0 ? '#e7dfd1' : `${color}55`}
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
          />
        )}
      </svg>
    </div>
  );
}

IndividualMiniRing.propTypes = {
  percentage: PropTypes.number,
  color: PropTypes.string,
  size: PropTypes.number,
};

function EmptyChartState({ text, icon: Icon = CalendarX2 }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2.5 px-4 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/70 bg-amber-50 text-amber-700 shadow-2xs">
        <Icon size={18} />
      </span>
      <p className="max-w-[220px] text-xs leading-relaxed text-neutral-400">{text}</p>
    </div>
  );
}

EmptyChartState.propTypes = {
  text: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

function CustomSetsTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="z-50 min-w-[165px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3 text-white shadow-xl backdrop-blur-md font-body text-xs pointer-events-none">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
        {item.groupLabel}
      </p>
      <div className="flex items-center justify-between gap-3 text-neutral-300">
        <span>{item.setLabel}:</span>
        <span className="font-bold text-white">
          {item.count} {item.count === 1 ? 'order' : 'orders'}
        </span>
      </div>
    </div>
  );
}

CustomSetsTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

function CustomOrderTypeTooltip({ active, payload, totalOrders = 0 }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item || item.key === 'EMPTY') return null;

  const pct = totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0;

  return (
    <div className="z-50 min-w-[155px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3 text-white shadow-2xl backdrop-blur-md font-body text-xs pointer-events-none">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-1.5 mb-1.5">
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
        <span className="font-bold text-white">
          {item.count} {item.count === 1 ? 'order' : 'orders'}
        </span>
      </div>
    </div>
  );
}

CustomOrderTypeTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  totalOrders: PropTypes.number,
};

function CustomSchoolTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="z-50 max-w-[240px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-3 text-white shadow-xl backdrop-blur-md font-body text-xs pointer-events-none">
      <p className="font-bold text-amber-300 leading-snug mb-1">{item.fullName}</p>
      <div className="flex items-center justify-between gap-3 text-neutral-300">
        <span>Total Bookings:</span>
        <span className="font-bold text-white">
          {item.count} {item.count === 1 ? 'order' : 'orders'}
        </span>
      </div>
    </div>
  );
}

CustomSchoolTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

function extractBookingSchoolName(b) {
  const raw =
    b?.school ||
    b?.student_details?.school ||
    (b?.notes && b.notes.match(/•\s*(?:School|Institution|University):\s*([^\n\r]+)/i)?.[1]) ||
    '';
  const trimmed = String(raw || '').trim();
  if (!trimmed || /^n\/a$/i.test(trimmed) || /^null$/i.test(trimmed) || trimmed === '—') {
    return '';
  }
  return trimmed;
}

function classifyOrderType(b) {
  const bf = String(b?.booking_for || b?.participant_details?.booking_for || '').toLowerCase().trim();
  const mode = String(b?.student_details?.booking_mode || '').toUpperCase().trim();
  const notes = String(b?.notes || '');

  if (
    bf === 'school_section' ||
    mode === 'SCHOOL_PARTNER' ||
    /\[SCHOOL_PARTNER\]/i.test(notes) ||
    /•\s*Booking\s*For:\s*School\s*Section/i.test(notes)
  ) {
    return 'SECTIONS';
  }
  if (
    bf === 'someone_else' ||
    /•\s*Booking\s*For:\s*Someone\s*Else/i.test(notes)
  ) {
    return 'OTHERS';
  }
  return 'MYSELF';
}

function normalizeSetKey(tierName) {
  const m = String(tierName || '').match(/\bset\s*([a-d])\b/i);
  if (m) return `Set ${m[1].toUpperCase()}`;
  return '';
}

function classifyAcademicGroup(b) {
  const slug = String(b?.service?.slug || '').toLowerCase();
  const name = String(b?.service?.name || '').toLowerCase();
  const cat = String(b?.service?.category || '').toLowerCase();
  const sid = String(b?.service_id || '').toLowerCase();
  if (
    sid === '1471388e-b74f-41ec-96c8-1d220d557a89' ||
    cat === 'senior-high' ||
    slug.includes('senior') ||
    name.includes('senior') ||
    name.includes('shs')
  ) {
    return 'SHS';
  }
  if (
    sid === 'e2415838-06be-4e80-aa7a-9f4d3b47a8a5' ||
    cat === 'college' ||
    slug.includes('college') ||
    name.includes('college')
  ) {
    return 'COLLEGE';
  }
  return '';
}

export default function StudioBookingBreakdownHub({ bookings = [] }) {
  const [hoveredTypeKey, setHoveredTypeKey] = useState(null);

  const activeBookings = useMemo(() => {
    return (bookings || []).filter((b) => {
      if (!b || b.is_deleted) return false;
      const st = String(b.status || '').toUpperCase();
      return st !== 'CANCELLED' && st !== 'REJECTED';
    });
  }, [bookings]);

  /* ── 1. Package Sets: Senior High (Set A-D) & College (Set A-B) ─────────── */
  const { setBars, totalSetOrders } = useMemo(() => {
    const template = [
      { key: 'SHS_A', shortLabel: 'SHS A', groupLabel: 'Senior High Package', setLabel: 'Set A', group: 'SHS', set: 'Set A', count: 0, color: PALETTE.gold },
      { key: 'SHS_B', shortLabel: 'SHS B', groupLabel: 'Senior High Package', setLabel: 'Set B', group: 'SHS', set: 'Set B', count: 0, color: PALETTE.gold },
      { key: 'SHS_C', shortLabel: 'SHS C', groupLabel: 'Senior High Package', setLabel: 'Set C', group: 'SHS', set: 'Set C', count: 0, color: PALETTE.gold },
      { key: 'SHS_D', shortLabel: 'SHS D', groupLabel: 'Senior High Package', setLabel: 'Set D', group: 'SHS', set: 'Set D', count: 0, color: PALETTE.gold },
      { key: 'COL_A', shortLabel: 'Col A', groupLabel: 'College Package', setLabel: 'Set A', group: 'COLLEGE', set: 'Set A', count: 0, color: PALETTE.teal },
      { key: 'COL_B', shortLabel: 'Col B', groupLabel: 'College Package', setLabel: 'Set B', group: 'COLLEGE', set: 'Set B', count: 0, color: PALETTE.teal },
    ];

    let total = 0;
    for (const b of activeBookings) {
      const grp = classifyAcademicGroup(b);
      const setName = normalizeSetKey(b.tier_name);
      if (!grp || !setName) continue;
      const match = template.find((t) => t.group === grp && t.set === setName);
      if (match) {
        match.count += 1;
        total += 1;
      }
    }

    return { setBars: template, totalSetOrders: total };
  }, [activeBookings]);

  /* ── 2. Order Types: Myself, Others, Sections ───────────────────────────── */
  const orderTypeData = useMemo(() => {
    let myselfCount = 0;
    let othersCount = 0;
    let sectionsCount = 0;

    for (const b of activeBookings) {
      const t = classifyOrderType(b);
      if (t === 'SECTIONS') sectionsCount += 1;
      else if (t === 'OTHERS') othersCount += 1;
      else myselfCount += 1;
    }

    const total = myselfCount + othersCount + sectionsCount;
    const cards = [
      {
        key: 'MYSELF',
        label: 'Myself',
        count: myselfCount,
        color: PALETTE.gold,
        pct: total > 0 ? (myselfCount / total) * 100 : 0,
      },
      {
        key: 'OTHERS',
        label: 'Others',
        count: othersCount,
        color: PALETTE.amber,
        pct: total > 0 ? (othersCount / total) * 100 : 0,
      },
      {
        key: 'SECTIONS',
        label: 'Sections',
        count: sectionsCount,
        color: PALETTE.teal,
        pct: total > 0 ? (sectionsCount / total) * 100 : 0,
      },
    ];

    // Give zero-count slices a minimal visual sliver so all 3 order-type segments remain visible on the donut
    // while tooltips, center total, and cards continue displaying exact true counts and percentages.
    const minSliver = total > 0 ? Math.max(0.06, total * 0.04) : 1;
    const donutSlices = cards.map((c) => ({
      ...c,
      chartValue: c.count > 0 ? c.count : minSliver,
    }));

    return {
      total,
      cards,
      donutSlices,
    };
  }, [activeBookings]);

  /* ── 3. Schools Breakdown (Across Any Order Type) ───────────────────────── */
  const { schoolBars, totalSchoolOrders } = useMemo(() => {
    const counts = new Map();
    let total = 0;

    for (const b of activeBookings) {
      const name = extractBookingSchoolName(b);
      if (!name) continue;
      const key = name.toLowerCase();
      const prev = counts.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        counts.set(key, {
          fullName: name,
          shortName: name.length > 22 ? `${name.slice(0, 20).trim()}…` : name,
          count: 1,
        });
      }
      total += 1;
    }

    const list = Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.fullName.localeCompare(b.fullName))
      .slice(0, 8);

    return { schoolBars: list, totalSchoolOrders: total };
  }, [activeBookings]);

  return (
    <section className="relative rounded-3xl border border-[#c9a96e]/35 bg-white shadow-xs overflow-hidden font-body ring-1 ring-[#c9a96e]/15">
      {/* Studio Signature Gold Top Accent Line */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-[#c9a96e] to-amber-600" />

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200/80 items-stretch bg-white">
        {/* ── 1. PACKAGE SETS SELECTED (Senior High A–D & College A–B) ── */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
                <Layers size={17} />
              </span>
              <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Package Sets Selected
              </h3>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#c9a96e]" />
                SHS
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#0d9488]" />
                College
              </span>
            </div>
          </div>

          {totalSetOrders === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyChartState text="No package set selections recorded yet." icon={Layers} />
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[270px] sm:min-h-[290px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setBars} margin={{ top: 14, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1ede4" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
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
                  <Tooltip content={<CustomSetsTooltip />} />
                  <Bar
                    dataKey="count"
                    minPointSize={8}
                    background={{ fill: '#f4efe6', radius: [6, 6, 0, 0] }}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  >
                    {setBars.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={entry.color}
                        fillOpacity={entry.count > 0 ? 1 : 0.35}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── 2. ORDER TYPES (Myself, Others, Sections) ── */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full bg-gradient-to-br from-[#faf7f2]/40 via-white to-amber-50/15">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
                <Users size={17} />
              </span>
              <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Booking Order Types
              </h3>
            </div>
          </div>

          {orderTypeData.total === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyChartState text="No bookings yet." icon={Users} />
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 items-center pt-4 min-h-[270px] sm:min-h-[290px]">
              {/* Left: Donut Chart */}
              <div className="xl:col-span-5 min-w-0 relative flex items-center justify-center w-full h-[180px] sm:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <Tooltip
                      content={<CustomOrderTypeTooltip totalOrders={orderTypeData.total} />}
                      wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                    />
                    <Pie
                      data={orderTypeData.donutSlices}
                      dataKey="chartValue"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="64%"
                      outerRadius="90%"
                      paddingAngle={4}
                      cornerRadius={6}
                      strokeWidth={0}
                      onMouseEnter={(_, idx) => {
                        const slice = orderTypeData.donutSlices[idx];
                        if (slice) setHoveredTypeKey(slice.key);
                      }}
                      onMouseLeave={() => setHoveredTypeKey(null)}
                    >
                      {orderTypeData.donutSlices.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          fillOpacity={
                            hoveredTypeKey && hoveredTypeKey !== entry.key
                              ? 0.25
                              : entry.count > 0
                                ? 1
                                : 0.4
                          }
                          className="transition-all duration-200 outline-none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                  <span className="font-heading text-2xl sm:text-3xl font-extrabold text-neutral-950 leading-none">
                    {orderTypeData.total}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">
                    {orderTypeData.total === 1 ? 'Order' : 'Orders'}
                  </span>
                </div>
              </div>

              {/* Right: Breakdown Rows matching Collections */}
              <div className="xl:col-span-7 flex flex-col gap-2.5 justify-center">
                {orderTypeData.cards.map((item) => (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredTypeKey(item.key)}
                    onMouseLeave={() => setHoveredTypeKey(null)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 ${
                      hoveredTypeKey === item.key
                        ? 'border-amber-300 bg-amber-50/70 shadow-xs'
                        : 'border-neutral-200/80 bg-white'
                    }`}
                  >
                    <IndividualMiniRing percentage={item.pct} color={item.color} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                          {item.label}
                        </span>
                        <span className="font-heading text-sm font-extrabold text-neutral-950 tabular-nums">
                          {item.count}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-neutral-500 tabular-nums">
                        {Math.round(item.pct)}% of bookings
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 3. SCHOOLS WHO BOOKED (Across Any Order Type) ── */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-400/20 to-amber-500/5 text-amber-700 shadow-2xs">
                <GraduationCap size={17} />
              </span>
              <h3 className="font-heading text-sm sm:text-base font-bold text-neutral-900 leading-tight">
                Bookings by School
              </h3>
            </div>
          </div>

          {totalSchoolOrders === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyChartState text="No school affiliations recorded yet." icon={GraduationCap} />
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[270px] sm:min-h-[290px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={schoolBars}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="school-bar-gold" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#c9a96e" />
                      <stop offset="100%" stopColor="#b45309" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1ede4" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    domain={[0, (dataMax) => Math.max(dataMax + 1, 3)]}
                    tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                    axisLine={{ stroke: '#e7e5e4' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={126}
                    tick={{ fontSize: 10, fill: '#44403c', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomSchoolTooltip />} />
                  <Bar
                    dataKey="count"
                    minPointSize={8}
                    background={{ fill: '#f4efe6', radius: [0, 6, 6, 0] }}
                    fill="url(#school-bar-gold)"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

StudioBookingBreakdownHub.propTypes = {
  bookings: PropTypes.array,
};
