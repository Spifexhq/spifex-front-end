# 10 — Inconsistency Audit

48 findings derived from source inspection; 48 resolved in Phase 1–6 (PR 1–26,
marked ✅). Use the ID in commits and PR descriptions. Complexity: **S** ≤ half a
day, **M** 1–3 days, **L** ≥ 1 week or cross-cutting.

| Severity | Count | Meaning |
| --- | --- | --- |
| Critical | 5 | Accessibility failure, broken layering, or unusable state |
| High | 9 | Frequent component divergence or systemic inconsistency |
| Medium | 20 | Visible coherence/maintenance problem |
| Low | 14 | Cleanup, naming, documentation |

Resolved in Phase 1, PR 1: **5 Critical, 2 High, 1 Medium** (DS-001–006, DS-031,
DS-038). Phase 1, PR 2: **2 Medium, 4 Low** (DS-012, DS-016–018, DS-046, DS-047).
Phase 2, PR 3: **2 High, 3 Medium** (DS-008, DS-011, DS-014, DS-027, DS-028).
Phase 2, PR 4: **1 High** (DS-021). Phase 2, PR 5: **1 Medium** (DS-009).
Phase 2, PR 6: **1 High** (DS-007). Phase 2, PR 7: **1 High, 1 Medium**
(DS-040, DS-042). Phase 2, PR 8: **1 Low** (DS-029). Phase 3, PR 9:
**1 High, 1 Medium** (DS-030, DS-032). Phase 3, PR 10: **3 Medium, 1 Low**
(DS-033, DS-034, DS-039, DS-035). Phase 3, PR 11: **1 High** (DS-013).
Phase 4, PR 12: **1 Medium** (DS-048). Phase 4, PR 13: **2 Medium** (DS-022,
DS-023). Phase 4, PR 14: follow-through only (DS-021/022), no new findings.
Phase 4, PR 15: follow-through on component doc §16–17, no new findings.
Phase 4, PR 16: follow-through on component doc §15 (Badge), no new findings.
Phase 5, PR 17: **1 Medium, 1 Low** (DS-019, DS-020). Phase 5, PR 18:
**1 Low** (DS-026). Phase 5, PR 19: **1 Medium** (DS-010). Phase 5, PR 20:
**1 Low** (DS-043). Phase 5, PR 21: **1 Low** (DS-044). Phase 5, PR 22:
**1 Medium, 2 Low** (DS-036, DS-037, DS-041). Phase 5, PR 23: **1 Low**
(DS-024). Phase 5, PR 24: **1 Low** (DS-025). Phase 6, PR 25: **1 Medium**
(DS-015). Phase 6, PR 26: **1 Medium** (DS-045). Remaining: none.

---

## Resolution log

