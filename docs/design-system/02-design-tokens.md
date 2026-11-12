# 02 — Design Tokens

Spifex has **one real token layer**: the `:root` block in `src/index.css`. Everything
else is either a Tailwind default or an arbitrary value repeated in components.
This file records the existing tokens, the de facto scales, and the small number
of tokens that should be added in Phase 1.

---

## 1. Existing CSS custom properties

Source: the `:root` block in `src/index.css`.

### 1.1 Brand and action colors

| Token | Value | Role | Used by |
| --- | --- | --- | --- |
| `--accentPrimary` | `#F46A35` | Primary action, selected state | `Button primary`, links, `Switch`, spinners |
| `--accentPrimaryHover` | `#f4883a` | Hover | `Button primary` |
| `--accentPrimaryPressed` | `#f15a1e` | Active/pressed | `Button primary` |
| `--accentPrimaryDisabled` | `#eb9d7e` | Disabled primary | `Button primary` |
| `--accentSecondary` | `#9BE7E2` | Brand teal; decorative fills | Brand/gradient surfaces; no Button variant |
| `--accentSecondaryHover` | `#b2e7e3` | Hover | Brand surfaces |
| `--accentSecondaryPressed` | `#72e7dd` | Active | Brand surfaces |
| `--accentSecondaryDisabled` | `#cfe6e4` | Disabled | Brand surfaces |
| `--accentCommon` | `#e4e4e4` | Neutral filled button | `Button common` |
| `--accentCommonHover` | `#d9d9d9` | Hover | `Button common` |
| `--accentCommonPressed` | `#cacaca` | Active | `Button common` |
| `--accentCommonDisabled` | `#e9e9e9` | Disabled | `Button common` |
| `--accentCancel` | `#f5f5f5` | Cancel/tertiary button | `Button cancel` |
| `--accentCancelHover` | `#f1f1f1` | Hover | `Button cancel` |
| `--accentCancelPressed` | `#f9f9f9` | Active | `Button cancel` |
| `--accentCancelDisabled` | `#ffffff` | Disabled | `Button cancel` |
| `--accentDanger` | `#da2020` | Destructive action | `Button danger`, `outlineDanger` |
| `--accentDangerHover` | `#f42626` | Hover | `Button danger` |
| `--accentDangerPressed` | `#c62020` | Active | `Button danger` |
| `--accentDangerDisabled` | `#d03e3e` | Disabled | `Button danger` |
| `--accentSuccess` | `#15803D` | Success status | Status surfaces; no Button variant |
| `--accentSuccessHover` | `#166534` | Hover | Status surfaces |
| `--accentSuccessPressed` | `#14532D` | Active | Status surfaces |
| `--accentSuccessDisabled` | `#86EFAC` | Disabled | Status surfaces |
| `--accentWarning` | `#F59E0B` | Warning status | Status surfaces; no Button variant |
| `--accentWarningHover` | `#FDBA28` | Hover | Status surfaces |
| `--accentWarningPressed` | `#D97706` | Active | Status surfaces |
| `--accentWarningDisabled` | `#FCD34D` | Disabled | Status surfaces |
| `--accentInfo` | `#0EA5E9` | Informational status | Status surfaces; no Button variant |
| `--accentInfoHover` | `#38BDF8` | Hover | Status surfaces |
| `--accentInfoPressed` | `#0284C7` | Active | Status surfaces |
| `--accentInfoDisabled` | `#7DD3FC` | Disabled | Status surfaces |

**Canonical usage rule:** only `--accentPrimary*` and `--accentDanger*` are
approved for actions in normal product UI. `--accentSuccess*`,
`--accentWarning*` and `--accentInfo*` are reserved status palette; no Button
variant consumes them since Phase 2. `--accentSecondary*` is a brand fill and
uses dark text (never white).

### 1.2 Core layout tokens

| Token | Value | Status |
| --- | --- | --- |
| `--font` | `Inter, -apple-system, BlinkMacSystemFont, Helvetica, sans-serif` | Canonical |
| `--black` | `#202020` | Canonical text token for filled controls |
| `--controlBorder` | `1px solid #d6d6d6` | Canonical border for `Button` outline/filled variants |
| `--checkboxBorder` | `#cbd5e1` | Checkbox unchecked border |
| `--checkboxChecked` | `#1e293b` | Checked/indeterminate fill (intentional dark state) |
| `--checkboxCheck` | `#ffffff` | Check/dash and unchecked surface |
| `--checkboxHoverShadow` | `0 0 2px rgb(15 23 42 / 0.2)` | Checkbox hover elevation |
| `--radius-control` / `--radius-panel` / `--radius-floating` | `6px` / `8px` / `12px` | Radius tokens for controls, panels and floating layers |
| `--shadow-floating` | `0 8px 32px #26334d20` | Floating-layer shadow token |
| `--z-navbar` / `--z-sidebar` / `--z-modal` / `--z-popover` / `--z-toast` | `30` / `40` / `10030` / `10060` / `15000` | Documented layering tokens |
| `--motion-tooltip` / `--motion-micro` / `--motion-standard` / `--motion-layout` | `120ms` / `150ms` / `180ms` / `220ms` | Motion duration tokens |
| `--ease-out` | `cubic-bezier(.22, 1, .36, 1)` | Layout/easing token |

