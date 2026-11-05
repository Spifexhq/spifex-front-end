/** Resource dependencies shared by HTTP cache invalidation and stale-read fences. */
const resources: Array<[string, string]> = [
 ["banking/accounts", "banks"], ["banking/statements", "statements"],
 ["cashflow/entries", "entries"], ["cashflow/settlements", "settlements"],
 ["cashflow/categories", "categories"], ["cashflow/kpis", "metrics"],
 ["cashflow/reports", "metrics"], ["cashflow/dashboard", "metrics"],
 ["departments", "departments"], ["projects", "projects"], ["inventory", "inventory"], ["crm/entities", "entities"],
 ["ledger", "ledger"], ["identity", "identity"], ["organizations", "organization"],
 ["rbac", "permissions"], ["billing", "subscription"], ["entitlements", "subscription"],
];
export function resourceTags(endpoint: string): string[] {
 const path = endpoint.replace(/^\/+/, "");
 return [resources.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"))?.[1] || path.split("/")[0]];
}
export function mutationTags(endpoint: string): string[] | null {
 const tag = resourceTags(endpoint)[0];
 const dependencies: Record<string, string[]> = {
 banks: ["banks", "entries", "settlements", "metrics", "ledger"],
 statements: ["statements", "entries", "settlements", "banks", "metrics", "ledger"],
 entries: ["entries", "settlements", "banks", "metrics", "ledger", "identity"],
 settlements: ["settlements", "entries", "banks", "metrics", "ledger"],
 categories: ["categories", "entries", "settlements", "ledger", "identity"],
 departments: ["departments", "entries"], projects: ["projects", "entries"],
 inventory: ["inventory", "entries", "settlements"], entities: ["entities", "entries", "settlements"],
 ledger: ["ledger", "entries", "settlements", "identity"],
 identity: ["identity", "organization"], organization: ["organization", "identity", "ledger"],
 permissions: ["permissions", "identity"], subscription: ["subscription", "identity"],
 };
 return dependencies[tag] || null;
}
export function stableParams(value: unknown): string {
 function normalize(item: unknown): unknown {
  if (Array.isArray(item)) return item.map(normalize);
  if (item && typeof item === "object") return Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize((item as Record<string, unknown>)[key])]));
  return item;
 }
 return JSON.stringify(normalize(value)) || "";
}
export function cacheFresh(headers: Record<string, unknown>, age: number): boolean {
 const control = String(headers["cache-control"] || "").toLowerCase();
 if (/\b(no-store|no-cache|must-revalidate)\b/.test(control)) return false;
 const maxAge = control.match(/\bmax-age\s*=\s*"?(\d+)/);
 // With no explicit policy, only coalesce near-simultaneous reads.
 return age < (maxAge ? Number(maxAge[1]) * 1000 : 500);
}
