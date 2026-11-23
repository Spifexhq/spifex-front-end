/* -----------------------------------------------------------------------------
 * File: src/core/permissions/usageResources.ts
 * Maps metered permission codes to the shared resource label used in usage
 * toasts, so add/change/delete of the same resource read consistently.
 * ---------------------------------------------------------------------------*/

const RESOURCE_BY_CODE: Record<string, string> = {
  add_workspace: "workspaces",

  add_cash_flow_entries: "cashFlowEntries",
  change_cash_flow_entries: "cashFlowEntries",
  delete_cash_flow_entries: "cashFlowEntries",

  add_settled_entries: "settledEntries",
  change_settled_entries: "settledEntries",
  delete_settled_entries: "settledEntries",

  add_transference: "transfers",
  add_transfer: "transfers",
  personal_add_transfer: "transfers",
  delete_transfer: "transfers",

  add_user: "members",
  change_user: "members",
  delete_user: "members",
  business_add_member: "members",
  business_change_member: "members",
  business_delete_member: "members",

  add_group: "groups",
  change_group: "groups",
  delete_group: "groups",

  add_bank: "bankAccounts",
  change_bank: "bankAccounts",
  delete_bank: "bankAccounts",
  personal_add_bank_account: "bankAccounts",
  personal_change_bank_account: "bankAccounts",
  personal_delete_bank_account: "bankAccounts",

  add_ledger_account: "ledgerAccounts",
  change_ledger_account: "ledgerAccounts",
  delete_ledger_account: "ledgerAccounts",

  add_department: "departments",
  change_department: "departments",
  delete_department: "departments",

  add_project: "projects",
  change_project: "projects",
  delete_project: "projects",

  add_inventory: "inventoryItems",
  change_inventory: "inventoryItems",
  delete_inventory: "inventoryItems",

  add_entity: "entities",
  change_entity: "entities",
  delete_entity: "entities",

  add_entry_view: "savedViews",
  change_entry_view: "savedViews",
  delete_entry_view: "savedViews",
  personal_add_saved_view: "savedViews",
  personal_change_saved_view: "savedViews",
  personal_delete_saved_view: "savedViews",

  add_statement: "statements",
  change_statement: "statements",
  delete_statement: "statements",

  personal_add_transaction: "transactions",
  personal_change_transaction: "transactions",
  personal_delete_transaction: "transactions",
  personal_settle_transaction: "transactions",

  personal_reverse_settlement: "settlements",

  personal_add_category: "categories",
  personal_change_category: "categories",
  personal_delete_category: "categories",

  personal_add_budget: "budgets",
  personal_change_budget: "budgets",
  personal_delete_budget: "budgets",

  personal_add_goal: "goals",
  personal_change_goal: "goals",
  personal_delete_goal: "goals",

  personal_add_transaction_attachment: "attachments",
  personal_delete_transaction_attachment: "attachments",
};

export function usageResourceKey(code: string): string | null {
  return RESOURCE_BY_CODE[code] ?? null;
}

export type UsageAction =
  | "added"
  | "updated"
  | "deleted"
  | "removed"
  | "settled"
  | "reversed"
  | "transferred"
  | "created";

const ACTION_BY_CODE: Record<string, UsageAction> = {
  add_workspace: "created",
  add_transference: "transferred",
  personal_add_transfer: "transferred",
  personal_settle_transaction: "settled",
  personal_reverse_settlement: "reversed",
  business_add_member: "added",
  business_change_member: "updated",
  business_delete_member: "deleted",
};

/** What the change did, so the toast never shows only a bare resource name. */
export function usageActionKey(
  code: string,
  direction: "increase" | "decrease",
): UsageAction {
  if (direction === "decrease") return "removed";
  const explicit = ACTION_BY_CODE[code];
  if (explicit) return explicit;
  if (code.startsWith("change_")) return "updated";
  if (code.startsWith("delete_")) return "deleted";
  return "added";
}
