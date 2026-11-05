# FloatingDialog

Reusable centered form frame, styled with Tailwind. `width` and `height` are fixed CSS-pixel dimensions clamped to viewport space. Entry uses 880 × 670; transfer uses 720 × 590. Body content and tab changes never resize the frame. The fieldset scrolls internally; heading, tabs and actions remain pinned. Narrow screens retain floating margins and use larger touch targets.

The caller supplies title/description, translated close label, tabs, fields, footer, and optional confirmation/warning overlay. Busy/loading states disable form fields. The frame owns the portal, restrained enter/exit motion, reduced-motion behavior, body scroll lock, focus trap/restoration and inert background form during alerts. It deliberately does not close on backdrop clicks. Consumers own Escape/save shortcuts and dirty-form policy, and must keep the component mounted while toggling `isOpen` so exit animations can run.

`DialogSkeleton` supports a field count and localized loading label. Finance-specific API calls, recurrence/settlement locks, validation and submit logic live under `pages/Finance/components/EntryForm` and `TransferForm`. Shared yes/no controls use `shared/ui/ToggleSwitch`, a labelled native button with switch semantics and keyboard support.

Verification: 91 frontend regressions, TypeScript and scoped ESLint passed. Browser visual verification was attempted with a temporary synthetic-data preview, then blocked: the in-app browser timed out and Computer Use could not reliably determine the current URL. Temporary preview files were removed. No real financial transactions were submitted during verification.
