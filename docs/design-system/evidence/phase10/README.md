# Phase 10 — Guided accounting AI setup

**Date**: 2026-11-14
**Feature**: `spifex-back-end/specs/013-accounting-ai-setup-blueprint`

## Scope

The chart-only AI questionnaire was replaced by a guided, level-aware setup
wizard. It now previews and applies a complete blueprint: accounting books, the
chart, operational categories, category posting rules and existing bank-account
mappings.

## UX changes

- Four steps: Level → Questions → Review → Preview.
- Level-specific question sets:
  - `none`: plain business questions and a compact setup.
  - `basic`: practical day-to-day bookkeeping questions.
  - `average`: customers, suppliers, payroll, tax, stock and currency.
  - `accountant`: basis, dimensions, consolidation and opening-balance questions.
- No free-text business description. Answers are closed choices/booleans.
- One primary action per step and one compact progress indicator.
- Warnings and assumptions are collapsed details instead of stacked alerts.
- Preview uses four tabs (Books, Chart, Rules, Banks) with summary counts and
  collapsible chart groups.
- Step transitions, generating state and success state use the shared framer
  motion language and respect reduced motion.
- Styling uses `Card`, `Button`, `Select`, `Checkbox`, `Badge`,
  `SegmentedControl`, `PageSkeleton` and neutral design-system surfaces.

## Backend and security

- `ledger.setup.ai_guide` owns questionnaires, fixed system prompt, Gemini
  boundary, normalizers, safety checks and preview/apply orchestration.
- New endpoints:
  - `GET /ledger/setup/ai-guide/context/`
  - `POST /ledger/setup/ai-guide/preview/`
  - `POST /ledger/setup/ai-guide/apply/`
- Apply re-validates the blueprint, locks the accounting workspace, checks the
  setup revision and uses existing accounting services in phase order.
- Existing bank accounts are mapped; account numbers are never invented.
- Injection phrases, unknown questions, invalid options and out-of-range
  references are rejected or dropped before writes.
- Dedicated `ai_setup` throttle; audit events store counts/outcomes, never
  prompts or answers.
- The legacy chart-only endpoint remains but its answers and text are bounded
  and scanned.

## Verification

| Check | Result |
| --- | --- |
| Backend `manage.py check` | No issues |
| Backend `makemigrations --check --dry-run` | No changes detected |
| Backend compile | All new modules compile |
| Backend normalizer/security tests | 6 passed (`--keepdb`) |
| Frontend `tsc -b` | Passed |
| Frontend `npm run lint` | 0 errors; 7 pre-existing warnings |
| Frontend `npm run build` | Passed |
| Accounting i18n check | 485 keys verified in en/pt/fr/de |
| Visual 1440px | Questionnaire and preview captured |
| Visual 360px | No horizontal overflow (`scrollWidth` 354 in a 360px iframe) |

## Screenshots

- `guided-questions-1440.png`
- `guided-preview-1440.png`
- `guided-questions-360.png`

## Remaining risks

- Live Gemini generation and authenticated apply were not run in this session
  because no provider key/session was available.
- The repository test database migration chain still fails before full
  `ledger.tests` can run; the new non-database tests pass.
- Existing categories/banks are required context; the wizard links to manual
  setup when the provider or prerequisites are unavailable.
- Security follow-up: the provider key currently appears in tracked backend
  `.env.dev` / `.env.prod`; rotate it and move it to a secret manager.
