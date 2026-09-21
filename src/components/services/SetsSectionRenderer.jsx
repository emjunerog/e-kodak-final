/**
 * SetsSectionRenderer.jsx
 * =======================
 * Renders ALL service packages (any tier count) as:
 *  1. Individual tier cards — each Set/Tier as its own standalone section
 *     with its full inclusions list
 *  2. "At a Glance" comparison table — after all tier cards
 *
 * Works for 2, 3, or 4 tiers:
 *  - 2 tiers → themes [1, 3]   e.g. College Set A/B, Couple Classic/Cinematic
 *  - 3 tiers → themes [0, 2, 3] e.g. Portrait Basic/Standard/Premium
 *  - 4 tiers → themes [0, 1, 2, 3] e.g. Studio & Toga Set D/C/B/A
 *
 * Rendered OUTSIDE and BELOW the parent PackageCard overview.
 */

import { Link } from "react-router-dom";
import { Check, ArrowRight, X } from "lucide-react";
import { siteConfig } from "../../config/siteConfig";
import { SET_THEMES } from "./PackageCard";

// ── Theme index mapping by tier count and position ────────────────────────────
function getThemeIndex(position, totalCount) {
  const maps = {
    1: [3],
    2: [1, 3],
    3: [0, 2, 3],
    4: [0, 1, 2, 3],
  };
  const map = maps[Math.min(totalCount, 4)] || maps[4];
  return map[Math.min(position, map.length - 1)];
}

