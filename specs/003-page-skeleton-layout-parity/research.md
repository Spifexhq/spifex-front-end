# Research: Page Skeleton Layout Parity

**Feature**: `003-page-skeleton-layout-parity`
**Date**: 2026-11-13

## Findings

### Current skeleton contract

`PageSkeleton` currently renders a page gutter (`px-4 py-6 sm:px-7`), a 1440px container and a fake title/action row. It is used in three incompatible contexts:

1. Inside a layout that already renders the heading (Business Settings, Accounting workspace, Personal settings).
2. Inside a layout that already provides the page gutter (`PersonalLayout`).
3. As the entire page body for a route that has no surrounding content container (Organization, Group, Limits).

This produced double gutters, duplicate headings and generic table skeletons for pages whose loaded composition is a section grid, a master/detail split or a dashboard.

### Page compositions observed

| Page group | Loaded composition | Skeleton need |
| --- | --- | --- |
| Business settings tables (Category, Project, Member, Entity, Department, Bank, Inventory) | `settings-page`/`settings-content`, toolbar chips + action, `DataTable` | settings frame + toolbar + table |
| Currency | settings frame, one heading + row | settings frame + panel |
| Format | settings frame, panel with row + three option cards + rows | settings frame + settings form panel |
| Organization / Personal profile | page container, 12-col 7/5 split of `SectionCard`s | page shell + form split |
| Notification | page container, 12-col 8/4 split (panel rows + info card) | page shell/sections |
| Security | page container, one section card with rows | page shell/single panel |
| Group | page container, 300px list rail + detail panel | page shell + groups |
| Workspace management | settings frame, single panel with workspace rows | settings frame + settings list |
| Personal dashboard | header, filter panel, metric cards, charts, two cards, recent table, upcoming panel | dashboard variant (content-only) |
| Business overview | metrics, chart/side card, recent table + side cards | dashboard-style content variant |
| Onboarding | header + segmented steps + form card | onboarding variant inside its own page frame |
| Import review | banner, counts, filters, selectable table | review variant |
| Accounting list pages | description/action, filters, `DataTable` | accounting variant (content-only) |
| Correlation explorer | header card, board split 1fr/300px | correlations variant |
| Locale setup | stacked preference panels with fields | fields variant (content-only) |
| Billing | callout card + three plan cards | billing variant |
| Limits & usage | page header/legend/search + table | page shell + table |
| Integrations list region | table only inside a section | `DataTableSkeleton` |

## Decisions

1. **Content-only `PageSkeleton`.** The primitive owns layout-shaped content only. `PageSkeletonShell` owns the canonical page gutter/width; `SettingsPageSkeleton` owns the settings frame.
2. **Named variants over per-page copies.** One shared module keeps loading markup consistent and lets future pages opt into the closest composition.
3. **Headings stay layout-owned.** No skeleton title/action row. The real heading remains mounted while the content region loads.
4. **Table-only waits use `DataTableSkeleton`.** Page-level waits use `PageSkeleton`; dialog/table-region waits keep their existing local skeleton.
5. **Neutral visual language.** Skeletons use existing `SkeletonLine` colors and documented panel/card radii; they do not attempt to reproduce page-specific accent colors.

## Alternatives considered

- **Keep one generic skeleton and only remove padding:** rejected; the section order and split columns would still mismatch.
- **Create page-local skeletons for every route:** rejected; duplicates the layout recipe and drifts from the design system.
- **Make `PageSkeleton` guess its container:** rejected; a shared primitive cannot know whether a layout already provides padding, and implicit behavior caused the current defect.
