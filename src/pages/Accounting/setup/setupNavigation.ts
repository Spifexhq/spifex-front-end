import type { AccountingSetupStatus } from "@/models/settings/accountingSetup";

export function accountingRouteAllowed(status: AccountingSetupStatus, page: string) {
  if (["overview", "setup", "reconciliation", "chart"].includes(page)) {
    return page !== "chart" || status.steps.find(step => step.key === "chart")?.available === true;
  }
  if (page === "books") return status.steps.find(step => step.key === "books")?.available === true;
  if (["periods", "bank-mappings", "posting-policies"].includes(page)) return status.can_activate;
  // Historical journals/connections remain readable while configuration is repaired.
  return ["journals", "correlation"].includes(page);
}
