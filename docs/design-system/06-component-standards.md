# 06 — Component Standards

Every component below names its canonical source. If a component is not listed,
it does not exist as a shared primitive and must not be invented locally.

## 0. Selection guide

| Need | Use | File |
| --- | --- | --- |
| Action | `Button` | `src/shared/ui/Button/Button.tsx` |
| Text / amount / percentage / date field | `Input` | `src/shared/ui/Input/Input.tsx` |
| Multi/single choice dropdown | `Select` | `src/shared/ui/Select/Select.tsx` |
| Currency picker | `CurrencySelect` | `src/shared/ui/CurrencySelect.tsx` |
| Boolean in a list row | `Switch` | `src/shared/ui/Switch/index.tsx` |
| Boolean with label + description | `ToggleSwitch` | `src/shared/ui/ToggleSwitch/index.tsx` |
| Multi-select table selection | `Checkbox` | `src/shared/ui/Checkbox/Checkbox.tsx` |
| 2–5 exclusive view options | `SegmentedControl` | `src/shared/ui/SegmentedControl/index.tsx` |
| Card/panel surface | `Card` | `src/shared/ui/Card/Card.tsx` |
| Record list | `DataTable` | `src/shared/ui/DataTable/index.tsx` |
| Selection action bar | `SelectionBar` | `src/shared/ui/SelectionBar/SelectionBar.tsx` |
| Form dialog | `FloatingDialog` | `src/components/Modal/FloatingDialog/index.tsx` |
| Detail/preview drawer | `SidePanel` | `src/components/Modal/SidePanel` + `side-panel.css` |
| Domain modal | `ModalShell` | `src/components/FinancialActivityPanel/ui/ModalShell.tsx` |
| Anchored menu | `CompactActionMenu` | `src/shared/ui/Popover/CompactActionMenu.tsx` |
| Rich anchored panel | `Popover` | `src/shared/ui/Popover/Popover.tsx` |
| Explanatory hover/focus | `InfoTooltip` | `src/shared/ui/InfoTooltip.tsx` |
| Transient result | `Snackbar` | `src/shared/ui/Snackbar/Snackbar.tsx` |
| Destructive confirm | `ConfirmToast` | `src/shared/ui/ConfirmToast/ConfirmToast.tsx` |
| Initial data load | `DataTableSkeleton` / `PageSkeleton` | `src/shared/ui/DataTable/DataTableSkeleton.tsx`, `src/shared/ui/Loaders/PageSkeleton.tsx` |
| Inline busy | `Spinner` | `src/shared/ui/Loaders/Spinner.tsx` |
| Empty collection | `EmptyState` | `src/shared/ui/State/EmptyState.tsx` |
| Error / retry | `ErrorState` | `src/shared/ui/State/ErrorState.tsx` |
| Status/count label | `Badge` | `src/shared/ui/Badge/Badge.tsx` |
| Route/global progress | `TopProgress` | `src/shared/ui/Loaders/TopProgress.tsx` |

---

## 1. Button

**Canonical:** `src/shared/ui/Button/Button.tsx`, tokens in `sizes.ts`, types in
`Button.types.ts`.

**Base:** `inline-flex select-none items-center justify-center rounded-md
font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60`.

| Size | Height | Padding | Text | Use |
| --- | --- | --- | --- | --- |
| `xs` | 28px | `px-2.5` | 11px | Dense icon-adjacent actions |
| `sm` | 32px | `px-3` | 12px | Toolbars, table row actions |
| `md` (default) | 32px | `px-4` | 13px | Forms, dialogs |
| `lg` | 40px | `px-6` | 16px | Primary page action |
| `xl` | 44px | `px-7` | 16px | Auth/hero only |
| `iconSm` | 32×32 | `p-0` | — | Close, row action |
| `iconMd` | 40×40 | `p-0` | — | Navbar, toolbar |
| `iconLg` | 48×48 | `p-0` | — | Touch-first contexts |

**Approved variants (product UI):**

| Variant | Appearance | Use |
| --- | --- | --- |
| `primary` | Orange fill, `#202020` text | One per screen region |
| `outline` | White/transparent, 1px neutral border, ink text | Default secondary action |
| `cancel` | `#f5f5f5` fill, neutral border | Dialog dismissal |
| `danger` | `#da2020` fill, white text | Destructive confirmation |
| `outlineBlack` | Black fill, white text | High-emphasis neutral (confirm in `ConfirmToast`) |
| `ghost` | Transparent, ink text | Icon-like low-emphasis actions |
| `common` | `#e4e4e4` fill | Rare neutral action |
| `muted` | `gray-100` fill | Inline chips-as-buttons |

