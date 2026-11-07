/** Resource dependencies shared by HTTP cache invalidation and stale-read fences. */
const resources: Array<[string, string]> = [
 ["banking/accounts", "banks"], ["banking/statements", "statements"], ["banking/statement-import-sessions", "statements"],
 ["cashflow/entries", "entries"], ["cashflow/settlements", "settlements"],
 ["cashflow/categories", "categories"], ["cashflow/kpis", "metrics"],
 ["cashflow/reports", "metrics"], ["cashflow/overview", "metrics"],
 ["departments", "departments"], ["projects", "projects"], ["inventory", "inventory"], ["crm/entities", "entities"],
 ["personal", "personal"], ["ledger", "ledger"], ["identity", "identity"], ["organizations", "organization"],
 ["rbac", "permissions"], ["billing", "subscription"], ["entitlements", "subscription"],
];
export function resourceTags(endpoint: string): string[] {
 const path = endpoint.replace(/^\/+/, "");
 return [resources.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"))?.[1] || path.split("/")[0]];
}
export function mutationTags(endpoint: string): string[] | null {
 const tag = resourceTags(endpoint)[0];
 const dependencies: Record<string, string[]> = {
 personal: ["personal", "entries", "settlements", "banks", "categories", "metrics", "identity"],
 banks: ["banks", "entries", "settlements", "metrics", "ledger"],
 statements: ["statements", "entries", "settlements", "banks", "metrics", "ledger"],
 entries: ["entries", "settlements", "banks", "metrics", "ledger", "identity"],
 settlements: ["settlements", "entries", "banks", "metrics", "ledger"],
 categories: ["categories", "entries", "settlements", "ledger", "identity", "metrics"],
 departments: ["departments", "entries"], projects: ["projects", "entries"],
 inventory: ["inventory", "entries", "settlements"], entities: ["entities", "entries", "settlements"],
 ledger: ["ledger", "entries", "settlements", "identity"],
 identity: ["identity", "organization", "metrics"], organization: ["organization", "identity", "ledger", "metrics"],
 permissions: ["permissions", "identity", "metrics"], subscription: ["subscription", "identity", "metrics"],
 };
 const affected = dependencies[tag];
 return affected ? [...new Set([...affected, ...(affected.some(value => ["entries", "settlements", "banks", "categories", "metrics"].includes(value)) ? ["personal"] : [])])] : null;
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
