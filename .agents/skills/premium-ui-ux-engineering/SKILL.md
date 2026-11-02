---
name: premium-ui-ux-engineering
description: Improve existing web application interfaces to feel premium, clean, cohesive, responsive, accessible, and genuinely functional. Use when redesigning pages, components, navigation, forms, tables, modals, dashboards, or overall product UI.
---

# Premium UI/UX Engineering Skill

## Mission

Transform the existing application into a polished, premium-quality product interface without sacrificing usability, performance, accessibility, or existing functionality.

A premium UI is not simply a page with gradients, shadows, animations, or fashionable colors. It feels intentional: clear hierarchy, consistent spacing, precise typography, useful feedback, predictable interactions, and layouts that adapt naturally to the user's device and task.

Inspect the real application first, then implement improvements directly in the codebase.

## Core principles

1. **Understand before redesigning.** Inspect the existing framework, component system, styles, routes, data sources, and interaction behavior before making changes.
2. **Preserve the product.** Keep established business rules, permissions, API contracts, routes, and data relationships intact unless the requested change requires a verified correction.
3. **Design with purpose.** Every visual element must improve hierarchy, comprehension, navigation, feedback, or task completion.
4. **Function before decoration.** Every visible control must perform its stated action, provide a clear disabled state, or be identified as non-interactive.
5. **Consistency over isolated beauty.** Apply shared design decisions across the full target area rather than polishing one component while leaving neighboring components inconsistent.
6. **Use real data.** Do not replace live data with invented examples or make a control appear functional when it is not connected to application behavior.
7. **Responsive by design.** Do not treat mobile responsiveness as a final patch to a desktop-only layout.
8. **Verify the result.** Run available checks and inspect the rendered UI where tooling permits. Report only work that was actually completed and verified.

## Phase 1 — Discover the existing product

Before editing:

- Identify the framework, build tools, routing, CSS strategy, UI component library, icon library, and existing design tokens.
- Inspect the target page and nearby pages that share navigation, cards, forms, tables, modals, or controls.
- Trace each visible control to its event handler, route, API call, or state update.
- Identify layout inconsistencies, duplicated components, conflicting styles, overflow, accessibility gaps, dead controls, unclear labels, and unnecessary visual noise.
- Check the existing light/dark theme support and preserve it if present.
- Review existing dependencies before adding new ones.
- Determine which changes are safe within the user's requested scope.

Then create a brief, prioritized plan and proceed with implementation. Do not stop at a list of recommendations.

## Phase 2 — Define a coherent design system

Use the existing system if one already exists. Otherwise, introduce a small, maintainable set of shared design tokens instead of styling each component independently.

### Visual language

Aim for an understated, high-quality product aesthetic:

- Strong typography hierarchy with readable body text and deliberate heading sizes.
- Restrained color palette with one primary accent and purposeful semantic colors.
- Consistent surfaces, borders, radii, spacing, icon sizes, and focus states.
- Clear separation between page background, primary surfaces, overlays, and interactive elements.
- Subtle depth only where it communicates elevation or grouping.
- Thoughtful use of whitespace; avoid both cramped content and excessively empty cards.
- Consistent alignment and optical balance across sections.
- Meaningful icons from the project's existing icon set; avoid emoji as a substitute for interface icons.
- Realistic text lengths and resilient layouts for long names, large values, and empty states.

### Tokens and consistency

- Centralize recurring colors, spacing, typography, radii, shadows, and transitions using the project's established token method or CSS custom properties.
- Reuse shared components for repeated patterns such as page headers, section headers, buttons, fields, badges, dialogs, tabs, and empty states.
- Keep component variants explicit and limited; avoid a different style for every instance.
- Use a consistent spacing scale rather than arbitrary values everywhere.
- Use semantic color names such as `surface`, `text-muted`, `border-subtle`, `primary`, `success`, `warning`, and `danger` when compatible with the project.
- Maintain contrast in every supported theme. Never rely on a pale color alone to communicate important information.

