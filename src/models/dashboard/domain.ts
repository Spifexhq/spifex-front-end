// src/models/dashboard/domain.ts

// -----------------------------------------------------------------------------
// List item previews
// -----------------------------------------------------------------------------

export interface DashboardEntryPreview {
  id: string;
  due_date: string;
  amount_minor: number;
  tx_type: number; // 1 (credit / inflow) or -1 (debit / outflow)
  description: string;
  entity_name: string | null;
  project_name: string | null;
  is_settled: boolean;
}

export interface DashboardSettlementPreview {
  id: string;
  value_date: string;
  amount_minor: number;
  tx_type: number; // same as entry.tx_type
  bank_label: string;
  entry_description: string;
}

// -----------------------------------------------------------------------------
// Organization & stats
// -----------------------------------------------------------------------------

export interface DashboardOrganization {
  external_id: string;
  name: string;
}

export interface DashboardOpenEntriesStats {
  count: number;
  total_minor: number;
  inflow_minor: number;
  outflow_minor: number;
  net_minor: number;
}

export interface DashboardSettledLast30dStats {
  count: number;
  inflow_minor: number;
  outflow_minor: number;
  net_minor: number;
}

export interface DashboardMastersStats {
  projects: number;
  departments: number;
  entities: number;
  inventory_items: number;
}

export interface DashboardBankingStats {
  accounts: number;
  total_consolidated_balance_minor: number;
}

export interface DashboardStats {
  open_entries: DashboardOpenEntriesStats;
  settled_last_30d: DashboardSettledLast30dStats;
  masters: DashboardMastersStats;
  banking: DashboardBankingStats;
}

// -----------------------------------------------------------------------------
// Full payload (data from API)
// -----------------------------------------------------------------------------

export interface DashboardOverview {
  organization: DashboardOrganization;
  stats: DashboardStats;

  overdue: DashboardEntryPreview[];
  next7: DashboardEntryPreview[];
  recent_settlements: DashboardSettlementPreview[];
}