**Removed in Phase 2:** `secondary`, `link`, `outlinePrimary`, `outlineDanger`,
`softPrimary`, `success`, `warning`, `info`, `dashed`, `gradient`. Do not re-add
these; use one of the eight approved variants above.

**States:** hover shifts one step (`--accentPrimaryHover`), active one more
(`Pressed`), disabled uses `Disabled` + `opacity-60`, loading replaces the label
with a spinner and disables the control. Buttons intentionally render no focus
outline (product decision 2026-11-12).

**Usage:**

```tsx
<Button variant="primary" size="sm" isLoading={saving} onClick={save}>
  {t("common.save")}
</Button>
<Button variant="outline" size="sm" onClick={cancel}>
  {t("common.cancel")}
</Button>
```

**Accessibility:** native `<button>`, `type` defaults to `"button"`, disabled
during loading. Icon-only buttons need `aria-label`.

**Responsive:** `sm`/`md` become ≥40px on touch surfaces through container
overrides (`[&_button]:min-h-11 sm:[&_button]:min-h-9` in `FloatingDialog`).
Do not set fixed 32px heights on mobile.

**Inconsistencies:** the eight remaining variants cover all product usage. The
focus-color, text-contrast, blue-tint and 17px `xl` issues were fixed in Phase 1
and Phase 2.

---

## 2. Icon buttons

There is no separate component. Canonical pattern:

```tsx
<button type="button" aria-label={label} title={label}
  className="grid size-8 shrink-0 place-items-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accentPrimary)]">
  <Icon size={16} aria-hidden="true" />
</button>
```

Mobile: `size-11` / `size-9` minimum 36–44px. Never render an icon-only control
below 32px.

---

## 3. Input

**Canonical:** `src/shared/ui/Input/Input.tsx` (dispatcher), `TextInput.tsx`,
`AmountField.tsx`, `PercentageField.tsx`, `DateField.tsx`, sizes in `sizes.ts`.

**Kinds:** `text` (default), `amount`, `percentage`, `date`.
**Variants:** `default` (1px `gray-300`), `outlined` (2px), `filled` (`gray-50`).
**Sizes:** `xs` 28px / `sm`,`md` 32px / `lg` 40px / `xl` 44px. Default `md`
(`h-8 text-xs px-4 rounded-md`).

**Anatomy:**

- Wrapper: `flex flex-col gap-1.5 w-full min-w-0`.
- Label: `font-semibold text-gray-700` at 11px; required fields append a red
  `*` (`RequiredMark`) and keep the control's native/`aria-required` state.
- Optional trailing `labelChip`: pill (`chip` size), tone from
  `INPUT_MESSAGE_TONE` (neutral/info/success/warning/danger).
- Field: white bg, `text-gray-900`, `placeholder:text-gray-400`,
  `hover:bg-gray-50`, `focus:bg-gray-50`. The focus indicator is the input-only
  neutral 1px outline (`#9ca3af`) from `src/index.css`.
- Error: `border-red-500`, message `text-red-600 text-[11px]` (`text-xs` at `xl`),
  global outline.
- Disabled: `bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`.
- Trailing slots shift right padding (`pr-8`, `pr-10`, `pr-16`) — do not hand-roll.

**Accessibility:** label `htmlFor` + generated `id`; `aria-invalid` and
`aria-describedby` point at the error `<span>`; date fields are a segmented
control with a calendar popover (verify keyboard path when touching).

**Usage:**

```tsx
<Input label={t("common.name")} value={name} errorMessage={errors.name}
  onChange={e => setName(e.target.value)} />
<Input kind="amount" label={t("common.amount")} currency={currency} />
```

**Inconsistencies:** `outlined`/`filled` are barely used; no shared `FormField`
wrapper, so vertical spacing drifts. The 10.5/12.5/15px sizes and the raw
textarea usages were fixed in Phase 2, PR 3.

---

## 4. Textarea

**Canonical:** `src/shared/ui/Input/Textarea.tsx`.

