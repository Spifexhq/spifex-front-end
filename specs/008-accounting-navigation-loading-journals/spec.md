# Feature Specification: Accounting navigation, loading and Journals

**Feature Branch**: `008-accounting-navigation-loading-journals`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Remove the duplicate setup prerequisite list, rename the chart link/route to `chart-of-accounts`, stabilise chart loading, align the active Overview with the main Overview card style, and refactor/block the Journals page.

## User Scenarios & Testing

### User Story 1 - One setup prerequisite list (Priority: P1)

As a user setting up accounting, I see the configuration cards once, including chart, books, category rules and bank connections. The shorter step list above is removed.

**Independent Test**: Open `/accounting/overview` before activation. Confirm the hero shows the next action and progress bar, and the only prerequisite list is the configuration card grid.

**Acceptance Scenarios**:

1. Given setup is incomplete, then the hero shows next action, progress and validation source.
2. Given setup is incomplete, then no duplicate step list appears above the configuration cards.
3. Given the chart is incomplete, then the configuration grid still lists chart, books, category rules and bank connections with their lock/status state.

### User Story 2 - Stable chart loading and URL (Priority: P1)

As an accounting user, I open `/accounting/chart-of-accounts` and see one stable loading surface until the chart and setup status are ready. Old `/accounting/chart` links redirect.

**Independent Test**: Throttle the chart request, open the chart route from the sidebar and from an old bookmark, and confirm Related setup never flashes before the page is ready.

**Acceptance Scenarios**:

1. Given the chart request is pending, then a page skeleton is shown and no Related setup/empty-card content is rendered.
2. Given the chart finishes loading, then the full page renders once in its final structure.
3. Given a later chart refresh, then the existing page remains mounted instead of returning to the initial skeleton.
4. Given `/accounting/chart`, then the app redirects to `/accounting/chart-of-accounts`.
5. Given the sidebar, breadcrumbs, setup links and AI targets, then they all use `chart-of-accounts`.

### User Story 3 - Active Overview matches the main Overview (Priority: P1)

As an active accounting user, the operational Overview uses the same two-layer metric cards and slate surfaces as the main Business Overview.

**Independent Test**: Open `/accounting/overview` after activation and compare metric cards, panel headers, typography and colour with the main Overview.

**Acceptance Scenarios**:

1. Given operational data, then the four metrics use the shared two-layer accounting metric card.
2. Given the page, then panels use the same `Card radius="xl" tone="slate"` treatment.
3. Given loading, then values use skeleton blocks without layout shift.
4. Given a load failure, then a red alert with retry is shown.

### User Story 4 - Journals refactor and block (Priority: P1)

As an active accounting user, Journals is a focused operational page with metrics and a clean list. Before setup completes, the page is blocked.

**Independent Test**: Open Journals before activation, then after activation with populated and empty journals.

**Acceptance Scenarios**:

1. Given accounting is not operational, then the Journals route and sidebar item are blocked.
2. Given the page is blocked, then a message and a link back to Overview are shown.
3. Given operational journals, then four metrics (entries, posted, reversed, lines) are shown.
4. Given journals, then the list is inside a titled panel with filters, lines and status columns.
5. Given a list error, then a red alert with retry is shown.
6. Given the manual journal panel, then duplicate styling and awkward section headers are removed.

## Requirements

- **FR-001**: Remove the short step list from the setup Overview; keep the complete configuration card grid.
- **FR-002**: Rename the route to `/accounting/chart-of-accounts`; redirect `/accounting/chart`.
- **FR-003**: Update every internal chart link, sidebar item, breadcrumb title, guard and AI target.
- **FR-004**: Show a stable page skeleton until the initial chart request completes; keep later refreshes mounted.
- **FR-005**: Use the shared two-layer accounting metric card for active Overview and Journals metrics.
- **FR-006**: Align active Overview typography, palette and cards with the main Business Overview.
- **FR-007**: Block the Journals route and sidebar entry until accounting is operational.
- **FR-008**: Refactor Journals into header, metrics, list panel and cleaned manual journal panel.
- **FR-009**: Add en/pt/fr/de copy and keep the accounting translation check green.
- **FR-010**: No API payload or permission change.

## Success Criteria

- **SC-001**: Only one setup prerequisite list is visible.
- **SC-002**: No Related setup flash during initial chart loading.
- **SC-003**: Old chart URLs redirect and all new links resolve.
- **SC-004**: Journals cannot be reached before activation.
- **SC-005**: `tsc -b`, lint, build and `check:accounting-i18n` pass.

## Assumptions

- The setup API remains the source of step state.
- Journals are read-only until accounting is activated.
- Existing journal list and manual journal APIs remain unchanged.
