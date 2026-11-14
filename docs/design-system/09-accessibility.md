# 09 — Accessibility

Target standard: **WCAG 2.2 AA**. The application already does many things well
(native controls, focus trapping, ARIA on tables and dialogs); the failures below
are concentrated in global CSS and color tokens, which makes them high-leverage.

## 1. Focus visibility

Phase 1 removed the global focus suppression. A later product decision
(2026-11-12) keeps focus outlines **on form inputs only** and removes them from
buttons, links and other non-input controls.

**Current standard** (`src/index.css`):

```css
:where(input, select, textarea):focus-visible {
  outline: 1px solid #9ca3af;
  outline-offset: 1px;
}
:where(a, button, summary, [role="button"], [tabindex]:not([tabindex="-1"])):focus-visible {
  outline: none !important;
}
```

- Inputs/selects/textareas keep a subtle 1px `#9ca3af` outline (2.54:1). This is a
  product-preference trade-off for a lighter, thinner indicator.
- Checkboxes and radios opt out of the outline and rely on their checked/indeterminate
  fill states.
- Buttons, links and other controls intentionally render no outline. This is a
  deliberate product preference; keyboard users rely on native button
  activation and hover/active states.
- Do not add new orange focus outlines. If a future product decision restores
  button focus indicators, use a visible ≥3:1 non-orange treatment.

## 2. Contrast requirements

| Content | Minimum | Status |
| --- | --- | --- |
| Normal text (<24px, or <18.66px bold) | 4.5:1 | Primary/secondary/success actions fixed in Phase 1: 5.40:1, 11.58:1, 5.02:1. Remaining failures: `gray-400` text (2.54) in DS-010 |
| Large text | 3:1 | Meets |
| UI components/borders/focus | 3:1 | Input outline `#9ca3af` (2.54:1, intentional subtle treatment); buttons have no focus outline |
| Disabled controls | exempt | — |

Decisions applied in Phase 1, PR 1:

1. Primary buttons keep brand orange and use `#202020` text (5.40:1).
2. Teal uses `#202020` text (11.58:1).
3. Success uses white text on the darkened green `#15803D` (5.02:1).

Do not solve contrast by adding text shadows or opacity.

## 3. Keyboard interaction contract

| Context | Keys | Required behavior |
| --- | --- | --- |
| All controls | `Tab` / `Shift+Tab` | Logical order, visible focus |
| Button/link | `Enter`, `Space` | Native activation |
| Dialog | `Tab`/`Shift+Tab` | Trapped inside; focus starts on first focusable or dialog |
| Dialog | `Escape` | Closes top layer only; restores trigger focus |
| Menu/popover | `Escape`, arrows | Close/restore; roving focus |
| Select | `ArrowUp/Down`, `Enter`, `Space`, `Home/End`, `Escape` | Active descendant announced |
| Table | `Shift+Click` | Range selection (`useShiftSelect`) |
| Table | `Escape` | Dismiss overlays, then clear selection |
| Mobile sidebar | `Escape` | Close unless a modal is above it |
| Segmented tabs | Arrow keys | Roving tabindex |

Implementation: `src/shared/ui/useDialogFocus.ts` traps focus and restores it;
`src/shared/esc/initGlobalEsc.ts` guarantees one Escape handler per layer.

## 4. Forms

Required per field:

- Visible `<label>` associated via `htmlFor`/`id` (never placeholder-only).
- `aria-invalid` when invalid.
- `aria-describedby` pointing at helper **and** error text.
- Error text in the DOM, not only a red border.
- `required`/`aria-required` where applicable.
- Appropriate `autoComplete` (already derived in `TextInput`).
- Grouped radios/checkbox sets use `<fieldset><legend>`.

Status: `TextInput` implements all of the above. **`Select` implements none of the
validation semantics** (DS-008), and `Checkbox` groups rely on caller markup.
Three raw `<textarea>` usages have no shared label/error wiring (DS-027).

## 5. Touch targets

| Element | Target | Current |
| --- | --- | --- |
| Primary controls | 44×44px | 32px desktop, 40–44px mobile |
| Icon buttons | 40–44px mobile | 44px navbar/table/rail controls |
| Table row actions | 32px desktop / 44px mobile | 28px desktop / 44px mobile |
| Mobile menu/toggle | 44px | 44px menu, bell, rail toggle |
| Segmented items | 32px desktop / 38–40px mobile | 38px mobile in settings |

WCAG 2.2 target-size minimum is 24px, so these are not all failures, but they are
below the project's own touch standard. Enforce 40px minimum on `max-md:`.

## 6. Color independence

Status is conveyed with color plus text/icon in tables and toasts. Watch for:

- Positive/negative numbers using only `text-emerald`/`text-red` (sign is usually
  present; ensure it is).
- Charts relying on series color alone — add labels or patterns.
- Selected rows/sidebar items using only a tint — add `font-medium`,
  `aria-current`, or a leading indicator.

## 7. Semantics and screen readers

| Element | Status |
| --- | --- |
| Tables | `<table aria-label>`, `<th>`, sticky header, `aria-busy` |
| Dialogs | `role="dialog" aria-modal="true"` + labelled title |
| Confirm | `role="alertdialog"` with description |
| Menus | `role="menu"`, items keyboard reachable |
| Select | `role="listbox"`, `aria-selected`, `aria-activedescendant` |
| Switches | `role="switch" aria-checked` |
| Toasts | `role="status"` / `role="alert"`, `aria-atomic` |
| Tooltip | trigger `aria-describedby`, portal content; collapsed-rail labels may rely on the control's `aria-label` when the tooltip is a visual duplicate |
| Icons | decorative icons `aria-hidden`; meaningful icons get a label |
| Loading | `role="status"` + `sr-only` text |
| Language | `document.documentElement.lang` synced with i18n |

Gaps: `Spinner` now localizes its label (DS-044 fixed); icon sizing and
`aria-hidden` are canonical as of Phase 5, PR 20 (DS-043).

**Icon sizing:** `13` inline small, `15` inline, `16` controls, `18`
navigation/section, `20` feature/large, `22–24` empty-state illustrations. Every
decorative icon gets `aria-hidden="true"`; icon-only controls carry `aria-label`.
All accessible names come from i18n; do not hardcode English labels (DS-044).

## 8. Timing and motion

- `prefers-reduced-motion` must disable transforms/transitions (68 usages already
  respect it; verify new code).
- No content may flash more than three times per second (none observed).
- `Snackbar` auto-hides after 5s by default. It pauses on hover but not on focus;
  keyboard users can miss it (DS-042). Either pause on focus or keep errors
  persistent.
- Dialogs do not auto-close; `ConfirmToast` persists.

## 9. Zoom and reflow

Requirements to verify per page:

- 200% zoom at 1280px: no horizontal page scroll, no clipped actions.
- 320px viewport: sidebar overlays, tables switch to mobile columns, dialogs fit
  `100dvh`.
- Text spacing overrides (line-height 1.5, letter-spacing .12em) do not clip
  labels.
- Sticky headers and footers do not cover focused controls.

## 10. Accessibility findings

| ID | Severity | Finding |
| --- | --- | --- |
| DS-001 | Critical | ✅ Fixed in Phase 1 — global focus suppression removed |
| DS-002 | Critical | ✅ Fixed in Phase 1 — settings focus resets removed |
| DS-003 | Critical | ✅ Fixed in Phase 1 — primary uses `#202020` (5.40:1) |
| DS-004 | Critical | ✅ Fixed in Phase 1 — teal uses `#202020` (11.58:1) |
| DS-005 | Critical | ✅ Fixed in Phase 1 — success fill darkened (5.02:1) |
| DS-006 | High | ✅ Fixed in Phase 1 — global 2px outline, ≥3:1 |
| DS-008 | High | ✅ Fixed in Phase 2 — `Select` error/required/ARIA wired |
| DS-028 | Medium | ✅ Fixed in Phase 2 — required marker + `aria-required` on Input/Select/Textarea/Date |
| DS-039 | Medium | ✅ Fixed in Phase 3 — 44px row actions on mobile, 28px desktop |
| DS-042 | Medium | Snackbar timing not adjustable for keyboard users |
| DS-043 | Low | ✅ Fixed in Phase 5 — canonical 13/15/16/18/20/22–24 sizes; decorative icons `aria-hidden` |
| DS-044 | Low | ✅ Fixed in Phase 5 — `Spinner`, clear controls, popover close and lock illustrations use i18n/ARIA |
| DS-045 | Medium | ✅ Fixed in Phase 6 — `eslint-plugin-jsx-a11y` + `npm run lint:a11y`; axe/visual checks remain the staging gate |

## 11. Pre-merge accessibility checklist

- [ ] Tab through the change: every stop shows a visible indicator.
- [ ] Escape closes only the topmost layer; focus returns to the trigger.
- [ ] All text meets 4.5:1 (or 3:1 for large text); verify with a contrast tool.
- [ ] Labels, errors and helpers are programmatically associated.
- [ ] Touch targets ≥40px on `max-md:`.
- [ ] Status is not conveyed by color alone.
- [ ] Reduced motion removes transforms and transitions.
- [ ] `aria-*` values are localized where they are user-facing.
- [ ] No new `outline: none` or `box-shadow: none` on focusable elements.