Do not add a design system framework or large dependency solely to achieve a visual refresh when existing tools are sufficient.

## Phase 3 — Fix information architecture and hierarchy

For each page:

1. Identify the user's primary task.
2. Make the page title and main action immediately understandable.
3. Group related information together.
4. Put the most important content first.
5. Make secondary actions visually quieter without making them difficult to find.
6. Remove redundant labels, repeated summaries, decorative elements with no purpose, and unnecessary nested containers.
7. Use consistent page gutters and content widths.
8. Ensure the layout remains balanced when content grows or is missing.

Avoid a dashboard-card aesthetic on every page. Use the most suitable structure for the content: tables for comparison, forms for data entry, timelines for activity, compact lists for repeated items, and cards for genuinely independent summaries.

## Phase 4 — Make every interaction functional

Audit all visible interactive elements, including:

- Buttons and icon-only buttons
- Navigation items and breadcrumbs
- Search fields and filters
- Sorting, pagination, tabs, and segmented controls
- Forms, validation, dropdowns, and date pickers
- Modals, drawers, popovers, and confirmation dialogs
- Tables, row actions, bulk selection, and contextual menus
- Uploads, previews, and file actions
- Toasts, alerts, loading indicators, and retry controls

For each control:

- Connect it to the correct state transition, route, or backend operation.
- Ensure the label accurately describes the action.
- Provide visible hover, focus, active, selected, loading, success, error, and disabled states where relevant.
- Prevent duplicate submissions while an operation is in progress.
- Preserve user input when validation fails.
- Show useful, actionable error messages without exposing secrets or internal stack traces.
- Ask for confirmation before destructive or irreversible actions.
- Close dialogs and restore focus appropriately after completion or cancellation.
- Make dismissible messages actually dismissible.
- Do not add fake success messages, placeholder links, or inert controls.
- Do not simulate backend persistence with local-only state when the feature is expected to persist data.
- If backend support is absent, state the limitation and do not imply the operation succeeded.

## Phase 5 — Refine forms, tables, cards, and overlays

### Forms

- Use persistent labels, appropriate input types, clear required/optional cues, and concise helper text.
- Group fields by task and use a logical tab order.
- Validate near the relevant field and summarize errors when useful.
- Preserve values on errors and make submission status clear.
- Avoid overly wide forms; use appropriate max-widths for the task.
- Ensure inputs, selects, date pickers, and buttons are comfortable to use on touchscreens.

### Tables and lists

- Make column hierarchy clear and align values consistently.
- Keep actions discoverable without cluttering every row.
- Support loading, empty, error, and long-content states.
- Use horizontal scrolling only when appropriate; on small screens, use a deliberate compact table or a well-designed alternative.
- Preserve meaningful sorting, filtering, pagination, and selection behavior.
- Avoid showing the same information in multiple columns or badges without a clear reason.

### Cards and summaries

- Give each card a distinct purpose and a clear title.
- Align card padding, headers, content, and footers.
- Keep primary values visually prominent when they matter.
- Avoid excessive borders, nested cards, oversized empty areas, and decorative gradients.
- Ensure cards remain useful at narrow widths and when text wraps.

### Modals and drawers

- Use concise titles and clear primary/secondary actions.
- Keep dialog content focused on one task.
- Ensure dialogs fit within the viewport and support internal scrolling where needed.
- Support Escape and appropriate focus behavior.
- Prevent background interaction when a modal requires exclusive attention.
- Make destructive actions visually distinct and provide confirmation when appropriate.

## Phase 6 — Responsive layout

Test the actual interface at representative widths, including approximately 1440px, 1024px, 768px, and 390px.