- Base: `w-full min-w-0 resize-y rounded-md border bg-white px-3 py-3
  text-[13px] text-gray-900`, `border-gray-300`, `placeholder:text-gray-400`,
  hover/focus `bg-gray-50`, disabled `bg-gray-100 text-gray-400`.
- Focus uses the input-only neutral outline; error uses `border-red-500` plus an
  `text-[11px] text-red-600` message wired with `aria-describedby`.
- With `label` it renders the same wrapper as `Input`; with neither label nor
  error it renders the bare field so existing `<label>` wrappers keep layout.
- `required` shows the shared `RequiredMark` and sets native/`aria-required`.

```tsx
<Textarea label={t("common.notes")} value={notes} required
  onChange={e => setNotes(e.target.value)} />
```

---

## 5. Select

**Canonical:** `src/shared/ui/Select/Select.tsx`, sizes in `sizes.ts`,
`CurrencySelect.tsx` for currencies.

**Behavior:** custom listbox trigger, portal panel, filter input (unless
`hideFilter`), checkboxes for multi-select, select-all/clear actions, keyboard
navigation with `aria-activedescendant`, viewport-aware placement (top/bottom),
max height clamped to available space, mobile bottom-anchored panel.

| Size | Trigger | Items | Use |
| --- | --- | --- | --- |
| `xs` | `h-7 px-2.5 text-[11px]` | 32px rows | Dense table filters |
| `sm` (common) | `h-8 px-3 text-xs` | 34px rows | Toolbars |
| `md` (default) | `h-8 px-4 text-xs` | 36px rows | Forms |
| `lg` | `h-10 px-4 text-[13px] rounded-lg` | 40px rows | Auth/large forms |
| `xl` | `h-11 text-base rounded-xl` | 44px rows | Hero forms |

**Appearance:** trigger `rounded-md` (except `lg`/`xl`), neutral border, white bg,
chevron 16px, optional count badge (`min-w-1.5rem h-5 text-[10px]`), label
`font-semibold text-gray-700` at 11px. Required fields append a red `*`.

**Panel:** `rounded-lg`/`rounded-xl` border `gray-200`, shadow
`0 8px 32px #26334d20`, `p-2` header for filter/actions, option rows `px-3 py-2`.

**Accessibility:** `role="listbox"`, `aria-multiselectable`, `aria-selected` per
option, trigger `aria-haspopup="listbox" aria-expanded aria-controls`. The
visible label names the trigger (no generic override). `errorMessage` adds
`aria-invalid`, `aria-describedby`, a red border and inline error text;
`required` adds `aria-required` and the shared marker.

**Usage:**

```tsx
<Select label={t("workspace.category")} items={categories} selected={selected}
  getItemKey={c => c.id} getItemLabel={c => c.name} onChange={setSelected} />
```

**Inconsistencies:** triggers are `h-8` for `sm` and `md` (identical heights,
different padding); `lg`/`xl` use `rounded-lg`/`rounded-xl`, breaking the
control-radius rule. The missing error state and 10.5px labels were fixed in
Phase 2, PR 3.

---

## 6. Checkbox

**Canonical:** `src/shared/ui/Checkbox/Checkbox.tsx` + `Checkbox.module.css`.

- Sizes: `small` 16px, `sm` 18px, `medium` 20px, `large` 24px (24 is not used in
  tables).
- Unchecked: `var(--checkboxCheck)` surface, 1px `var(--checkboxBorder)`, radius 4px.
- Checked/indeterminate: `var(--checkboxChecked)` fill (slate-800) with a
  `var(--checkboxCheck)` check/dash.
- Hover: `var(--checkboxHoverShadow)`; disabled: `opacity`/cursor.
- State transitions are limited to background, border and shadow (no `all`).
- Native `<input type="checkbox">` with `ref.indeterminate` sync.

**Usage:** table selection via `DataTable` (`selectable`), select-all with
indeterminate. Label text must be associated (`<label>` wrapping or `htmlFor`).

**Inconsistencies:** the dark checked state is intentional (it reads better than
the orange accent) and should be kept. Colors are tokenized and the unused
`colorClass`/`myBlueColor` surface was removed in Phase 2, PR 8.

---

## 7. Radio

No shared component. Only occurrence: inline radios in
`src/products/business/pages/Finance/components/EntryForm/EntriesModal.tsx`.
Until a primitive exists, radios must match Checkbox sizing and use a visible
2px accent border when selected. Do not introduce a second radio style.