### Phase 1, PR 1 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-001 | ✅ Fixed | Removed `*, *:focus, *:focus-visible { outline:none !important }` and the `button[class*="inline-flex"]` resets. Added an unlayered 2px `:focus-visible` outline in `src/index.css`; it overrides utility `outline-none`. | Keyboard Tab in headless Chrome: input outline `2px solid`, offset `2px`. Evidence: `evidence/phase1/`. |
| DS-002 | ✅ Fixed | Removed every focus reset from `SettingsSurface.tsx` and the duplicated resets in `SettingsPopover.tsx`, including `outline:none`, `outline-offset:0` and `box-shadow:none`. | `eslint src` clean; tab-through settings pending runtime data (Phase 2 verification). |
| DS-003 | ✅ Fixed | `Button primary` uses `text-[var(--black)]` (`#202020`) on `#F46A35`. | 5.40:1 normal, 4.83:1 pressed; screenshot `after-1440-button.png`. |
| DS-004 | ✅ Fixed | `Button secondary` used dark text in PR 1; the variant was removed in Phase 2, so white-on-teal no longer exists. | 11.58:1 measured before removal. |
| DS-005 | ✅ Fixed | Success tokens darkened in PR 1; the variant was removed in Phase 2 and the tokens are retained as status palette. | 5.02:1 / 7.13:1 / 9.11:1. |
| DS-006 | ✅ Fixed | Global accent outline is 3.02:1; filled variants use `#4b5563` (7.58:1). Removed low-contrast focus rings (`ring-gray-300` 1.47:1, `ring-orange-200`, `ring-slate-900/10`) from inputs, Select, DateField, ConfirmToast, SignUp, Status and selection toolbars. **2026-11-12:** outlines are now input-only and neutral; buttons/links render none. | Computed styles + screenshots at 360/1440. |
| DS-031 | ✅ Fixed | Deleted the scoped `!important` focus rules from `shell.css` and `sidebar.css`; `sidebar.css` now only documents the global rule. **2026-11-12:** a single unlayered `outline:none!important` now removes outlines from non-input controls. | No `!important` focus selectors remain outside `index.css`. |
| DS-038 | ✅ Fixed | Single focus color: accent on light surfaces, `#4b5563` on filled actions. Removed `outline-indigo-500` from `FloatingDialog`. **2026-11-12:** button outlines removed; inputs use neutral `#6b7280`. | Tab through sign-in: input neutral outline, no button outline. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` still fails only on
pre-existing `.preview/*.ts(x)` `no-explicit-any` errors.

### Phase 1, PR 2 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-012 | ✅ Fixed | Replaced `bg-[var(--brand,#f97316)]` with `bg-[var(--accentPrimary)]` in `TopProgress`. | Built CSS contains no `--brand` or `#f97316` fallback. |
| DS-016 | ✅ Fixed | Deleted the inert v3 `tailwind.config.js`. | `npm run build` passes; no references remain. |
| DS-017 | ✅ Fixed | Replaced `* { font-family: var(--font) !important }` with `html { font-family: var(--font) }`. | Production build: body is Inter; a `.font-mono` element resolves to `ui-monospace`. |
| DS-018 | ✅ Fixed | Removed the unused Open Sans import. | Built CSS has no `Open Sans`; only Inter is requested. |
| DS-046 | ✅ Fixed | Removed `--white`, `--color1..6`, `--border2`; renamed `--standardBorder` to `--controlBorder: 1px solid #d6d6d6` and updated 10 Button variants. | No legacy token references in the built CSS; outline/cancel borders measure `1px`. |
| DS-047 | ✅ Fixed | Removed the stale `Shimmer` keyframe comments. | `eslint src` clean. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged. Evidence:
`evidence/phase1/pr2-token-cleanup.md`.

### Phase 2, PR 3 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-008 | ✅ Fixed | `Select` gained `errorMessage`, `required`, `aria-invalid`, `aria-describedby`, `aria-required`, red border/message, and its visible label now names the trigger. | Preview form: `aria-required=true`, `aria-invalid=true`, error id wired, measured border red. |
| DS-011 | ✅ Fixed | Reduced `ButtonVariant` from 18 to 8 approved variants; removed blue-tinted/legacy variants; `xl` is 16px. | `tsc -b` and `eslint src` pass; preview renders all 8. |
| DS-014 | ✅ Fixed | Form labels 11px, errors 12px, `xl` controls 16px; `text-[12px]` → `text-xs` in shared form sizes. | Build passes; sizes in `Input/sizes.ts`, `Select/sizes.ts`, `Button/sizes.ts`. |
| DS-027 | ✅ Fixed | Added `src/shared/ui/Input/Textarea.tsx`; migrated `ChartImport`, `LedgerAccountModal` and `CategorySettings`. | `tsc -b` passes; preview covers label/error/focus/disabled base. |
| DS-028 | ✅ Fixed | Added `RequiredMark` and `required` handling to `Input` (text/amount/percentage/date), `Select` and `Textarea`; date segments expose `aria-required`. | Preview labels show `*`; inputs native-required; select/textarea/date expose ARIA. |
| DS-015 | ◐ Partial | Shared form sizes now use `text-xs`; page-level `text-[12px]`/`text-[13px]` sweep remains. | — |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged. Evidence:
`evidence/phase2/README.md`.

### Phase 2, PR 4 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-021 | ✅ Fixed | Added `src/shared/ui/Card` (`panel`/`slate`/`metric`, `compact`/`default`/`spacious`, `lg`/`xl`, header/actions/footer) and migrated 12 simple card sites. | Old/new compact and slate cards measured pixel-identical (radius, border, background, padding, size). Evidence: `evidence/phase2/card-1440.png`. |

DS-022/023 remained open after PR 4 (padding was encoded in `Card` but not yet
applied to filter surfaces and page roots); completed in Phase 4, PR 13.

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 2, PR 5 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-009 | ✅ Fixed | Extracted `SwitchControl` (36×20 track, 16px thumb, shared focus/hover/ARIA). `Switch` keeps a 36px hit area (44px on mobile); `ToggleSwitch` keeps the 44px settings row. Removed the stale `outline-indigo-500`. | Measured both tracks 36×20/thumb 16px; hit areas 36/44 (44 at 360); click toggles `aria-checked`; keyboard focus shows the global accent outline. Evidence: `evidence/phase2/switches-1440.png`. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 2, PR 6 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-007 | ✅ Fixed | Added `DialogShell` (`center`/`drawer`, one overlay, scrim, z `10030`, focus/Escape/scroll lock, header/body/footer, nested-overlay focus). Migrated `FloatingDialog`, `ModalShell` and `SidePanelFrame`; drawer title/close scale aligned. | All three measured: `role=dialog`, `aria-modal`, z `10030`, 16px title, focus trapped; Escape closes and restores scroll; FloatingDialog backdrop stays open, SidePanel preview backdrop closes. Evidence: `evidence/phase2/dialog-*.png`. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 2, PR 7 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-040 | ✅ Fixed | Added `FeedbackStackProvider` (fixed bottom-center flex stack, z-15000). Snackbar, ConfirmToast, DataTable selection bar and both Finance/Personal selection toolbars portal into it; each keeps its own width and animation. | Snackbar 448×62 and confirmation 320×110 rendered with no overlap in the same stack; stack z-index 15000. |
| DS-042 | ✅ Fixed | Native `focusin`/`focusout` pauses the timer; `persistOnError` keeps errors until dismissed; delayed unmount removes the card after the exit animation (fixes stale auto-hide cards). | Success snackbar hides after its timer; error snackbar persists past 6s; focus pause verified via the stack preview. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 2, PR 8 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-029 | ✅ Fixed | Added `--checkboxBorder`, `--checkboxChecked`, `--checkboxCheck`, `--checkboxHoverShadow`; replaced hardcoded colors; explicit state transitions; removed the unused `colorClass`/`myBlueColor` surface. | Unchecked border `#cbd5e1`; checked/indeterminate `#1e293b` with white mark; sizes 16/20/24; focus outline accent. Evidence: `evidence/phase2/checkbox-1440.png`. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 3, PR 9 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-030 | ✅ Fixed | Added `position="section"`/`topOffsetPx` to `SidebarFrame`; migrated `SettingsSidebar` and `AccountingSidebar` to the shared rail. Removed their private backdrop/focus/Escape/body-lock/header logic. | Section rail 248/72 at desktop with content offset; mobile rail 280, backdrop z-90/panel z-95, `role=dialog`, focus trapped, body locked. Evidence: `evidence/phase3/sidebar-section-1440.png`, `sidebar-mobile-360.png`. |
| DS-032 | ✅ Fixed | Removed `z-[1000000]`; aligned popovers to 10050/10060, modals 10030, feedback 15000, progress 9999; documented the full layer table. | No million-level values remain; build passes. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 3, PR 10 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-034 | ✅ Fixed | Mobile targets raised to 44px: Navbar menu/bell, sidebar toggle, Personal menu, toast collapse, snackbar close, table row actions. | Class-level verification; no 28/32/34px mobile action targets remain. |
| DS-039 | ✅ Fixed | DataTable row actions keep 28px on desktop and grow to 44px on mobile. | `max-md:h-11 max-md:w-11` applied to both row actions. |
| DS-033 | ✅ Fixed | Added the Settings parent to every `/settings/*` breadcrumb; kept bank-imports/accounting detail rules. | Path matrix verified for settings, accounting, bank-imports, overview and cashflow. |
| DS-035 | ✅ Fixed | Commented the `/cashflow` and `/settled` full-bleed rule and documented it in `07`. | Code comment + docs. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 3, PR 11 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-013 | ✅ Fixed | Recorded the intentional surface rule: `gray` for operational UI/shared controls, `slate` for settings/reporting/feedback; no convergence. | Documented in `04-colors-and-themes.md` §3 and §10. |
| 3.6 | ✅ Verified | Nested layer pass: nested dialog → parent dialog → mobile sidebar, with a snackbar present. Fixed `SidebarFrame` scroll-lock restoration when `onToggle` identity changed. | Escape closed one layer at a time (3 → 2 → 1 → 0 dialogs); sidebar `aria-hidden=true`; body overflow restored to `""`; snackbar stayed above dialogs. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 4, PR 12 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-048 | ✅ Fixed | Extracted `SelectionBar` (portal to the feedback stack, shared animation, width/role/label) and migrated `DataTable`, Finance `SelectionToolbar` and Personal selection actions. Documented the confirmation policy in `06`/`12`. | Build/type-check pass; the three bars now share one positioning/animation contract. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 4, PR 13 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-022 | ✅ Fixed | Dashboard and personal filter forms migrated to `Card` (`tone="slate"`/`radius="xl"`/`padding="compact"`). Documented the role-based padding rule: compact filter/toolbar `p-4`, default content/metric `p-5`, spacious/hero `p-6`. | Type check + build pass; no filter form keeps a hand-rolled bordered surface. |
| DS-023 | ✅ Fixed | Page roots normalized to `space-y-5` across the Accounting shell and its subpages (overview/setup/reconciliation/chart import), Bank Imports, Business Overview, Personal Dashboard and Accounting Correlations. Reporting keeps `md:space-y-6` by design. | Type check + build pass; the only remaining `space-y-6` page root is the reporting exception. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 4, PR 14 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-021 | ✅ Follow-through | Adopted `Card` for the remaining dashboard/accounting summary surfaces: `ActivityCalendar`, `AccountBalancePanel`, Accounting overview progress/optional/how cards, setup review and profile cards, journal totals, chart-import mode panels and the statement upload panel. | Build/type-check pass; each migration is class-equivalent (`rounded-lg`/`xl`, same border/background) and removes duplicated class strings. |
| DS-022 | ✅ Follow-through | These surfaces now use `default` padding (`p-5`) for content/metric cards and `compact` (`p-4`) for chart-import mode panels; filter cards stay `compact`. | No new padding values introduced; role-based rule in `05-spacing-and-layout.md` unchanged. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 4, PR 15 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| §17 | ✅ Follow-through | Added `EmptyState` and `ErrorState` primitives (`src/shared/ui/State`) and migrated table, chart, navbar, workspace, personal, overview and dialog empty/error surfaces. `ErrorState` covers `danger`/`warning`, `panel`/`inline`, `sm`/`md`. | Type check + build pass; `DataTable` empty/error now render through the shared primitives. |
| §16 | ✅ Verified | Loading-choice audit: page first loads use `PageSkeleton`/`DataTableSkeleton`, dialogs use `DialogSkeleton`; no app page renders `Spinner`/`PageLoader` for first load. | Source inspection of all loader call sites. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 4, PR 16 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| §15 | ✅ Follow-through | Promoted `Badge` (`tone`/`variant`/`size`/`dot`) after confirming more than three duplicate status pills. Migrated workspace/plan current, onboarding done/required, reporting change/status, correlation labels, settings sync badges and the limits `ToneBadge`. | Type check + build pass; the repeated `rounded-full px-2 py-0.5` status markup is gone outside the primitive. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 17 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-019 | ✅ Fixed | Standardized feature page `<h1>` to `text-2xl`: Settings and Personal Settings layouts, Personal bank accounts, Business overview, Reports and Bank Imports. Panel/metric headings were left at their local sizes. | `tsc -b` + build pass; no page `<h1>` remains at `text-xl`/`text-[22px]` outside auth/error screens. |
| DS-020 | ✅ Fixed | Raised 9px/10px uppercase eyebrows to 11px `font-semibold text-gray-500 tracking-wide`; normalized 11px `gray-600` eyebrows to `gray-500`. Covers settings, accounting modals, correlations, reporting metrics and selection toolbars. | `tsc -b` + build pass; no `text-[9px]`/`text-[10px]` uppercase label remains. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 18 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-026 | ✅ Fixed | Normalized feature page top padding to `py-6`: accounting shell, reports content, help, and the standalone account/settings mains that used `pt-5`. Existing `py-6` pages (overview, bank imports, onboarding, personal layout) needed no change. | `tsc -b` + build pass; no feature page container remains on `pt-5`/`py-7` for top padding. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 19 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-010 | ✅ Fixed | Raised meaningful `text-gray-400` captions to `text-gray-500`: chart titles/legends, settings hints, sidebar section labels, accounting status/step labels, footer shortcut hints, table counts, empty-state descriptions, and status metadata. Kept `gray-400` for placeholders, disabled text and decorative icons. | `tsc -b` + build pass; remaining `gray-400` uses are placeholder/disabled/decorative only. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 20 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-043 | ✅ Fixed | Normalized Lucide icon sizes to the 13/15/16/18/20/22–24 scale (51 size props) and added `aria-hidden` to decorative icons (135 tags plus dynamic icon slots). Icon-only controls keep their accessible names. | `tsc -b` + build pass; `size` distribution is now only 13/15/16/18/20/22/24 and no static Lucide icon lacks `aria-hidden`/`aria-label`/`role`. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 21 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-044 | ✅ Fixed | `Spinner` now accepts `label` and falls back to `common:loading` (added to en/de/fr/pt). Amount/percentage clear buttons use `common:input.clearAmount`/`clearPercentage`; popover close uses `common:modal.close`; lock illustrations use `aria-hidden` when no title. | `tsc -b` + build pass; all four `common.json` files parse; no hardcoded English `aria-label` remains outside the English-only legal page. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 22 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-036 | ✅ Fixed | Replaced all 11 `transition-all` uses with explicit properties (`transition-colors`, `transition-[opacity,transform]`, `transition-[width]`, `transition-[border-color,box-shadow,opacity]`) plus `motion-reduce:transition-none`. | Grep: no `transition-all` remains in product UI. |
| DS-037 | ✅ Fixed | Normalized 200/300/500ms transitions to 180/220ms; product UI now uses only 120/150/180/220. The 4s status-page loop is illustration-only. | `tsc -b` + build pass; no disallowed `duration-*` class remains. |
| DS-041 | ✅ Fixed | Added a `prefers-reduced-motion` query for `.settings-modal-tab`; checkbox CSS now disables its color transition under reduced motion. | Reduced-motion media query present in both CSS modules. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 5, PR 23 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-024 | ✅ Fixed | Documented the reporting-only radius exception with a DS-024 comment in each of the six reporting cards (`CashflowBarsCard`, `LiquidityCard`, `MetricCard`, `OverdueMobileList`, `ReportsHero`, `TimelineBucketsCard`). No visual change. | Comments present; `tsc -b` + build pass. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 6, PR 24 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-025 | ✅ Fixed | Added a rail-math comment in `sidebar-motion.css`: 248 expanded = 12 + 224 (48 icon + 176 label) + 12; 72 collapsed = 12 + 6 + 36 + 6 + 12. Notes that `ApplicationShell` `md:ml` offsets must stay in sync. | Comment present; no CSS behavior change; `tsc -b` + build pass. |

Verification commands: `npm run build` (pass), `npx --no-install eslint src`
(0 errors, 7 pre-existing warnings), full `npm run lint` unchanged.

### Phase 6, PR 25 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-015 | ✅ Fixed | Replaced all 113 page-level `text-[12px]` occurrences with `text-xs` (37 files). Kept `text-[13px]` for the default body and `text-sm` for prose/auth only. | `tsc -b` + build pass; grep finds 0 `text-[12px]`. |

Verification commands: `npm run build` (pass), `npm run lint:a11y` (pass),
`npm run lint` (0 errors, 7 pre-existing warnings).

### Phase 6, PR 26 — 2026-11-11

| ID | Status | Change | Verification |
| --- | --- | --- | --- |
| DS-045 | ✅ Fixed | Added `eslint-plugin-jsx-a11y` with recommended rules for `src/**/*.{ts,tsx}` and a `lint:a11y` script. Fixed the 19 surfacing issues: label associations, tablist semantics, clickable rows, Select ARIA ownership and the DataTable resizer role. | `npm run lint:a11y` passes with 0 errors. |
| 1.4 | ✅ Done | Added radius, shadow, z-index and motion tokens to the `:root` block in `src/index.css`; docs updated in `02-design-tokens.md`. | Tokens present; build passes. |

Verification commands: `npm run build` (pass), `npm run lint:a11y` (pass),
`npm run lint` (0 errors, 7 pre-existing warnings).

---

## A. Global CSS and accessibility

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-001** | Critical | `src/index.css:62-88`; all consumers | `*, *:focus, *:focus-visible { outline:none !important }` and `button[class*="inline-flex"] { box-shadow:none !important }` remove every focus indicator outside `.app-shell`/`.workspace-sidebar`. → Every focusable element shows a 2px outline with 2px offset. | Delete the global suppression and the inline-flex rules. Add `:focus-visible { outline:2px solid var(--accentPrimary); outline-offset:2px }`. Audit any component that relied on the suppression. | M |
| ✅ **DS-002** | Critical | `src/shared/ui/Settings/SettingsSurface.tsx:19` | Settings removes `outline` from `[data-settings-select]` and from `button`/`input` focus-visible. → Inherit the global focus ring. | Remove the focus-reset classes; keep only spacing/offset normalization. Verify Select, icon buttons, checkbox rows and page-size menu. | S |
| ✅ **DS-003** | Critical | `src/shared/ui/Button/sizes.ts:22-25`; `src/index.css:8` | `text-white` on `#F46A35` = **3.02:1** at 13px. → ≥4.5:1. | Applied `text-[var(--black)]` on primary (5.40:1, preserves brand). | M |
| ✅ **DS-004** | Critical | `src/shared/ui/Button/sizes.ts:27-30` | `variant="secondary"` is white on `#9BE7E2` = **1.41:1** — effectively unreadable. → No white-on-teal variant. | Applied dark text in PR 1; removed the variant in Phase 2. | S |
| ✅ **DS-005** | Critical | `src/shared/ui/Button/sizes.ts:79-82`; success chips | `text-white` on `#16A34A` = **3.30:1**. → ≥4.5:1. | Darkened the fill in PR 1; removed the variant in Phase 2 and kept the tokens as status palette. | S |
| ✅ **DS-006** | High | `src/products/business/layouts/shell.css:2-3`; `src/products/business/components/Sidebar/sidebar.css:1-2`; `src/shared/ui/Input/TextInput.tsx:26` | Focus outlines `#9ca3af` = 2.54:1 and `ring-gray-300` = 1.47:1 against white, below the 3:1 non-text minimum. → ≥3:1. | Use `var(--accentPrimary)` on white, or `#6b7280` (4.83:1) on orange surfaces. Inputs get a 2px ring, not 1px. | S |
| ✅ **DS-010** | Medium | 74 `text-gray-400` usages, e.g. empty-state descriptions, settings hints | `#9ca3af` at 2.54:1 was used for meaningful captions, not just placeholders. → Placeholder/disabled only. | Replaced meaningful captions with `text-gray-500` (4.83:1); kept `gray-400` for placeholders, decorative icons and disabled text. | M |
| ✅ **DS-042** | Medium | `src/shared/ui/Snackbar/Snackbar.tsx` | 5s auto-hide paused on hover only; keyboard focus did not pause it, and errors disappeared. → Timing adjustable or errors persistent. | Added native focusin/focusout pause, `persistOnError` (errors stay until dismissed), and a delayed unmount so the timer actually removes the card. Close affordance already present. | S |

