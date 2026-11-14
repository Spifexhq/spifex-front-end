# Feature Specification: Accounting chart setup UX

**Feature Branch**: `006-accounting-chart-setup-ux`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Remove accounting tours, neutralise AI setup entry points, remove Review guide and AI setup from the sidebar, use the Personal Settings country list in the AI questionnaire, preserve AI answers as browser scratch with a close confirmation, and refactor the Chart of Accounts setup with manual-paste examples, clipboard copy and a validator.

## User Scenarios & Testing

### User Story 1 - Focused navigation (Priority: P1)

As an accounting user, I see only durable workspace, operations and configuration entries in the Accounting sidebar, so the rail is not cluttered with temporary assistants or duplicated review actions.

**Independent Test**: Open any Accounting page at desktop and mobile widths and confirm the sidebar lists Overview, Journals, and the configuration pages only. Confirm the Review guide and AI setup remain reachable from Overview and the chart page.

**Acceptance Scenarios**:

1. Given the Accounting sidebar, when it renders, then Review guide and AI setup are absent.
2. Given the old Review guide route, when I open it, then the app redirects to Overview.
3. Given the chart page, when I press the guided setup action, then the AI setup side panel opens.

### User Story 2 - Neutral AI entry points (Priority: P1)

As an accounting user, AI setup appears as a neutral, optional helper rather than the dominant primary action.

**Independent Test**: Inspect the Overview and empty chart page actions at 100% zoom and confirm neutral button styling and a visible gap between the icon and label.

**Acceptance Scenarios**:

1. Given the empty chart page, when the setup card renders, then the guided setup button uses neutral outline styling.
2. Given any AI action with an icon and a label, then a consistent gap separates them.
3. Given the AI wizard footer, then primary actions use neutral black styling rather than an accent colour.

### User Story 3 - Country-aware questionnaire (Priority: P1)

As a business owner, I choose my country from the same searchable country list used in Personal Settings, so tax and reporting guidance can be adapted.

**Independent Test**: Open AI setup, focus the country field, search for a country, select it, and confirm the review step shows the localized country name.

**Acceptance Scenarios**:

1. Given the questionnaire country question, then it renders a searchable list of countries.
2. Given the workspace has a saved country code, then the matching country is preselected.
3. Given a different UI language, then country names and sorting follow that language.

### User Story 4 - Keep or discard scratch answers (Priority: P1)

As a user who closes AI setup early, I decide whether my answers are discarded or kept in browser memory for later.

**Independent Test**: Enter answers, close the panel, choose “Keep scratch”, reopen the panel and confirm the answers are restored. Repeat and choose “Discard answers” and confirm the form is empty.

**Acceptance Scenarios**:

1. Given unanswered setup, when I close the panel, then it closes without prompting.
2. Given entered answers, when I close the panel, then a confirmation asks whether to keep or discard them.
3. Given “Keep scratch”, then answers survive in browser memory and repopulate the form.
4. Given “Discard answers”, then scratch is cleared and the form starts empty.
5. Given no database writes, then scratch never leaves the browser.

### User Story 5 - Understandable chart setup (Priority: P1)

As a user setting up accounts, I can choose a template, upload a file, or paste rows, with a clearer layout and useful manual-paste tooling.

**Independent Test**: Open Configure ledger on an empty chart, switch between methods, copy the base structure, paste valid and invalid rows, and confirm the inspector reports the result before submission.

**Acceptance Scenarios**:

1. Given the setup panel, then each method is a clearly selected card with an icon, title and description.
2. Given manual mode, then the textarea shows a multi-line example placeholder.
3. Given the base-structure panel, when I press the copy icon, then the header structure is copied and the button confirms success.
4. Given pasted rows, then a validator reports row count, detected columns, errors with line numbers and warnings.
5. Given validation errors, then submission is blocked until they are fixed.
6. Given a valid paste, then submission proceeds to the existing import API.

### Edge Cases

- Scratch contains unknown levels or answers: fall back to safe defaults.
- Country code missing from the ISO list: keep the raw value rather than losing the answer.
- Pasted rows use commas or semicolons: both delimiters are supported.
- Quoted values containing delimiters: parsing follows CSV quoting rules.
- Duplicate account codes, missing parents, invalid choices and invalid booleans: reported as errors.
- Empty required columns: reported with the line number and column name.

## Requirements

- **FR-001**: Remove every tour configuration, component, usage and translation key.
- **FR-002**: Remove Review guide and AI setup entries from the Accounting sidebar; keep the panels reachable from Overview and the chart page.
- **FR-003**: Use neutral outline/black styling for AI setup actions and always separate icon and label with a gap.
- **FR-004**: Render the AI country answer with `getCountries()` from `src/lib/location/countries.ts`.
- **FR-005**: Map the workspace country code to the localized country label for preselection.
- **FR-006**: Persist unfinished AI answers only in `sessionStorage`; never write scratch to the backend.
- **FR-007**: Ask Keep scratch / Discard answers when closing a panel that has answers.
- **FR-008**: Refactor chart setup into a clear method selector and a single active method panel.
- **FR-009**: Provide a rich manual example, a copyable base structure panel and a live paste validator.
- **FR-010**: Add all new copy to en, pt, fr and de and keep the accounting translation check green.
- **FR-011**: Preserve routes, permissions and existing import payloads.

## Success Criteria

- **SC-001**: No tour code or translation remains.
- **SC-002**: AI entry points are neutral and correctly spaced.
- **SC-003**: Country selection uses the shared list and localized names.
- **SC-004**: Keep/discard scratch behaviour works in both directions.
- **SC-005**: Manual paste shows example, copy action and validation feedback.
- **SC-006**: `tsc -b`, lint, build and `check:accounting-i18n` pass.

## Assumptions

- Browser scratch uses session storage and is intentionally not synchronised.
- The existing backend manual parser accepts comma or semicolon delimiters and uses `code`, `name`, `account_type`, `statement_section`, `normal_balance` as required headers.
- Review guide and AI setup remain available from Overview and the chart page after removal from the sidebar.