---

## 8. Switch and ToggleSwitch

Two wrappers share one control (`src/shared/ui/Switch/SwitchControl.tsx`):

| Component | File | Use | Anatomy |
| --- | --- | --- | --- |
| `Switch` | `src/shared/ui/Switch/index.tsx` | Start of a list row where the row supplies the label | 36px hit area (44px on mobile), shared 36×20 track |
| `ToggleSwitch` | `src/shared/ui/ToggleSwitch/index.tsx` | Settings row with label + description | Full-width bordered row (`rounded-lg border-slate-200 px-3 py-3`), 44px hit area |

Both use the same `SwitchControl`: `role="switch"`, `aria-checked`, 16px thumb,
accent track when on, `group-hover` feedback, `disabled:opacity-40`. Buttons and
switches render no focus outline per the button rule. `ToggleSwitch` adds
`aria-labelledby` and `aria-describedby`; `Switch` uses `aria-label`/`title`.

**Rules:** use `Switch` in tables/lists, `ToggleSwitch` in settings forms. Do not
use a checkbox to represent an immediate on/off setting.

---

## 9. SegmentedControl

**Canonical:** `src/shared/ui/SegmentedControl/index.tsx`.

- Container: `inline-flex gap-[3px] rounded-lg border border-[#e8ebf0]
  bg-[#f5f7fa] p-[3px]`, horizontal scroll on overflow, hidden scrollbar.
- Item: compact 12px label, `rounded-md`, white surface + shadow when active,
  `text-gray-600` inactive.
- `tabs` prop switches `role="tablist"` with arrow-key roving focus; otherwise
  `role="group"`.
- `stretch` fills width (mobile), `disabled` disables all.

**Use for** view switches (list/board, income/expense). **Do not use for**
navigation between routes — use `NavLink` in the sidebar or tabs with URLs.

---

## 10. Card / Panel

**Canonical:** `src/shared/ui/Card/Card.tsx` (exported from `@/shared/ui/Card`).

| Prop | Values | Use |
| --- | --- | --- |
| `tone` | `panel` (gray border), `slate` (settings/reporting), `metric` (+ `shadow-sm`) | Surface family |
| `padding` | `none`, `compact` (`p-4`), `default` (`p-5`), `spacious` (`p-6`) | Body padding |
| `radius` | `lg` (default), `xl` | Existing personal/reporting surfaces still use `xl` |
| `title`, `description`, `actions`, `header`, `footer` | ReactNode | Optional framed header/footer |
| `as` | element type | `section` default; `div`, `form`, etc. |

```tsx
<Card title={t("section.title")} actions={<Button size="sm" variant="outline">…</Button>}>
  <p className="text-[13px] text-gray-700">{body}</p>
</Card>

<Card padding="compact" tone="slate" radius="xl">
  <p className="text-[13px] text-gray-700">{body}</p>
</Card>
```

With no header/footer, padding is applied to the root, matching the old
one-element recipe exactly. Twelve simple card sites were migrated in Phase 2, PR 4
(`PersonalPermissionRoute`, `PermissionMiddleware`, `OrganizationSettings`,
`ProductBillingSettings`, `FinancialCharts`, `PersonalDashboardPage`,
`OverviewActivity`). Remaining cards should adopt `Card` incrementally.

Metric tiles use `tone="metric"`; reporting may keep `rounded-[24px]`/`[28px]`
as a local exception. Never nest two bordered panels; use dividers.

---

## 11. DataTable

**Canonical:** `src/shared/ui/DataTable/index.tsx` (+ `README.md`). This is the
single record renderer for Settings, Accounting and Finance.

**Surface:** `rounded-lg border border-gray-200 bg-white shadow-none`,
`overflow-hidden`, optional `fillHeight` flex column.

**Table:** `w-full table-fixed text-left text-[13px]`, `md:min-w-[740px]`;
sticky `thead` (`bg-gray-50`, `z-10`), header cells `px-3 py-2.5 text-xs
font-medium text-gray-500`; rows `h-10`, `border-b border-gray-100`,
`hover:bg-gray-50`, last row no border.

**Columns:** `column.mobile` keeps secondary fields in the mobile card layout;
non-mobile columns are `hidden md:table-cell`. Resizing handles are 8px hit areas,
keyboard-adjustable with arrow keys.

