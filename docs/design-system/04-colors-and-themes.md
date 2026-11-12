# 04 — Colors and Themes

## 1. Brand identity

| Element | Value | Meaning |
| --- | --- | --- |
| Primary accent | `#F46A35` (`--accentPrimary`) | Spifex orange. Primary actions, selection, focus intent |
| Secondary accent | `#9BE7E2` (`--accentSecondary`) | Spifex teal. Brand support, gradients, decorative fills |
| Ink | `#202020` (`--black`) | Text on neutral filled controls |
| App neutral | Tailwind `gray` | Operational surfaces |
| Overlay neutral | Tailwind `slate` | Settings, reporting, floating feedback |

The identity is **warm orange accent on a near-white, neutral, bordered
interface**. It is not a colorful dashboard; color is event-driven (action,
status, selection).

## 2. Brand usage rules

1. `--accentPrimary` is for **one** primary action per screen region and for the
   selected/active state. Primary buttons use dark `#202020` text (5.40:1).
2. Teal is **never** a text background with white text (1.41:1). It carries dark
   `#202020` text (11.58:1), or is used as a gradient partner/decorative accent.
3. Success green (`#16A34A`) is a status color, not an alternative primary
   button color.
4. Gradients are limited to `Button gradient` (unused in product code) and the
   reporting hero (`from-slate-950 via-slate-900 to-slate-800`).
5. Do not introduce purple/violet, cyan, or a second orange. `#f97316` was
   removed with the old `TopProgress` fallback.

## 3. Neutrals: the gray/slate split

The codebase uses two neutral families. This is intentional but must stay
consistent per surface type.

| Family | Where | Examples |
| --- | --- | --- |
| `gray` | Core app: tables, inputs, sidebar, navbar, dialogs, page chrome | `DataTable` `border-gray-200`, `TextInput` `border-gray-300`, `SidebarFrame` `bg-gray-50` |
| `slate` | Settings, reporting, snackbar, newer overlay controls | `SettingsSurface` `--settings-ink:#202936`, `Snackbar` `text-slate-800`, `Reports*` `border-slate-200` |

Evidence: `text-gray-900` 184, `text-gray-500` 184, `text-gray-600` 158 vs
`text-slate-500` 103, `text-slate-900` 63.

**Decision (Phase 3):** keep both families permanently, by surface:

- `gray` — operational app chrome and shared controls: tables, forms, workspace
  rail, navbar, dialogs.
- `slate` — settings, reporting and feedback surfaces: `SettingsSurface`,
  reporting cards, snackbar/confirmation overlays.

A shared primitive inside settings (for example `DataTable`) stays `gray`; that
is an allowed exception, not a defect. Do not mix families inside one control or
card, and do not converge them as part of a feature change.

## 4. Surface hierarchy

| Level | Light value | Classes | Use |
| --- | --- | --- | --- |
| Page background | `#ffffff` or `gray-50` | `bg-white`, `bg-gray-50` | Shell content; settings forces white |
| Panel | `#ffffff` | `bg-white border border-gray-200` | Tables, cards, dialogs |
| Subtle fill | `gray-50` | `bg-gray-50` | Table header, input hover, toolbar |
| Hover | `gray-50` / `gray-100` | `hover:bg-gray-50`, `hover:bg-gray-100` | Rows, ghost buttons, menu items |
| Selected | orange tint or `gray-100` | `bg-[var(--accentPrimary)]/10`, `bg-gray-100` | Sidebar active, selected rows |
| Disabled | `gray-100` + `gray-400` text | `disabled:bg-gray-100 disabled:text-gray-400` | Inputs, buttons (`opacity-60`) |
| Overlay scrim | `gray-950/25` | `bg-gray-950/25` | Dialog, mobile sidebar |
| Dark surface | `slate-900`/`slate-950` | `bg-slate-900 text-white` | Reporting hero only |

Settings uses its own surface variables:
`--settings-border:#e3e6eb`, `--settings-muted:#687385`, `--settings-ink:#202936`.

## 5. Text and contrast

Computed with the WCAG relative-luminance formula. Normal text requires 4.5:1;
large text (≥24px or ≥18.66px bold) requires 3:1; UI borders/icons require 3:1.

| Foreground | Background | Ratio | Verdict | Where |
| --- | --- | --- | --- | --- |
| `#ffffff` | `#F46A35` | **3.02** | ❌ normal text | retired from button text |
| `#202020` | `#F46A35` | **5.40** | ✅ | **current `Button primary`** |
| `#ffffff` | `#f15a1e` (pressed) | 3.38 | ❌ normal text | not used for text |
| `#202020` | `#f15a1e` | 4.83 | ✅ | primary pressed |
| `#ffffff` | `#9BE7E2` | **1.41** | ❌ | retired |
| `#202020` | `#9BE7E2` | 11.58 | ✅ | teal fill; no Button variant |
| `#ffffff` | `#16A34A` | 3.30 | ❌ | retired background |
| `#ffffff` | `#15803D` | **5.02** | ✅ | success fill; no Button variant |
| `#ffffff` | `#da2020` | 4.99 | ✅ | `Button danger` |
| `#6b7280` (`gray-500`) | white | 4.83 | ✅ | column headers, metadata |
| `#9ca3af` (`gray-400`) | white | **2.54** | ❌ | placeholders only |
| `#94a3b8` (`slate-400`) | white | **2.56** | ❌ | snackbar close icon only |
| `#687385` (settings muted) | white | 4.79 | ✅ | settings metadata |
| `#465164` (settings label) | white | 8.01 | ✅ | settings headings |
| `#202936` (settings ink) | white | 14.67 | ✅ | settings body |
| `#F46A35` on white | — | 3.02 | ⚠️ large text/icons only | the 13px `Button link` variant fails |

