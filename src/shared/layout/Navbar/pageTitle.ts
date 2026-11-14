const settingsPages = new Set(["personal", "organization-settings", "workspaces", "billing", "security", "banks", "departments", "entities", "inventory", "projects", "members", "groups", "categories", "ledger-accounts", "notifications"]);
const accountingPages: Record<string, string> = { overview: "overview", chart: "chart", "chart-of-accounts": "chart", books: "books", "bank-mappings": "bankMappings", "posting-policies": "postingPolicies", journals: "journals", periods: "periods" };
export function getPageTitleKey(pathname: string): string {
  const [, root, page, detail] = pathname.split("/");
  if (root === "accounting") {
    return `accountingSettings:nav.${accountingPages[page || "overview"] || "overview"}`;
  }
  if (root === "settings") {
    if (page === "ledger-accounts") return "accountingSettings:nav.chart";
    if (page === "accounting") return `accountingSettings:nav.${accountingPages[detail || "overview"] || "overview"}`;
    if (page === "register" && detail === "ledger-accounts") return "accountingSettings:nav.setup";
    if (settingsPages.has(page)) return `settingsSidebar:items.${page}`;
    if (page === "manage-currency") return "navbar:pages.currency";
    if (page === "manage-formats") return "navbar:pages.formats";
    if (page === "limits") return "navbar:pages.limits";
    if (page === "subscription") return "settingsSidebar:items.billing";
    return "navbar:pages.settings";
  }
  const keys: Record<string, string> = { "bank-imports": "bankImports", overview: "overview", help: "help", home: "overview", cashflow: "cashflow", settled: "settled", reports: "reports", onboarding: "onboarding", "locale-setup": "locale", status: "status" };
  return `navbar:pages.${keys[root] || "overview"}`;
}
export type PageCrumb = { titleKey: string; to?: string };
export function getPageBreadcrumbs(pathname: string): PageCrumb[] {
  const titleKey = getPageTitleKey(pathname);
  if (pathname.startsWith("/bank-imports/")) return [{ titleKey: "navbar:pages.bankImports", to: "/bank-imports" }, { titleKey: "statements:workspace.reviewTitle" }];
  if (pathname.startsWith("/accounting/setup/")) return [{ titleKey: "accountingSettings:section.title", to: "/accounting/overview" }, { titleKey: "accountingSettings:nav.overview", to: "/accounting/overview" }];
  if ((pathname === "/accounting" || pathname.startsWith("/accounting/"))) return [{ titleKey: "accountingSettings:section.title", to: "/accounting/overview" }, { titleKey }];
  const parents: Record<string, PageCrumb> = {
    "/settings/manage-currency": { titleKey: "settingsSidebar:items.organization-settings", to: "/settings/organization-settings" },
    "/settings/manage-formats": { titleKey: "settingsSidebar:items.personal", to: "/settings/personal" },
    "/settings/limits": { titleKey: "settingsSidebar:items.billing", to: "/settings/billing" },
  };
  if (parents[pathname]) return [parents[pathname], { titleKey }];
  if (pathname.startsWith("/settings/") && titleKey !== "navbar:pages.settings") {
    return [{ titleKey: "navbar:pages.settings", to: "/settings/personal" }, { titleKey }];
  }
  return [{ titleKey }];
}
export function getSettingsDescriptionKey(pathname: string): string {
  const [, , page, tab] = pathname.split("/");
  const key = page === "accounting" ? `accounting-${tab || "overview"}` : page === "register" ? "ledger-accounts" : page === "subscription" || page === "subscription-management" ? "billing" : page || "personal";
  return `navbar:settingsDescriptions.${key}`;
}
