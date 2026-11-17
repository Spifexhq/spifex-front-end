const settingsPages = new Set(["personal", "organization-settings", "workspaces", "billing", "security", "banks", "departments", "entities", "inventory", "projects", "members", "groups", "categories", "ledger-accounts", "notifications"]);
const accountingPages: Record<string, string> = { overview: "overview", chart: "chart", "chart-of-accounts": "chart", books: "books", "bank-mappings": "bankMappings", "posting-policies": "postingPolicies", journals: "journals", periods: "periods" };
const inventoryPages: Record<string, string> = { overview: "overview", items: "items", stock: "stock", locations: "locations" };

/** Canonical product URLs include the user and workspace IDs; strip them for page logic. */
function sectionPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 3 && (parts[1] === "p" || parts[1] === "b")) parts.splice(0, 3);
  else if (parts[0] === "b") parts.shift();
  return `/${parts.join("/")}`;
}

export function getPageTitleKey(pathname: string): string {
  const [, root, page, detail] = sectionPath(pathname).split("/");
  if (root === "accounting") {
    return `accountingSettings:nav.${accountingPages[page || "overview"] || "overview"}`;
  }
  if (root === "inventory") {
    return `inventory:nav.${inventoryPages[page || "overview"] || "overview"}`;
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
  const path = sectionPath(pathname);
  if (path.startsWith("/bank-imports/")) return [{ titleKey: "navbar:pages.bankImports", to: "/b/bank-imports" }, { titleKey: "statements:workspace.reviewTitle" }];
  if (path.startsWith("/accounting/setup/")) return [{ titleKey: "accountingSettings:section.title", to: "/b/accounting/overview" }, { titleKey: "accountingSettings:nav.overview", to: "/b/accounting/overview" }];
  if (path === "/accounting" || path.startsWith("/accounting/")) return [{ titleKey: "accountingSettings:section.title", to: "/b/accounting/overview" }, { titleKey }];
  if (path === "/inventory" || path.startsWith("/inventory/")) return [{ titleKey: "inventory:section.title", to: "/b/inventory/overview" }, { titleKey }];
  const parents: Record<string, PageCrumb> = {
    "/settings/manage-currency": { titleKey: "settingsSidebar:items.organization-settings", to: "/b/settings/organization-settings" },
    "/settings/manage-formats": { titleKey: "settingsSidebar:items.personal", to: "/b/settings/personal" },
    "/settings/limits": { titleKey: "settingsSidebar:items.billing", to: "/b/settings/billing" },
  };
  if (parents[path]) return [parents[path], { titleKey }];
  if (path.startsWith("/settings/") && titleKey !== "navbar:pages.settings") {
    return [{ titleKey: "navbar:pages.settings", to: "/b/settings/personal" }, { titleKey }];
  }
  return [{ titleKey }];
}