**Canonical text colors:**

- `text-gray-900` primary, `text-gray-600` secondary, `text-gray-500` muted.
- `text-gray-400` is placeholder/disabled/decorative only. Meaningful captions
  use `text-gray-500` (4.83:1) or `text-slate-500` (enforced in Phase 5, PR 19).
- On orange, use `#202020`/`text-gray-900` (5.40:1). Primary buttons do this since
  Phase 1, PR 1; white is allowed only at ≥18.66px bold.
- On teal, use `#202020` (11.58:1).

## 6. Status colors

| Status | Background | Border | Text | Token |
| --- | --- | --- | --- | --- |
| Success | `emerald-50` | `emerald-200` | `emerald-700` | `--accentSuccess` |
| Warning | `amber-50` | `amber-200` | `amber-700`/`amber-900` | `--accentWarning` |
| Danger | `rose-50` (toasts) / `red-50` (forms) | `rose-200`/`red-200` | `rose-700`/`red-600` | `--accentDanger` |
| Info | `slate-100` / `blue-50` | `slate-200` / `blue-200` | `slate-600` / `blue-700` | `--accentInfo` |
| Neutral | `gray-100` | `gray-200` | `gray-600` | — |

Inconsistency: forms use `red-*` while toasts use `rose-*`. Canonical:
**`rose` for feedback surfaces, `red` for inline field errors**. Do not
introduce a third family (`pink`, `crimson`).

## 7. Hardcoded color inventory

These hex values bypass the token layer. They are acceptable only where listed,
and should be moved to settings-local variables rather than duplicated.

| Hex | Location | Meaning | Target |
| --- | --- | --- | --- |
| `#e3e6eb` | `SettingsSurface`, `side-panel.css` | Settings border | `--settings-border` |
| `#687385` | `SettingsSurface` | Settings muted | `--settings-muted` |
| `#202936` | `SettingsSurface` | Settings ink | `--settings-ink` |
| `#dce1e8` | `CompactActionMenu`, settings popover | Menu border | `border-slate-200` |
| `#26334d` | shadows (`Popover`, toasts) | Shadow ink | `--shadow-floating` |
| `#465164` | `SettingsSurface` | Toolbar text | `--settings-label` |
| `#26344a`, `#657084` | `SettingsSurface` | Record name/actions | settings variables |
| `#f3f5f8`, `#f4f6f9` | `SettingsSurface` | Hover fills | `gray-50`/`slate-50` |
| `#c52d38` | `CompactActionMenu` | Destructive menu item | `--accentDanger` |
| `#f4f7ff`, `#edf2ff`, `#e6eeff` | `Button` outline/soft variants | Blue hover tints | **remove** (brand conflict) |
| `#1b1b1b`, `#242124`, `#fbfbfb` | `Button outlineBlack` | Black button states | `neutral-900`/`gray-50` |

## 8. Dark mode

- The legacy `tailwind.config.js` was deleted in Phase 1; it was never loaded by
  Tailwind v4.
- There are **zero** `dark:` utilities in `src`.
- No theme switcher exists.

**Status: not supported.** Do not add `dark:` variants opportunistically. A dark
theme requires a separate specification and a token layer (Phase 1 prerequisite).

## 9. Charts and data visualization

There is no shared chart color scale. Observations:

- Reporting uses `slate` surfaces with `emerald` for positive and `rose`/`amber`
  for negative/warning series.
- Sparklines inherit `currentColor` (`src/shared/ui/Sparkline`).
- `CashflowBarsCard` and `TimelineBucketsCard` use gradient/solid slate bars.

**Provisional series order** (verify before enforcing): 1 `#F46A35`, 2 `#0EA5E9`,
3 `#16A34A`, 4 `#F59E0B`, 5 `#64748B`, 6 `#9BE7E2` (fill only). Labels must meet
4.5:1; gridlines use `gray-200`.

## 10. Decisions and unresolved items

**Resolved in Phase 1, PR 1:**

1. **Primary button text.** Retained the brand orange and switched to `#202020`
   text (5.40:1; 4.83:1 pressed).
2. **Teal's role.** Teal remains a brand fill with dark `#202020` text
   (11.58:1); it is not a white-label action.
3. **Success status.** Kept white text on the darkened success fill
   `#15803D` / `#166534` / `#14532D` (5.02:1 / 7.13:1 / 9.11:1). No Button
   variant consumes it; status chips use the emerald scale.

4. **Gray vs. slate.** Resolved in Phase 3: keep both by surface (gray for
   operational UI, slate for settings/reporting/feedback); no convergence.

**Still unresolved:** none for color. New surface decisions follow §3.
