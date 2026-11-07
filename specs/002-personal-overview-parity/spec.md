# Feature Specification: Personal Overview Visual Parity

**Feature Branch**: `002-personal-overview-parity`  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: Match Personal Overview's filter-panel position, styling and page composition to Enterprise Overview while retaining Personal-specific data and functionality.

## User Scenarios & Testing

### User Story 1 - Read a consistent Personal Overview (Priority: P1)
As a Personal workspace user, I want the Overview to use the same information hierarchy and visual language as Enterprise Overview, so both products feel like parts of Spifex while showing the correct product-specific data.

**Independent Test**: Open Personal Overview at desktop and mobile widths and compare heading, filter placement, metric cards, charts, and activity sections to Enterprise Overview. Confirm Personal-specific balances, budgets, goals, transactions and permissions remain intact.

**Acceptance Scenarios**:
1. Given Personal Overview loads, when I view the page, then the heading is followed by a separate filter panel in the same position as Enterprise Overview.
2. Given the Personal filter panel, when I select a date preset or enter dates and apply them, then Personal dashboard requests use the selected period without a full-page reload.
3. Given Personal summary metrics, when they render, then they use the same card composition and responsive grid as Enterprise metrics, with comparisons only where supported by Personal data.
4. Given a mobile viewport, when I view the filter panel, cards, charts and activity, then they remain readable and stack without horizontal overflow.
5. Given loading, error, restricted, report, or empty states, when displayed, then existing Personal behavior remains understandable and consistent with the shared overview style.

## Requirements

- **FR-001**: Move Personal's date controls out of the page heading and into a dedicated filter panel directly below the heading, matching Enterprise's page hierarchy.
- **FR-002**: Use shared visual primitives for the filter panel and metric cards where practical, avoiding dependencies from Personal pages into Business product modules.
- **FR-003**: Retain Personal API parameters, report/overview behavior, currency display, current balance, charts, budgets, goals, recent activity, and outstanding entries.
- **FR-004**: Show trend comparisons only for Personal metrics with valid previous-period data; do not invent a previous-period balance.
- **FR-005**: Preserve the shared chart controls and responsive behavior; keep all filter and chart controls keyboard accessible.
- **FR-006**: No backend, routing, permission or financial calculation contracts are changed.

## Success Criteria

- **SC-001**: Personal filters appear below the heading in an Enterprise-equivalent filter panel, not in the heading row.
- **SC-002**: Personal and Enterprise summary cards share the same outer/inner surfaces, typography, sparklines, trend treatment and responsive layout.
- **SC-003**: Existing Personal Overview and Reports queries, actions and product-specific sections continue to work.
- **SC-004**: TypeScript, targeted lint, production build and `git diff --check` pass.

## Assumptions

- The existing Personal dashboard response includes the same period metrics/previous-period fields as the shared `OverviewData` type.
- Personal data and permission rules remain authoritative; only page composition and shared presentation primitives change.
