---
name: studio-intelligence-dashboard-refactor
description: Refactor the e-Kodak Studio Intelligence dashboard into a clean, responsive, cohesive, data-accurate interface. Use when improving dashboard layout, KPI cards, charts, analytics, responsive behavior, or duplicated dashboard content.
---

# Studio Intelligence Dashboard Refactoring Skill

## Mission

Refactor the existing Studio Intelligence dashboard into a polished, cohesive, responsive dashboard. Treat the supplied screenshots as the visual reference for the current state and the source of issues to investigate—not as a requirement to preserve the current layout.

Improve the interface and chart implementation together. Do not make a superficial styling-only pass. Audit the existing UI, data flow, calculations, and chart components before editing.

## Non-negotiable constraints

- Preserve existing business rules, routes, permissions, database schema, and working features unless a change is explicitly required to fix a verified defect.
- Do not replace live application data with hardcoded demo values.
- Do not invent bookings, revenue, dates, statuses, or activity records.
- Do not create a second source of truth for a metric that is already available from the backend or a shared selector.
- Reuse the project's existing framework, charting library, design tokens, components, and coding conventions where practical. Do not introduce a new library without a clear need.
- Keep the existing dashboard's useful information and interactions, but remove repetition and make each section serve a distinct purpose.
- Do not silently alter financial definitions. Confirm whether revenue means booked value, collected amount, or another existing business definition before changing calculations or labels.
- Keep all actions functional: range filters, revenue/bookings toggles, comparison controls, chart-point inspection, clickable service/status filters, calendar links, and “view all” links must work as shown or be clearly disabled when unsupported.
- Never claim a visual or functional fix is complete without running available checks and inspecting the resulting UI.

## Phase 1 — Audit before editing

1. Locate the dashboard page, child components, styles, chart components, data hooks/selectors, API calls, and relevant tests.
2. Trace the source of every displayed number and graph series back to its source.
3. Identify duplicated calculations, repeated UI components, inconsistent date filtering, fake/placeholder data, missing-data handling, and conflicting labels.
4. Inspect the existing package dependencies and use the installed charting library.
5. Write a short implementation plan based on actual code findings. Then implement it; do not stop after producing a plan.

## Phase 2 — Establish dashboard information hierarchy

Use a consistent responsive grid and clear reading order:

1. **Page header:** “Studio Intelligence” eyebrow, concise page title, and a compact live-data/freshness indicator. Avoid excessive header height.
2. **Primary analytics:** revenue/booking trajectory as the main chart; service demand as a secondary panel on wide screens.
3. **Operational summaries:** weekly booking volume, booking status breakdown, and collections health.
4. **Operations:** upcoming sessions and recent activity, with distinct empty/loading/error states.

Use the current project’s spacing and typography conventions. Maintain a refined editorial feel: warm neutral page background, white or subtly tinted cards, restrained orange accent for revenue, blue for booking/status series, and green for successful collections. Colors must have consistent meanings across the entire dashboard and remain readable in light/dark themes if the app supports both.

### Layout requirements

- Use a consistent spacing scale, border radius, border treatment, card padding, icon sizing, and heading hierarchy.
- Avoid unnecessary nested cards, excessive borders, decorative gradients, and large empty regions.
- Align card headers, subtitles, badges, and content baselines.
- Make the primary chart visually dominant without causing other cards to become too narrow.
- Use CSS Grid/Flexbox and the project's breakpoint conventions rather than fixed screenshot-specific widths.
- Desktop: use a balanced multi-column layout with the primary analytics chart receiving the most space.
- Tablet: reduce columns intentionally; keep chart labels legible.
- Mobile: stack sections in a sensible order, wrap controls, reduce chart tick density, and prevent page-level horizontal scrolling.
- Use `min-width: 0` on grid/flex children containing charts and long text when needed.
- Respect reduced-motion preferences and existing accessibility conventions.

## Phase 3 — KPI cards and metric definitions

Audit the KPI row and make each metric immediately scannable. Prioritize the number over the label, while retaining a clear label, unit/currency, and concise contextual comparison or caption.

Potential metrics shown in the current UI:
- Revenue / booked value
- Collected
- Outstanding / receivables
- Average order value

