import { getAuthGeneration } from "@/core/authentication/authGeneration";
import { getOrgExternalIdStored } from "@/lib/tokens";
import { http, request } from "@/core/api/http";

import type { PersonalAccount, PersonalDashboard, PersonalCollection, PersonalPage, PersonalRecord, PersonalTransaction, PersonalSettledActivity, EntryAttachment } from "../types";
import type { CashflowBalance } from "@/shared/financial/types";
import type { SettlementSource, BulkSettleItem } from "@/models/entries/settlements";
export const personalApi = {
  transaction: (id: string) => request<PersonalTransaction>(`personal/transactions/${id}/`, "GET"),
  account: (id: string) => request<PersonalAccount>(`personal/accounts/${id}/`, "GET"),
  summary: (params: Record<string, string> = {}) => request<CashflowBalance>("personal/transactions/summary/", "GET", params),
  settledActivity: (params: Record<string, string | number | undefined> = {}) => request<PersonalPage<PersonalSettledActivity>>("personal/transactions/settled-activity/", "GET", params),
  settlementDrafts: (ids: string[]) => request<SettlementSource[]>("personal/transactions/settlement-drafts/", "GET", { ids: ids.join(",") }),
  settleBulk: (items: BulkSettleItem[], atomic = true) => request<{updated:PersonalTransaction[];errors:unknown[]}>("personal/transactions/bulk-settle/", "POST", { items, atomic }),
  deleteTransactionsBulk: (ids: string[]) => request<{deleted:string[]}>("personal/transactions/bulk-delete/", "POST", { ids }),
  attachments: (id: string) => request<{results:EntryAttachment[];max_files:number;max_bytes:number}>(`personal/transactions/${id}/attachments/`, "GET"),
  uploadAttachment: (id: string, file: File) => { const form = new FormData(); form.append("file", file); return request<EntryAttachment>(`personal/transactions/${id}/attachments/`, "POST", form); },
  removeAttachment: (id: string, attachment: string) => request<void>(`personal/transactions/${id}/attachments/${attachment}/`, "DELETE"),
  downloadAttachment: async (id: string, attachment: string, signal?: AbortSignal) => {
    const generation = getAuthGeneration(), workspace = getOrgExternalIdStored();
    const response = await http.get<Blob>(`personal/transactions/${id}/attachments/${attachment}/download/`, {responseType:"blob",signal});
    if(generation !== getAuthGeneration() || workspace !== getOrgExternalIdStored()) throw new Error("Workspace changed during file download");
    return response.data;
  },
  dashboard: (reports = false, params: Record<string,string> = {}) => request<PersonalDashboard>(`personal/${reports ? "reports" : "dashboard"}/`, "GET", params),
  list: <T extends PersonalRecord>(collection: PersonalCollection, params: Record<string,unknown> = {}) => request<PersonalPage<T>>(`personal/${collection}/`, "GET", params),
  create: (collection: Exclude<PersonalCollection,"transfers">, payload: Record<string,unknown>) => request<PersonalRecord | {created_count:number;transactions:PersonalTransaction[]}>(`personal/${collection}/`, "POST", payload),
  edit: (collection: Exclude<PersonalCollection,"transfers">, id: string, payload: Record<string,unknown>) => request<PersonalRecord>(`personal/${collection}/${id}/`, "PATCH", payload),
  remove: (collection: PersonalCollection, id: string) => request<void>(`personal/${collection}/${id}/`, "DELETE"),
  settle: (id: string, payload: Record<string,unknown>) => request(`personal/transactions/${id}/settle/`, "POST", payload),
  reverseSettlement: (entryId: string, settlementId: string) => request<PersonalTransaction>(`personal/transactions/${entryId}/settlements/${settlementId}/`, "DELETE"),
  transfer: (payload: Record<string,unknown>) => request("personal/transfers/", "POST", payload),
  contribute: (id: string, payload: Record<string,unknown>) => request(`personal/goals/${id}/contributions/`, "POST", payload),
};