Legacy `--white`, `--color1..6`, `--standardBorder` (0.5px) and `--border2` were
removed in Phase 1, PR 2. Use the Tailwind palette for colors and
`--controlBorder` for the single control border.

### 1.3 Scoped tokens

| Token | Defined in | Purpose |
| --- | --- | --- |
| `--settings-border/muted/ink` | `src/shared/ui/Settings/SettingsSurface.tsx` | Settings surface palette; intentionally scoped |

The old `--brand` fallback in `TopProgress` was replaced with
`--accentPrimary`; there is no second orange token.

---

## 2. De facto semantic palette (Tailwind defaults)

Tailwind v4 ships its default palette. The application uses it as the semantic
layer. These are canonical:

| Role | Utilities | Notes |
| --- | --- | --- |
| App text primary | `text-gray-900` | Headings, values |
| App text secondary | `text-gray-700`, `text-gray-600` | Labels, body |
| App text muted | `text-gray-500` | Column headers, metadata (4.83:1) |
| App text disabled/placeholder | `text-gray-400` | Placeholder only; 2.54:1 — never for meaningful text |
| App border | `border-gray-200`, `border-gray-100` | Structural vs. row divider |
| App surface | `bg-white`, `bg-gray-50` | Panel vs. header/hover |
| Overlay neutral | `slate-*` | Settings, reporting, snackbar, mobile overlays |
| Success | `emerald-50/200/700` | `Snackbar`, tone chips |
| Warning | `amber-50/200/700/900` | Onboarding CTA, warnings |
| Danger | `rose-50/200/700`, `red-600` | Toasts use `rose`; forms use `red` |
| Info | `slate-100/600`, `blue-50/700` | Snackbar info; input info message |

**Canonical rule:** `gray` for operational app surfaces, `slate` for settings and
overlay surfaces. Do not mix `gray` and `slate` within one component (see DS-013).

---

## 3. Radius scale

| Token | Value | Use |
| --- | --- | --- |
| `rounded` | 4px | Checkbox, tiny chips, menu items |
| `rounded-md` | 6px | **All controls**: buttons, inputs, selects, switches, icon buttons |
| `rounded-lg` | 8px | **Panels**: tables, sidebar rows, settings cards, segmented control, popovers |
| `rounded-xl` | 12px | **Floating**: dialogs, popovers, toasts, selection bars |
| `rounded-2xl` | 16px | Special summary cards only |
| `rounded-full` | 9999px | Pills, avatars, badges, switch tracks |
| `rounded-[24px]` / `[28px]` | — | **Reporting only** (`Reports*` cards); do not generalize |
| `rounded-[100%]` | — | Decorative shadow ellipse in `StatusScene` |

Frequencies (`.tsx` occurrences): `md` 198, `lg` 186, `full` 109, `xl` 59,
`2xl` 16. The control/panel/floating split is consistent enough to standardize.

## 4. Elevation (shadows)

| Name | Utility / value | Use |
| --- | --- | --- |
| Flat | `shadow-none` | Tables, inline panels |
| Card | `shadow-sm` | Metric/summary cards |
| Popover | `shadow-lg` | Navbar notifications, small menus |
| Floating | `shadow-[0_8px_32px_#26334d20]` | `Popover`, `ConfirmToast`, selection bar |
| Menu | `shadow-[0_6px_24px_#26334d18]` | `CompactActionMenu`, settings selects |
| Drawer | `shadow-[-12px_0_40px_#182a421c]` | `settings-drawer` (`side-panel.css`) |
| Snackbar | `shadow-[0_8px_32px_-8px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]` + ring | `Snackbar` |

Avoid new arbitrary shadows. If a layer needs elevation, reuse one of the rows
above.

## 5. Spacing scale

Base unit is 4px (Tailwind default). Approved steps for product UI:

`0, 0.5 (2px), 1 (4px), 1.5 (6px), 2 (8px), 2.5 (10px), 3 (12px), 4 (16px),
5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px)`.

Rules:

- Component internals: 4/6/8/12px.
- Card padding: `p-4` (16px), `sm:p-5`/`p-6` for larger cards.
- Section gaps: `gap-4`/`gap-5`/`gap-6`; page stacks `space-y-5`.
- Do not use odd values (7, 9, 11, 13, 14) except in existing dense settings CSS.

Most frequent utilities: `gap-2` 194, `gap-3` 181, `px-4` 137, `p-4` 116,
`px-3` 100, `py-4` 80, `px-5` 77, `py-3` 77, `gap-4` 75.

## 6. Sizing scale

| Element | Desktop | Mobile |
| --- | --- | --- |
| Button `xs` | 28px | — |
| Button `sm` | 32px | — |
| Button `md` (default) | 32px | ≥40px when touch-primary |
| Button `lg` | 40px | 40px |
| Button `xl` | 44px | 44px |
| Input/Select `md` | 32px | ≥40px |
| Icon button | 32px (`iconSm`), 40px (`iconMd`), 48px (`iconLg`) | 40–44px |
| Table header row | 36px (`py-2.5`, 12px text) | 36px |
| Table body row | 40px (`h-10`) | 40px current, 44px target |
| Sidebar row | 36px min-height | 36px current, 40px target |
| Navbar | 64px (`h-16`) | 64px |
| Page title | 24px text | 24px text |

## 7. Breakpoints

Tailwind defaults; only these are meaningful in this codebase:

| Name | Width | Behavior |
| --- | --- | --- |
| `sm` | 640px | Page padding (`px-7`), typography, two-column forms |
| `md` | 768px | **Shell breakpoint**: mobile sidebar ↔ desktop rail; table desktop columns; dialog centering |
| `lg` | 1024px | Sidebars in settings/layout grids, multi-column cards |
| `xl` | 1280px | Reporting/metric grids, `2fr/1fr` detail layouts |

`max-md:` is used for "mobile only" overrides. Do not introduce custom
breakpoints without an audit entry.

## 8. Z-index hierarchy

Canonical hierarchy (Phase 3; legacy million-level values removed):

| Layer | Target | Current evidence |
| --- | --- | --- |
| Base content | `0` | — |
| Sticky table header / local sticky | `10` | `DataTable` `thead z-10` |
| Navbar | `30` | `Navbar` `z-30` |
| Workspace rail slot / desktop rail | `40` | `ApplicationShell`, `SidebarFrame` |
| Section rail | `50` | `SidebarFrame position="section"` |
| Mobile sidebar backdrop | `90` | `SidebarFrame` |
| Mobile sidebar panel | `95` | `SidebarFrame` |
| Progress / cookie banner | `9999` | `TopProgress`, `CookieBanner` (below modals) |
| Modal layer (scrim + panel) | `10030` | `DialogShell` (center and drawer) |
| Tooltip / date picker / select panel | `10050` | `InfoTooltip`, `Select`, `DateField` |
| Anchored popover/menu | `10060` | `CompactActionMenu`, `SettingsPopover`, legacy `Popover` |
| Selection bars above dialogs | `11000` | Settings/import selection surfaces |
| Feedback stack (snackbar, confirmation, selection) | `15000` | `FeedbackStackProvider` |

Rules: floating layers must be above the mobile sidebar; toasts must be above
dialogs; never add a new arbitrary `z-[…]` without adding it to this table.

## 9. Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| Micro | `150ms ease-out` | Popover/menu enter, dialog fade |
| Standard | `180ms` | `Snackbar` transition |
| Layout | `220ms cubic-bezier(.22,1,.36,1)` | Desktop sidebar width/transform, content margin (mobile drawer 260ms, backdrop 240ms) |
| Spring | `stiffness 420, damping 36, mass 0.7` | `ConfirmToast` collapse |
| Reduced | `0ms` | All of the above under `prefers-reduced-motion` |

## 10. Implemented additions (Phase 1.4)

The scale tokens now live in the `:root` block of `src/index.css`:

```css
--radius-control: 6px;
--radius-panel: 8px;
--radius-floating: 12px;
--shadow-floating: 0 8px 32px #26334d20;
--z-navbar: 30;
--z-sidebar: 40;
--z-modal: 10030;
--z-popover: 10060;
--z-toast: 15000;
--motion-tooltip: 120ms;
--motion-micro: 150ms;
--motion-standard: 180ms;
--motion-layout: 220ms;
--ease-out: cubic-bezier(.22, 1, .36, 1);
```

Do not add color tokens that duplicate Tailwind's palette unless they encode a
semantic role. Do not rename existing `--accent*` variables as part of a feature
change; rename only in a dedicated token task.
