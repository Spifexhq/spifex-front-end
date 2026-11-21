# Feature Specification: Business cash-flow forecast chart

**Feature Branch**: `019-business-cashflow-forecast`
**Created**: 2026-11-21
**Status**: Implemented
**Input**: Rebuild the Business Overview "Cash-flow trend" as a continuously animated chart in the World App / Coinbase direction, inside the Stripe-flavoured Spifex design system. Let the user pick a forward window, toggle series (receivables, paid, optional dotted net), and switch between due transactions and projected cash flow. Delete the unused Business Reports page and clean up.

## Decisions

- **Forward window** (confirmed with the user): the pills select the next 7 days, 30 days, 90 days or 1 year, starting today. Labels are `7D / 30D / 90D / 1Y` and the exact range is always printed under the headline.
- **Due** = open entries by due date in that window (receivables and paid per bucket, net per bucket).
- **Projected** = today's consolidated balance walked forward through the same dues (balance plus cumulative receivables and payments).
- The projection needs one consolidated balance, so it comes from the banking table endpoint (`total_consolidated_balance`), not from the truncated eight-account list in the overview payload. When the balance is hidden by permission or spans several currencies, the Projected tab is disabled instead of showing a wrong number.

## User Scenarios & Testing

### User Story 1 — Read the forecast at a glance (P1)

As a Business user, the card shows one headline number, what it means, and a smooth chart of the forward window.

**Independent Test**: Open Overview at 360, 768 and 1440 px; the card has no horizontal overflow, the headline is legible, and the chart fills the card width.

**Acceptance Scenarios**:

1. Given due entries, then the headline is the net due for the window and the sub-line shows receivables and paid totals.
2. Given the Projected tab, then the headline is the projected balance at the end of the window and the sub-line shows the movement against today.
3. Given any range change, then the window dates under the headline update immediately.

### User Story 2 — Choose the window and the series (P1)

**Acceptance Scenarios**:

1. Given the range pills, then 7D/30D/90D/1Y re-query the window and re-group the buckets (day, day, week, month).
2. Given the series chips, then Receivables and Paid toggle independently; Net result is available and drawn as a dashed line.
3. Given a toggle, then the Y domain re-fits to the visible series only.

### User Story 3 — Motion that feels like a finance app (P1)

**Acceptance Scenarios**:

1. Given a data change, then the line and area morph between shapes with a spring instead of snapping or restarting a clip reveal.
2. Given the pointer moves across the plot, then the crosshair, the markers and the tooltip glide with a stiffer spring.
3. Given the headline value changes, then the number counts to the new value.
4. Given `prefers-reduced-motion`, then all of the above render instantly.

### User Story 4 — Remove the Reports page (P2)

**Acceptance Scenarios**:

1. Given the Business sidebar, then no Reports entry is shown.
2. Given a bookmarked `/b/reports`, then the router sends the user to Overview.
3. Given the build, then no Reports chunk, model, API helper or translation namespace remains.

## Requirements

- **FR-001**: The card MUST live under `src/products/business/pages/Overview/CashFlowTrend/` and stay Business-only.
- **FR-002**: The chart MUST be hand-rolled SVG with fixed-length resampled paths so `d` can be interpolated.
- **FR-003**: Line and area MUST morph with a spring; the crosshair and tooltip MUST use their own spring.
- **FR-004**: The headline, the movement and the totals MUST animate via `AnimatedNumber`.
- **FR-005**: Ranges MUST be forward windows ending today + N − 1 days.
- **FR-006**: Series toggles MUST control the domain and the hover tooltip rows.
- **FR-007**: Projected MUST use the consolidated balance and MUST be disabled when it is unavailable.
- **FR-008**: The card MUST reuse `Card`, `SegmentedControl`, `InfoTooltip`, `Button` and Spifex colours.
- **FR-009**: All copy MUST be localized in en/pt/fr/de.
- **FR-010**: The Business Reports route, sidebar entry, page, models, API helper and `reports` i18n namespace MUST be removed.
- **FR-011**: The spending-by-category card MUST remain unchanged in content.
- **FR-012**: No backend contract changes.

## Success Criteria

- **SC-001**: Path morphs are observable frame to frame between window changes.
- **SC-002**: Hover shows date and every visible series value.
- **SC-003**: `tsc -b`, `eslint` and `npm run build` pass; no Reports chunk in `dist`.
- **SC-004**: Personal Overview keeps its current chart.

## Assumptions

- Overdue entries (due date before today) are outside the forward window; the page's attention panel remains the place for overdue items.
- Grouping is day for 7D/30D, week for 90D and month for 1Y to keep path density comfortable.

---

# Revision 2 — 2026-11-21

**Input**: Remove the Transactions metric card; show the trend day by day; more date ticks; dark red Paid line; date-only tooltip with hover-driven header values; colored line up to the hovered point and muted after it; fix the Due/Projected transition. The last assumption above is superseded: every window is now daily.

## Changes

- **Metrics**: Overview renders Receipts, Payments and Net cash flow only (3 columns). The Transactions count card is gone.
- **Daily granularity**: every window is requested with `group_by=day`, so 7D, 30D, 90D and 1Y return one bucket per day (365 for the year).
- **X axis**: up to 12 labels (5 narrow, 8 medium, 12 wide), positioned by day index and formatted with `Intl.DateTimeFormat(locale, { month: "short", day: "numeric" })` — `Nov 21` in English, `21 de nov.` in Portuguese, `21 nov.` in French, `21. Nov.` in German.
- **Paid line**: dark red `#B42318`, chip swatch included.
- **Tooltip**: no values. A pill follows the cursor and shows only the full date, `Tue, Nov 21, 2026`, localized with weekday, month, day and year.
- **Header follows hover**: headline, the receipts/payments pair (Due) or the movement versus today (Projected) animate to the hovered day, then animate back to the totals on leave.
- **Split coloring**: each series draws twice — colored before the hovered x, muted `#CBD5E1` after it — through two animated `clipPath` rects. Leaving sweeps the color back with a spring.
- **Mode transition**: the plot group is keyed by mode and cross-fades (180 ms) instead of interpolating between per-day and cumulative semantics. Hover, crosshair and date pill reset on mode and range changes.

