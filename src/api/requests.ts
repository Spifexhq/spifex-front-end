// src/api/requests.ts
import { request, http } from '@/lib/http';
import type { AxiosProgressEvent, AxiosResponse } from 'axios'
import {
  GetEmployeeResponse, GetEmployeesResponse, AddEmployeeRequest, EditEmployeeRequest,
  GetUserResponse,
  SignInRequest, SignInResponse, SignUpRequest, SignUpResponse,
  GetSubscriptionStatusResponse,
  GetPermission, GetPermissions,
  GetGroups, GetGroup, AddGroupRequest, EditGroupRequest,
  GetEntitlementLimitsResponse,
} from '@/models/auth/dto'
import { User, Organization, Permission, GroupDetail,
  CounterUsage, IncrementCounterUsage, PersonalSettings,
  NotificationPreference
} from '@/models/auth/domain'
import { GetTask, GetTasks, AddTaskRequest, EditTaskRequest } from '@/models/tasks/dto';
import { TaskDetail } from '@/models/tasks/domain';
import { Entry, SettledEntry, Transference,
  CashflowKpis, SettledKpis, BulkSettleItem,
  BulkSettleResponse, ReportsSummary
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
import { DashboardOverview } from '@/models/dashboard/domain';


export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse>('auth/signin/', 'POST', payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>('auth/signup/', 'POST', payload),

  checkEmailAvailability: (email: string) =>
    request<{ available: boolean }>("auth/check-email/", "POST", { email }),

  verifyEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-email/${uidb64}/${token}/`, "GET"),

  verifyNewEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-email/${uidb64}/${token}/`, "GET"),

  saveCookieConsent: (payload: {
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  }) => request<{ status: string; preferences: unknown }>(
    "cookies/consent/",
    "POST",
    payload
  ),

  /* --- User --- */
  getUser: () =>
    request<GetUserResponse>('auth/me/', "GET"),

  editUser:(payload: Partial<User>) =>
    request<User>('auth/me/', 'PUT', payload),

  getPersonalSettings: () =>
    request<PersonalSettings>('auth/me/settings/', "GET"),

  editPersonalSettings:(payload: Partial<PersonalSettings>) =>
    request<PersonalSettings>('auth/me/settings/', 'PATCH', payload),

  /* --- Entitlements --- */
  getEntitlementLimits:() =>
    request<GetEntitlementLimitsResponse>('entitlements/limits/', 'GET'),

  /* --- Password --- */
  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<unknown>('auth/password/change/', 'PUT', payload),

  requestPasswordReset: (email: string) =>
    request<void>('auth/password/reset/', 'POST', { email }),

  confirmPasswordReset: (uidb64: string, token: string, password: string) =>
    request<void>(`auth/password/reset/${uidb64}/${token}/`, 'POST', {
      password,
      password_confirm: password,
    }),

  /* --- Subscriptions --- */
  getSubscriptionStatus: () => {
    return request<GetSubscriptionStatusResponse>(`billing/subscription`, 'GET');
  },
  createCheckoutSession: (price_id: string) => {
    return request<{ url?: string; message?: string }>(
      `billing/create-checkout-session/`,
      'POST',
      { price_id }
    );
  },
  createCustomerPortalSession: () => {
    return request<{ url?: string }>(
      `billing/create-customer-portal-session/`,
      'POST',
      {}
    );
  },

  /* --- Notifications --- */
  getNotificationPreferences: () =>
    request<NotificationPreference[]>(
      "auth/notifications/preferences/",
      "GET"
    ),

  updateNotificationPreferences: (
    payload: { category: string; enabled: boolean }[]
  ) =>
    request<NotificationPreference[]>(
      "auth/notifications/preferences/",
      "PUT",
      payload
    ),

  /* --- Counter --- */
  getCounter: (codeName: string) =>
    request<CounterUsage>(`companies/counter/${codeName}/`, 'GET'),
  
  incrementCounter: (codeName: string) =>
    request<IncrementCounterUsage>(`companies/counter/${codeName}/`, 'PATCH'),

  /* --- Organization --- */
  getOrganization: () => {
    return request<Organization>(`organizations/current/`, "GET");
  },

  editOrganization: (payload: Partial<Organization>) => {
    return request<Organization>(`organizations/current/update/`, "PUT", payload);
  },

  getOrgCurrency: () => {
    return request<{ currency: string | null }>(
      `organizations/current/currency/`,
      "GET"
    );
  },

  updateOrgCurrency: (payload: { currency: string; current_password: string }) => {
    return request<{ currency: string | null }>(
      "organizations/current/currency/",
      "PUT",
      payload
    );
  },

  /* --- KPIs --- */
  getCashflowKpis(params: Record<string, string | number | undefined>) {
    return request<CashflowKpis>(`cashflow/kpis/cashflow/`, 'GET', params);
  },
  getSettledKpis(params: Record<string, string | number | undefined>) {
    return request<SettledKpis>(`cashflow/kpis/settled/`, 'GET', params);
  },

  /* --- Dashboard --- */
  getCashflowDashboard: () => {
    return request<DashboardOverview>(`cashflow/dashboard/`, "GET");
  },

  /* --- Reports --- */
  getReportsSummary(
    params?: {
      description?: string;
      observation?: string;
      gl?: string;         // comma-separated external_ids
      date_from?: string;  // YYYY-MM-DD
      date_to?: string;    // YYYY-MM-DD
    }
  ) {
    return request<ReportsSummary>(
      `cashflow/reports/summary/`,
      'GET',
      params
    );
  },

  /* --- Permissions --- */
  getPermissions: () =>
    request<GetPermissions>(`rbac/permissions/`, "GET"),

  getPermission: (code: string) =>
    request<GetPermission>(`rbac/permissions/${code}/`, "GET"),

  getGroupPermissions: (groupId: string) => {
    return request<{ group: { external_id: string; name: string; slug: string }; permissions: Permission[] }>(
      `rbac/groups/${groupId}/permissions/`,
      "GET"
    );
  },

  updateGroupPermissions: (groupId: string, permission_codes: string[]) => {
    return request<{ message: string; permissions: string[] }>(
      `rbac/groups/${groupId}/permissions/`,
      "POST",
      { permission_codes }
    );
  },
  
  /* --- Groups --- */
  getAllGroups: () => {
    return request<GetGroups>(`rbac/groups/`, "GET");
  },

  getGroup: (groupId: string) => {
    return request<GetGroup>(`rbac/groups/${groupId}/`, "GET");
  },

  addGroup: (payload: AddGroupRequest) => {
    return request<GroupDetail>(`rbac/groups/`, "POST", payload);
  },

  editGroup: (groupId: string, payload: Partial<EditGroupRequest>) => {
    return request<GroupDetail>(`rbac/groups/${groupId}/`, "PATCH", payload);
  },

  deleteAllGroups: () => {
    return request<void>(`rbac/groups/`, "DELETE");
  },

  deleteGroup: (groupId: string) => {
    return request<void>(`rbac/groups/${groupId}/`, "DELETE");
  },

  /* --- Employees --- */
  getEmployees: () => {
    return request<GetEmployeesResponse>(`organizations/members/`, "GET");
  },

  getEmployee: (membershipExternalId: string) => {
    return request<GetEmployeeResponse>(`organizations/members/${membershipExternalId}/`, "GET");
  },

  addEmployee: (payload: AddEmployeeRequest) => {
    return request<GetEmployeeResponse>(`organizations/members/`, "POST", payload);
  },

  editEmployee: (membershipExternalId: string, payload: EditEmployeeRequest) => {
    return request<GetEmployeeResponse>(`organizations/members/${membershipExternalId}/`, "PATCH", payload);
  },

  deleteEmployee: (membershipExternalId: string) => {
    return request<void>(`organizations/members/${membershipExternalId}/`, "DELETE");
  },
  
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
    }>>(`cashflow/entry-views/`, "GET");
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
    }>(`cashflow/entry-views/`, "POST", payload);
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
    }>(`cashflow/entry-views/${viewId}/`, "PATCH", payload);
  },

  deleteEntryView: (viewId: string) => {
    return request<void>(`cashflow/entry-views/${viewId}/`, "DELETE");
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

    return request<Paginated<BankAccount>>(
      `banking/banking/accounts/`,
      "GET",
      params
    );
  },

  getBanksBatch: (ids: string[]) => {
    return request<BankAccount[]>(
      `banking/banking/accounts/batch/`,
      "POST",
      { ids }
    );
  },

  getBank: (bankExternalId: string) => {
    return request<BankAccount>(
      `banking/banking/accounts/${bankExternalId}/`,
      "GET"
    );
  },

  addBank: (payload: Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">) => {
    return request<BankAccount>(
      `banking/banking/accounts/`,
      "POST",
      payload
    );
  },

  editBank: (bankExternalId: string, payload: Partial<Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">>) => {
    return request<BankAccount>(
      `banking/banking/accounts/${bankExternalId}/`,
      "PATCH",
      payload
    );
  },

  deleteBank: (bankExternalId: string) => {
    return request<unknown>(
      `banking/banking/accounts/${bankExternalId}/`,
      "DELETE"
    );
  },

  /* --- General Ledger Acccounts --- */
  getLedgerAccounts: (params?: GetLedgerAccountsRequest) => {
    return request<GetLedgerAccountsResponse>(
      `ledger/ledger/accounts/`,
      "GET",
      params
    );
  },

  getLedgerAccountsBatch: (ids: string[]) => {
    return request<GLAccount[]>(
      `ledger/ledger/accounts/batch/`,
      "POST",
      { ids }
    );
  },

  getLedgerAccount: (glaId: string) => {
    return request<GLAccount>(
      `ledger/ledger/accounts/${glaId}/`,
      "GET"
    );
  },

  importLedgerAccounts: (formData: FormData) => {
    return request<{
      created_count: number;
      accounts: GLAccount[];
    }>(
      `ledger/ledger/accounts/import/`,
      "POST",
      formData
    );
  },

  importStandardLedgerAccounts: (plan: "personal" | "business") => {
    return request<{
      created_count: number;
      accounts: GLAccount[];
    }>(
      `ledger/ledger/accounts/import-standard/`,
      "POST",
      { plan }
    );
  },

  downloadLedgerCsvTemplate: async () => {
    const res = await http.get(
      `ledger/ledger/accounts/template/csv/`,
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

  // Download XLSX template as a file (no page navigation)
  downloadLedgerXlsxTemplate: async () => {
    const res = await http.get(
      `ledger/ledger/accounts/template/xlsx/`,
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
      `ledger/ledger/accounts/`,
      "POST",
      payload
    );
  },

  addLedgerAccountsBulk: (payload: AddGLAccountRequest[]) => {
    return request<GLAccount[]>(
      `ledger/ledger/accounts/bulk/`,
      "POST",
      payload
    );
  },

  editLedgerAccount: (glaId: string, payload: EditGLAccountRequest) => {
    return request<GLAccount>(
      `ledger/ledger/accounts/${glaId}/`,
      "PATCH",
      payload
    );
  },

  deleteAllLedgerAccounts: () => {
    return request<{ message: string; deleted_count: number }>(
      `ledger/ledger/accounts/bulk/delete/`,
      "DELETE",
      { confirm_delete_all: true }
    );
  },

  deleteLedgerAccount: (glaId: string) => {
    return request<unknown>(
      `ledger/ledger/accounts/${glaId}/`,
      "DELETE"
    );
  },

  /* --- Document Types --- */
  getAllDocumentTypes: () =>
    request<GetDocumentTypes>("enterprise_structure/document-types", "GET"),

  getDocumentType: (ids: number[]) =>
    request<GetDocumentType>(`enterprise_structure/document-types/${ids.join(',')}`, "GET"),

  /* --- Departments --- */
  getDepartments: (params?: { page_size?: number; cursor?: string; q?: string; active?: "true" | "false" }) => {
    return request<GetDepartmentsResponse>(
      `departments/departments/`,
      "GET",
      params
    );
  },

  getDepartment: (departmentId: string) => {
    return request<GetDepartmentResponse>(
      `departments/departments/${departmentId}/`,
      "GET"
    );
  },

  getDepartmentsBatch: (ids: string[]) => {
    return request<Department[]>(
      `departments/departments/batch/`,
      "POST",
      { ids }
    );
  },

  addDepartment: (payload: AddDepartmentRequest) => {
    return request<Department>(
      `departments/departments/`,
      "POST",
      payload
    );
  },

  editDepartment: (departmentId: string, payload: Partial<EditDepartmentRequest>) => {
    return request<Department>(
      `departments/departments/${departmentId}/`,
      "PATCH",
      payload
    );
  },

  deleteDepartment: (departmentId: string) => {
    return request<void>(
      `departments/departments/${departmentId}/`,
      "DELETE"
    );
  },

  /* --- Projects --- */
  getProjects: (params?: { cursor?: string; page_size?: number; active?: "true" | "false"; type?: string; q?: string }) => {
    return request<GetProjectsResponse>(
      `projects/projects/`,
      "GET",
      params
    );
  },

  getProjectsBatch: (ids: string[]) => {
    return request<Project[]>(
      `projects/projects/batch/`,
      "POST",
      { ids }
    );
  },

  getProject: (projectId: string) => {
    return request<Project>(
      `projects/projects/${projectId}/`,
      "GET"
    );
  },

  addProject: (payload: AddProjectRequest) => {
    return request<Project>(
      `projects/projects/`,
      "POST",
      payload
    );
  },

  editProject: (projectId: string, payload: EditProjectRequest) => {
    return request<Project>(
      `projects/projects/${projectId}/`,
      "PATCH",
      payload
    );
  },

  deleteProject: (projectId: string) => {
    return request<void>(
      `projects/projects/${projectId}/`,
      "DELETE"
    );
  },

  /* --- Inventory --- */
  getInventoryItems: (params?: {
    cursor?: string;
    page_size?: number;
    active?: "true" | "false";
    q?: string;
    min_qoh?: string | number;
    max_qoh?: string | number;
  }) => {
    return request<GetInventoryItemsResponse>(
      `inventory/inventory/items/`,
      "GET",
      params
    );
  },

  getInventoryOptions: (params?: {
    cursor?: string;
    page_size?: number;
    active?: "true" | "false";
    q?: string;
  }) => {
    return request<GetInventoryItemsResponse>(
      `inventory/inventory/items/options/`,
      "GET",
      params
    );
  },

  getInventoryItemsBatch: (ids: string[]) => {
    return request<InventoryItem[]>(
      `inventory/inventory/items/batch/`,
      "POST",
      { ids }
    );
  },

  getInventoryItem: (id: string) => {
    return request<InventoryItem>(
      `inventory/inventory/items/${id}/`,
      "GET"
    );
  },

  addInventoryItem: (payload: AddInventoryItemRequest) => {
    return request<InventoryItem>(
      `inventory/inventory/items/`,
      "POST",
      payload
    );
  },

  editInventoryItem: (id: string, payload: EditInventoryItemRequest) => {
    return request<InventoryItem>(
      `inventory/inventory/items/${id}/`,
      "PATCH",
      payload
    );
  },

  deleteInventoryItem: (id: string) => {
    return request<void>(
      `inventory/inventory/items/${id}/`,
      "DELETE"
    );
  },

  /* --- Entities --- */
  getEntities: (params?: {
    cursor?: string;
    page_size?: number;
    active?: "true" | "false";
    type?: string; // client | supplier | employee ...
    q?: string;
  }) => {
    return request<GetEntitiesResponse>(
      `crm/crm/entities/`,
      "GET",
      params
    );
  },

  getEntitiesTable: (params?: {
    cursor?: string;
    page_size?: number;
    active?: "true" | "false";
    type?: string;
    q?: string;
  }) => {
    return request<GetEntitiesResponse>(
      `crm/crm/entities/table/`,
      "GET",
      params
    );
  },

  getEntitiesOptions: (params?: {
    cursor?: string;
    page_size?: number;
    active?: "true" | "false";
    type?: string;
    q?: string;
  }) => {
    return request<GetEntitiesResponse>(
      `crm/crm/entities/options/`,
      "GET",
      params
    );
  },
  
  getEntity: (id: string) => {
    return request<GetEntityResponse>(
      `crm/crm/entities/${id}/`,
      "GET"
    );
  },

  getEntitiesBatch: (ids: string[]) => {
    return request<Entity[]>(
      `crm/crm/entities/batch/`,
      "POST",
      { ids }
    );
  },

  addEntity: (payload: AddEntityRequest) => {
    return request<Entity>(
      `crm/crm/entities/`,
      "POST",
      payload
    );
  },

  editEntity: (id: string, payload: EditEntityRequest) => {
    return request<Entity>(
      `crm/crm/entities/${id}/`,
      "PATCH",
      payload
    );
  },

  deleteEntity: (id: string) => {
    return request<void>(
      `crm/crm/entities/${id}/`,
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
    }>>(
      `banking/banking/statements/`,
      "GET",
      params
    );
  },

  // upload with progress (FormData: file, optional bank_account_id)
  uploadStatement: (form: FormData, onProgress?: (pct: number) => void) => {
    return http.post(
      `banking/banking/statements/`,
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
      `banking/banking/statements/${statementId}/`,
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
      `banking/banking/statements/${statementId}/analyze/`,
      "POST",
      {}
    );
  },

  // download binary (Blob) via axios responseType: 'blob'
  downloadStatement: async (statementId: string) => {
    const res = await http.get(
      `banking/banking/statements/${statementId}/download/`,
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







}
