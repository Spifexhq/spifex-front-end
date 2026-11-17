export type ProductSegment = "p" | "b";

/** Internal product paths stay `/p/...` and `/b/...`; the router adapter adds the IDs. */
const PRODUCT_PATH = /^\/(p|b)(?=\/|$)(.*)$/;
/** Canonical product URLs are `/{userExternalId}/{p|b}/{organizationExternalId}/...`. */
const DYNAMIC_PRODUCT_PATH = /^\/[^/]+\/(p|b)\/[^/]+(\/.*)?$/;

export function isProductPath(pathname: string): boolean {
  return PRODUCT_PATH.test(pathname);
}

const LEGACY_BUSINESS_ROOTS = new Set([
  "overview",
  "home",
  "help",
  "onboarding",
  "cashflow",
  "settled",
  "reports",
  "accounting",
  "inventory",
  "bank-imports",
  "settings",
]);

const LEGACY_PERSONAL_ROOTS = new Set([
  "transactions",
  "accounts",
  "categories",
  "budgets",
  "goals",
  "transfers",
  "imports",
]);

/** Map a removed root-level product path to its internal `/p/...` or `/b/...` shape. */
export function legacyProductPath(
  pathname: string,
): { product: ProductSegment; suffix: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  const root = parts[0];
  if (!root) return null;

  if (root === "personal") {
    const suffix = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "/overview";
    return { product: "p", suffix };
  }
  if (LEGACY_PERSONAL_ROOTS.has(root) && !LEGACY_BUSINESS_ROOTS.has(root)) {
    return { product: "p", suffix: pathname };
  }
  if (LEGACY_BUSINESS_ROOTS.has(root)) {
    return { product: "b", suffix: pathname };
  }
  return null;
}

export function buildProductPath(
  userExternalId: string,
  product: ProductSegment,
  organizationExternalId: string,
  path = "",
): string {
  const suffix = path === "/" ? "" : path;
  const normalized = suffix && !suffix.startsWith("/") ? `/${suffix}` : suffix;
  return `/${encodeURIComponent(userExternalId)}/${product}/${encodeURIComponent(organizationExternalId)}${normalized}`;
}

/** Collapse a canonical product URL back to `/p/...` or `/b/...` for existing UI logic. */
export function productPathname(pathname: string): string {
  const match = DYNAMIC_PRODUCT_PATH.exec(pathname);
  if (!match) return pathname;
  return `/${match[1]}${match[2] ?? ""}`;
}

/** Return the path after `/{user}/{p|b}/{organization}`. */
export function productSuffix(pathname: string): string {
  const match = DYNAMIC_PRODUCT_PATH.exec(pathname);
  return match?.[2] ?? "";
}

/** Inject the current user and workspace external IDs into an internal product path. */
export function withProductIds(
  to: string,
  userExternalId: string,
  organizationExternalId: string,
): string {
  const match = PRODUCT_PATH.exec(to);
  if (!match) return to;
  return buildProductPath(userExternalId, match[1] as ProductSegment, organizationExternalId, match[2]);
}