## Verification (preview harness, removed afterwards)

- Split sweep on leave, measured through clip widths: `239 → 389 → 599 → 696 → 736 → 753 → 760 → 766` px — fluid, not a snap.
- Hovering day 4 of 30 updated the header to `US$ 359,00` net, `2.730` in, `2.371` out; the pill showed `sex., 4 de dez. de 2026`.
- Mode switch sampled two groups at complementary opacities `0.69/0.31 → 0.33/0.67 → 0.12/0.88 → 0/1`, then one group.
- 1Y rendered 365 daily buckets with 12 ticks.
- `tsc -b`, eslint and `npm run build` (29.0 s) pass.

---

# Revision 3 — 2026-11-21

**Input**: x-axis labels are clipped at both ends; darker green; the area jumps to another series when a line is toggled off; the Due/Projected switch should be a real motion, not a crossfade.

## Changes

- **Plot inset**: the plot now runs from `PAD = 18 px` to `width − 18 px`. Paths, clips, crosshair, markers and ticks all share that inset, so the first and last date labels sit inside the card instead of touching the border. The area and lines stop short of the card edge, which also gives the shape room to breathe.
- **Darker green**: receivables and its chip/swatch moved from `#10B981` to `#047857`.
- **Stable gradient**: the area is always the receivables series in both modes. Hiding receivables fades the fill out (220 ms) while its path is frozen; showing it again morphs the frozen shape back and fades in. The fill never re-targets the paid line, so there is no red gradient jump.
- **Mode transition is a morph**: the old crossfade is gone. `receivables`, `paid` and `net` keep their keys across modes, so their paths morph from per-day to cumulative in pixel space. `balance` is a Projected-only line that fades in and out through `AnimatePresence`. The morph spring is softer (`95 / 24 / mass 1`) and opacity uses a short tween so fades do not ride the spring.
- Removed the invalid `d: undefined` initial state that logged `<path> attribute d` errors on mount.

## Verification (preview harness, removed afterwards)

- Mode switch sampled the receivables path: `107.23 → 129.95 → 163.45 → 187.90 → 205.09 → 215.78 → 222.38 → 232.97` — a continuous glide, one plot group, no crossfade, no console errors.
- Toggling receivables off: the area path string stayed identical while opacity went `1 → 0.45 → 0.05 → 0`.
- Range switch 30D → 90D still interpolates the path.
- Hover at the middle: crosshair, split coloring, markers on the line and the date pill all aligned inside the inset.
- `tsc -b`, eslint and `npm run build` (28.5 s) pass.

---

# Revision 4 — 2026-11-21

**Input**: refill the coloured line a bit slower; drop the gradient whenever more than one line is visible and show it only for a single line.

## Changes

- **Slower refill**: the clip mask now uses two springs — a fast one while the pointer is inside the plot (`340 / 32`), and a softer `80 / 20 / mass 1` for the return. The colour sweep back to full takes roughly twice as long as before.
- **Gradient only for one line**: the fill is rendered only when exactly one line is visible (receivables, paid, net or the projected balance). With two or more lines the plot is a clean line chart with no fill. The gradient colour follows the visible line — green for receivables, dark red for paid, sky for net, indigo for the projected balance.
- Switching between one and several lines fades the fill in or out (280 ms) instead of morphing it into another series.
- The projected balance gained the same coloured/muted split as the other lines (it was previously clipped to the past only, so it vanished after the hover point).

## Verification (preview harness, removed afterwards)

- Two lines (default): no area path in the SVG.
- Paid hidden: green gradient appears under receivables.
- Receivables hidden: red gradient (`#B42318`) under paid.
- Projected with both toggles off: indigo gradient under the balance line, and the muted `#CBD5E1` tail still renders after the hover point.
- Refill sample after leaving: `253 → 299 → 419 → 522 → 595 → 643 → 677 → 697 → 708` px at 80 ms steps (previous spring reached the same distance in about 40 % of that time).
- `tsc -b`, eslint and `npm run build` (34.3 s) pass.

---

# Revision 5 — 2026-11-21

**Input**: remove the gradient entirely; lighter green; allow hiding the projected balance line; bucket 1Y by week.

## Changes

- **No gradient**: the area path, `linearGradient` defs and the single-line fill rule are removed. The chart is now lines only in every state.
- **Lighter green**: receivables `#047857 → #059669`.
- **Projected balance is optional**: a fourth chip, "Projected balance", appears only in Projected mode (default on). Hiding it removes the line and the marker while the headline keeps showing the balance.
- **1Y by week**: `365d` requests `group_by=week` (53 buckets) while 7D/30D/90D stay daily.
- **Tick fitting**: the label count is now estimated from the longest localized label (`≈6.2 px/char`) and the plot width, capped by the previous 5/8/12 limits. Portuguese 1Y shows 9 ticks instead of 12 without collisions.

## Verification (preview harness, removed afterwards)

- No `linearGradient` elements and every path renders `fill="none"`.
- Projected mode shows the fourth chip; unselecting it drops the `#4F46E5` path from the DOM and restores it when re-selected.
- 1Y fixture (53 weekly points) renders with 9 ticks: `21 de nov.`, `9 de jan.`, … `20 de nov.`.
- `tsc -b`, eslint and `npm run build` (45.9 s) pass.