- Prefer fluid grids, flexible sizing, and content-driven breakpoints.
- Avoid fixed widths and heights that break when text, localization, or data changes.
- Use `min-width: 0` for flex/grid children where overflow is possible.
- Wrap or reorganize controls when horizontal space is insufficient.
- Keep touch targets comfortably sized, aiming for approximately 44 × 44 CSS pixels where practical.
- Avoid horizontal page overflow, overlapping sticky elements, clipped menus, and obscured primary actions.
- Reduce chart tick density and adapt data tables when necessary.
- Keep the primary action accessible without forcing excessive scrolling.
- Ensure side navigation, headers, and toolbars behave intentionally on small screens.
- Check zoom and long-content behavior, not just the default viewport.

## Phase 7 — Accessibility and inclusive interaction

- Use semantic HTML and correct heading order.
- Ensure all functionality is keyboard-accessible.
- Provide visible focus indicators.
- Give icon-only controls accessible names and mark decorative icons appropriately.
- Associate form fields with labels and error descriptions.
- Use accessible dialog semantics and manage focus.
- Maintain WCAG-aligned contrast, targeting at least 4.5:1 for normal text and 3:1 for large text and essential UI boundaries where applicable.
- Do not use color as the sole indicator of state.
- Respect `prefers-reduced-motion`.
- Avoid flashing, excessive motion, and hover-only information.
- Check screen-reader labels for controls whose visible labels are ambiguous.

## Phase 8 — Motion, feedback, and performance

Use animation to clarify state changes, not as decoration.

- Prefer short, restrained transitions for hover, focus, opening, closing, and selection.
- Avoid constant movement, heavy parallax, and excessive entrance animations.
- Respect reduced-motion preferences.
- Prevent layout shift by reserving space for asynchronous content.
- Use loading skeletons only when they meaningfully improve perceived loading; otherwise use a clear progress indicator.
- Avoid unnecessary rerenders, duplicated network requests, oversized assets, and expensive effects.
- Keep interaction responsive on low-powered devices and slower connections.
- Lazy-load large or below-the-fold content when suitable for the existing application.

## Phase 9 — Code quality and scope control

- Follow existing naming, formatting, typing, and component conventions.
- Extract reusable components when there is genuine repetition, not merely to fragment simple code.
- Separate business logic and data transformations from presentation where appropriate.
- Remove obsolete styles and dead code only after verifying they are unused.
- Avoid global CSS changes that unintentionally break unrelated pages.
- Avoid broad rewrites of routing, state management, or data architecture for a visual task.
- Keep changes scoped to the requested page or feature, except where a shared component must be corrected.
- Do not hide errors by weakening types, disabling lint rules, removing tests, or suppressing warnings without justification.

## Phase 10 — Verification

Before finishing:

- Run the project's available lint, type-check, test, and build commands as appropriate.
- Inspect the changed page in a browser or screenshot workflow if available.
- Test each changed interactive control and verify its outcome.
- Check desktop, tablet, and mobile layouts.
- Check loading, empty, validation-error, success, and failure states where applicable.
- Confirm existing navigation, permissions, and business rules remain intact.
- Check for console errors, missing assets, layout overflow, and inaccessible controls.
- Fix issues discovered during verification where possible.

If a browser or runtime is unavailable, clearly distinguish code-level checks from visual or end-to-end verification.

## Definition of done

The work is complete only when:

- The interface has a consistent, deliberate visual hierarchy.
- Spacing, typography, colors, icons, and components are cohesive.
- Important tasks and actions are easy to find.
- Every visible interactive control works or has an honest disabled state.
- Responsive layouts work without unintended overflow or overlap.
- Loading, empty, error, and success states are clear.
- Accessibility and performance have been considered.
- Existing functionality and data behavior are preserved.
- Available tests and build checks have been run, with actual outcomes reported.

## Required final report

Provide a concise implementation report containing:

1. Pages and components changed.
2. Key visual and usability improvements.
3. Interactions fixed or connected.
4. Responsive and accessibility changes.
5. Tests, build commands, and visual checks actually completed.
6. Known limitations or items requiring backend or user decisions.

Do not claim work is complete, tests pass, or visual verification occurred unless the evidence supports the claim.
