# Spifex frontend

When this repository sits in the shared Spifex directory, read [the workspace instructions](../AGENTS.md) and [frontend reference](../docs/refactor/agents/frontend-agent.md). Open the shared directory for cross-repository work and project agent discovery.

Keep Business and Personal routing and feature ownership separate. Reuse shared UI and the existing Spifex design system. Preserve Business routes and verify responsive behavior. Coordinate API contracts with the backend and run the affected frontend tests and TypeScript checks.

Use the installed Spec Kit workflow for every new feature. Write and review its specification, plan, and tasks before implementation, run analysis before implementation, and run convergence after implementation. Keep cross-repository feature artifacts in the backend `specs/` directory; store frontend-only feature artifacts in this repository. Use the Spec Kit bug-fixing workflow for bounded repairs when appropriate.
