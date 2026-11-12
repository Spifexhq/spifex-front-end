# 11 — Migration Roadmap

Execution order for the 48 findings in
[10-inconsistency-audit.md](10-inconsistency-audit.md). Each phase must ship and
be verified independently; do not bundle phases into one PR.

**Status (2026-11-11):** Phase 1, PR 1 (focus + action contrast), PR 2
(token/config and font cleanup), Phase 2, PR 3 (core form controls), PR 4
(Card/Panel), PR 5 (Switch unification), PR 6 (DialogShell), PR 7 (feedback
stack), PR 8 (Checkbox tokens), Phase 3, PR 9–11 (sidebar unification, z-index
hierarchy, mobile targets, breadcrumbs, nested-layer verification) and Phase 4,
PR 12–13 (`SelectionBar`, confirmation policy, filter cards, page stacks), PR 14
(`Card` on summary surfaces), PR 15 (`EmptyState`/`ErrorState`, loading audit),
PR 16 (`Badge`) and Phase 5 PR 17–23 (page titles, eyebrows, page padding,
meaningful contrast, icons, ARIA labels, motion, reporting radii) are implemented.
Phases 4 and 5 are complete. Phase 6 (PR 24–26) validates the migration statically
and closes all 48 findings; the manual runtime matrix is pending staging access.
Remaining Phase 1 items: none (1.4 and 1.6 done). Remaining Phase 2 items: none
(2.4 done).

**Guiding constraints**

- No phase may change business behavior, routes, API contracts or copy.
- Token/global-CSS changes land **before** component changes that depend on them.
- Accessibility fixes are never deferred to the validation phase.
- Every phase keeps `npm run build` and `npx eslint src` green. Full
  `npm run lint` currently fails only on pre-existing `.preview/*.ts(x)` errors.
- Visual changes are reviewed with before/after screenshots at 360 / 768 / 1440.

---

## Phase 1 — Foundations

**Goal:** one token layer, working focus, accessible action colors, no dead
configuration.

| Order | Task | Findings | Notes |
| --- | --- | --- | --- |
| 1.1 | Remove global focus suppression; add `:focus-visible` outline; delete the shell/sidebar `!important` compensations | DS-001, DS-002, DS-031 | Highest impact. Verify every primitive before moving on |
| 1.2 | Fix focus indicator contrast (2px, ≥3:1) | DS-006, DS-038 | Use accent on white, neutral on orange |
| 1.3 | Decide and apply primary/danger/teal text colors | DS-003, DS-004, DS-005 | Product decision required (see 04 §10) |
| ✅ 1.4 | Token cleanup and additions: legacy tokens removed; define `--controlBorder`; add radius/shadow/z-index/motion tokens | DS-012, DS-032 (partial), DS-046 | Legacy cleanup in PR 2; scale tokens added in Phase 6, PR 26 |
| ✅ 1.5 | Font hygiene: removed `Open Sans`, removed `* !important`, deleted `tailwind.config.js` | DS-016, DS-017, DS-018 | Done in PR 2; `font-mono` verified |
| ✅ 1.6 | Add accessibility guardrails: `eslint-plugin-jsx-a11y`; axe smoke test; screenshot harness | DS-045 | `jsx-a11y` and `lint:a11y` added in Phase 6, PR 26; axe/screenshots remain the staging gate |

**Exit criteria**

- Keyboard focus is visible on every interactive element in app, settings and
  overlays.
- All action text meets 4.5:1; focus indicators meet 3:1.
- No `!important` focus suppression remains.
- `tailwind.config.js` is deleted (done); no `!important` font or focus reset
  remains.
- Build, lint and the new a11y smoke test pass.

**Risk:** color changes are visible across the entire product. Ship 1.3 alone and
review screenshots per product area.

---

## Phase 2 — Core components

**Goal:** one implementation and one state model per shared control.

Depends on Phase 1 (tokens/focus).

**Status (2026-11-11):** PR 3 implemented 2.1–2.3 (Button variants, form
typography, `Select` validation, `Textarea`, required marker). PR 4 implemented
2.4 (Card/Panel primitive and 12 card-site migrations). PR 5 implemented 2.5
(shared `SwitchControl`). PR 6 implemented 2.6 (`DialogShell`). PR 7 implemented
2.7 (`FeedbackStackProvider`, focus pause, persistent errors). PR 8 implemented
2.8 (Checkbox tokens). DS-015 remains a page-level sweep; 2.4 follow-through
(remaining cards, spacing) remains open.

