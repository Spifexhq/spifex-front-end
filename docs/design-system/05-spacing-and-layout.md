# 05 — Spacing and Layout

## 1. Grid and spacing scale

Layout uses a 4px base unit through Tailwind's default spacing scale. Approved
steps: `0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12` (0–48px).

| Purpose | Value | Classes |
| --- | --- | --- |
| Icon-to-label gap | 6–8px | `gap-1.5`, `gap-2` |
| Control inner horizontal padding | 12–16px | `px-3`, `px-4` |
| Form field stack | 6–8px | `gap-1.5`, `gap-2` |
| Button group gap | 8–12px | `gap-2`, `gap-3` |
| Card padding (compact) | 16px | `p-4` — filter/toolbar cards |
| Card padding (default) | 20px | `p-5` — metric/content cards |
| Card padding (spacious) | 24px | `p-6` — hero/reporting summaries only |
| Section gap | 16–20px | `gap-4`, `gap-5` |
| Page section stack | 20px | `space-y-5` |
| Page gutter (mobile) | 16px | `px-4` |
| Page gutter (desktop) | 28px | `sm:px-7` |
| Toolbar gap | 12px | `gap-3` |
| Table cell horizontal | 12px | `px-3` |
| Table cell vertical | 10px | `py-2.5` (header) / fixed 40px rows |

Most frequent utilities confirm this: `gap-2` 194, `gap-3` 181, `px-4` 137,
`p-4` 116, `px-3` 100, `py-4` 80, `px-5` 77, `py-3` 77, `gap-4` 75.

## 2. Page shell layout

```
┌─────────────────────────────────────────────────────────┐
│ Navbar 64px (breadcrumbs + notifications)   z-30        │
├──────────────┬──────────────────────────────────────────┤
│ Sidebar      │ Page content                             │
│ 248px        │ px-4 py-6 sm:px-7                        │
│ (72px        │ max-w-[1440px] mx-auto                   │
│ collapsed)   │                                          │
│ sticky       │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- Navbar: `h-16` (64px), `border-b border-gray-200 bg-white px-4 sm:px-6`.
- Sidebar: `sticky top-0 h-[100dvh]`, `w-[248px]` expanded / `w-[72px]`
  collapsed (`SidebarFrame`), header `h-20` (80px), internal grid
  `48px + 176px = 224px` with `12px` inline margin (`sidebar-motion.css`).
- Mobile sidebar: `fixed inset-y-0 left-0 w-[280px] max-w-[85vw]`.
- Content offset: `.app-shell-content` animates `margin-left` by the sidebar
  width (220ms).

## 3. Content width and page padding

Canonical content container:

```tsx
<div className="mx-auto min-w-0 max-w-[1440px] px-4 py-6 sm:px-7">
```

Evidence: `PageSkeleton`, settings surface, feature pages.

- Maximum width: **1440px**, centered. Wider screens keep gutters rather than
  stretching tables.
- Page top padding: `py-6` (24px). The navbar already supplies 64px of chrome.
  Apply it once on the page container; standalone settings mains use `pt-6`.
- Settings pages: `padding: 24px 28px 40px` (from `SettingsSurface`) with
  `max-width: 1440px` on `.settings-content`.
- Dialogs are clamped to the viewport (`max-h`, `max-w`) and never rely on page
  padding.

## 4. Vertical rhythm inside a page

| Block | Spacing |
| --- | --- |
| Page header → first section | 20px (`mb-5` / `space-y-5`) |
| Section header → content | 12–16px |
| Between cards | 16–24px (`gap-4`/`gap-6`) |
| Between form rows | 12–16px |
| Between table and footer | 0 (footer is inside the table panel) |
| Settings intro → panels | 20px (`margin-bottom:20px`) |

## 5. Layout patterns

### Detail / list split

```tsx
<div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
```

```tsx
<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
```

- The first column is a list/navigation rail (260px) or the primary content
  (`2fr`); the second is detail/summary.
- Always include `minmax(0, …)` for the flexible column so tables can shrink.
- Stacks to one column below `lg`/`xl`; do not force two columns on tablet.

### Toolbar

`SettingsSurface` establishes the canonical toolbar: `justify-content:
space-between`, `flex-wrap: wrap`, `gap: 12px`, first child `flex: 1 1 320px;
min-width: 0`. On mobile the filter group becomes a toggle (`settings-filters-toggle`).

### Grid of metric cards

Reporting uses `grid gap-3 sm:grid-cols-2 xl:grid-cols-4` with `rounded-[24px]`
cards. This radius is reporting-only. Operational metric strips use
`rounded-lg` and `shadow-sm`.

## 6. Panel / card composition

There is a shared `Card` primitive in `src/shared/ui/Card`. Use it instead of
repeating the recipe:

```
<Card>                                   // rounded-lg border-gray-200 bg-white p-5
<Card padding="compact">                 // p-4 (filters, toolbars)
<Card padding="default">                 // p-5 (metrics, content)
<Card padding="spacious">                // p-6 (hero/reporting only)
<Card tone="metric">                     // + shadow-sm
<Card tone="slate" radius="xl">          // settings/reporting surface
<Card title=… actions=… footer=…>        // framed header/footer
```

Choose padding by role, not by page: filter/toolbar `compact`, metric/content
`default`, hero/reporting summary `spacious`. Do not mix two paddings for
equivalent cards in the same viewport.

Dashboard/accounting summary surfaces (`ActivityCalendar`, `AccountBalancePanel`,
Accounting overview/setup panels, journal totals, chart-import mode panels,
statement upload) use `Card` as of Phase 4, PR 14. `OverviewMetricCards` keeps
its two-layer metric treatment; reporting/correlation views keep the `DS-024`
radius exception.

Do not nest bordered cards more than one level; use dividers
(`border-t border-gray-100`) inside a panel instead.

## 7. Density and alignment rules

- **Desktop:** 32px controls, 40px table rows, 13px body.
- **Mobile (≤767px):** interactive controls ≥40px, table row ≥44px, dialogs
  full-height drawers, secondary columns hidden behind `mobile` columns.
- Numbers right-aligned; text left-aligned; action columns right-aligned.
- Table header labels are `font-medium text-gray-500`; values `text-gray-900`.
- Avoid centering form labels or values. Center only empty states and hero copy.
- Use `min-w-0` on every flex/grid child that contains truncating text.

## 8. Borders

| Use | Canonical |
| --- | --- |
| Panel/table border | `border border-gray-200` |
| Row divider | `border-b border-gray-100` |
| Input border | `border border-gray-300` |
| Hover/selected divider | `border-gray-300` / accent tint |
| Settings border | `--settings-border: #e3e6eb` |
| Control border | `--controlBorder: 1px solid #d6d6d6` (Button variants) |
| Focus ring | Input-only 2px neutral outline (see [09-accessibility.md](09-accessibility.md)) |

