# Spifex Frontend Constitution

## Core Principles

### I. Keep Product Boundaries
Keep Business and Personal routing and feature ownership separate. Shared financial UI and services must remain reusable and must not import product-specific implementation across boundaries.

### II. Preserve Stable API and Routes
Keep established API contracts and Business routes compatible. Coordinate any cross-repository contract change against the backend consumer and producer.

### III. Protect Workspace Context
Every workspace-scoped request must use the intended authorized workspace. Ignore stale asynchronous responses when identity or workspace selection changes.

### IV. Use the Existing Design System
Reuse shared UI, responsive layout, accessibility, and translation conventions. Keep user-facing strings translated in every supported locale.

### V. Verify Feature Boundaries
Use focused frontend checks for behavior changes and run TypeScript checks for changed types. Report relevant checks and any skipped validation.

## Constraints

- Use the established React, TypeScript, React Router, Redux, Axios, and Tailwind conventions.
- Keep route-level code splitting and auth/workspace access guards intact.
- Never assume backend mutations succeeded until the server response confirms them.

## Development Workflow

- Inspect feature callers and shared dependencies before refactoring.
- For cross-repository changes, record the API contract in the feature specification and validate both sides.
- Keep accessibility, keyboard behavior, mobile use, loading, failure, and retry states in scope.

## Governance

This constitution records requirements already present in the Spifex frontend engineering instructions. Amendments must remain compatible with those instructions.

**Version**: 1.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
