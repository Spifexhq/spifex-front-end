# Feature Specification: Landing-aligned primary button

**Feature Branch**: `011-primary-button-landing-style`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Make the orange primary button match the primary button style used by `spifex-landing`.

## User Scenarios & Testing

### User Story 1 - Brand-consistent primary action (Priority: P1)

As a user moving between the marketing site and the product, the primary orange action looks like the same brand button in both places.

**Independent Test**: Compare a primary `Button` in the app with the landing `Button` primary variant.

**Acceptance Scenarios**:

1. Given a primary button, then its fill is the landing deep orange `#C2410C`.
2. Given hover and pressed states, then they use `#A93A0A` and `#92320A`.
3. Given a primary button, then it uses white text and the landing normal/hover/pressed colours only; shape, typography, shadow and motion stay standard.
4. Given a disabled primary button, then it uses the disabled strong-orange token.
5. Given other variants (`outline`, `outlineBlack`, `danger`, `common`, `cancel`, `ghost`, `muted`), then they are unchanged.

## Requirements

- **FR-001**: Add `--accentPrimaryStrong*` tokens for the primary button fill, hover, pressed and disabled states.
- **FR-002**: Keep `--accentPrimary*` for selection, links, focus and switches.
- **FR-003**: Update only the `Button` primary colour tokens. Keep standard radius, font weight, shadow and transitions.
- **FR-004**: Keep the existing size scale so layouts do not shift.
- **FR-005**: Update design-system token, colour and component documentation.
- **FR-006**: No behavioural, route, permission or API changes.

## Success Criteria

- **SC-001**: Primary buttons visually match the landing brand button.
- **SC-002**: White text on `#C2410C` meets normal-text contrast (5.18:1).
- **SC-003**: Other button variants are visually unchanged.
- **SC-004**: `tsc -b`, lint and build pass.
