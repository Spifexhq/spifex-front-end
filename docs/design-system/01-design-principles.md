# 01 — Design Principles

These principles describe the visual language already present in Spifex. They
exist to settle future decisions without redesigning the product.

## 1. Product context

Spifex is a multi-product financial workspace:

| Area | Route root | Visual character |
| --- | --- | --- |
| Business / Enterprise | `/`, `/bank-imports`, `/accounting` | Dense operational tables, compact forms, sidebar-first navigation |
| Personal | `/personal` routes | Same primitives, lighter chrome, card-based summaries |
| Settings | `/settings/**` | Denser, `slate`-toned, rule-based layout (`SettingsSurface`) |
| Reporting | Business reports | Hero + metric cards, larger radii, `slate` palette |

All areas share authentication, shell infrastructure, primitives and the orange
brand accent. Business behavior and routes are the stability baseline.

## 2. Principles

### P1. Data first, chrome second

The interface exists to expose financial records. Tables, totals and status
labels dominate; decoration is minimal. Evidence: `DataTable` renders a
border-only surface with `shadow-none`, sticky header and a compact footer; page
headers are one line of breadcrumbs plus one primary action.

**Implication:** do not add gradients, illustrations or decorative containers to
operational pages. Reporting-style heroes stay in reporting.

### P2. Compact by default, comfortable on touch

Desktop density is deliberately high: 32px controls, 40px table rows, 13px body
text, 11–12px metadata. Mobile raises interactive heights to 40px (`max-md:`
overrides in `SettingsSurface`, `DataTable` footer, filter triggers).

**Implication:** density changes by breakpoint, not by page. Never ship a 32px
touch target on mobile.

### P3. One accent, used sparingly

`--accentPrimary` (#F46A35) marks the single most important action or the
selected state on a surface. Neutral borders and white surfaces carry the rest.
Secondary teal (`--accentSecondary`) is part of the brand but is not a valid
primary action background (see [09-accessibility.md](09-accessibility.md)).

**Implication:** a screen should normally contain one primary (orange) button.
Secondary actions use `outline` or `cancel`, destructive actions use `danger`.

### P4. Borders define structure; shadows define float

Panels, tables, sidebar rows and settings cards use a 1px neutral border and no
shadow. Only floating layers (dialogs, popovers, toasts, menus) receive shadows
and larger radii.

**Implication:** `shadow-sm` on an in-page card is acceptable only where the card
is a distinct metric tile; `shadow-lg` on an inline panel is a defect.

### P5. Progressive disclosure

Complex edits happen in overlays, not inline. Tables open a `SidePanel` preview,
then a form dialog; mobile collapses secondary information behind explicit
actions (`DataTable` `mobile` columns, `ConfirmToast` collapse, settings filter
toggle).

**Implication:** preserve the "summary → preview → edit" flow. Do not expand
inline rows for editing when a dialog already exists for that entity.

### P6. Motion explains, never entertains

Transitions are short (150–220ms), mostly opacity/translate, and always reduced
under `prefers-reduced-motion`. The sidebar owns the only long-running layout
transition (220ms `cubic-bezier(.22,1,.36,1)`).

**Implication:** no looping animation except loading indicators; no bounce or
spring on page-level surfaces (spring is reserved for `ConfirmToast` body
collapse).

### P7. Shared primitives over local variants

The repository deliberately centralizes controls in `src/shared/ui`. `Button`,
`Input`, `Select`, `Checkbox`, `DataTable`, `Snackbar`, `ConfirmToast`,
`SegmentedControl`, `Switch`, `ToggleSwitch`, `Popover` and loaders are the
system. Feature code composes them with layout utilities.

**Implication:** a new visual control requires a shared primitive. One-off class
strings that re-implement a button, input or panel are defects.

### P8. Localized and accessible by construction

All copy goes through `i18next`. Labels are associated with controls
(`TextInput` uses `htmlFor`, `aria-invalid`, `aria-describedby`). Dialogs use
`useDialogFocus` for trapping and restoration.

**Implication:** new UI must keep both properties; neither is optional polish.

## 3. Decision hierarchy

When two patterns conflict, choose in this order:

1. An existing shared primitive in `src/shared/ui`.
2. A pattern repeated across actively maintained Business/Settings surfaces.
3. Accessibility and responsive behavior.
4. Visual coherence with the compact neutral + orange language.
5. Frequency alone — never sufficient. A duplicated mistake stays a mistake.

## 4. What this system is not

- Not a Material/Ant/shadcn theme. Names like `Snackbar` and `ToggleSwitch` are
  local; there is no component-library dependency.
- Not dark-mode ready. There are zero `dark:` utilities in `src`; the legacy
  config's `darkMode: "class"` has no effect.
- Not a marketing site system. Larger radii (`24–28px`) and gradient heroes exist
  only in reporting and must not migrate into operational pages.
- Not a place to introduce new brand colors. The accent palette is fixed by
  `src/index.css`.

## 5. Quality gates for any UI change

A change is acceptable when all are true:

- It uses documented tokens and an existing primitive, or adds a primitive with a
  documented justification.
- It works at 360px, 768px, 1024px and 1440px.
- Keyboard focus is visible and the tab order is logical.
- Text contrast meets the ratios in [09-accessibility.md](09-accessibility.md).
- Motion is suppressed under reduced-motion.
- Copy is localized.
- It does not increase the count of open findings in
  [10-inconsistency-audit.md](10-inconsistency-audit.md).
