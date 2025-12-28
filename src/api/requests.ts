// src/api/requests.ts
import { request, http } from '@/lib/http';
import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import type { SignInRequest, SignInResponse, SignOutResponse, SignUpRequest, SignUpResponse } from '@/models/auth/auth'
import type { CookieConsentRequest, CookieConsentResponse } from 'src/models/auth/cookies';
import type { ChangeEmailRequest, ChangeEmailResponse, ChangePasswordRequest, ChangePasswordResponse, ConfirmPasswordResetRequest,
  ConfirmPasswordResetResponse, RequestPasswordResetRequest, RequestPasswordResetResponse } from 'src/models/auth/security';
import type { GetUserResponse, User, PersonalSettings, EditPersonalSettingsRequest } from 'src/models/auth/user';
import type { Organization, OrgCurrencyResponse, UpdateOrgCurrencyRequest } from 'src/models/auth/organization';
import type { GetEntitlementLimitsResponse } from 'src/models/auth/entitlements';
import type { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse, CreateCustomerPortalSessionRequest,
  CreateCustomerPortalSessionResponse, 
  GetSubscriptionStatusResponse} from 'src/models/auth/billing';
import type { GetNotificationPreferencesResponse, UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesResponse } from 'src/models/auth/notifications';
import type { AddGroupRequest, EditGroupRequest, GetGroupPermissionsResponse, GetGroupResponse, GetGroupsResponse,
  GetPermissionsResponse, UpdateGroupPermissionsResponse } from 'src/models/auth/rbac';
import type { AddMemberRequest, EditMemberRequest, GetMemberResponse, GetMembersResponse } from 'src/models/auth/members';
import type { CashflowKpis, KpiQueryParams, SettledKpis } from 'src/models/components/cardKpis';
import type { DashboardOverview } from 'src/models/components/dashboard';

import { GetTask, GetTasks, AddTaskRequest, EditTaskRequest } from '@/models/tasks/dto';
import { TaskDetail } from '@/models/tasks/domain';
import { Entry, SettledEntry, Transference,
  BulkSettleItem,
  BulkSettleResponse, ReportsSummary,
  ReportsSummaryParams
} from '@/models/entries/domain'
import {
  GetEntryResponse, GetEntryRequest, AddEntryRequest, EditEntryRequest,
  GetSettledEntry, GetSettledEntryRequest, EditSettledEntryRequest,
  AddTransferenceRequest
} from '@/models/entries/dto'
import {
  GetLedgerAccountsRequest, GetLedgerAccountsResponse, AddGLAccountRequest, EditGLAccountRequest,
  GetDocumentType, GetDocumentTypes,
  GetDepartmentResponse, GetDepartmentsResponse, AddDepartmentRequest, EditDepartmentRequest,
  GetProjectsResponse, AddProjectRequest, EditProjectRequest,
  GetEntityResponse, GetEntitiesResponse, AddEntityRequest, EditEntityRequest,
  GetInventoryItemsResponse, AddInventoryItemRequest, EditInventoryItemRequest
} from '@/models/enterprise_structure/dto';
import { BankAccount, GLAccount, Department,
  Project, InventoryItem, Entity
} from '@/models/enterprise_structure/domain';
import { Paginated } from '@/models/Api';


