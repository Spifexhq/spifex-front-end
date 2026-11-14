# Feature Specification: Accounting Overview refactor

**Feature Branch**: `007-accounting-overview-refactor`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Remove the duplicate bottom “Add account” action on Chart of accounts, and rebuild the Accounting Overview panel for both the pre-activation setup state and the post-activation operational state.

## User Scenarios & Testing

### User Story 1 - One Add account action (Priority: P1)

As an accounting user, I see a single Add account action at the top of the chart page, so I do not have to choose between duplicate controls.

**Independent Test**: Open an empty chart and a populated chart at desktop and mobile widths. Confirm each state exposes exactly one Add account action and that it is in the top toolbar or onboarding card.

**Acceptance Scenarios**:

1. Given an empty chart, then the onboarding card offers Add account once and no bottom duplicate is rendered.
2. Given a populated chart, then the top toolbar offers Add account and More actions.
3. Given the chart is loading, then no duplicate placeholder action appears.
4. Given an import panel is open, then the panel can still be cancelled without losing the single Add account entry point.

### User Story 2 - Clear setup overview (Priority: P1)

As a user setting up accounting, I see the next action, progress, validation issues and related configuration in one coherent page.

**Independent Test**: Open `/accounting/overview` before activation with missing currency, missing chart, missing books and ready-to-activate configurations.

**Acceptance Scenarios**:

1. Given the workspace currency is missing, then the primary action opens workspace settings and the prerequisite is explained.
2. Given the chart is incomplete, then the primary action opens the chart and AI setup remains a neutral secondary action.
3. Given the chart is complete but books are incomplete, then the primary action opens books.
4. Given required configuration is valid, then Activate accounting becomes the primary action and the activation consequences are shown.
5. Given validation issues exist, then each issue is listed with a review link and the affected step.
6. Given steps are complete, then progress, step state and configuration cards agree.
7. Given configuration is locked, then the card is visibly disabled with its prerequisite status.

### User Story 3 - Useful operational overview (Priority: P1)

As an active accounting user, I can read balances, journals and common actions without scanning a wall of loose rows.

**Independent Test**: Open `/accounting/overview` after activation with populated and empty trial balances/journals, and with a configuration issue.

**Acceptance Scenarios**:

1. Given posted journals, then debit, credit, journal and posted metrics show current values and the last posting date.
2. Given trial balance rows, then the table shows account, debit, credit and balance with totals.
3. Given no balances, then an empty state is shown instead of a blank table.
4. Given recent journals, then each row shows entry number, status, memo or book and posting date.
5. Given a configuration issue, then an attention panel lists it with a review link.
6. Given data loading fails, then an alert and retry action are shown.
7. Given the page is ready, then quick actions expose journals, Review guide, category rules and bank connections.

### Edge Cases

- Trial balance or journals fail to load: show an alert, keep the page usable and allow retry.
- Only one of the two data requests succeeds: treat the overview data as loading/error rather than showing partial totals.
- More trial rows than the table preview: show a count of displayed versus total accounts.
- Activation blocked by validation: disable the action and keep issues visible.
- Review guide opens without leaving the overview.

## Requirements

- **FR-001**: Render exactly one Add account action on the chart page: onboarding card when empty, top toolbar when populated.
- **FR-002**: Keep More actions in the top toolbar and remove the bottom action row.
- **FR-003**: Setup Overview shows a status, a next-action hero with progress, step state, issues and configuration cards.
- **FR-004**: Primary setup actions follow the sequence workspace settings → chart → books → activation.
- **FR-005**: AI setup remains a neutral secondary action only while the chart is incomplete.
- **FR-006**: Setup and operational issue lists link to the affected Accounting page.
- **FR-007**: Operational Overview shows four metrics, a trial-balance table with totals, recent journals, error/retry and quick actions.
- **FR-008**: No route, API payload or permission change.
- **FR-009**: Add en/pt/fr/de copy and keep the accounting translation check green.
- **FR-010**: Preserve responsive behavior and design-system tokens.

## Success Criteria

- **SC-001**: No duplicate Add account action is rendered in any chart state.
- **SC-002**: Setup next action always matches the current prerequisite.
- **SC-003**: Both Overview states are usable at mobile and desktop widths.
- **SC-004**: All new copy is localised in four languages.
- **SC-005**: `tsc -b`, lint, build and `check:accounting-i18n` pass.

## Assumptions

- The backend setup status remains `chart`, `books`, `review` and provides issue codes.
- Trial balance and journal endpoints keep their existing response shapes.
- Overview remains the single page for setup and operations; no new route is introduced.