**Footer:** `flex flex-wrap items-center justify-end gap-1 border-t
border-gray-200 bg-gray-50/50 px-3 py-2`; pagination buttons 32px (40px mobile),
`rounded-md text-xs text-slate-600`; `ResultsPerPage` popover.

**States:**

| State | Rendering |
| --- | --- |
| Initial load, no rows | `DataTableSkeleton` (same columns/selection/pagination) |
| Refresh with rows | Rows stay visible, `aria-busy`, no skeleton |
| Empty | Empty row/message, `emptyLabel`, no fabricated data |
| Error | Error surface with retry (passed by caller) |
| Selection | Shared `SelectionBar` (portals into the feedback stack; `max-w-[320px]` for DataTable) |
| Bulk delete confirm | Same bar becomes `alertdialog`; failed deletes stay selected |

**Accessibility:** `<table aria-label>`, select-all checkbox with
`aria-label`, shift-select, Escape clears overlays before selection, pagination
`aria-live="polite"` range text.

**Responsive:** below `md`, only `mobile` columns render, rows become taller, the
footer grows to 40px targets, and selection actions use their own toolbar when
supplied.

**Rules:** always pass `items` + `columns`; do not build an ad-hoc `<table>` for
records. Server pages pass `pager`; never slice server rows again. Use
`onInspect`/`SidePanel` for previews instead of inline expansion.

---

## 12. Dialogs, drawers and modals

| Component | File | Size | Surface | Use |
| --- | --- | --- | --- | --- |
| `DialogShell` | `src/shared/ui/DialogShell/DialogShell.tsx` | `center` or `drawer` | One scrim `slate-950/35 backdrop-blur-[2px]`, z-10030, `role=dialog` | Shared overlay/focus/Escape/scroll-lock frame |
| `FloatingDialog` | `src/components/Modal/FloatingDialog/index.tsx` | Fixed `width`/`height`, clamped to viewport | `DialogShell center`, form body/footer | Form dialogs |
| `SidePanel` | `src/components/Modal/SidePanel` + `side-panel.css` | `min(640px,100vw)`, full `100dvh` | `DialogShell drawer`, white panel, left border | Preview/edit drawer |
| `ModalShell` | `src/components/FinancialActivityPanel/ui/ModalShell.tsx` | `max-w-3xl` default | `DialogShell center`, loading overlay | Domain modal (financial activity) |

**Shared behavior (provided by `DialogShell`):**

- Portal to `document.body`.
- `role="dialog" aria-modal="true"` + `aria-labelledby` (and `aria-describedby`
  when a description exists).
- Focus trap via `useDialogFocus`, restore focus to the trigger on close.
- Body scroll lock while open.
- Escape closes only the topmost layer (`window.useGlobalEsc`); disabled while
  busy and when a nested overlay owns focus.
- One scrim, one z-index (`10030`), one 16px title scale, one close affordance.
- Reduced motion removes translate/scale.
- Footer actions: cancel (`outline`/`cancel`) left or right, primary right;
  mobile buttons ≥44px.

**FloatingDialog structure:** `DialogShell` header (11px eyebrow, 16px title,
description `text-xs`), scrollable `fieldset` (`px-4 py-5 sm:px-6 sm:py-6`),
sticky footer (`border-t bg-slate-50/50 px-4 py-3`), optional nested overlay with
its own focus trap and `inert` on the form body.

**Remaining differences:** `SidePanel` keeps drawer-specific CSS for its
scroll/footer/tabs layout; header title/close sizes now match the shared scale.

---

## 13. Popover, menu, tooltip

**`Popover`** (`src/shared/ui/Popover/Popover.tsx`): portal, anchored,
viewport-clamped, `CLOSE_MS = 150`, `appearance="settings"` for settings styling,
mobile variant anchors to the bottom (`inset-x-3 bottom-3 max-h-[80dvh]`),
`rounded-xl border-gray-200 shadow-[0_8px_32px_#26334d20]`.
**`CompactActionMenu`**: 180px wide, `rounded-lg`, 5px padding, 9px item padding,
12px text, danger color `#c52d38`, keyboard Escape returns focus to anchor.
**`InfoTooltip`**: portal, 120ms close delay, reposition on scroll/resize,
`role="tooltip"` via trigger `aria-describedby`; 13px text on dark or white card.
**`SidebarTooltip`**: collapsed-rail label; portal, side-aware placement with
left flip and vertical clamp, dark compact surface with arrow, opens on hover and
focus, closes on leave/blur/outside/Escape; 140ms entrance and reduced-motion safe.