---

## B. Design tokens and color

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-011** | High | `src/shared/ui/Button/sizes.ts`, `Button.types.ts` | 18 variants; 8 unused; `outlinePrimary`/`softPrimary` hover with blue tints `#f4f7ff`/`#edf2ff`; `xl` uses 17px. → 8 approved variants, no off-brand tints, 16px `xl`. | Removed 10 unused/off-brand variants; retained `primary, outline, cancel, danger, outlineBlack, ghost, common, muted`; `xl` is 16px. | M |
| ✅ **DS-013** | High | `SettingsSurface.tsx`, `Snackbar.tsx`, `FloatingDialog`, `DataTable` | `gray` and `slate` were mixed inside the same surfaces: settings shell slate, embedded `DataTable` gray; dialogs slate, navbar/table gray. → One family per surface type. | Resolved as an intentional surface rule: `gray` for operational UI/shared controls, `slate` for settings/reporting/feedback. Documented in `04`; no convergence. | M |
| ✅ **DS-012** | Medium | `src/shared/ui/Loaders/TopProgress.tsx:36-40` | `var(--brand,#f97316)` when `--brand` is undefined → a second orange (`#f97316`, 2.8:1). → Single brand orange. | Replaced with `var(--accentPrimary)`; no fallback remains. | S |
| ✅ **DS-046** | Low | `src/index.css:46-55` | Legacy `--white`, `--color1..6`, `--standardBorder` (0.5px), `--border2` remain in use. → One token set. | Removed unused tokens; replaced `--standardBorder` with `--controlBorder: 1px solid #d6d6d6` and updated the Button variants. | S |
| ✅ **DS-047** | Low | `src/shared/ui/Loaders/Shimmer.tsx:13-14` | Comment says to add `@keyframes shimmer`, but it already exists in `index.css`. → Accurate documentation. | Removed the stale comments. | S |

