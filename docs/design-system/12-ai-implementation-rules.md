# 12 — AI Implementation Rules

Read this before modifying any frontend UI. It is intentionally compact.
Detailed rationale lives in the linked files; do not read them all up front.

## 1. Non-negotiable rules

1. **Reuse before create.** Check the selection guide in
   [06-component-standards.md](06-component-standards.md) and `src/shared/ui/**`
   before writing a control, panel, dialog or toast.
2. **No arbitrary values.** No new hex colors, `text-[Npx]`, `rounded-[Npx]`,
   `z-[N]`, `shadow-[...]`, `p-[Npx]` outside the documented scales in
   [02-design-tokens.md](02-design-tokens.md).
3. **Preserve identity.** Orange `--accentPrimary` + neutral borders + white
   surfaces + compact density. No new accent hues, gradients, glassmorphism, or
   dark mode.
4. **Accessibility is part of the definition of done.** Visible focus, 4.5:1
   text, labelled controls, keyboard operability, reduced motion. Never add
   `outline: none` / `box-shadow: none` to a focusable element.
5. **One responsive contract.** Shell changes at `md` (768px); touch targets
   ≥40px on `max-md:`; tables use `DataTable` mobile columns; dialogs clamp to
   `100dvh`.
6. **No duplicate implementations.** If two components do the same job, extend
   the canonical one. Do not fork `Button`, `Input`, `Select`, `DataTable`,
   `Dialog`, `Snackbar`.
7. **Follow existing architecture.** Tailwind utilities + `src/index.css` tokens;
   no CSS-in-JS, no new styling library, no new global CSS file unless it scopes
   a primitive.
8. **Business behavior is frozen.** Do not change routes, permissions, API calls,
   payloads or copy while styling. Coordinate cross-repo contracts.
9. **Localize everything.** No new user-visible English strings, including
   `aria-label`/`title`.
10. **No unrelated redesign.** Fix the assigned finding only. Visual changes
    outside the task are a separate PR.

## 2. Canonical cheat sheet

| Need | Value / component |
| --- | --- |
| Body text | `text-[13px] leading-5 text-gray-900` |
| Metadata | `text-xs text-gray-500` |
| Caption/error | `text-[11px]` |
| Eyebrow | `text-[11px] font-semibold uppercase tracking-wide text-gray-500` |
| Page title | `text-2xl font-semibold tracking-tight text-gray-900` |
| Control radius | `rounded-md` |
| Panel radius | `rounded-lg` |
| Floating radius | `rounded-xl` |
| Panel / card | `Card` (`tone="panel\|slate\|metric"`, `padding="compact\|default\|spacious"`) |
| Primary action | `Button variant="primary"` (one per region) |
| Secondary action | `Button variant="outline"` |
| Destructive | `Button variant="danger"` |
| Dismiss | `Button variant="cancel"` |
| Field | `Input` (`kind="text"|"amount"|"percentage"|"date"`) |
| Multi-line field | `Textarea` (`src/shared/ui/Input/Textarea.tsx`) |
| Choice | `Select` / `Checkbox` / `Switch` / `ToggleSwitch` |
| Records | `DataTable` |
| Form dialog | `FloatingDialog` |
| Preview/edit drawer | `SidePanel` |
| Result toast | `Snackbar` |
| Destructive confirm | `ConfirmToast` |
| Feedback placement | `FeedbackStackProvider` (do not add fixed bottom offsets) |
| Selection action bar | `SelectionBar` (do not build a fixed bottom bar) |
| Empty state | `EmptyState` (do not write new centered empty markup) |
| Error state | `ErrorState` (panel/inline, danger/warning; do not add new alert recipes) |
| Status/count badge | `Badge` (do not hand-roll rounded status pills) |
| Busy | `Spinner` (action) / `PageSkeleton` (page) / `DataTableSkeleton` (table) |
| Accessible name | Localized via i18n; never hardcode English `aria-label`/`title` |
| Page container | `mx-auto min-w-0 max-w-[1440px] px-4 py-6 sm:px-7` |
| Sidebar | `SidebarFrame` (`position="rail"` workspace, `"section"` settings/accounting) |
| Focus | Input-only neutral outline from `src/index.css`; no button/link outlines |
| Motion | 150ms micro, 180ms standard, 220ms layout, 0 under reduced motion |

## 3. Forbidden