// ── Individual Tier/Set Card ──────────────────────────────────────────────────
function TierSectionCard({ tier, themeIndex, serviceName, serviceSlug }) {
  const theme = SET_THEMES[themeIndex] || SET_THEMES[0];
  const ThemeIcon = theme.icon;

  return (
    <article
      className={`rounded-2xl border-2 overflow-hidden shadow-warm-sm hover:shadow-warm-lg transition-all duration-300 hover:-translate-y-0.5 ${
        tier.popular ? "border-gold shadow-gold" : theme.border
      }`}
      aria-label={`${serviceName} — ${tier.name}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`${theme.header} px-6 py-5`}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: badges + tier name */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider ${theme.labelBg}`}>
                <ThemeIcon size={10} />
                {theme.label}
              </span>
              {tier.popular && (
                <span className="px-2.5 py-1 rounded-full bg-gold text-primary text-[10px] font-bold uppercase tracking-wider">
                  ⭐ Most Popular
                </span>
              )}
            </div>
            <h4 className={`font-heading text-4xl font-bold ${theme.headerAccent}`}>
              {tier.name}
            </h4>
            {tier.duration && (
              <p className="text-white/55 font-body text-xs mt-1">{tier.duration}</p>
            )}
          </div>

          {/* Right: price + edited */}
          <div className="text-right shrink-0">
            <p className="text-white/50 font-body text-[10px] uppercase tracking-wider mb-1">
              Package Price
            </p>
            <p className={`font-heading text-4xl font-bold leading-none ${theme.headerAccent}`}>
              {tier.price}
            </p>
            {tier.edited && (
              <p className="text-white/45 font-body text-[11px] mt-1.5">{tier.edited}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Inclusions ─────────────────────────────────────────────────────── */}
      <div className="bg-white px-6 py-6">
        <p className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-4">
          What's included
        </p>

        {tier.highlights && tier.highlights.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {tier.highlights.map((h) => (
              <li key={h} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${theme.checkBg}`}>
                  <Check size={11} className={theme.checkColor} strokeWidth={2.5} />
                </span>
                <span className="font-body text-neutral-700 text-sm leading-snug">{h}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-body text-neutral-400 text-sm italic">No inclusions listed.</p>
        )}

        {/* Book CTA */}
        <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="font-body text-neutral-400 text-xs">50% down payment required to book</p>
          <Link
            to={`/dashboard/book?service=${serviceSlug}&tier=${encodeURIComponent(tier.name)}`}
            className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-body font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap ${theme.ctaBg}`}
            aria-label={`Book ${tier.name} — ${serviceName}`}
          >
            Book {tier.name}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── At-a-Glance Comparison Table ─────────────────────────────────────────────
function GlanceTable({ tiers, serviceName }) {
  // Sort cheapest → most expensive
  const sorted = [...tiers].sort((a, b) => {
    const av = parseFloat(a.price?.replace(/[₱,]/g, "") || "9999");
    const bv = parseFloat(b.price?.replace(/[₱,]/g, "") || "9999");
    return av - bv;
  });

  // ── Build smart comparison rows ───────────────────────────────────────────
  // Collect all unique highlights across tiers
  const allHighlights = [];
  tiers.forEach(tier => {
    (tier.highlights || []).forEach(h => {
      if (!allHighlights.includes(h)) allHighlights.push(h);
    });
  });

  // Differentiating rows: highlights NOT present in ALL tiers (so they show real differences)
  const differentiating = allHighlights.filter(h => {
    const count = tiers.filter(t => (t.highlights || []).includes(h)).length;
    return count < tiers.length && count > 0;
  });

  // Fall back to all highlights if every highlight is unique to one tier
  const comparisonRows = differentiating.length >= 3
    ? differentiating.slice(0, 10)
    : allHighlights.slice(0, 10);

  // Always-first rows: price and session type
  const headerRows = [
    {
      label: "Price",
      get: (t) => t.price,
      render: (val) => <span className="font-heading text-primary font-bold text-sm">{val}</span>,
    },
    ...(sorted.some(t => t.edited)
      ? [{
          label: "Deliverables",
          get: (t) => t.edited || "—",
          render: (val) => <span className="font-body text-neutral-700 text-xs font-semibold">{val}</span>,
        }]
      : []),
    ...(sorted.some(t => t.duration)
      ? [{
          label: "Session",
          get: (t) => t.duration || "—",
          render: (val) => <span className="font-body text-neutral-600 text-xs">{val}</span>,
        }]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-warm-sm bg-white">
      {/* Header */}
      <div className="bg-neutral-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-body text-white/40 text-[10px] uppercase tracking-widest">Quick Reference</p>
          <h4 className="font-heading text-white text-lg font-semibold">
            At a Glance — Compare All {serviceName} Options
          </h4>
        </div>
        <span className="hidden sm:block font-body text-white/30 text-xs">← Scroll if needed →</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: `${Math.max(480, sorted.length * 130 + 180)}px` }}>
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="py-3.5 px-5 text-left font-body text-[10px] uppercase tracking-widest text-neutral-400 font-bold w-[35%]">
                Feature
              </th>
              {sorted.map((tier, i) => {
                const theme = SET_THEMES[getThemeIndex(i, sorted.length)] || SET_THEMES[0];
                return (
                  <th key={tier.name} className="py-3.5 px-3 text-center align-bottom">
                    <div className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold text-white ${theme.header}`}>
                      {tier.name}
                    </div>
                    <div className="font-heading text-primary text-base font-bold mt-1">{tier.price}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Static header rows (price already shown in column headers, skip price row) */}
            {headerRows.filter(r => r.label !== "Price").map((row, rowIdx) => (
              <tr key={row.label} className={`border-b border-neutral-50 ${rowIdx % 2 === 0 ? "bg-neutral-50/50" : "bg-white"}`}>
                <td className="py-3 px-5 font-body text-neutral-600 text-xs font-semibold">{row.label}</td>
                {sorted.map(tier => (
                  <td key={tier.name} className="py-3 px-3 text-center">
                    {row.render(row.get(tier))}
                  </td>
                ))}
              </tr>
            ))}

            {/* Feature comparison rows */}
            {comparisonRows.map((h, rowIdx) => {
              const baseIdx = headerRows.filter(r => r.label !== "Price").length;
              const isEven = (baseIdx + rowIdx) % 2 === 0;
              return (
                <tr key={h} className={`border-b border-neutral-50 ${isEven ? "bg-neutral-50/50" : "bg-white"}`}>
                  <td className="py-3 px-5 font-body text-neutral-600 text-xs font-medium leading-snug">
                    {h}
                  </td>
                  {sorted.map(tier => {
                    const has = (tier.highlights || []).includes(h);
                    return (
                      <td key={tier.name} className="py-3 px-3 text-center">
                        {has ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 mx-auto">
                            <Check size={12} className="text-emerald-600" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 mx-auto">
                            <X size={10} className="text-neutral-300" strokeWidth={2.5} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Book CTA row */}
            <tr className="bg-neutral-50 border-t-2 border-neutral-200">
              <td className="py-4 px-5 font-body text-neutral-400 text-xs italic">
                Ready to book?
              </td>
              {sorted.map((tier, i) => {
                const theme = SET_THEMES[getThemeIndex(i, sorted.length)] || SET_THEMES[0];
                return (
                  <td key={tier.name} className="py-4 px-3 text-center">
                    <Link
                      to={siteConfig.routes.register}
                      className={`inline-block w-full py-2 px-1 rounded-lg text-xs font-body font-bold text-white transition-all duration-200 active:scale-95 ${
                        tier.popular
                          ? "bg-gold text-primary hover:bg-gold-dark"
                          : theme.header + " hover:opacity-90"
                      }`}
                    >
                      Book {tier.name}
                    </Link>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function SetsSectionRenderer({ service }) {
  const tiers = service.tiers || [];
  if (tiers.length === 0) return null;

  // Sort cheapest → most expensive
  const sorted = [...tiers].sort((a, b) => {
    const av = parseFloat(a.price?.replace(/[₱,]/g, "") || "9999");
    const bv = parseFloat(b.price?.replace(/[₱,]/g, "") || "9999");
    return av - bv;
  });

  // Grid: 2 cols for 3–4 tiers, single col for 1–2 tiers
  const gridClass = sorted.length >= 3 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1";

  return (
    <div className="space-y-5">
      {/* Section label */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-gold rounded-full shrink-0" />
        <div>
          <p className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            {service.name}
          </p>
          <h3 className="font-heading text-primary text-xl font-semibold leading-snug">
            {sorted.length <= 2 ? "Choose Your Package" : "All Available Sets"}
          </h3>
        </div>
      </div>

      {/* Individual tier/set cards */}
      <div className={`grid ${gridClass} gap-5`}>
        {sorted.map((tier, i) => (
          <TierSectionCard
            key={tier.name}
            tier={tier}
            themeIndex={getThemeIndex(i, sorted.length)}
            serviceName={service.name}
            serviceSlug={service.slug}
          />
        ))}
      </div>

      {/* At-a-glance comparison table */}
      <GlanceTable tiers={tiers} serviceName={service.name} />
    </div>
  );
}