| Order | Task | Findings |
| --- | --- | --- |
| ✅ 2.1 | Reduce `Button` to approved variants; remove blue tints; `xl` → 16px; delete dead variants | DS-011, DS-014 (button part) |
| ✅ 2.2 | Normalize `Input`/`Select` typography (11px labels, 12px errors, 16px `xl`), add `Select` error API, extract `Textarea` | DS-008, DS-014, DS-015 (partial), DS-027 |
| ✅ 2.3 | Add required-field affordance | DS-028 |
| ✅ 2.4 | Introduce `Card`/`Panel`; migrate simple surfaces incrementally (panels, filters, summary surfaces) | DS-021, DS-022/023 (done in Phase 4) |
| ✅ 2.5 | Unify `Switch`/`ToggleSwitch` internals; align focus and sizes | DS-009 |
| ✅ 2.6 | Extract one dialog shell (overlay/panel/header/body/footer); migrate `FloatingDialog`, `ModalShell`, `SidePanel` | DS-007 |
| ✅ 2.7 | Align `Snackbar`/`ConfirmToast` surfaces and stacking; pause on focus; persist errors | DS-040, DS-042 |
| ✅ 2.8 | Tokenize `Checkbox` colors | DS-029 |

**Exit criteria**

- A single focus color across all controls.
- Buttons have no unused/off-brand variants.
- All form controls share label, error, disabled and focus behavior.
- Dialogs share one z-index, scrim, radius and title scale.
- No new arbitrary radius/shadow introduced.

**Risk:** `Select` is used in dense tables; adding an error row can change layout.
Reserve space or use an inline message consistent with `Input`.

---

## Phase 3 — Application layout

**Goal:** one shell, one rail, one responsive contract.

Depends on Phase 2 (dialog shell, focus).

**Status (2026-11-11):** PR 9 implemented 3.1–3.2; PR 10 implemented 3.3–3.5;
PR 11 verified 3.6 and closed the gray/slate decision (DS-013). Phase 3 complete.

| Order | Task | Findings |
| --- | --- | --- |
| ✅ 3.1 | Migrate settings and accounting sidebars onto `SidebarFrame` | DS-030 |
| ✅ 3.2 | Apply the z-index hierarchy to shell, rail, popovers, dialogs, toasts | DS-032, DS-040 |
| ✅ 3.3 | Normalize mobile targets (menu, notifications, rail toggle) to ≥44px | DS-034 |
| ✅ 3.4 | Breadcrumb rules and duplicate-title cleanup | DS-033 |
| ✅ 3.5 | Document full-bleed routes (`/cashflow`, `/settled`) | DS-035 |
| ✅ 3.6 | Verify Escape/focus behavior across nested layers | DS-001, DS-007 |

**Exit criteria**

- All three navigation modes use the same rail implementation.
- Mobile rail, dialogs, popovers and toasts always stack in the documented order.
- 360px and 768px layouts have no clipped controls.
- Focus returns to the trigger after closing every layer.

**Risk:** sidebar unification touches persisted collapse state. Test each mode's
localStorage key and the 768px transition.

---

## Phase 4 — Feature components

**Goal:** consistent records, filters, forms and settings.

Depends on Phases 2–3.

**Status (2026-11-11):** Phase 4 is complete. PR 12 implemented 4.1–4.2
(`SelectionBar`, confirmation policy, mobile row actions). PR 13 implemented 4.3
(filter cards and page stacks). PR 14 implemented 4.4 (`Card` on
dashboard/accounting summary surfaces). PR 15 implemented 4.5
(`EmptyState`/`ErrorState`, loading audit). PR 16 implemented 4.6 (`Badge`).

| Order | Task | Findings |
| --- | --- | --- |
| ✅ 4.1 | Extract the table selection/confirmation bar; define confirmation policy | DS-048, DS-040 |
| ✅ 4.2 | Normalize table row actions and mobile action columns | DS-039, DS-034 |
| ✅ 4.3 | Unify filter/toolbar layouts (settings toolbar pattern) | DS-022, DS-023 |
| ✅ 4.4 | Apply `Card` to metric/summary surfaces; unify padding per surface | DS-021, DS-022 |
| ✅ 4.5 | Standardize empty/error states and loading choice | — (component doc §16–17) |
| ✅ 4.6 | Promote a badge/status primitive if a third duplicate appears | — (component doc §15) |

**Exit criteria**

- One confirmation pattern per scenario, documented.
- Tables, filters and toolbars behave identically across Business, Accounting
  and Settings.
- No page-level horizontal scroll at 360px.
- Loading uses skeleton for first load and spinner for actions, consistently.

---

## Phase 5 — Page-level consistency

**Goal:** remove remaining visual drift without redesigning pages.

Depends on Phase 4.

**Status (2026-11-11):** Phase 5 is complete. PR 17 implemented 5.1 (page titles
and eyebrows); PR 18 5.2 (page padding); PR 19 5.3 (meaningful `gray-400` text);
PR 20 5.4 (icons and `aria-hidden`); PR 21 5.5 (localized ARIA labels); PR 22 5.6
(motion cleanup); PR 23 5.7 (reporting radius documentation).