- `text-white` on `--accentPrimary` or `--accentSecondary` (fails 4.5:1).
  Success keeps white text only on the darkened `--accentSuccess` token.
- Any `Button` variant outside `primary`, `outline`, `cancel`, `danger`,
  `outlineBlack`, `ghost`, `common`, `muted`.
- Raw `<table>` for record lists, raw `<select>`, raw `<input>` without `Input`,
  raw `<textarea>` without `Textarea`.
- New `rounded-* border-* bg-white` card recipes; use `Card` instead.
- `window.confirm`, custom modals built from `div`s, new toast systems.
- New confirmation patterns: record actions use `ConfirmToast`, bulk selection
  uses `SelectionBar` (`alertdialog`), unsaved dialog changes use the in-dialog
  confirm.
- `z-[…]` not present in the token table.
- Local focus overrides (`outline-none`, custom outline/ring colors); focus is
  owned by the global rule in `src/index.css`.
- `transition-all` on controls.
- Icons without `aria-hidden` (decorative) or `aria-label` (meaningful).
- New `!important`, new global selectors, new font imports.
- Copy without i18n, hardcoded dates/currencies, color-only status.

## 4. Before you code

- [ ] Identify the audit finding or feature spec this change belongs to.
- [ ] Find the canonical component; read only its source and the relevant doc
      section.
- [ ] Check usages (`grep`) to avoid breaking a shared prop.
- [ ] Confirm the responsive target (360 / 768 / 1024 / 1440).
- [ ] Confirm the keyboard path and focus return.
- [ ] Confirm the four states: default, hover, focus-visible, disabled (+ error
      for fields).
- [ ] Check whether the change touches Business routes, permissions or API
      contracts (if yes, coordinate).
- [ ] For a new feature, confirm the Spec Kit spec/plan/tasks exist
      (`specs/`), per `AGENTS.md`.

## 5. Before you finish

- [ ] `npm run build` and `npm run lint` pass.
- [ ] No application file outside the task scope changed.
- [ ] Screenshots at 360 and 1440 (or a clear reason they are not applicable).
- [ ] Keyboard tab-through + Escape behavior verified.
- [ ] No new arbitrary values; no new duplicate primitive.
- [ ] Audit ID referenced in the commit/PR description.
- [ ] If a finding was fixed, update
      [10-inconsistency-audit.md](10-inconsistency-audit.md) and
      [11-migration-roadmap.md](11-migration-roadmap.md).

## 6. Decision handling

- **Conflict between code and docs:** code shows current behavior, docs define
  the target. Do not "match the codebase" if it contradicts a documented rule;
  raise it and update the doc if the code is right.
- **Missing rule:** prefer the closest existing primitive; if none exists, add a
  provisional note in the task, do not invent a token.
- **Exception needed:** document it in the PR with file, reason and scope. A
  second exception in the same area means the rule needs revision.
- **Product decision required** (contrast strategy, gray/slate convergence, dark
  mode): stop and ask; do not guess.

## 7. Where to look

| Question | File |
| --- | --- |
| Why does the product look like this? | [01-design-principles.md](01-design-principles.md) |
| Which token/scale? | [02-design-tokens.md](02-design-tokens.md) |
| Font size/weight? | [03-typography.md](03-typography.md) |
| Color/contrast? | [04-colors-and-themes.md](04-colors-and-themes.md) |
| Padding/grid/width? | [05-spacing-and-layout.md](05-spacing-and-layout.md) |
| Which component/props? | [06-component-standards.md](06-component-standards.md) |
| Shell/mobile? | [07-navigation-and-responsive.md](07-navigation-and-responsive.md) |
| Motion/states? | [08-interactions-and-motion.md](08-interactions-and-motion.md) |
| A11y requirements? | [09-accessibility.md](09-accessibility.md) |
| Is this a known defect? | [10-inconsistency-audit.md](10-inconsistency-audit.md) |
| What should I fix next? | [11-migration-roadmap.md](11-migration-roadmap.md) |

## 8. Minimal example

```tsx
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

export function RenameForm({ value, error, saving, onChange, onSubmit, onCancel, t }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label={t("common.name")}
        value={value}
        errorMessage={error}
        onChange={e => onChange(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="cancel" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button type="submit" variant="primary" isLoading={saving}>{t("common.save")}</Button>
      </div>
    </form>
  );
}
```

`gap-4`, `rounded-md`, 13px body, cancel/primary pairing, error wiring, i18n —
all canonical. No custom classes required.