The old 0.5px `--standardBorder` was replaced by `--controlBorder` at 1px in
Phase 1, PR 2. New control borders use that token or `border-gray-300`.

## 9. Spacing findings

| ID | Severity | Issue | Resolution |
| --- | --- | --- | --- |
| DS-022 | Medium ✅ | Card padding varied `p-4`/`p-5`/`p-6` for equivalent metric cards, including within the same reporting row | Padding follows the card's role: `compact` `p-4` for filter/toolbar cards, `default` `p-5` for metrics and content, `spacious`/`p-6` only for hero or reporting summaries. Filter cards migrated to `Card`. |
| DS-023 | Medium ✅ | Page stacks alternated `space-y-4`, `space-y-5`, `space-y-6` | Page roots use `space-y-5`; `space-y-3` stays inside forms and card bodies. Reporting keeps `md:space-y-6` as an intentional density exception. |
| ✅ DS-024 | Low | Reporting radii `24px`/`28px` conflict with the panel scale | Keep locally; documented with DS-024 comments in each reporting card |
| DS-025 | Low | ✅ | Sidebar internal width 224px + 12px margin vs. declared rail width 248px/72px was opaque | Commented the rail math in `sidebar-motion.css` |
| ✅ DS-026 | Low | `py-6` vs `py-5`/`py-7` top padding across feature pages | `py-6` canonical; normalized on page containers in Phase 5, PR 18 |

## 10. Provisional decisions

- **1440px max width** is consistent in settings and skeleton; some feature pages
  use `max-w-6xl`/`max-w-5xl` for forms. Treat those as intentional form-width
  constraints, not a competing page width.
- **Sidebar width** 248/72 is canonical for Business. Personal/Settings sidebars
  share `SidebarFrame` but not all width constants; verify before enforcing.
