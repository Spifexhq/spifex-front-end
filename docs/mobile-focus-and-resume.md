# Select focus and session resume

Select focuses its search input (desktop) or panel (mobile) on opening only. Filtering recalculates the active result and scroll metrics without transferring focus. An input already focused inside the panel is left alone during viewport changes. Repositioning, Escape and keyboard navigation remain available.

Session visibility/focus checks, HttpOnly refresh cookies, server expiry, identity checks and live permission updates remain enabled. Redux preserves references for unchanged user, organization and permissions data. Genuine account, membership, permission and subscription changes still update immediately. No sensitive drafts or tokens are newly stored in browser persistence.

A failed configuration revalidation retains only a previously validated same-user/same-organization snapshot through temporary failures. Initial checks, a different identity or organization, and explicit 401/403 denials do not gain access through this policy. Successful responses with incomplete setup continue to redirect. This controls presentation; backend authorization still applies to every API call.

Tests: scripts/resume-state.test.mjs exercises the actual auth reducer and a simulated Select hook/effect lifecycle across mobile keystrokes. scripts/locale-setup.test.mjs and scripts/settings-navigation.test.mjs cover startup, temporary outage and access denial behavior. This is not physical iPhone validation. If iOS terminates/discards the entire browser tab, component memory cannot survive; deliberate draft recovery would be a separate feature requiring sensitive-data retention decisions.

References:
- React input troubleshooting: https://react.dev/reference/react-dom/components/input
- Browser visibility events: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- Server-enforced session expiry: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