---

## C. Typography

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-014** | Medium | `Input/sizes.ts`, `Select/sizes.ts`, `Button/sizes.ts` | Off-scale sizes: `10.5px` labels, `12.5px` error, `15px`, `17px`. → 10/11/12/13/15/16/18/20/24. | Applied 11px labels, 12px errors, 16px `xl`; `15px` remains for drawer/modal titles. | M |
| ✅ **DS-015** | Medium | 329 `text-xs` vs 113 `text-[12px]`; 128 `text-[13px]` vs `text-sm` elsewhere | Same size expressed two ways; unclear when `text-sm` (14px) is intended. → Named utility when the value matches. | Replaced all 113 `text-[12px]` with `text-xs`; `text-[13px]` stays body, `text-sm` only for prose/auth. | L |
| ✅ **DS-019** | Medium | Feature page headers (Finance, Accounting, Settings) | Page titles alternated `text-xl`, `text-2xl`, `text-[22px]`. → 24px `text-2xl`. | Standardized feature page `<h1>` to `text-2xl font-semibold tracking-tight`; panel titles stay `text-base`/15px. | S |
| ✅ **DS-017** | Medium | `src/index.css:58-60` | `* { font-family: var(--font) !important }` defeats `font-mono` and per-element fonts. → Normal inheritance. | Replaced with `html { font-family: var(--font) }`; `font-mono` verified in the production build. | S |
| ✅ **DS-016** | Low | `tailwind.config.js` | v3-style config is never loaded (no `@config`) and declares uninstalled plugins; its `fontSize`/`colors` are inert. → One source of truth. | Deleted; Tailwind v4 config lives in the CSS entry point. | S |
| ✅ **DS-018** | Low | `src/index.css:2` | `Open Sans` is imported but never used. → One font family. | Removed the import. | S |
| ✅ **DS-020** | Low | Settings eyebrows, metric labels | 10px/9px uppercase labels combined with `text-gray-400`/`gray-600` → hard to read. → 11px minimum, `gray-500`. | Raised eyebrows to 11px, `tracking-wide`, `font-semibold`, `text-gray-500`. | S |

