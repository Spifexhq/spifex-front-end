import { request } from "@/core/api/http";
import type { ProductCategory } from "@/models/auth/organization";
import type { Workspace, WorkspaceInput, ProductPlan, WorkspaceCurrencyPolicy } from "../types";
export const workspaceApi = {
  currency: () => request<WorkspaceCurrencyPolicy>("organizations/current/currency/", "GET"),
  workspaces: () => request<Workspace[]>("organizations/workspaces/", "GET"),
  createWorkspace: (payload: WorkspaceInput) => request<Workspace>("organizations/workspaces/", "POST", payload),
  replaceWorkspace: (id: string, payload: WorkspaceInput) => request<{workspace:Workspace;legacy_workspace:Workspace}>(`organizations/workspaces/${id}/replace/`, "POST", {...payload,confirm:true}),
  scheduleDeletion: (id: string, password: string, idempotency_key: string) => request<Workspace>(`organizations/workspaces/${id}/schedule-deletion/`, "POST", {password, confirmation:true, idempotency_key}),
  catalog: (product_category: ProductCategory, country_code?: string) => request<{product_category:ProductCategory;billing_currency:string;plans:ProductPlan[]}>("billing/catalog/", "GET", {product_category,country_code}),
  checkout: (plan_code: string, country_code: string, billing_interval: string, organizationId?: string) => request<{url:string}>("billing/checkout-session/", "POST", {plan_code,country_code,billing_interval}, {organizationId}),
};