**Rules:** menus close on outside pointer, scroll, and Escape. Anchored panels
must flip when there is no space. Tooltips never carry essential information.

---

## 14. Feedback: Snackbar, ConfirmToast, inline alerts

**Feedback stack:** `FeedbackStackProvider` (`src/shared/ui/FeedbackStack`) renders
one fixed bottom-center flex stack at `z-[15000]`. `Snackbar`, `ConfirmToast`,
`DataTable` selection bars and the Finance/Personal selection toolbars portal into
it, so active feedback layers stack with a 12px gap instead of overlapping.

**`Snackbar`** (`src/shared/ui/Snackbar/Snackbar.tsx`): stack item (or fixed
bottom-center when used without the provider), `rounded-xl` white/95 surface with
ring + shadow, `p-3.5` (14px), icon tile 28px `rounded-lg`, message `text-[13px]`,
5s auto-hide, pauses on hover and keyboard focus, errors persist until dismissed
(`persistOnError` default true), `role="alert"` for errors and `role="status"`
otherwise, `aria-atomic`. Tones: success `emerald`, error `rose`, warning `amber`,
info `slate`.

**`ConfirmToast`**: stack item, `max-w-[320px]`, `rounded-xl`,
`role="alertdialog"`, Escape cancels, focus moves to Cancel on open, mobile
collapse toggle with `aria-expanded`/`aria-controls`, body `inert` when
collapsed. Variants `default`/`danger`; confirm uses `outlineBlack` by default.

**Confirmation policy (DS-048):**

1. **Record action** (row/record delete, import) → `ConfirmToast`.
2. **Bulk destructive action on a selection** → `SelectionBar` with
   `role="alertdialog"`, so the selected rows and actions stay in context.
3. **Unsaved changes inside a dialog** → inline confirmation overlay inside that
   dialog, because closing would discard the form.

Do not add a fourth confirmation presentation. New record actions use
`ConfirmToast`.

**Inline alerts** (no component): `rounded-md border px-3 py-2 text-xs` with
`emerald/amber/red/slate` tones. Use for persistent page-level status
(quota, onboarding), not for transient results.

---

## 15. Badges and status indicators

Use `Badge` (`src/shared/ui/Badge`). Canonical pattern:

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="warning" variant="outline" size="md">Required</Badge>
<Badge tone={isUp ? "success" : "danger"} size="md" dot>+12.4% period</Badge>
```

- Tones: `neutral`, `success`, `warning`, `danger`, `info`, `lime`, `orange`.
- Variants: `soft` (tinted fill, default) and `outline` (white fill).
- Sizes: `sm` 10px, `md` 11px; `px-2 py-0.5`, 20–24px height.
- `rounded-full` for counts/status. Inline chips inside inputs use
  `rounded`/`rounded-md` (`Input` `labelChip` keeps its chip size + tone map).
- `dot` adds a leading status dot; the label must still carry the meaning.
- Never use a badge as a button.

Migrated in Phase 4, PR 16: workspace current badges, plan current badge,
onboarding done/required, reporting change/status badges, correlation group
labels, settings background-sync badges, and the limits usage `ToneBadge`.

---

## 16. Loading states

| Component | File | When |
| --- | --- | --- |
| `DataTableSkeleton` | `src/shared/ui/DataTable/DataTableSkeleton.tsx` | First table load; mirrors columns/selection/pagination |
| `PageSkeleton` | `src/shared/ui/Loaders/PageSkeleton.tsx` | Page-level first load; content only, page heading stays. Variants mirror page compositions: `table`, `limits`, `settings-table`, `form`, `sections`, `panel`, `settings-form`, `groups`, `settings-list`, `dashboard`, `billing`, `onboarding`, `review`, `accounting`, `correlations`, `fields` |
| `PageSkeletonShell` | same file | Page frame for routes without their own container: canonical `max-w-[1440px]` + `px-4 py-6 sm:px-7` |
| `SettingsPageSkeleton` | same file | Settings frame: `.settings-page` + `.settings-content`; heading stays in `SettingsLayout` |
| `SkeletonLine` | same files | `rounded bg-gray-100` with a `shimmer` sweep; static under reduced motion |
| `Shimmer` | `src/shared/ui/Loaders/Shimmer.tsx` | Decorative shimmer block; requires `@keyframes shimmer` (exists in `index.css`) |
| `Spinner` | `src/shared/ui/Loaders/Spinner.tsx` | Inline button/panel busy; `role="status" aria-label="loading"` |
| `TopProgress` | `src/shared/ui/Loaders/TopProgress.tsx` | Route/section progress; sticky 2px content bar (`z-20`) or centered minimal line; no visible text/shadows; reduced-motion safe |
| `PageLoader` | `src/shared/ui/Loaders/PageLoader.tsx` | Full-page blocking load |

Rules: skeleton for layout-shaped waits, spinner for actions under ~300ms,
progress bar for navigation. Never show both skeleton and spinner for the same
region. Skeletons use `aria-busy` + `sr-only` label. `PageSkeleton` carries no
page gutter or fake title: the layout owns page chrome. Use `PageSkeletonShell`
or `SettingsPageSkeleton` only when the route has no container of its own.

Phase 4, PR 15 audit: page first loads use `PageSkeleton`/`DataTableSkeleton`,
dialogs use `DialogSkeleton`, and no app page renders an inline `Spinner` or
`PageLoader` for first load. Keep that split; add a spinner only for a
sub-300ms action.

---

## 17. Empty and error states

Use the shared primitives in `src/shared/ui/State`:

```
<EmptyState
  title={t("…")}                 // required, 13px medium gray-700
  description={t("…")}           // optional, 12px leading-5 gray-500
  icon={<Inbox size={22} />}     // optional, caller-sized, gray-300
  action={<Button size="sm" variant="outline">…</Button>}
  size="sm" | "md"               // py-8 / py-12; use `xs` only inside compact cards