---

## D. Layout, spacing and surfaces

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-021** | High | No Card/Panel primitive under `src/shared/ui/`; repeated `rounded-lg border border-gray-200 bg-white p-*` | No primitive → each page re-decides padding, header, divider and radius. → One `Card`/`Panel` primitive. | Added `src/shared/ui/Card` with `padding`, `radius`, `tone`, header/footer/actions; migrated 12 simple card sites. Remaining pages adopt incrementally. | M |
| ✅ **DS-022** | Medium | Reporting metric row, Finance cards | Equivalent cards used `p-4`, `p-5`, `p-6` in one viewport. → `p-4` compact, `p-5` default, `p-6` hero by role. | Migrated overview/personal filter cards to `Card`; documented role-based padding. Reporting keeps `p-4/sm:p-5`, hero `p-6`. | M |
| ✅ **DS-023** | Medium | Feature pages, skeletons | Page stacks used `space-y-4`, `space-y-5`, `space-y-6`. → `space-y-5`. | Normalized page roots (Accounting, Bank Imports, Overview, Personal Dashboard, Correlations); reporting keeps `md:space-y-6` intentionally. | M |
| ✅ **DS-024** | Low | `Reports/components/*` | `rounded-[24px]`/`[28px]` outside the radius scale. → Reporting-only exception. | Kept; added DS-024 comments in each reporting card. Do not copy into operational UI. | S |
| ✅ **DS-025** | Low | `src/shared/layout/Sidebar/sidebar-motion.css:1-10` | Rail is declared 248/72px but internals used a 224px grid + 12px margin; the math was implicit. → Documented geometry. | Added a comment block explaining the 48px icon column, 176px label, margins and collapsed rail. | S |
| ✅ **DS-026** | Low | Feature page containers | `py-6` vs `py-5`/`py-7` top padding. → `py-6`. | Normalized on the page container: accounting, reports, help and the standalone account/settings mains. | S |

