# Snackbar

One shared presentation and lifecycle for page notifications. Default auto-dismiss is five seconds; use null or zero deliberately for persistent notifications. Pass the notification state object as notificationKey, so two consecutive identical messages each receive their own countdown. Parent onClose callback changes do not reset the timer.

Hover and keyboard focus pause independently; leaving both resumes the remaining time. Closing is single-shot and cancels the pending timer. Unmounting cancels all callbacks. The last content remains visible during the exit animation. Custom children retain their own presentation.

Use apiErrorMessage(cause, localizedFallback) at the operation boundary for errors. It supports structured API errors, field validation arrays, Axios envelopes and Error instances. The HTTP client normalizes API failures into Error objects while preserving codes, status and field details for existing consumers. Never render HTML returned by an error page.

Notification text stays in page translation namespaces; shared dismiss and fallback text are localized in common for en, pt, fr and de. Tailwind styles provide a solid fallback when backdrop filters are unavailable, small severity accents, mobile-safe widths and reduced-motion transitions.
