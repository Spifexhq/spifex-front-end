import type { AccountingSetupStatus } from "@/models/settings/accountingSetup";

export function accountingRouteAllowed(status: AccountingSetupStatus, page: string) {
  if (page === "overview" || page === "setup" || page === "assistant" || page === "reconciliation" || page === "correlation" || page === "chart") return true;
  if (page === "chart-of-accounts") return status.steps.find(step => step.key === "chart")?.available === true;
  if (page === "books") return status.steps.find(step => step.key === "books")?.available === true;
  if (["periods", "bank-mappings", "posting-policies"].includes(page)) return status.can_activate;
  // Journals are operational-only and unlock after activation.
  return page === "journals" && status.operational;
}
