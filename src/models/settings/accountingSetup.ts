export type SetupPhase = "profile" | "chart" | "books" | "review";
export type SetupIssue = { code: string; account_id?: string; account_code?: string };
export type SetupStep = { key: SetupPhase; complete: boolean; available: boolean; issues: SetupIssue[] };
export interface AccountingSetupStatus {
  status: "draft" | "configuring" | "ready" | "active" | "needs_attention";
  operational: boolean;
  can_activate: boolean;
  legacy: boolean;
  current_phase: SetupPhase;
  revision: string;
  steps: SetupStep[];
  profile: { mode: "personal" | "organizational"; currency: string };
  primary_book_id: string | null;
  activated_at: string | null;
}
export interface FiscalPeriod {
  id: string;
  book: string;
  period_key: string;
  starts_at: string;
  ends_at: string;
  status: "open" | "soft_closed" | "closed";
  has_journals?: boolean;
}
