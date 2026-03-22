// src/models/settings/statements.ts
import type { Paginated } from "@/models/Api";

export type ImportSessionStatus =
  | "draft"
  | "reviewing"
  | "ready_to_commit"
  | "committed"
  | "failed";

export type ImportRowStatus =
  | "pending"
  | "ready"
  | "excluded"
  | "created"
  | "error";

export type StatementSummary = {
  total_pages?: number;
  text_pages?: number;
  image_pages?: number;
  needs_chunking?: boolean;
};

export type Statement = {
  id: string;
  bank_account_id: string | null;
  bank_account_label: string | null;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  pages: number | null;
  error_message?: string;
  created_at: string;
  import_session_id?: string | null;
  import_status?: ImportSessionStatus | null;
  analysis_summary?: StatementSummary | null;
};

export type LookupOption = {
  id: string;
  label: string;
  entity_type?: string;
};

export type StatementImportDepartment = {
  department_id: string;
  percent: string;
};

export type StatementImportItem = {
  item_id: string;
  quantity: string;
};

export type RowCandidate = {
  kind?: string;
  source?: string;
  score?: number;
  description?: string | null;
  observation?: string | null;
  document_type?: string | null;
  entity_id?: string | null;
  entity_label?: string | null;
  entity_type?: string | null;
  ledger_account_id?: string | null;
  ledger_account_label?: string | null;
  project_id?: string | null;
  project_label?: string | null;
  tx_type?: number | null;
  departments?: StatementImportDepartment[];
  items?: StatementImportItem[];
  installment_count?: number | null;
  interval_months?: number | null;
  weekend_action?: number | null;
  ai_rationale?: string;
};

export type FieldSuggestionOption = {
  id?: string;
  label: string;
  value?: unknown;
  score?: number;
  count?: number;
};

export type AiCompletionField<T = unknown> = {
  value: T | null;
  confidence: number;
};

export type AiCompletionPayload = {
  tx_type?: AiCompletionField<number>;
  amount_minor?: AiCompletionField<number>;
  due_date?: AiCompletionField<string>;
  document_type?: AiCompletionField<string>;
  entity_id?: AiCompletionField<string>;
  ledger_account_id?: AiCompletionField<string>;
  project_id?: AiCompletionField<string>;
  installment_count?: AiCompletionField<number>;
  interval_months?: AiCompletionField<number>;
  observation?: AiCompletionField<string>;
  notes?: AiCompletionField<string>;
  rationale?: string;
};

export type CandidatePayload = {
  row_candidates: RowCandidate[];
  field_suggestions: {
    document_type?: FieldSuggestionOption[];
    entity?: FieldSuggestionOption[];
    ledger_account?: FieldSuggestionOption[];
    project?: FieldSuggestionOption[];
  };
  ai_completion?: AiCompletionPayload | null;
};

export type StatementImportRow = {
  id: string;
  line_index: number;
  source_date: string | null;
  source_description: string;
  source_amount_minor: number | null;
  source_tx_type: number | null;
  status: ImportRowStatus;
  match_source: string;
  match_confidence: number;
  duplicate_confidence: number;
  recurring_confidence: number;
  warning_codes: string[];
  warning_messages: string[];
  candidate_payload: CandidatePayload;
  final_description: string;
  final_observation: string;
  final_notes: string;
  final_due_date: string | null;
  final_amount_minor: number | null;
  final_tx_type: number | null;
  document_type: LookupOption | null;
  entity: LookupOption | null;
  ledger_account: LookupOption | null;
  project: LookupOption | null;
  entity_type?: string | null;
  departments?: StatementImportDepartment[];
  items?: StatementImportItem[];
  installment_count?: number | null;
  interval_months?: number | null;
  weekend_action?: number | null;
  review_notes: string;
  created_entry_id?: string | null;

  resolved_description?: string;
  resolved_observation?: string;
  resolved_notes?: string;
  resolved_due_date?: string | null;
  resolved_amount_minor?: number | null;
  resolved_tx_type?: number | null;
  resolved_entity_type?: string | null;
  resolved_departments?: StatementImportDepartment[];
  resolved_items?: StatementImportItem[];
  resolved_installment_count?: number | null;
  resolved_interval_months?: number | null;
  resolved_weekend_action?: number | null;
};

export type StatementImportSession = {
  id: string;
  statement_id: string;
  bank_account_id: string | null;
  status: ImportSessionStatus;
  error_message: string;
  summary: {
    total_rows?: number;
    ready_rows?: number;
    pending_rows?: number;
    excluded_rows?: number;
    created_rows?: number;
    duplicate_rows?: number;
    recurring_rows?: number;
    high_confidence_rows?: number;
  };
  committed_entry_ids: string[];
  created_at?: string;
  rows: StatementImportRow[];
};

export type StatementImportLookups = {
  document_types: LookupOption[];
  entities: LookupOption[];
  ledger_accounts: LookupOption[];
  projects: LookupOption[];
  departments: LookupOption[];
  inventory_items: LookupOption[];
};

export type GetStatementsParams = {
  page?: number;
  page_size?: number;
  search?: string;
  bank_account_id?: string;
  import_status?: ImportSessionStatus | "";
  ordering?: string;
};

export type GetStatementsResponse = Paginated<Statement>;

export type UploadStatementResponse = Statement;

export type TriggerStatementAnalysisResponse = {
  id?: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  started_at?: string;
  finished_at?: string | null;
  error_message?: string;
};

export type LatestStatementAnalysisResponse = {
  id: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  started_at: string;
  finished_at: string | null;
  error_message: string;
};

export type PrepareStatementImportRequest = {
  bank_account_id?: string;
  force_rebuild?: boolean;
};

export type PrepareStatementImportResponse = {
  session_id: string;
  status: string;
};

export type StatementImportRowsResponse = Paginated<StatementImportRow>;

export type UpdateStatementImportRowRequest = Partial<{
  due_date: string | null;
  amount_minor: number | null;
  description: string;
  observation: string;
  notes: string;
  tx_type: number | null;
  document_type: string | null;
  entity_id: string | null;
  entity_type: string;
  ledger_account_id: string | null;
  project_id: string | null;
  departments: StatementImportDepartment[];
  items: StatementImportItem[];
  installment_count: number;
  interval_months: number;
  weekend_action: number;
  status: ImportRowStatus;
  review_notes: string;
  apply_to_installment_family: boolean;
}>;

export type BulkUpdateStatementImportRowsRequest = {
  ids: string[];
  data: UpdateStatementImportRowRequest;
};

export type AcceptConfidentStatementImportRowsResponse = {
  accepted: number;
};

export type CommitStatementImportSessionResponse = {
  created_count: number;
  entry_ids: string[];
};