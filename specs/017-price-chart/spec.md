# Feature Specification: Shared PriceChart (X cashtag chart parity)

**Feature Branch**: `017-price-chart`
**Created**: 2026-11-20
**Status**: Draft
**Input**: Reproduce the visual style and interaction behaviour of the X cashtag price chart (`x.com/search?q=$ANT&cashtagRestId=ANT`) as one shared Spifex chart component, and adopt it for the main Reporting trend chart.

## Reference analysis (measured live, 2026-11-20)

Reference implementation: X cashtag widget, rendered with **Recharts 3.x** (`svg.recharts-surface`), column width 598 px.

| Element | Measured value |
| --- | --- |
| Identity name | 15/20 px, weight 700, `#E7E9EA` |
| Identity meta | 13/16 px, weight 400, `#71767B`, `·` separators, 8 px gap row |
| Price | 26/20 px, weight 800, `#E7E9EA`, tabular numerals |
| Change | 14/16 px, weight 700, `#F4212E` / `#00BA7C`; 16 px arrow glyph in a 23 px box; 2 px gap |
| Third line | 13/16 px, `#71767B`; timestamp · volume, or `After hours <price> (<pct>%)` |
| Plot | 598×151, full-bleed, no axis, no grid, no labels, no tick, no padding |
| Volume strip | 598×35 immediately below the plot, bars `#595D62`, ~54 % duty cycle |
| Range pills | 5 equal columns, 3 px gap, 32 px tall, radius 9999, 13 px; active `#2A2D30` on `#E7E9EA`; inactive transparent on `#71767B` |
| Series | 2 px stroke, Recharts `monotone`; area fill same hue 0.5 → 0 opacity |
| 1D split | regular session coloured, after-hours `#595D62` at 0.6 opacity, 4 px dot on the last point |

Behaviour:

1. Hover snaps a single 4 px dot to the nearest sample. There is no crosshair line and no tooltip box.
2. Hover rewrites the header: price, change vs previous close (`$` and `%`), third line becomes `date · Volume <n>`.
3. Mouse-out restores the latest values.
4. Changing the timeframe remounts the series and reveals it left→right (~300 ms ease-out); volume bars grow from the baseline (250 ms).
5. Empty range shows centred muted text `No chart data to display`.

## User Scenarios & Testing

### User Story 1 - Consistent price/trend chart across Spifex (Priority: P1)

As a Spifex user, every main trend chart uses the same visual language: identity header, live value, delta, full-bleed plot, volume strip and range pills, so charts are read the same way everywhere.

**Independent Test**: Render the component at 360 px, 768 px and 1440 px; confirm the plot is full-bleed, the pills split the width in equal columns, and no horizontal overflow occurs.

**Acceptance Scenarios**:

1. Given ranges with data, when the chart renders, then it shows the identity row (optional), price, delta, third line, plot, volume strip and pills.
2. Given the user hovers the plot, then the dot snaps to the nearest sample and the header switches to the hovered value without a tooltip box.
3. Given the pointer leaves the plot, then the header returns to the latest value.
4. Given a different timeframe is selected, then the series remounts and reveals left→right.

---

### User Story 2 - Theme-aware and reusable (Priority: P1)

As a developer, I can render the chart on Spifex light surfaces by default and on the exact X dark palette when required, using one component and a typed data contract.

**Independent Test**: Render with `tone="light"` and `tone="dark"`; confirm all colours come from the tone tokens and no literal colour is required by the caller.

**Acceptance Scenarios**:

1. Given `tone="light"`, then surface/text/muted/pill/volume colours resolve from the light tokens.
2. Given `tone="dark"`, then they resolve from the measured X dark tokens.
3. Given `upColor`/`downColor` overrides, then series and delta use them.
4. Given `prefers-reduced-motion`, then reveal animations are skipped.

---

### User Story 3 - Reporting adopts the chart (Priority: P2)

The Reporting "Cash trajectory" card renders through the shared chart without losing its existing inflow/outflow/context figures or its range selection.

**Independent Test**: Open Reporting > Reports; confirm the trend card shows the new chart, the ranges still switch, and the inflow/outflow/context row is unchanged.

**Acceptance Scenarios**:

1. Given reporting ranges, then the chart shows the last balance and the change versus the first point of the selected range.
2. Given a range switch, then the chart updates and the footer figures stay intact.
3. Given no data for a range, then the localized empty message is shown.

### Edge Cases

- Single point (no line, dot only).
- All values identical (flat line, no division by zero in the delta).
- `reference` equal to zero (percentage omitted).
- Range without a volume series (strip hidden).
- Points without `phase` (no after-hours split, dot at rest is the line colour).
- Very long identity meta text (truncate with ellipsis).

## Requirements

- **FR-001**: The component MUST live at `src/shared/ui/PriceChart/` and export a typed default component.
- **FR-002**: It MUST use the existing `recharts` dependency (already `^3.1.0`) rather than a new library.
- **FR-003**: Hover MUST snap to the nearest data point and MUST NOT render a tooltip box or crosshair.
- **FR-004**: The header MUST update to the hovered point and restore the latest values on leave.
- **FR-005**: Timeframe changes MUST remount the series and reveal it with a left→right wipe; the volume strip MUST grow from the baseline.
- **FR-006**: All colours MUST resolve from tone tokens (`light` default, `dark` exact X palette) plus optional up/down overrides.
- **FR-007**: `prefers-reduced-motion` MUST disable the reveal animations.
- **FR-008**: The chart MUST be full-bleed inside its container: no axis, grid, labels or plot padding.
- **FR-009**: Text and labels the component owns MUST be injectable (`labels`, formatters) so callers supply localized copy.
- **FR-010**: Reporting MUST keep its current card title, subtitle, range keys and footer statistics.
- **FR-011**: No route, API, permission or backend contract changes.

## Success Criteria

- **SC-001**: At 360 px, 768 px and 1440 px there is no horizontal overflow and the plot fills its container edge to edge.
- **SC-002**: Hover, leave and range switch reproduce the measured reference behaviour.
- **SC-003**: Light and dark renders use only tone tokens for colour.
- **SC-004**: `npm run build` (tsc + vite) and `npm run lint` pass.
- **SC-005**: Reporting shows the new chart with its footer statistics and range switching intact.

## Assumptions

- X's up colour `#00BA7C` is inferred from the X design token set: every ticker available in the verification session was negative, so only the down colour `#F4212E` was directly observed.
- X's light-theme values (`#0F1419`, `#536471`, `#EFF3F4`, `#CFD9DE`) follow the published X light tokens; the dark values are measured.
- Reporting data has no after-hours phase, so the split renders only where a caller provides it.
