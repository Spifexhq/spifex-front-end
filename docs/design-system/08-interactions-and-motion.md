# 08 — Interactions and Motion

## 1. State model

Every interactive component must define these states. The table gives the
canonical treatment; the audit lists where implementations diverge.

| State | Visual rule | Implementation |
| --- | --- | --- |
| Default | Token fill/border, `font-medium` | base classes |
| Hover | One step darker/tinted; `transition-colors` | `hover:bg-*`, `hover:text-*` |
| Active/pressed | One further step; no scale except menus | `active:bg-*` |
| Focus-visible | 2px outline + 2px offset in accent or neutral | `focus-visible:outline-2 focus-visible:outline-offset-2` |
| Disabled | `opacity-40/60`, `cursor-not-allowed`, no hover | `disabled:*` |
| Loading | Control disabled, spinner replaces label, layout width preserved | `isLoading` on `Button` |
| Selected | Accent tint or `gray-100` + `font-medium` | `aria-selected` / `aria-current` |
| Invalid | `border-red-500`, `ring-red-200`, error text | `aria-invalid` |
| Read-only | Neutral surface, no border emphasis | `readOnly` |

**Focus is the one non-negotiable state.** The repository currently suppresses it
globally (DS-001) and re-adds it with `!important` only inside the shell and
sidebar. That is not the standard; the standard is a visible 2px outline on every
focusable element.

## 2. Hover and active conventions

| Element | Hover | Active |
| --- | --- | --- |
| Primary button | `--accentPrimaryHover` | `--accentPrimaryPressed` |
| Outline button | `bg-[#f9f9f9]` | `bg-[#f2f2f2]` |
| Ghost/icon button | `bg-gray-100`, text `gray-900` | `bg-gray-200` |
| Table row | `bg-gray-50` | — |
| Sidebar row | `bg-gray-200/60` or `gray-100` | accent tint + `font-medium` |
| Menu item | `bg-gray-50` | — |
| Input | `bg-gray-50` + border stays | — |
| Link | `underline` or `text-gray-900` | — |

Rules: hover must never be the only way to discover an action (row actions are
always visible). Do not animate color on `:active` with a longer duration than
hover. Avoid `hover:-translate-y-*` except existing reporting metric cards.

## 3. Motion tokens

| Token | Value | Applied to |
| --- | --- | --- |
| Micro | `150ms ease-out` | Popovers, menus, `ConfirmToast`, selection bar |
| Standard | `160–180ms` | `FloatingDialog` (160), `Snackbar` (180) |
| Layout | `220ms cubic-bezier(.22,1,.36,1)` | Desktop sidebar width/transform, `.app-shell-content` margin (mobile drawer 260ms, backdrop 240ms) |
| Spring | `stiffness 420, damping 36, mass 0.7` | `ConfirmToast` collapse only |
| Reduced | `0ms` | Every animation above |

Observed durations after Phase 5, PR 22: product UI uses only **120 (tooltip), 150,
180, 220**; the 4s status-page loop is illustration-only. `transition-all` is no
longer used in product UI.

## 4. Framer Motion conventions

```tsx
const reduced = useReducedMotion();
<motion.div
  initial={{ opacity: 0, y: reduced ? 0 : 6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: reduced ? 0 : 4 }}
  transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }}
/>
```

- Enter: fade + 4–6px translate (dialogs may add `scale: .99`).
- Exit: fade + smaller translate; always inside `AnimatePresence`.
- Never animate height except `ConfirmToast` body (spring) and accordions.
- Menus use `scale: .985` + `transformOrigin` at the anchor edge.
- Layout animations (`layout`) are limited to the selection bar.
- Every motion component reads `useReducedMotion()`; CSS transitions use
  `motion-reduce:transition-none` or a `prefers-reduced-motion` media query.

## 5. CSS transition conventions

- Use `transition-colors` (53 usages) for controls, not `transition-all`
  (11 usages — DS-036).
- Use `transition-[opacity,transform]` for floating panels.
- Use `transition-shadow` only for elevation changes.
- Never transition `width`/`height` outside the sidebar and collapse affordances.

## 6. Escape and dismissal architecture

