# Phase 1, PR 2 — Token/config cleanup evidence

Covers DS-012, DS-016, DS-017, DS-018, DS-046 and DS-047.

## Changes verified

| Item | Before | After |
| --- | --- | --- |
| Brand progress color | `var(--brand,#f97316)` | `var(--accentPrimary)` |
| JS Tailwind config | `tailwind.config.js` (v3, not loaded) | deleted |
| Base font | `* { font-family: var(--font) !important }` | `html { font-family: var(--font) }` |
| Open Sans | imported, unused | removed |
| Legacy tokens | `--white`, `--color1..6`, `--standardBorder`, `--border2` | removed; `--controlBorder: 1px solid #d6d6d6` |
| Shimmer | stale keyframe comment | comments removed |

## Runtime measurements (production build)

- `document.body` font family:
  `Inter, -apple-system, BlinkMacSystemFont, Helvetica, sans-serif`
- A `.font-mono` element:
  `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
  "Courier New", monospace` — the utility is no longer overridden.
- `--controlBorder`: `1px solid #d6d6d6`.
- Outline/cancel buttons in the cookie banner render a 1px border (screenshot
  below).

![Sign-in with 1px outline/cancel borders](pr2-borders-1440.png)

## Built CSS checks

- No `font-family:var(--font)!important`.
- No `Open Sans`.
- No `var(--standardBorder)`, `var(--brand)`, `--color1`, `--border2`, `--white:`.
- `.font-mono{font-family:var(--font-mono)}` is present.
- `html{font-family:var(--font)}` is present.

## Commands

- `npm run build` — pass.
- `npx --no-install eslint src` — 0 errors, 7 pre-existing warnings.
- `npm run lint` — unchanged; still 24 pre-existing `.preview/*` errors.
