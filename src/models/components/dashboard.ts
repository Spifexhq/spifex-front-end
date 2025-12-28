// src/models/components/dashboard.ts

export type MoneyDecimal = string;

/* ------------------------------ List item previews ----------------------------- */

export interface DashboardEntryPreview {
  id: string;
  due_date: string;          // ISO date
  amount: MoneyDecimal;      // major decimal string
  tx_type: number;           // 1 inflow, -1 outflow
  description: string;
  entity_name: string | null;
  project_name: string | null;
  is_settled: boolean;
}

export interface DashboardSettlementPreview {
  id: string;
  value_date: string;        // ISO date
  amount: MoneyDecimal;      // major decimal string
  tx_type: number;
  bank_label: string;
  entry_description: string;
}

/* ----------------------------- Organization & stats ---------------------------- */

export interface DashboardOrganization {
  external_id: string;
  name: string;
}

export interface DashboardOpenEntriesStats {
  count: number;
  total: MoneyDecimal;
  inflow: MoneyDecimal;
  outflow: MoneyDecimal;
  net: MoneyDecimal;
}

export interface DashboardSettledLast30dStats {
  count: number;
  inflow: MoneyDecimal;
  outflow: MoneyDecimal;
  net: MoneyDecimal;
}

export interface DashboardMastersStats {
  projects: number;
  departments: number;
  entities: number;
  inventory_items: number;
}

export interface DashboardBankingStats {
  accounts: number;
  total_consolidated_balance: MoneyDecimal;
}

export interface DashboardStats {
  open_entries: DashboardOpenEntriesStats;
  settled_last_30d: DashboardSettledLast30dStats;
  masters: DashboardMastersStats;
  banking: DashboardBankingStats;
}

/* -------------------------------- Full payload -------------------------------- */

export interface DashboardOverview {
  organization: DashboardOrganization;
  stats: DashboardStats;

  overdue: DashboardEntryPreview[];
  next7: DashboardEntryPreview[];
  recent_settlements: DashboardSettlementPreview[];
}
