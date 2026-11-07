import type { Organization, ProductCategory } from "@/models/auth/organization";
export type WorkspaceCurrencyPolicy = { currency: string; can_change: boolean; reason: "financial_history" | null };
export interface Workspace extends Omit<Organization, "owner"> { is_owner: boolean; role: string | null; }
export type ProductPlan = { code: string; name: string; description: string; tier: string; product_category: ProductCategory; available: boolean; prices: { currency: string; amount_minor: number; billing_interval: string; stripe_price_id: string }[] };
export type WorkspaceInput = { name: string; product_category: ProductCategory; plan_code: string; idempotency_key: string; currency: string; country?: string; timezone?: string };