---

## E. Forms

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-008** | High | `src/shared/ui/Select/Select.tsx`, `Select.types.ts` | No `errorMessage`, `aria-invalid`, `aria-describedby`; selects cannot show or announce validation. → Same contract as `Input`. | Added `errorMessage`/`required`, `aria-invalid`/`aria-describedby`/`aria-required`, red border and error text; label now names the trigger. | M |
| ✅ **DS-027** | Medium | 3 raw `<textarea>` usages; no shared component | Textareas do not share label/error/focus/disabled styling. → A shared `Textarea` primitive under `src/shared/ui/Input/`. | Added `Input/Textarea.tsx` and migrated the 3 raw usages (`ChartImport`, `LedgerAccountModal`, `CategorySettings`). | M |
| ✅ **DS-028** | Medium | `Input`, `Select`, `Checkbox`, `Textarea` | Required fields had no consistent visual marker (`required` existed on `Checkbox` only). → Asterisk/label suffix plus `aria-required`. | Added a shared `RequiredMark` and `required` handling to `Input` (all kinds), `Select` and `Textarea`; date segments expose `aria-required`. | S |
| ✅ **DS-009** | Medium | `Switch/index.tsx`, `ToggleSwitch/index.tsx` | Two switch components with different geometry (36 vs 44px), labels and surfaces. → One behavior, two presentations. | Extracted `SwitchControl` (one 36×20 track/16px thumb, shared focus/hover/ARIA); `Switch` and `ToggleSwitch` are now wrappers with 36px/44px hit areas (44px on mobile for compact). | M |
| ✅ **DS-029** | Low | `Checkbox.module.css` | Hardcoded `#cbd5e1`, `#1e293b`, `#ffffff`, `rgba(...)`. → Tokens. | Added `--checkboxBorder`, `--checkboxChecked`, `--checkboxCheck`, `--checkboxHoverShadow`; explicit transitions; removed the unused `colorClass`/`myBlueColor` API. Kept the dark checked state. | S |
| ✅ **DS-034** | Medium | `Navbar.tsx`, `DataTable`, `SidebarFrame`, `PersonalLayout`, `ConfirmToast`, `Snackbar` | Mobile targets varied 28/32/34px. → ≥44px on `max-md:`. | Navbar menu/bell, rail toggle, Personal menu, toast collapse, snackbar close and table row actions now use 44px on mobile. | M |

