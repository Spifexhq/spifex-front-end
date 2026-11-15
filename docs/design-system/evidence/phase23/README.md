# Phase 23 — Business entry attachments

**Date**: 2026-11-15
**Feature**: `018-business-entry-attachments`

## What changed

- The Personal attachment section was extracted into the shared
  `EntryAttachments` component. Personal and Business now render the same
  heading, file list, download action, removal confirmation and error states.
- Business and Personal entry creation use the shared `PendingAttachments`
  picker in the Details tab. Files upload after the entry is created, so the
  existing create contracts and recurrence payloads stay unchanged.
- Recurring creations in both products show a project `Checkbox` for every
  pending file: "All N installments". It defaults on per file; turning it off
  keeps that file on the first installment while other files can still be
  shared.
- The Business and Personal previews and edit modals show attachments with the
  same styling and behavior.
- Cash-flow rows show a small paperclip before the description when an active
  attachment exists. No column was added; outstanding and settled rows both
  use the indicator.

## Design system notes

- Reused the existing shared `Button`, focus rings, border and muted text
  tokens; no new component styles were introduced.
- The paperclip is a 12px lucide icon in the existing gray-400 muted tone and
  carries an accessible label.
- Attachment controls follow the existing 40px touch targets and reduced-motion
  loading skeleton.

## Verification

| Check | Result |
| --- | --- |
| Django `check` | Pass |
| `makemigrations --check --dry-run` | No changes detected |
| Python compileall | Pass |
| Frontend `tsc -b` | Pass |
| Frontend lint | 0 errors; existing warnings only |
| Frontend build | Pass |
| Locale parity | Pass (en/pt/fr/de) |

The focused backend attachment test is added but cannot run while the
pre-existing test-database migration graph blocks migrations.
