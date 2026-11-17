# Plan: Overview blank after workspace switch

**Feature**: `015-workspace-switch-overview-race`

## Changes

1. Split HTTP request freshness into:
   - identity freshness (auth generation and selected organization) for
     cancelling superseded reads;
   - cache freshness (cache/resource versions) for storing responses.
2. Increase the auth-gate wait window so data reads do not escape a slow
   workspace transition.
3. In the Business overview:
   - retry up to two times after a cancelled request;
   - normalize all array fields from the response.
4. Harden chart rendering:
   - do not mount Recharts with an empty point series;
   - coerce and filter chart point values;
   - guard Sparkline inputs against non-finite or missing values.

## Constraints

- Do not weaken user/workspace isolation.
- Preserve the existing 401 refresh behavior.
- Keep the overview request/caching contract.
