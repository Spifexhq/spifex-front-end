const settingsPages = new Set(["personal", "organization-settings", "subscription-management", "security", "banks", "departments", "entities", "inventory", "projects", "members", "groups", "categories", "ledger-accounts", "bank-statements", "notifications"]);
const accountingPages: Record<string, string> = { overview: "overview", chart: "chart", books: "books", "bank-mappings": "bankMappings", "posting-policies": "postingPolicies", journals: "journals", reconciliation: "reconciliation", correlation: "correlation" };
export function getPageTitleKey(pathname: string): string {
  const [, root, page, detail] = pathname.split("/");
  if (root === "settings") {
    if (page === "accounting") return `accountingSettings:nav.${accountingPages[detail || "overview"] || "overview"}`;
    if (page === "register" && detail === "ledger-accounts") return "settingsSidebar:items.ledger-accounts";
    if (settingsPages.has(page)) return `settingsSidebar:items.${page}`;
    if (page === "manage-currency") return "navbar:pages.currency";
    if (page === "manage-formats") return "navbar:pages.formats";
    if (page === "limits") return "navbar:pages.limits";
    if (page === "subscription") return "settingsSidebar:items.subscription-management";
    return "navbar:pages.settings";
  }
  const keys: Record<string, string> = { home: "home", cashflow: "cashflow", settled: "settled", reports: "reports", onboarding: "onboarding", "locale-setup": "locale", status: "status" };
  return `navbar:pages.${keys[root] || "home"}`;
}