Before displaying these together, verify their definitions and avoid double-counting. Use a single shared formatting function for Philippine peso amounts, with consistent decimal and abbreviation rules. Do not mix values such as `₱1,750`, `₱1.8k`, and `₱875` without an intentional formatting rule.

Do not repeat the same total in multiple places unless the second presentation serves a distinct analytical purpose. If a KPI is also shown in a chart or collection summary, the labels and visual context must make the relationship clear.

## Phase 4 — Graph and data cleanup

### Shared chart-data rules

- Derive chart series from the same validated, filtered data source used by the relevant metrics.
- Centralize date parsing, timezone handling, date-range filtering, currency formatting, aggregation, and status mapping in reusable selectors/utilities.
- Normalize timestamps consistently. Do not mix local dates and UTC dates in a way that shifts bookings to the wrong day.
- Sort chronological data ascending before plotting.
- Use stable date keys and explicit aggregation intervals.
- Distinguish missing data from a genuine zero. Only fill missing intervals with zero when the metric's semantics justify it.
- Never connect unrelated records into a misleading continuous line.
- Avoid smoothing a line in a way that implies values on dates with no records. Use a straight line or discrete points where appropriate.
- Keep chart totals reconcilable with KPI totals for the same filters and period.
- Use one consistent definition of “booking,” “order,” “revenue,” “collected,” “outstanding,” and each workflow status.
- Avoid duplicate series, duplicate legend entries, repeated dates, duplicate event aggregation, and counting one booking more than once.
- Do not display fabricated trend lines, averages, or forecasts. If an average is displayed, calculate it from a clearly defined period and show that period.
- Use responsive chart containers and resize-aware rendering supported by the installed library.
- Add meaningful tooltips with date/period, series name, value, and units. Provide keyboard/focus access where the library supports it.
- Keep legends concise. Hide redundant legends when the chart controls or labels already identify the series.
- Include accessible labels or a text summary for key chart values when feasible.

### Revenue & Booking Trajectory

- Ensure the range controls (7D, 30D, 90D, All) update both the chart and its supporting summary consistently.
- Make Revenue and Bookings toggles change the actual series and its units, not just the selected button styling.
- Make Compare either perform a real, clearly labeled period comparison or remain visibly disabled with a reason if comparison is not implemented.
- Align the X-axis with the selected interval. Use sensible tick density and localized date labels.
- Format currency values consistently on the Y-axis. Do not use currency ticks on booking-count charts.
- Make each point inspectable if that interaction is offered; inspection must use the same filtered dataset as the chart.
- Do not show a continuous zero line with a disconnected area fill that visually suggests revenue existed between isolated booking dates.
- If revenue is event-based, choose a chart type and aggregation that honestly represents event-based values (for example, daily bars, discrete points, or a line with gaps). Select based on the data, not decoration.
- Ensure the current date range, number of included bookings, and selected metric are truthful.

### Weekly Volume

- Use a consistent 8-week window if the subtitle says “8-week booking intake.”
- Aggregate bookings by week using one documented week-start convention.
- Fix repeated or ambiguous axis labels; include month/day labels where needed and prevent labels from colliding.
- Calculate the average from the same displayed weeks and clarify whether empty weeks count as zero.
- Do not show star markers or “peak week” annotations unless their meaning is defined and they are computed from actual data.
- Keep the total booked value separate from booking count unless the chart explicitly visualizes both with a clear legend and units.

### Status Breakdown

- Derive counts and percentages from the same filtered booking set.
- Include all relevant statuses, including completed, cancelled, or other states where appropriate to the real workflow. Do not silently omit statuses.
- Percentages must sum to approximately 100% when categories are mutually exclusive and exhaustive; handle a zero-total state without division errors.
- Use a compact, legible horizontal bar or segmented distribution. Avoid large blank status cards that make the chart look broken.
- Status selection should filter the queue only if that behavior is actually supported.

### Service Demand

- Group orders by the correct service/package category using actual booking records.
- Ensure order counts and percentages use the same denominator.
- Keep booked value clearly distinguished from revenue collected.
- Handle ties and multiple categories; do not imply one category represents 100% if other categories exist.
- Clicking a category should filter the queue only if the filter is implemented and the active filter should be clear and removable.