export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse>('auth/signin/', 'POST', payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>('auth/signup/', 'POST', payload),

  signOut: () =>
    request<SignOutResponse>("auth/signout/", "POST"),

  saveCookieConsent: (payload: CookieConsentRequest) =>
    request<CookieConsentResponse>("cookies/consent/", "POST", payload),

  /* --- Emails --- */
  checkEmailAvailability: (email: string) =>
    request<{ available: boolean }>("auth/emails/check/", "POST", { email }),

  verifyEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/emails/verify/${uidb64}/${token}/`, "GET"),

  verifyNewEmail: <T>(changeId: string, token: string) =>
    request<T>(`auth/emails/verify-change/${changeId}/${token}/`, "GET"),

  cancelEmailChange: <T>(changeId: string, token: string) =>
    request<T>(`auth/emails/cancel-change/${changeId}/${token}/`, "GET"),

  /* --- Password / Email security --- */
  changePassword: (payload: ChangePasswordRequest) =>
    request<ChangePasswordResponse>("auth/password/change/", "PUT", payload),

  changeEmail: (payload: ChangeEmailRequest) =>
    request<ChangeEmailResponse>("auth/emails/change/", "POST", payload),

  requestPasswordReset: (email: string) =>
    request<RequestPasswordResetResponse>("auth/password/reset/", "POST", {
      email
    } satisfies RequestPasswordResetRequest),

  confirmPasswordReset: (uidb64: string, token: string, password: string) =>
    request<ConfirmPasswordResetResponse>(`auth/password/reset/${uidb64}/${token}/`, "POST", {
      password,
      password_confirm: password,
    } satisfies ConfirmPasswordResetRequest),

  /* --- User --- */
  getUser: () =>
    request<GetUserResponse>("auth/profile/", "GET"),

  editUser:(payload: Partial<User>) =>
    request<User>("auth/profile/", "PUT", payload),

  getPersonalSettings: () =>
    request<PersonalSettings>("auth/profile/settings/", "GET"),

  editPersonalSettings:(payload: EditPersonalSettingsRequest) =>
    request<PersonalSettings>("auth/profile/settings/", "PATCH", payload),

  /* --- Organization --- */
  getOrganization: () =>
    request<Organization>("organizations/current/", "GET"),

  editOrganization: (payload: Partial<Organization>) =>
    request<Organization>("organizations/current/", "PUT", payload),

  getOrgCurrency: () =>
    request<OrgCurrencyResponse>("organizations/current/currency/", "GET"),

  updateOrgCurrency: (payload: UpdateOrgCurrencyRequest) =>
    request<OrgCurrencyResponse>("organizations/current/currency/", "PUT", payload),

  /* --- Entitlements --- */
  getEntitlementLimits:() =>
    request<GetEntitlementLimitsResponse>("entitlements/limits/", "GET"),

  /* --- Subscriptions --- */
  getSubscriptionStatus: () =>
    request<GetSubscriptionStatusResponse>("billing/subscription/", "GET"),

  createCheckoutSession: (price_id: string) =>
    request<CreateCheckoutSessionResponse>("billing/checkout-session/", "POST", {
      price_id
    } satisfies CreateCheckoutSessionRequest),

  createCustomerPortalSession: () =>
    request<CreateCustomerPortalSessionResponse>(`billing/customer-portal-session/`, 'POST',
      {} satisfies CreateCustomerPortalSessionRequest),

  /* --- Notifications --- */
  getNotificationPreferences: () =>
    request<GetNotificationPreferencesResponse>("auth/notifications/preferences/", "GET"),

  updateNotificationPreferences: (payload: UpdateNotificationPreferencesRequest) =>
    request<UpdateNotificationPreferencesResponse>("auth/notifications/preferences/", "PUT", payload),

  /* --- Permissions --- */
  getPermissions: () =>
    request<GetPermissionsResponse>("rbac/permissions/", "GET"),

  getPermission: (code: string) =>
    request<GetPermissionsResponse>(`rbac/permissions/${code}/`, "GET"),

  /* --- Group permissions --- */
  getGroupPermissions: (groupId: string) =>
    request<GetGroupPermissionsResponse>(`rbac/groups/${groupId}/permissions/`, "GET"),

  updateGroupPermissions: (groupId: string, permission_codes: string[]) =>
    request<UpdateGroupPermissionsResponse>(`rbac/groups/${groupId}/permissions/`, "POST", {
      permission_codes
    }),
  
  /* --- Groups --- */
  getGroups: () =>
    request<GetGroupsResponse>("rbac/groups/", "GET"),

  getGroup: (groupId: string) =>
    request<GetGroupResponse>(`rbac/groups/${groupId}/`, "GET"),

  addGroup: (payload: AddGroupRequest) =>
    request<GetGroupResponse>("rbac/groups/", "POST", payload),

  editGroup: (groupId: string, payload: Partial<EditGroupRequest>) =>
    request<GetGroupResponse>(`rbac/groups/${groupId}/`, "PATCH", payload),

  deleteAllGroups: () =>
    request<void>("rbac/groups/", "DELETE"),

  deleteGroup: (groupId: string) =>
    request<void>(`rbac/groups/${groupId}/`, "DELETE"),

  /* --- Members --- */
  getMembers: () =>
    request<GetMembersResponse>("organizations/members/", "GET"),

  getMember: (memberId: string) =>
    request<GetMemberResponse>(`organizations/members/${memberId}/`, "GET"),

  addMember: (payload: AddMemberRequest) =>
    request<GetMemberResponse>("organizations/members/", "POST", payload),

  editMember: (memberId: string, payload: EditMemberRequest) =>
    request<GetMemberResponse>(`organizations/members/${memberId}/`, "PATCH", payload),

  deleteMember: (memberId: string) =>
    request<void>(`organizations/members/${memberId}/`, "DELETE"),

  /* --- KPIs --- */
  getCashflowKpis: (params: KpiQueryParams) =>
    request<CashflowKpis>("cashflow/kpis/cashflow/", "GET", params),
  
  getSettledKpis: (params: KpiQueryParams) =>
    request<SettledKpis>("cashflow/kpis/settled/", "GET", params),

  /* --- Dashboard --- */
  getCashflowDashboard: () =>
    request<DashboardOverview>(`cashflow/dashboard/`, "GET"),

  /* --- Reports --- */
  getReportsSummary: (params: ReportsSummaryParams) =>
    request<ReportsSummary>("cashflow/reports/summary/", "GET", params),
  
  /* --- Tasks --- */
  getAllTasks: () =>
    request<GetTasks>("companies/tasks", "GET"),

  getTask: (ids: number[]) =>
    request<GetTask>(`companies/tasks/${ids.join(',')}`, "GET"),

  addTask: (payload: AddTaskRequest) =>
    request<TaskDetail>("companies/tasks", "POST", payload),

  editTask: (ids: number[], payload: Partial<EditTaskRequest>) =>
    request<TaskDetail>(`companies/tasks/${ids.join(',')}`, "PUT", payload),
  
  deleteAllTasks: () =>
    request<TaskDetail>("companies/tasks", 'DELETE'),

  deleteTask: (ids: number[]) =>
    request<TaskDetail>(`companies/tasks/${ids.join(',')}`, 'DELETE'),

  /* --- Entries: saved views --- */
  getEntryViews: () => {
    return request<Array<{
      id: string;
      name: string;
      is_default: boolean;
      filters: unknown;
    }>>(`cashflow/entry-view-preset/`, "GET");
  },

  addEntryView: (payload: {
    name: string;
    is_default?: boolean;
    filters: unknown;
  }) => {
    return request<{
      id: string;
      name: string;
      is_default: boolean;
      filters: unknown;
    }>(`cashflow/entry-view-preset/`, "POST", payload);
  },

  editEntryView: (viewId: string, payload: {
    name?: string;
    is_default?: boolean;
    filters?: unknown;
  }) => {
    return request<{
      id: string;
      name: string;
      is_default: boolean;
      filters: unknown;
    }>(`cashflow/entry-view-preset/${viewId}/`, "PATCH", payload);
  },

  deleteEntryView: (viewId: string) => {
    return request<void>(`cashflow/entry-view-preset/${viewId}/`, "DELETE");
  },
  
  /* --- Cash-flow Entries --- */
  getEntries: (payload: GetEntryRequest) => {
    return request<GetEntryResponse>(`cashflow/entries/`, "GET", payload);
  },

  getEntriesTable: (payload: GetEntryRequest) => {
    return request<GetEntryResponse>(`cashflow/entries/table/`, "GET", payload);
  },

  getEntry: (externalId: string) => {
    return request<Entry>(`cashflow/entries/${externalId}/`, "GET");
  },

  getEntriesBatch: (ids: string[]) => {
    return request<Entry[]>(
      `cashflow/entries/batch/`,
      "POST",
      { ids }
    );
  },

  addEntry: (payload: AddEntryRequest) => {
    return request<Entry | Entry[]>(
      `cashflow/entries/`,
      "POST",
      payload
    );
  },

  editEntry: (externalId: string, payload: Partial<EditEntryRequest>) => {
    return request<Entry | Entry[]>(
      `cashflow/entries/${externalId}/`,
      "PATCH",
      payload
    );
  },

  bulkUpdateEntries: (
    ids: string[],
    data: Partial<EditEntryRequest>,
    atomic: boolean = true
  ) => {
    return request<{ updated: Entry[] } | { updated: Entry[]; errors: Array<{ id: string; error: string }> }>(
      `cashflow/entries/bulk/update/`,
      "PATCH",
      { ids, data, atomic }
    );
  },

  deleteEntry: (externalId: string) => {
    return request<void>(`cashflow/entries/${externalId}/`, "DELETE");
  },

  bulkDeleteEntries: (ids: string[]) => {
    return request<void>(`cashflow/entries/bulk/delete/`, "POST", { ids });
  },

  /* --- Settle Process --- */
  bulkSettle: (items: BulkSettleItem[], atomic: boolean = true) => {
    return request<BulkSettleResponse>(
      `cashflow/settlements/bulk/settle/`,
      "POST",
      { items, atomic }
    );
  },

  addSettlement: (
    entryExternalId: string,
    payload: { bank_id: string; amount_minor?: number; amount?: string; value_date: string }
  ) => {
    return request<Entry>(
      `cashflow/entries/${entryExternalId}/settlements/`,
      "POST",
      payload
    );
  },

  /* --- Settled Entries --- */
  getSettledEntries: (payload: GetSettledEntryRequest) => {
    const params = { include_inactive: true, ...payload };
    return request<GetSettledEntry>(
      `cashflow/settlements/`,
      "GET",
      params
    );
  },

  getSettledEntriesTable: (payload: GetSettledEntryRequest) => {
    const params = { include_inactive: true, ...payload };
    return request<GetSettledEntry>(
      `cashflow/settlements/table/`,
      "GET",
      params
    );
  },

  getSettledEntry: (ids: string[], payload?: GetSettledEntryRequest) => {
    const params = { include_inactive: true, ...(payload || {}), ids: ids.join(",") };
    return request<SettledEntry[]>(
      `cashflow/settlements/batch/`,
      "GET",
      params
    );
  },

  editSettledEntry: (id: string, payload: Partial<EditSettledEntryRequest>) => {
    return request<SettledEntry>(
      `cashflow/settlements/${id}/`,
      "PATCH",
      payload
    );
  },

  bulkDeleteSettledEntries: (ids: string[]) => {
    return request<void>(
      `cashflow/settlements/bulk/delete/`,
      "POST",
      { ids }
    );
  },

  deleteSettledEntry: (id: string) => {
    return request<Entry>(`cashflow/settlements/${id}/`, "DELETE");
  },

  /* --- Transferences --- */
  addTransference: (payload: AddTransferenceRequest) => {
    return request<Transference>(`cashflow/transfers/`, 'POST', payload);
  },

  /* --- Banks --- */
  getBanks: (active?: boolean) => {
    const params = active == null ? undefined : { active: active ? "true" : "false" };
    return request<Paginated<BankAccount>>(`banking/accounts/`, "GET", params);
  },

  getBanksBatch: (ids: string[]) => {
    return request<BankAccount[]>(`banking/accounts/batch/`, "POST", { ids });
  },

  getBank: (bankExternalId: string) => {
    return request<BankAccount>(`banking/accounts/${bankExternalId}/`, "GET");
  },

  addBank: (payload: Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">) => {
    return request<BankAccount>(`banking/accounts/`, "POST", payload);
  },

  editBank: (bankExternalId: string, payload: Partial<Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">>) => {
    return request<BankAccount>(`banking/accounts/${bankExternalId}/`, "PATCH", payload);
  },

  deleteBank: (bankExternalId: string) => {
    return request<unknown>(`banking/accounts/${bankExternalId}/`, "DELETE");
  },

  /* --- General Ledger Acccounts --- */
  getLedgerAccounts: (params?: GetLedgerAccountsRequest) => {
    return request<GetLedgerAccountsResponse>(
      `ledger/accounts/`,
      "GET",
      params
    );
  },

  getLedgerAccountsBatch: (ids: string[]) => {
    return request<GLAccount[]>(
      `ledger/accounts/batch/`,
      "POST",
      { ids }
    );
  },

  getLedgerAccount: (glaId: string) => {
    return request<GLAccount>(
      `ledger/accounts/${glaId}/`,
      "GET"
    );
  },

  getLedgerAccountsExists: () => {
    return request<{ exists: boolean }>(
      `ledger/accounts/exists/`,
      "GET"
    );
  },

  importLedgerAccounts: (formData: FormData) => {
    return request<{
      created_count: number;
      accounts: GLAccount[];
    }>(
      `ledger/accounts/import/`,
      "POST",
      formData
    );
  },

  importStandardLedgerAccounts: (plan: "personal" | "business") => {
    return request<{
      created_count: number;
      accounts: GLAccount[];
    }>(
      `ledger/accounts/import-standard/`,
      "POST",
      { plan }
    );
  },

  downloadLedgerCsvTemplate: async () => {
    const res = await http.get(
      `ledger/accounts/template/csv/`,
      {
        responseType: "blob",
        validateStatus: (s: number) => s >= 200 && s < 300,
      }
    );

    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_ledger_accounts.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  downloadLedgerXlsxTemplate: async () => {
    const res = await http.get(
      `ledger/accounts/template/xlsx/`,
      {
        responseType: "blob",
        validateStatus: (s: number) => s >= 200 && s < 300,
      }
    );

    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_ledger_accounts.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  addLedgerAccount: (payload: AddGLAccountRequest) => {
    return request<GLAccount>(
      `ledger/accounts/`,
      "POST",
      payload
    );
  },

  addLedgerAccountsBulk: (payload: AddGLAccountRequest[]) => {
    return request<GLAccount[]>(
      `ledger/accounts/bulk/`,
      "POST",
      payload
    );
  },

  editLedgerAccount: (glaId: string, payload: EditGLAccountRequest) => {
    return request<GLAccount>(
      `ledger/accounts/${glaId}/`,
      "PATCH",
      payload
    );
  },

  deleteAllLedgerAccounts: () => {
    return request<{ message: string; deleted_count: number }>(
      `ledger/accounts/bulk/delete/`,
      "DELETE",
      { confirm_delete_all: true }
    );
  },

  deleteLedgerAccount: (glaId: string) => {
    return request<unknown>(
      `ledger/accounts/${glaId}/`,
      "DELETE"
    );
  },

  /* --- Document Types --- */
  getAllDocumentTypes: () =>
    request<GetDocumentTypes>("enterprise_structure/document-types", "GET"),

  getDocumentType: (ids: number[]) =>
    request<GetDocumentType>(`enterprise_structure/document-types/${ids.join(',')}`, "GET"),

  /* --- Departments --- */
  getDepartments: (params?: { cursor?: string; q?: string; active?: "true" | "false" }) => {
    return request<GetDepartmentsResponse>(
      `departments/`,
      "GET",
      params
    );
  },

  getDepartmentsOptions: (params?: { cursor?: string; q?: string; active?: "true" | "false" }) => {
    return request<GetDepartmentsResponse>(
      `departments/options/`,
      "GET",
      params
    );
  },

  getDepartment: (departmentId: string) => {
    return request<GetDepartmentResponse>(
      `departments/${departmentId}/`,
      "GET"
    );
  },

  getDepartmentsBatch: (ids: string[]) => {
    return request<Department[]>(
      `departments/batch/`,
      "POST",
      { ids }
    );
  },

  addDepartment: (payload: AddDepartmentRequest) => {
    return request<Department>(
      `departments/`,
      "POST",
      payload
    );
  },

  editDepartment: (departmentId: string, payload: Partial<EditDepartmentRequest>) => {
    return request<Department>(
      `departments/${departmentId}/`,
      "PATCH",
      payload
    );
  },

  deleteDepartment: (departmentId: string) => {
    return request<void>(
      `departments/${departmentId}/`,
      "DELETE"
    );
  },

  /* --- Projects --- */
  getProjects: (params?: { cursor?: string; active?: "true" | "false"; type?: string; q?: string }) => {
    return request<GetProjectsResponse>(`projects/`, "GET", params);
  },

  getProjectsOptions: (params?: { cursor?: string; active?: "true" | "false"; type?: string; q?: string }) => {
    return request<GetProjectsResponse>(`projects/options/`, "GET", params);
  },

  getProjectsBatch: (ids: string[]) => {
    return request<Project[]>(
      `projects/batch/`,
      "POST",
      { ids }
    );
  },

  getProject: (projectId: string) => {
    return request<Project>(
      `projects/${projectId}/`,
      "GET"
    );
  },

  addProject: (payload: AddProjectRequest) => {
    return request<Project>(
      `projects/`,
      "POST",
      payload
    );
  },

  editProject: (projectId: string, payload: EditProjectRequest) => {
    return request<Project>(
      `projects/${projectId}/`,
      "PATCH",
      payload
    );
  },

  deleteProject: (projectId: string) => {
    return request<void>(
      `projects/${projectId}/`,
      "DELETE"
    );
  },

  /* --- Inventory --- */
  getInventoryItems: (params?: {
    cursor?: string;
    active?: "true" | "false";
    q?: string;
  }) => {
    return request<GetInventoryItemsResponse>(
      `inventory/items/`,
      "GET",
      params
    );
  },

  getInventoryOptions: (params?: {
    cursor?: string;
    active?: "true" | "false";
    q?: string;
  }) => {
    return request<GetInventoryItemsResponse>(
      `inventory/items/options/`,
      "GET",
      params
    );
  },

  getInventoryItemsBatch: (ids: string[]) => {
    return request<InventoryItem[]>(
      `inventory/items/batch/`,
      "POST",
      { ids }
    );
  },

  getInventoryItem: (id: string) => {
    return request<InventoryItem>(
      `inventory/items/${id}/`,
      "GET"
    );
  },

  addInventoryItem: (payload: AddInventoryItemRequest) => {
    return request<InventoryItem>(
      `inventory/items/`,
      "POST",
      payload
    );
  },

  editInventoryItem: (id: string, payload: EditInventoryItemRequest) => {
    return request<InventoryItem>(
      `inventory/items/${id}/`,
      "PATCH",
      payload
    );
  },

  deleteInventoryItem: (id: string) => {
    return request<void>(
      `inventory/items/${id}/`,
      "DELETE"
    );
  },

  /* --- Entities --- */
  getEntities: (params?: {
    cursor?: string;
    active?: "true" | "false";
    type?: string; // client | supplier | employee ...
    q?: string;
  }) => {
    return request<GetEntitiesResponse>(
      `crm/entities/`,
      "GET",
      params
    );
  },

  getEntitiesTable: (params?: {
    cursor?: string;
    active?: "true" | "false";
    type?: string;
    q?: string;
  }) => {
    return request<GetEntitiesResponse>(
      `crm/entities/table/`,
      "GET",
      params
    );
  },

  getEntitiesOptions: (params?: {
    cursor?: string;
    active?: "true" | "false";
    type?: string;
    q?: string;
  }) => {
    return request<GetEntitiesResponse>(
      `crm/entities/options/`,
      "GET",
      params
    );
  },
  
  getEntity: (id: string) => {
    return request<GetEntityResponse>(
      `crm/entities/${id}/`,
      "GET"
    );
  },

  getEntitiesBatch: (ids: string[]) => {
    return request<Entity[]>(
      `crm/entities/batch/`,
      "POST",
      { ids }
    );
  },

  addEntity: (payload: AddEntityRequest) => {
    return request<Entity>(
      `crm/entities/`,
      "POST",
      payload
    );
  },

  editEntity: (id: string, payload: EditEntityRequest) => {
    return request<Entity>(
      `crm/entities/${id}/`,
      "PATCH",
      payload
    );
  },

  deleteEntity: (id: string) => {
    return request<void>(
      `crm/entities/${id}/`,
      "DELETE"
    );
  },

  // -------------- Statements (PDF) --------------

  // list with filters { q?, status?, bank? }
  getStatements: (params?: { q?: string; status?: string; bank?: string }) => {
    return request<Paginated<{
      id: string;
      bank_account_id: string | null;
      bank_account_label: string | null;
      original_filename: string;
      content_type: string;
      size_bytes: number;
      pages: number | null;
      status: "uploaded" | "processing" | "ready" | "failed";
      created_at: string;
      json_ready: boolean; // <-- add this
    }>>(
      `banking/statements/`,
      "GET",
      params
    );
  },

  // upload with progress (FormData: file, optional bank_account_id)
  uploadStatement: (form: FormData, onProgress?: (pct: number) => void) => {
    return http.post(
      `banking/statements/`,
      form,
      {
        onUploadProgress: (evt: AxiosProgressEvent) => {
          if (!onProgress || !evt.total) return;
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      }
    ).then((r: AxiosResponse) => r.data);
  },

  deleteStatement: (statementId: string) => {
    return request<void>(
      `banking/statements/${statementId}/`,
      "DELETE"
    );
  },

  triggerStatementAnalysis: (statementId: string) => {
    return request<{
      id: string;
      status: "processing" | "ready" | "failed" | "uploaded";
      started_at: string;
      finished_at: string | null;
      error_message: string;
    }>(
      `banking/statements/${statementId}/analyze/`,
      "POST",
      {}
    );
  },

  // download binary (Blob) via axios responseType: 'blob'
  downloadStatement: async (statementId: string) => {
    const res = await http.get(
      `banking/statements/${statementId}/download/`,
      { responseType: "blob", validateStatus: (s: number) => s >= 200 && s < 300 }
    );
    const blob = res.data as Blob;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "extrato.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  downloadStatementJson: async (statementId: string) => {
    const res = await http.get(`banking/statements/${statementId}/download-json/`, { responseType: "blob" });

    const cd = res.headers?.["content-disposition"] as string | undefined;
    const match = cd?.match(/filename="([^"]+)"/i);
    const fallbackName = `statement_${statementId}.json`;
    const filename = match?.[1] ?? fallbackName;

    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },





}