Global handler: `src/shared/esc/initGlobalEsc.ts`, installed at app start
(`src/index.tsx` imports `@/shared/esc/initGlobalEsc`).

- Components call `window.useGlobalEsc(enabled, handler)`.
- A single capture-phase listener runs **only the topmost enabled handler**
  (most recently enabled/activated), then `preventDefault`,
  `stopPropagation`, `stopImmediatePropagation`.
- Nested dialogs therefore close one layer at a time; `FloatingDialog` disables
  its own handler when a nested overlay is open.
- `SidebarFrame` uses its own key listener for the mobile rail and defers when a
  modal dialog is open. This is the one exception; consolidate in Phase 3.

Dismissal matrix:

| Layer | Outside click | Escape | Route change | Scroll |
| --- | --- | --- | --- | --- |
| Popover/menu | yes | yes → restore trigger focus | yes | closes |
| Select panel | yes | yes | yes | repositions/close |
| Dialog | no (explicit close) | yes unless busy | stays (caller closes) | no |
| Mobile sidebar | backdrop | yes | yes | no |
| Snackbar | click if enabled | no (timeout) | stays | no |
| ConfirmToast | no | yes (cancel) | caller | no |

## 7. Feedback timing

| Feedback | Timing | Notes |
| --- | --- | --- |
| Tooltip open | immediate, close after 120ms | `InfoTooltip` |
| Popover close delay | 150ms | `Popover` `CLOSE_MS` |
| Snackbar | 5s default (`autoHideDuration`) | pause on hover and focus; errors persist (`persistOnError`); dismiss button |
| ConfirmToast | persists until action | mobile collapse available |
| Feedback stack | 12px gap | Snackbar, ConfirmToast and selection bars share one bottom-center stack |
| Loading skeleton | shown immediately on first load | never flashes for cached data |
| Optimistic delete | row removed, restored on failure | `onDeleted` contract |

Async rule: keep existing content visible during refresh (`aria-busy`), disable
mutating controls, and never replace a populated table with a skeleton.

## 8. Loading hierarchy

1. **Route-level**: `TopProgress` — a 2px sticky bar at the top of the content
   scroll area (`z-20`), or a minimal centered line for blocking auth/bootstrap.
   The indicator stays below the navbar, sidebar, modals, popovers and toasts.
2. **Page-level first load**: `PageSkeleton` (keeps the page heading). Do not also
   render `TopProgress` for the same first load.
3. **Table first load**: `DataTableSkeleton`.
4. **Region refresh**: keep content, show subtle busy state.
5. **Action**: button `isLoading`, spinner inside the control.
6. **Inline async field**: disable + trailing spinner.

Do not stack two indicators for the same wait. `TopProgress` uses one soft accent
gradient sweep on a neutral track, with no visible words, borders or shadows;
skeleton lines use the shared `shimmer` keyframe. Both become static under
`prefers-reduced-motion`.

## 9. Interaction findings

| ID | Severity | Issue | Resolution |
| --- | --- | --- | --- |
| DS-036 | Medium | ✅ Fixed in Phase 5 — explicit transition properties replace `transition-all` |
| DS-037 | Low | ✅ Fixed in Phase 5 — canonical 120/150/180/220; 4s loop is illustration-only |
| DS-038 | Medium | ✅ Fixed in Phase 1 — one accent outline; `#4b5563` on filled actions; indigo removed | — |
| DS-039 | Medium | Table row action buttons are 28px (`h-7 w-7`) on all breakpoints | 32px desktop, 40px mobile |
| DS-040 | High | ✅ Fixed in Phase 2 — one `FeedbackStackProvider`; snackbar, confirmation and selection bars stack at z-15000 | — |
| DS-041 | Low | ✅ Fixed in Phase 5 — `side-panel.css` and checkbox transitions respect reduced motion | — |

## 10. Provisional decisions

- **120ms tooltip close** is treated as canonical even though only `InfoTooltip`
  uses it.
- **Sidebar easing** `cubic-bezier(.22,1,.36,1)` is the only custom curve; a
  second curve should not be introduced without a design decision.
- **Spring usage** is intentionally narrow; expanding it requires an audit entry.