### Collections

- Calculate collected, outstanding, and collection rate from validated payment records or the authoritative booking/payment fields.
- Ensure collected plus outstanding reconciles with the applicable amount due; account for partial payments, cancelled bookings, refunds, and overpayments according to existing business rules.
- Do not assume a downpayment equals the full collected amount unless that matches the payment model.
- Paid, partial, and unpaid counts must be mutually exclusive and use the same population as the displayed total.
- Label percentages and amounts unambiguously. Avoid showing the same percentage in several places without adding new meaning.
- Handle zero amounts and missing payment data safely.

## Phase 5 — Upcoming Sessions and Recent Activity

### Upcoming Sessions

- Use a clear empty state when no sessions are scheduled, with a direct action to the calendar/scheduling workflow if that route exists.
- If active bookings remain unscheduled, communicate that fact without implying the bookings themselves are missing.
- Render real session dates and times with a consistent timezone and readable date format.
- Keep the header action and count synchronized with the displayed list.

### Recent Activity

- Render the actual activity feed in a consistent timeline.
- Avoid duplicate events caused by repeated fetches, duplicated records, or unstable React keys.
- Show a meaningful event title, concise description, and relative timestamp; provide an absolute timestamp on hover or in details when supported.
- Use pagination or “View all” for older activity instead of allowing an unbounded list to dominate the dashboard.
- Distinguish system preference saves from booking actions using appropriate icons and labels.
- Do not delete legitimate repeated events merely because their text is identical; deduplicate only when a stable event ID or verified duplicate rule confirms duplication.

## Phase 6 — States, accessibility, and polish

Implement or preserve explicit loading, empty, error, and stale-data states. Avoid blank chart canvases, unexplained empty panels, layout jumps, and indefinitely spinning skeletons.

- Use semantic headings and buttons.
- Ensure keyboard focus is visible.
- Give icon-only controls accessible names.
- Maintain sufficient contrast for muted text, borders, chart series, and badges.
- Do not use color as the only means of communicating status.
- Keep animations subtle and nonessential; support reduced motion.
- Use skeletons that match the final component dimensions.
- Prevent layout shift while charts load.
- Check that floating assistant/help controls do not cover key chart controls or card content.

## Phase 7 — Implementation quality

- Extract repeated chart-card headers, metric formatting, date-range controls, and empty states into shared components where this reduces complexity.
- Keep data transformation separate from rendering.
- Prefer small, typed, testable selectors and utility functions over duplicated inline calculations.
- Remove dead code and unused styles only when safe.
- Do not refactor unrelated pages or rewrite the application architecture as part of this task.
- Keep changes scoped and consistent with existing conventions.

## Verification checklist

Before finishing:

- [ ] Dashboard builds without errors.
- [ ] Existing tests pass; add or update tests for any corrected aggregation or financial calculation.
- [ ] Revenue, collected, outstanding, average order value, service demand, status counts, and weekly volume reconcile with source data.
- [ ] 7D, 30D, 90D, All, Revenue/Bookings, and Compare controls behave correctly.
- [ ] Dates are ordered correctly and do not shift due to timezone conversion.
- [ ] Missing dates, zero records, partial payments, and empty states do not break charts.
- [ ] No duplicate series, legend entries, aggregation, or UI summaries remain without a clear reason.
- [ ] Chart labels, tooltips, currency units, and percentages are accurate.
- [ ] Upcoming Sessions and Recent Activity show correct empty/loading/error states.
- [ ] Layout is checked at approximately 1440px, 1024px, 768px, and 390px widths.
- [ ] No horizontal page overflow, clipped controls, overlapping cards, or unreadable chart labels.
- [ ] Keyboard navigation and contrast are acceptable.
- [ ] Existing routes, filters, links, permissions, and business behavior remain intact.

## Required final report from the coding agent

Summarize:
1. The files/components changed.
2. The graph/data defects discovered and how each was corrected.
3. The duplicated UI/data removed and why it was safe to remove.
4. Responsive and accessibility improvements.
5. Commands/tests run and their actual outcomes.
6. Any remaining limitation or behavior that could not be verified.

Do not claim tests, browser checks, or visual verification were performed unless they actually were.
