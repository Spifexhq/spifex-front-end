# Phase 6 evidence — validation

Date: 2026-11-11

## Automated / static checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx --no-install tsc -b` | ✅ pass |
| Production build | `npm run build` | ✅ pass (Vite chunk-size warning only) |
| Source lint | `npx --no-install eslint src` | ✅ 0 errors, 7 pre-existing warnings |
| A11y lint | `npm run lint:a11y` | ✅ 0 errors |
| Repository lint | `npm run lint` | ✅ 0 errors, 7 pre-existing warnings (`.preview` harnesses excluded) |
| Audit arithmetic | `audit_counts.py` | 48 fixed, 0 remaining |
| Docs links | `check_links.py` | ✅ no missing targets |
| Docs IDs | `check_links.py` | ✅ 48 DS IDs present |

## Static consistency sweep

| Rule | Result |
| --- | --- |
| `transition-all` in product UI | 0 |
| Hardcoded English `aria-label` outside legal page | 0 |
| Icon size outliers (`size={11/12/14/17/19/21/23/25/26/27/28/30}`) | 0 |
| Feature page roots on `space-y-6` outside reporting | 0 (only `PreviewSkeleton` inner stack matches) |
| DS-024 reporting-radius comments | 6 of 6 cards |
| `prefers-reduced-motion` blocks in CSS | 5 |

## Runtime matrix — pending staging access

These checks require authenticated Business/Personal data and were **not**
executed in this session:

- Keyboard tab/Escape pass across shells, dialogs, menus and tables.
- Screen-reader smoke (NVDA/VoiceOver) on table, dialog, select and toast.
- Responsive screenshots at 360/768/1024/1440.
- 200% zoom at 1280px and 320px reflow.
- OS reduced-motion pass over dialogs/sidebar.
- Axe smoke and screenshot diff.

Known risk: authenticated Settings, Accounting, Finance and Reporting surfaces
were verified by source inspection, type checks and build only. Run the matrix
on staging before the next release gate.

## Resolved findings (Phase 6, PR 25–26)

| ID | Resolution |
| --- | --- |
| DS-015 | All 113 `text-[12px]` replaced with `text-xs`; `text-[13px]` remains the body size and `text-sm` is reserved for prose/auth. |
| DS-045 | `eslint-plugin-jsx-a11y` recommended rules added for `src/**/*.{ts,tsx}`; `npm run lint:a11y` passes with 0 errors. Fixed label associations, tablist semantics, pointer-only rows, Select ARIA ownership and the DataTable resizer role. `.preview` scratch harnesses are excluded from lint so `npm run lint` is green. Axe/Playwright screenshot checks remain part of the staging gate. |
| 1.4 | Radius, shadow, z-index and motion tokens added to `:root` in `src/index.css`; documented in `02-design-tokens.md`. |

## Closing note

All 48 audit findings are resolved. The design-system migration is implemented
through Phases 1–6 and statically validated. The remaining release gate is the
manual runtime matrix on authenticated staging data.

## Post-migration fixes — 2026-11-12

| Issue | Fix |
| --- | --- |
| Orange outlines on controls | Focus outline now applies to `input`/`select`/`textarea` only, using neutral `#6b7280`; buttons, links and other controls get `outline: none !important`. |
| Cashflow/settled selection bar missing | `SelectionBar` portaled the `AnimatePresence` child itself; Framer dropped the portal child. The portal now wraps `AnimatePresence`, and the bar renders again (verified with a temporary harness, since removed). |
| Popover/Select open-close animation missing | Tailwind v4 uses `translate`/`scale` individual properties, not `transform`. Replaced `transition-[opacity,transform]` with `transition-[opacity,translate,scale]`. |
| Select list opening outside/behind popovers | Select panel z-index raised from `10050` to `10070`, above the `10060` popover layer. |
| Selection bar created table space | Removed `selectionPadding={180}` from `FinancialActivityTable`; the bar now floats without altering table layout. |
| Checkbox outlines | Checkbox/radio inputs explicitly opt out of the input focus outline. |
| Input outline too heavy | Reduced to 1px `#9ca3af` with 1px offset. |
| Personal preview edit did not close | Preview actions now call `onClose()` before opening edit/settle/contribute. |
| Personal action order | Edit is left, Record payment/Contribute is right. |
| Personal settled preview had no revert | Added `Reverse activity` for transfers and settlements, permission-gated and with error/busy state. |
| Business settled preview had no revert | Added `Undo settlement` to `EntryPreview` for settlement rows, permission-gated. |

Verification: `tsc -b`, `npm run build`, `npm run lint:a11y` and `npm run lint` pass.
