export type AccountingReadinessStatus =
  | 'uncategorised'
  | 'missing_policy'
  | 'missing_bank_mapping'
  | 'ready'
  | 'posted'
  | 'error';

export interface AccountingLinkedJournal {
  id: string;
  entry_number?: string;
  status?: string;
  posting_date?: string;
}

export interface AccountingPreviewLine {
  side: 'debit' | 'credit';
  account_code?: string;
  account_name?: string;
  amount?: string;
}

export interface AccountingReadiness {
  status: AccountingReadinessStatus;
  label: string;
  message?: string;
  policy_configured?: boolean;
  bank_mapping_configured?: boolean;
  book_id?: string | null;
  book_code?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  ledger_account_id?: string | null;
  ledger_account_name?: string | null;
  linked_journal?: AccountingLinkedJournal | null;
  next_action?: string;
}

export interface EntryAccountingReadinessEnvelope {
  entry_id: string;
  accounting: AccountingReadiness;
}

export interface EntryAccountingPreviewEnvelope extends EntryAccountingReadinessEnvelope {
  preview_lines: AccountingPreviewLine[];
}

export function fallbackAccountingReadiness(input?: Partial<AccountingReadiness> | null): AccountingReadiness {
  return {
    status: input?.status ?? 'uncategorised',
    label: input?.label ?? 'Unclassified',
    message: input?.message ?? 'This entry still needs an operational cashflow category before accounting can consume it.',
    policy_configured: input?.policy_configured ?? false,
    bank_mapping_configured: input?.bank_mapping_configured ?? false,
    book_id: input?.book_id ?? null,
    book_code: input?.book_code ?? null,
    category_id: input?.category_id ?? null,
    category_name: input?.category_name ?? null,
    ledger_account_id: input?.ledger_account_id ?? null,
    ledger_account_name: input?.ledger_account_name ?? null,
    linked_journal: input?.linked_journal ?? null,
    next_action: input?.next_action ?? 'Review accounting readiness',
  };
}