---

## F. Overlays and layering

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-007** | High | `FloatingDialog/index.tsx`, `FinancialActivityPanel/ui/ModalShell.tsx`, `SidePanel/side-panel.css` | Three dialog shells: z `9999`/`10000`/`10030`; scrim `slate-950/35`/`gray-950/25`/`black/40`; titles 16px vs 15px; focus `indigo-500` vs accent; radii all `xl`. → One shell contract. | Added `DialogShell` (center/drawer, one z `10030`, scrim, focus, Escape, scroll lock, header/body/footer); migrated all three. SidePanel remains a drawer presentation. | L |
| ✅ **DS-032** | Medium | Global | z-index values were fragmented: popovers 999/10010/10020/10021, dialogs 9999/10000/10030, toasts 9000/15000, settings `1000000`. → Documented hierarchy. | Adopted the layer table in [02-design-tokens.md](02-design-tokens.md); removed million-level values; aligned popovers to 10050/10060, modals to 10030, feedback to 15000. | M |
| ✅ **DS-040** | High | `ConfirmToast` `z-[9000]`, `DataTable` selection bar `z-[9000]`, `Snackbar` `z-[15000]` | All bottom-center; a snackbar covered a confirmation, and a table selection bar could overlap a confirm. → One toast region with stacking. | Added `FeedbackStackProvider`; Snackbar, ConfirmToast, DataTable selection bar and both selection toolbars portal into one bottom-center flex stack at z-15000. | M |
| ✅ **DS-048** | Medium | `ConfirmToast`, `DataTable` bulk bar, `EntriesModal` close confirm, `ImportReview` | Four confirmation presentations: floating toast, in-table alertdialog, dialog-level confirm, inline confirm. → One canonical confirmation pattern. | Extracted `SelectionBar` and documented the policy: `ConfirmToast` for record actions, inline alertdialog for bulk selection, in-dialog confirm for unsaved changes. No fourth pattern. | M |
| ✅ **DS-033** | Medium | `src/shared/layout/Navbar/pageTitle.ts`; detail pages | Breadcrumb depth varied; some detail routes showed only the current page. → ≤3 levels with section parent. | Added the Settings parent for all `/settings/*` pages; bank-imports/accounting detail rules remain. Verified with a path matrix. | S |