/>

<ErrorState
  message={error}                // required
  title={t("…")}                 // optional
  tone="danger" | "warning"      // red or amber recipe
  variant="panel" | "inline"     // bordered panel, or inline inside an existing card
  size="sm" | "md"               // p-3 text-xs / p-4 text-sm
  action={<Button …>…</Button>}  // retry when retry is possible
/>
```

Canonical recipe (from table/dialog usage):

```
centered column, py-8/py-12, icon 22–24px text-gray-300,
title text-[13px] font-medium text-gray-700,
description mt-1 text-xs leading-5 text-gray-500,
optional action Button size="sm" variant="outline"
```

Errors offer a retry action and preserve existing data. Empty states never
invent rows or zero-values. `DataTable` accepts `emptyLabel` and renders it
through `EmptyState`; callers supply domain copy through i18n.

Migrated in Phase 4, PR 15: `DataTable` empty/error, `AccountBalancePanel`
error, `FinancialCharts` no-activity overlay, Navbar notifications, workspace
management, personal dashboard lists, Overview attention/accounts, workspace
switcher, saved-view/config modals, accounting periods, and personal record
dialog. Reporting keeps its richer empty illustration; document any remaining
local state as intentional.

---

## 18. Charts and sparklines

`src/shared/ui/Sparkline` is the only shared visualization primitive. Reporting
charts are feature-local (`Reports/components/*`). Rules: inherit `currentColor`
for sparklines; use the provisional series order in
[04-colors-and-themes.md](04-colors-and-themes.md); label axes at 11px
`text-gray-500`; gridlines `gray-200`; no 3D, no pie charts with more than five
slices.

---

## 19. Component-level migration summary

| Component | Action | Phase |
| --- | --- | --- |
| Button | ✅ Reduced to 8 variants, 16px `xl` (PR 3) | 2 |
| Input/Select | ✅ 11px labels, 12px errors, Select validation (PR 3) | 2 |
| Textarea | ✅ Shared primitive added (PR 3) | 2 |
| Card | ✅ Primitive added; 12 card sites migrated (PR 4) | 2 |
| Dialog family | One z-index, one scrim, one focus color, one title size | 2 |
| DataTable | Keep; extract selection bar component | 4 |
| Snackbar/ConfirmToast | Keep; align radius/shadow tokens | 2 |
| EmptyState/ErrorState | ✅ Primitives added; shared surfaces migrated (PR 15) | 4 |
| Badge | ✅ Primitive added; status/count labels migrated (PR 16) | 4 |
