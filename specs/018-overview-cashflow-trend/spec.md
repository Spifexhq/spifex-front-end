# Feature Specification: Overview cash-flow trend on the shared PriceChart

**Feature Branch**: `018-overview-cashflow-trend`
**Created**: 2026-11-21
**Status**: Implemented
**Input**: Use the shared PriceChart for the "Cash-flow trend" card on the Overview page, adjust the component to keep the receipts/payments series, and animate the header numbers.

## Context

`FinancialCharts` (shared by Business Overview and Personal Overview) rendered the trend with a three-area Recharts chart plus a `SegmentedControl` for day/week/month grouping. The card should adopt the `017-price-chart` visual language.

The existing chart carries three series (`incoming`, `outgoing`, cumulative `periodNet`), so the shared component needed overlay support before it could replace it.

## User Scenarios & Testing

### User Story 1 - Overview trend matches the new chart language (Priority: P1)

As a user, the cash-flow trend card reads like the rest of Spifex charts: identity header, large animated net figure, delta, full-bleed plot, and equal-width grouping pills.

**Independent Test**: Open Overview at 360 px, 768 px and 1440 px; confirm the card shows the header, the plot, the group pills and the legend without horizontal overflow.

**Acceptance Scenarios**:

1. Given data, then the header shows the cumulative net for the period, the delta versus the previous period and the last bucket date.
2. Given the pointer moves over the plot, then the header switches to the hovered bucket and the third line lists the date, receipts and payments for that bucket.
3. Given the pointer leaves, then the header returns to the period totals.
4. Given the user picks Daily/Weekly/Monthly, then the pill becomes active and the grouping request is issued through the existing `onGroup` callback.

### User Story 2 - Receipts and payments stay visible (Priority: P1)

The side series are not lost when adopting the single-area look.

**Acceptance Scenarios**:

1. Given data, then receipts and payments render as 2 px stroke-only lines over the net area.
2. Given either side series exceeds the net range, then the shared Y domain expands to include it.
3. Given the legend, then it names receipts, payments and period net with matching colours.

### User Story 3 - Numbers move (Priority: P2)

**Acceptance Scenarios**:

1. Given a value change (range switch, hover, leave), then the price, delta amount and delta percentage interpolate instead of snapping.
2. Given `prefers-reduced-motion`, then numbers jump straight to the target and the chart skips its reveal.
3. Given `animateNumbers={false}`, then the component renders static text.

## Requirements

- **FR-001**: `PriceChart` MUST accept `lines` (stroke-only overlay series) without changing its single-area behaviour.
- **FR-002**: The Y domain MUST include overlay series.
- **FR-003**: `PriceChart` MUST accept `tabs`/`tab`/`onTabChange`/`tabsLabel` so a control-only pill row can drive external grouping while the data range stays separate.
- **FR-004**: The header price, delta amount and delta percentage MUST animate between values via the shared `AnimatedNumber`.
- **FR-005**: `AnimatedNumber` MUST accept an optional `duration` while keeping its current default.
- **FR-006**: `PriceChart` MUST support `titleAside`, `detailFormatter` and `animateNumbers`.
- **FR-007**: `FinancialCharts` MUST keep its existing props (`data`, `group`, `onGroup`), currencies, empty state, legend content and spending panel.
- **FR-008**: No API, route or permission change.

## Success Criteria

- **SC-001**: Overview trend renders through `PriceChart` with receipts/payments preserved.
- **SC-002**: Hover, leave and grouping behave as specified.
- **SC-003**: `tsc -b`, `eslint` and `npm run build` pass.
- **SC-004**: Reduced motion disables both the reveal and the number animation.

## Assumptions

- The delta reference is the previous period net when available, otherwise the first bucket of the range.
- Reporting keeps using `PriceChart` without overlays; the extension is additive.