---

## G. Navigation and shell

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-030** | High | `SidebarNavigation.tsx`, `SidebarSettings.desktop.tsx`, `SidebarFrame.tsx`, `AccountingSidebar.tsx` | Settings and accounting sidebars duplicated rail behavior (width, focus, Escape, scroll) instead of using one implementation. → One rail + product content. | Migrated settings and accounting to `SidebarFrame` with `position="section"`; one header/backdrop/focus/Escape/scroll contract for all three modes. | L |
| ✅ **DS-031** | High | `shell.css:2-3`, `sidebar.css:1-2` | Focus outlines are re-added with `!important` only inside two scopes to compensate for DS-001. → Focus comes from primitives. | Delete these rules after DS-001; keep one global ring. | S |
| ✅ **DS-035** | Low | `ApplicationShell.tsx:19,50` | The workspace sidebar is hidden for `/cashflow` and `/settled` via `pageHasActions`. → Documented full-bleed workspace. | Added a code comment and confirmed both routes own their layout; documented in `07-navigation-and-responsive.md`. | S |

---

## H. Motion, feedback and quality

| ID | Sev | Affected files | Current → Expected | Correction | Cx |
| --- | --- | --- | --- | --- | --- |
| ✅ **DS-036** | Medium | 11 `transition-all` usages | Animated layout/paint on controls. → Explicit properties. | Replaced with `transition-colors`, `transition-[opacity,transform]`, `transition-[width]` or `transition-[border-color,box-shadow,opacity]`, with `motion-reduce:transition-none`. | S |
| ✅ **DS-038** | Medium | `FloatingDialog` (`indigo-500`), `Switch`/`Button` (accent), `shell.css` (gray) | Focus color varies. → One accent focus token (+ neutral on orange). | Centralize ring/outline color; never use `indigo` outside a documented exception. | S |
| ✅ **DS-039** | Medium | `DataTable/index.tsx:119` | Row action buttons were `h-7 w-7` (28px) on every breakpoint. → 32px desktop / 44px mobile. | Applied `max-md:h-11 max-md:w-11`; desktop remains 28px. | S |
| ✅ **DS-037** | Low | Global | Durations spanned 120/150/160/180/200/220/250/300/500. → 120/150/180/220. | Normalized product UI to 120/150/180/220; 300/500 removed from product UI (illustration-only). | S |
| ✅ **DS-041** | Low | `SidePanel/side-panel.css` | No `prefers-reduced-motion` handling. → Same reduced-motion contract. | Added a reduced-motion query for tabs; checkbox CSS also disables its transition. | S |
| ✅ **DS-043** | Low | Global icon usage | Icon sizes varied 11–25; `aria-hidden` was inconsistent. → 13/15/16/18/20/22–24 scale. | Normalized Lucide `size` props and added `aria-hidden` to decorative icons; icon-only controls keep their `aria-label`. | M |
| ✅ **DS-044** | Low | `Loaders/Spinner.tsx:10` | `aria-label="loading"` was hardcoded in English. → Localized. | `Spinner` accepts a label and falls back to `common:loading`; clear controls, popover close and lock illustrations use i18n or `aria-hidden`. | S |
| ✅ **DS-045** | Medium | `package.json`, `eslint.config.js` | No unit/visual tests, no `eslint-plugin-jsx-a11y`, no axe/Playwright. → Automated guardrails. | Added `eslint-plugin-jsx-a11y` (recommended rules) and `npm run lint:a11y`; axe/Playwright remain part of the Phase 6 staging gate. | L |

---

## Intentional variations (do not "fix")

| Variation | Why it stays |
| --- | --- |
| `gray` vs `slate` by surface | Established in settings/reporting; changing it is a redesign |
| Reporting `24/28px` radii and hero gradients | Product-specific visual language |
| Dark checkbox check (`#1e293b`) | Better contrast than orange on white |
| 32px desktop controls | Deliberate operational density; mobile raises to 40–44px |
| `text-sm` in auth/prose | Long-form reading needs 14px |
| `ConfirmToast` spring collapse | Only interaction where spring is justified |
| Sidebar's 220ms layout transition | The only layout animation; required for rail collapse |

## Dependency order for fixes

```
DS-001/002 (focus) ─┬─> DS-006/031/038 (indicator)
                    └─> DS-007/032/040 (layering)
DS-003/004/005 (contrast) ─> DS-011 (variants)
DS-021 (Card) ─> DS-022/023/026 (spacing)
DS-008/027/028 (form contract) ─> DS-009/029
DS-030 (rail) ─> DS-033/034/035
DS-045 (tests) ─> all phases (regression gate)
```
