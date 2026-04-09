import type { Paginated } from '@/models/Api';

export type AccountingBookBasis = 'management' | 'cash' | 'accrual' | 'tax';
export type JournalSourceType = 'cash_entry' | 'cash_settlement' | 'cash_transfer' | 'manual' | 'system';
export type JournalStatus = 'draft' | 'posted' | 'reversed' | 'void' | 'error';
export type PostingPolicyStatus = 'active' | 'inactive';
export type AccountingReadinessStatus =
  | 'uncategorized'
  | 'missing_policy'
  | 'missing_bank_mapping'
  | 'ready'
  | 'posted'
  | 'error';

export interface AccountingBook {
  id: string;
  code: string;
  name: string;
  basis: AccountingBookBasis;
  currency_code: string;
  is_primary: boolean;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

export interface AddAccountingBookRequest {
  code: string;
  name: string;
  basis: AccountingBookBasis;
  currency_code: string;
  is_primary?: boolean;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export type EditAccountingBookRequest = Partial<AddAccountingBookRequest>;

export interface CategoryPostingPolicy {
  id: string;

  cashflow_category_id: string;
  cashflow_category_code?: string;
  cashflow_category_name?: string;
  cashflow_category_label?: string;

  book_id: string;
  book_code?: string;
  book_name?: string;
  book_label?: string;

  settlement_debit_account_id?: string | null;
  settlement_debit_account_code?: string | null;
  settlement_debit_account_name?: string | null;
  settlement_debit_account_label?: string | null;

  settlement_credit_account_id?: string | null;
  settlement_credit_account_code?: string | null;
  settlement_credit_account_name?: string | null;
  settlement_credit_account_label?: string | null;

  accrual_debit_account_id?: string | null;
  accrual_debit_account_code?: string | null;
  accrual_debit_account_name?: string | null;
  accrual_debit_account_label?: string | null;

  accrual_credit_account_id?: string | null;
  accrual_credit_account_code?: string | null;
  accrual_credit_account_name?: string | null;
  accrual_credit_account_label?: string | null;

  clearing_account_id?: string | null;
  clearing_account_code?: string | null;
  clearing_account_name?: string | null;
  clearing_account_label?: string | null;

  status: PostingPolicyStatus;
  metadata?: Record<string, unknown>;
}

export interface UpsertCategoryPostingPolicyRequest {
  cashflow_category_id: string;
  book_id: string;
  settlement_debit_account_id?: string | null;
  settlement_credit_account_id?: string | null;
  accrual_debit_account_id?: string | null;
  accrual_credit_account_id?: string | null;
  clearing_account_id?: string | null;
  status?: PostingPolicyStatus;
  metadata?: Record<string, unknown>;
}

export interface BankAccountLedgerMap {
  id: string;
  bank_account_id: string;
  book_id: string;
  ledger_account_id: string;
  is_active: boolean;
}

export interface UpsertBankAccountLedgerMapRequest {
  bank_account_id: string;
  book_id: string;
  ledger_account_id: string;
}

export interface JournalLineDimension {
  dimension_id: string;
  dimension_code: string;
  value_id: string;
  value_code: string;
  value_name: string;
}

export interface JournalLine {
  line_no: number;
  account_id: string;
  account_code: string;
  account_name: string;
  debit_minor: number;
  credit_minor: number;
  amount_currency_minor: number;
  currency_code: string;
  bank_account_id?: string | null;
  project_id?: string | null;
  entity_id?: string | null;
  memo?: string;
  dimensions: JournalLineDimension[];
  metadata?: Record<string, unknown>;
}

export interface JournalEntry {
  id: string;
  book_id: string;
  book_code: string;
  source_type: JournalSourceType;
  source_external_id: string;
  idempotency_key: string;
  entry_number: string;
  document_date: string;
  posting_date: string;
  status: JournalStatus;
  currency_code: string;
  memo?: string;
  reversal_of_id?: string | null;
  posted_at?: string | null;
  metadata?: Record<string, unknown>;
  lines: JournalLine[];
}

export interface JournalEntryLineWrite {
  account_id: string;
  debit_minor?: number;
  credit_minor?: number;
  amount_currency_minor?: number;
  currency_code?: string;
  bank_account_id?: string | null;
  project_id?: string | null;
  entity_id?: string | null;
  cash_entry_id?: string | null;
  cash_settlement_id?: string | null;
  cash_transfer_id?: string | null;
  memo?: string;
  dimensions?: Array<{ dimension_id: string; value_id: string }>;
  metadata?: Record<string, unknown>;
}

export interface AddJournalEntryRequest {
  book_id: string;
  fiscal_period_id?: string | null;
  source_type?: JournalSourceType;
  source_external_id?: string;
  idempotency_key?: string;
  document_date: string;
  posting_date: string;
  currency_code: string;
  memo?: string;
  metadata?: Record<string, unknown>;
  lines: JournalEntryLineWrite[];
}

export interface ReverseJournalEntryRequest {
  memo?: string;
}

export interface GetJournalEntriesParams {
  book_id?: string;
  source_type?: JournalSourceType;
  status?: JournalStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export type GetJournalEntriesResponse = Paginated<JournalEntry>;

export interface TrialBalanceRow {
  external_id?: string;
  code: string;
  name: string;
  debit_minor?: number;
  credit_minor?: number;
  balance_minor?: number;
}

export interface GetTrialBalanceParams {
  book_id?: string;
  date_to?: string;
}

export interface GetTrialBalanceResponse {
  items: TrialBalanceRow[];
}

export interface AccountingReadiness {
  status: AccountingReadinessStatus;
  label: string;
  detail?: string;
  book_id?: string | null;
  cashflow_category_id?: string | null;
  bank_account_id?: string | null;
  journal_entry_id?: string | null;
}