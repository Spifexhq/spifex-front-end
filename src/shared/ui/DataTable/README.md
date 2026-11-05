# DataTable

The shared renderer for Settings, Accounting and Finance. Supply typed `items` and explicit `columns`; domain models and authorization stay in the caller.

- Local collections paginate once, at 20 rows by default. Pass a `pager` from `useCursorPager` for server pages; those rows are never sliced again.
- Name clicks open the shared SidePanel preview. `onInspect` delegates to a domain-specific preview; `previewFields` adds fields without adding columns.
- `onEdit`, `onDelete`, `canEdit` and `canDelete` control row actions. Deletes are confirmed. `onDeleted` receives successful IDs for optimistic removal before refresh. Failed bulk deletions remain selected.
- `selectable` enables Checkbox/useShiftSelect behavior. Escape dismisses overlays before clearing selection. `canSelect` allows non-delete workflows; `selectionActions` supplies a domain toolbar.
- Adjacent column resizing preserves total width. `mobile` and `mobileWidth` keep selected secondary fields visible on narrow screens.
- `pagination={false}` supports trees and infinite collections. `rowKind` marks non-selectable summary rows. `virtualize`, `fillHeight` and `onEndReached` support bounded, virtual scrolling. `rowHeight` accepts a number or a per-item function; virtual spacers use the exact cumulative heights.
- `ResultsPerPage`, pagination, filters and column sizing live here. API adapters pass fetch callbacks to the shared hooks; the UI imports no domain API.

`useCursorPager` owns page-size changes, cached navigation, concurrent-request coalescing and stale-response protection. Finance opts into `accumulate` to retain loaded pages. API adapters retain endpoint parameters, organization isolation and authorization.
