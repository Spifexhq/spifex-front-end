import type { AccountingSetupStatus } from "./accountingSetup";
import type { AddAccountingBookRequest } from "./accounting";
import type { LedgerGuideAccount } from "./ledgerAccounts";

export type AiSetupLevel = "none" | "basic" | "average" | "accountant";
export type AiSetupLanguage = "en" | "pt" | "fr" | "de";
export type AiSetupQuestionType = "single" | "multi" | "boolean" | "text" | "textarea";

export interface AiSetupQuestionOption {
  value: string;
  label_key: string;
}

export interface AiSetupQuestion {
  key: string;
  type: AiSetupQuestionType;
  required: boolean;
  max_length?: number;
  options: AiSetupQuestionOption[];
}

export interface AiSetupSection {
  id: string;
  title_key: string;
  description_key: string;
  questions: AiSetupQuestion[];
}

export interface AiSetupCategory {
  id?: string;
  code: string;
  name: string;
  description?: string;
  tx_type_hint?: number | "credit" | "debit" | "none" | null;
}

export interface AiSetupBankAccount {
  id: string;
  currency: string;
  label: string;
}

export interface AiSetupAccount extends LedgerGuideAccount {
  is_bank_control?: boolean;
  allows_manual_posting?: boolean;
}

export interface AiSetupCategoryRule {
  category_code: string;
  book_code: string;
  settlement_debit_account_code?: string;
  settlement_credit_account_code?: string;
  accrual_debit_account_code?: string;
  accrual_credit_account_code?: string;
  clearing_account_code?: string;
  metadata?: Record<string, unknown>;
}

export interface AiSetupBankMapping {
  bank_account_id: string;
  book_code: string;
  account_code: string;
}

export interface AiSetupMessage {
  code: string;
  message: string;
}

export interface AiSetupBlueprint {
  books: AddAccountingBookRequest[];
  accounts: AiSetupAccount[];
  categories: AiSetupCategory[];
  category_rules: AiSetupCategoryRule[];
  bank_mappings: AiSetupBankMapping[];
}

export interface AiSetupSummary {
  books?: number;
  accounts?: number;
  posting_accounts?: number;
  categories?: number;
  category_rules?: number;
  bank_mappings?: number;
}

export interface AiSetupContext {
  provider_configured: boolean;
  provider: string;
  language: AiSetupLanguage;
  level: AiSetupLevel;
  level_options: AiSetupLevel[];
  questionnaires: Record<AiSetupLevel, AiSetupSection[]>;
  defaults: { currency: string; country?: string };
  existing: {
    categories: AiSetupCategory[];
    bank_accounts: AiSetupBankAccount[];
    chart: boolean;
    books: number;
    operational: boolean;
  };
  blockers: AiSetupMessage[];
  can_apply: boolean;
  revision: string;
  setup: AccountingSetupStatus;
}

export interface AiSetupPreviewRequest {
  level: AiSetupLevel;
  language: AiSetupLanguage;
  answers: Record<string, string | string[] | boolean>;
}

export interface AiSetupPreviewResponse {
  provider: string;
  model: string | null;
  prompt_version: string | null;
  language: AiSetupLanguage;
  level: AiSetupLevel;
  can_apply: boolean;
  blockers: AiSetupMessage[];
  warnings: AiSetupMessage[];
  assumptions: AiSetupMessage[];
  summary: AiSetupSummary;
  revision: string;
  blueprint: AiSetupBlueprint | null;
}

export interface AiSetupApplyRequest extends AiSetupPreviewRequest {
  blueprint: AiSetupBlueprint;
  revision: string;
  activate: boolean;
}

export interface AiSetupApplyResponse {
  activated: boolean;
  created: {
    accounts: number;
    books: number;
    categories: number;
    category_rules: number;
    bank_mappings: number;
  };
  setup: AccountingSetupStatus;
  warnings: AiSetupMessage[];
}