| Order | Task | Findings |
| --- | --- | --- |
| ✅ 5.1 | Page titles → `text-2xl`; eyebrows → 11px `gray-500` | DS-019, DS-020 |
| ✅ 5.2 | Page stacks → `space-y-5` (Phase 4 PR 13); page padding → `py-6` (PR 18) | DS-023, DS-026 |
| ✅ 5.3 | Replace `text-gray-400` where text carries meaning | DS-010 |
| ✅ 5.4 | Normalize icon sizes and `aria-hidden` | DS-043 |
| ✅ 5.5 | Localize hardcoded `aria-label`s | DS-044 |
| ✅ 5.6 | Motion cleanup: explicit transitions, 120/150/180/220, reduced motion | DS-036, DS-037, DS-041 |
| ✅ 5.7 | Keep reporting radii documented; add comments | DS-024 |

**Exit criteria**

- Page headers, stacks and gutters match across products.
- No meaningful text below 4.5:1.
- Icon sizes come from the documented set.
- No `transition-all` on controls.

---

## Phase 6 — Validation

**Goal:** prove the migration and prevent regression.

**Status (2026-11-11):** static/compile validation complete (build, type check,
source lint, `jsx-a11y` lint, docs checks and consistency sweeps). Manual runtime
matrix — keyboard, screen reader, responsive screenshots, zoom/reflow and axe —
is pending staging access and is the only remaining release gate. All 48 audit
findings are resolved.

| Check | Method | Pass condition |
| --- | --- | --- |
| Keyboard | Manual tab/escape pass on every shell, dialog, menu, table | Visible focus at every stop; one layer per Escape |
| Contrast | Automated + manual spot check | 4.5:1 text, 3:1 UI |
| Screen reader | VoiceOver/NVDA smoke on table, dialog, select, toast | Names, roles, states announced |
| Responsive | Screenshots 360/768/1024/1440 | No clipping, no horizontal page scroll |
| Zoom/reflow | 200% at 1280px, 320px viewport | Content reflows, actions reachable |
| Reduced motion | OS setting on | No transforms/transitions in dialogs/sidebar |
| Regression | `npm run build`, `npm run lint`, axe smoke, screenshot diff | All green; only intended pixels changed |
| Docs | Re-read 06/07 against code | No contradictions; update this roadmap |

**Validated statically (2026-11-11):** `tsc -b`, `npm run build`, `eslint src`,
`npm run lint:a11y`, docs link/ID checks, audit counts, `transition-all` sweep,
ARIA-label sweep, icon-size sweep, page-stack sweep, DS-024 comments and
reduced-motion CSS. **Pending:** the manual/browser matrix above.

**Exit criteria**

- All Critical/High findings closed.
- Medium findings either closed or explicitly accepted with an owner and date.
- Documentation updated with any decision changed during implementation.
- A closing note records exact commands, results and remaining risks.

---

## Recommended PR slicing

| PR | Scope | Findings |
| --- | --- | --- |
| 1 ✅ | Focus + contrast tokens (implemented 2026-11-11) | DS-001…006, 031, 038 |
| 2 ✅ | Token/config cleanup (implemented 2026-11-11) | DS-012, 016–018, 046, 047 |
| 3 ✅ | Button/Input/Select/Textarea (implemented 2026-11-11) | DS-008, 011, 014, 027, 028 |
| 4 ✅ | Card + spacing (implemented Phase 2/4) | DS-021–023, 026 |
| 5 ✅ | Dialog shell + feedback stack (implemented 2026-11-11) | DS-007, 040, 042 |
| 6 ✅ | Sidebar, z-index, mobile targets and breadcrumbs (implemented 2026-11-11) | DS-030–035 |
| 7 ✅ | Table/feature consistency (selection bar, row actions, filters, page stacks, summary cards, states, badges) | DS-039, 048, 022, 023 |
| 8 ✅ | Page-level typography/color/icons/motion (implemented Phase 5) | DS-010, 019, 020, 036, 037, 041, 043, 044 |
| 9 ✅ | Tests + docs convergence (jsx-a11y lint + docs done; axe/visual harness remain the staging gate) | DS-045 |

## Sequencing rules

1. Never change a token and its consumers in the same PR unless the consumer list
   is small and visually verified.
2. Fix the global cause before patching local symptoms (focus first).
3. Do not refactor business logic while migrating styles.
4. Keep the old and new component mounted behind the same props during migration;
   delete the old implementation only after all usages move.
5. If a finding reveals a product decision (contrast strategy, gray/slate
   convergence), stop and record the decision before coding.
