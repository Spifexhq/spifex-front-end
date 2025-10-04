import { request } from '@/lib/http'
import {
  GetEmployeeResponse, GetEmployeesResponse, AddEmployeeRequest, EditEmployeeRequest,
  GetUserResponse,
  SignInRequest, SignInResponse, SignUpRequest, SignUpResponse,
  Subscription,
  GetPermission, GetPermissions,
  GetGroups, GetGroup, AddGroupRequest, EditGroupRequest,
} from '@/models/auth/dto'
import { User, Organization, GroupDetail, CounterUsage, IncrementCounterUsage, PersonalSettings } from '@/models/auth/domain'
import { GetTask, GetTasks, AddTaskRequest, EditTaskRequest } from '@/models/tasks/dto';
import { TaskDetail } from '@/models/tasks/domain';
import { Entry, SettledEntry, Transference, CashflowKpis, SettledKpis, BulkSettleItem, BulkSettleResponse, ReportsSummary } from '@/models/entries/domain'
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
import { BankAccount, GLAccount, Department, Project, InventoryItem, Entity } from '@/models/enterprise_structure/domain';
import { Paginated } from '@/models/Api';
import { store } from '@/redux/store';

const getOrgExternalId = (): string => {
  const state = store.getState();
  const byField = state.auth.orgExternalId;
  const byNested = state.auth.organization?.organization?.external_id;
  const id = byField || byNested;
  if (!id) throw new Error('Organization external_id is not available yet.');
  return id;
};

export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse>('auth/signin/', 'POST', payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>('auth/signup/', 'POST', payload),

  verifyEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-email/${uidb64}/${token}/`, "GET"),

  verifyNewEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-email/${uidb64}/${token}/`, "GET"),

  /* --- User --- */
  getUser: () =>
    request<GetUserResponse>('auth/me/', "GET"),

  editUser:(payload: Partial<User>) =>
    request<User>('auth/me/', 'PUT', payload),

  getPersonalSettings: () =>
    request<PersonalSettings>('auth/me/settings/', "GET"),

  editPersonalSettings:(payload: Partial<PersonalSettings>) =>
    request<PersonalSettings>('auth/me/settings/', 'PATCH', payload),

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
    const orgExternalId = getOrgExternalId();
    return request<Subscription>(`billing/${orgExternalId}/subscription`, 'GET');
  },
  createCheckoutSession: (price_id: string) => {
    const orgExternalId = getOrgExternalId();
    return request<{ url?: string; message?: string }>(
      `billing/${orgExternalId}/create-checkout-session/`,
      'POST',
      { price_id }
    );
  },
  createCustomerPortalSession: () => {
    const orgExternalId = getOrgExternalId();
    return request<{ url?: string }>(
      `billing/${orgExternalId}/create-customer-portal-session/`,
      'POST',
      {}
    );
  },

  /* --- Counter --- */
  getCounter: (codeName: string) =>
    request<CounterUsage>(`companies/counter/${codeName}/`, 'GET'),
  
  incrementCounter: (codeName: string) =>
    request<IncrementCounterUsage>(`companies/counter/${codeName}/`, 'PATCH'),

  /* --- Organization --- */
  getOrganization: () => {
    const orgExternalId = getOrgExternalId();
    return request<Organization>(`organizations/${orgExternalId}/`, "GET");
  },

  editOrganization: (payload: Partial<Organization>) => {
    const orgExternalId = getOrgExternalId();
    return request<Organization>(`organizations/${orgExternalId}/update/`, "PUT", payload);
  },

  /* --- KPIs --- */
  getCashflowKpis(orgExtId: string, params: Record<string, string | number | undefined>) {
    return request<CashflowKpis>(`cashflow/${orgExtId}/kpis/cashflow/`, 'GET', params);
  },
  getSettledKpis(orgExtId: string, params: Record<string, string | number | undefined>) {
    return request<SettledKpis>(`cashflow/${orgExtId}/kpis/settled/`, 'GET', params);
  },

  /* --- Reports --- */
  getReportsSummary(
    orgExternalId: string,
    params?: {
      description?: string;
      observation?: string;
      gl?: string;         // comma-separated external_ids
      date_from?: string;  // YYYY-MM-DD
      date_to?: string;    // YYYY-MM-DD
    }
  ) {
    return request<ReportsSummary>(
      `cashflow/${orgExternalId}/reports/summary/`,
      'GET',
      params
    );
  },

  /* --- Permissions --- */
  getPermissions: () =>
    request<GetPermissions>(`rbac/permissions/`, "GET"),

  getPermission: (code: string) =>
    request<GetPermission>(`rbac/permissions/${code}/`, "GET"),
  
  /* --- Groups --- */
  getAllGroups: () => {
    const org = getOrgExternalId();
    return request<GetGroups>(`rbac/${org}/groups/`, "GET");
  },

  getGroup: (slug: string) => {
    const org = getOrgExternalId();
    return request<GetGroup>(`rbac/${org}/groups/${slug}/`, "GET");
  },

  addGroup: (payload: AddGroupRequest) => {
    const org = getOrgExternalId();
    return request<GroupDetail>(`rbac/${org}/groups/`, "POST", payload);
  },

  editGroup: (slug: string, payload: Partial<EditGroupRequest>) => {
    const org = getOrgExternalId();
    return request<GroupDetail>(`rbac/${org}/groups/${slug}/`, "PATCH", payload);
  },

  deleteAllGroups: () => {
    const org = getOrgExternalId();
    return request<void>(`rbac/${org}/groups/`, "DELETE");
  },

  deleteGroup: (slug: string) => {
    const org = getOrgExternalId();
    return request<void>(`rbac/${org}/groups/${slug}/`, "DELETE");
  },

  /* --- Employees --- */
  getEmployees: () => {
    const orgExternalId = getOrgExternalId();
    return request<GetEmployeesResponse>(`organizations/${orgExternalId}/members/`, "GET");
  },

  getEmployee: (membershipId: number) => {
    const orgExternalId = getOrgExternalId();
    return request<GetEmployeeResponse>(`organizations/${orgExternalId}/members/${membershipId}/`, "GET");
  },

  addEmployee: (payload: AddEmployeeRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<GetEmployeeResponse>(`organizations/${orgExternalId}/members/`, "POST", payload);
  },

  editEmployee: (membershipId: number, payload: EditEmployeeRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<GetEmployeeResponse>(`organizations/${orgExternalId}/members/${membershipId}/`, "PATCH", payload);
  },

  deleteEmployee: (membershipId: number) => {
    const orgExternalId = getOrgExternalId();
    return request<void>(`organizations/${orgExternalId}/members/${membershipId}/`, "DELETE");
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
  
  /* --- Cash-flow Entries --- */
  getEntries: (payload: GetEntryRequest) => {
    const org = getOrgExternalId();
    return request<GetEntryResponse>(`cashflow/${org}/entries/`, "GET", payload);
  },

  getEntry: (externalId: string) => {
    const org = getOrgExternalId();
    return request<Entry>(`cashflow/${org}/entries/${externalId}/`, "GET");
  },

  getEntriesBatch: (ids: string[]) => {
    const org = getOrgExternalId();
    return request<Entry[]>(
      `cashflow/${org}/entries/batch/`,
      "POST",
      { ids }
    );
  },

  addEntry: (payload: AddEntryRequest) => {
    const org = getOrgExternalId();
    return request<Entry | Entry[]>(
      `cashflow/${org}/entries/`,
      "POST",
      payload
    );
  },

  editEntry: (externalId: string, payload: Partial<EditEntryRequest>) => {
    const org = getOrgExternalId();
    return request<Entry | Entry[]>(
      `cashflow/${org}/entries/${externalId}/`,
      "PATCH",
      payload
    );
  },

  bulkUpdateEntries: (
    ids: string[],
    data: Partial<EditEntryRequest>,
    atomic: boolean = true
  ) => {
    const org = getOrgExternalId();
    return request<{ updated: Entry[] } | { updated: Entry[]; errors: Array<{ id: string; error: string }> }>(
      `cashflow/${org}/entries/bulk/update/`,
      "PATCH",
      { ids, data, atomic }
    );
  },

  deleteEntry: (externalId: string) => {
    const org = getOrgExternalId();
    return request<void>(`cashflow/${org}/entries/${externalId}/`, "DELETE");
  },

  bulkDeleteEntries: (ids: string[]) => {
    const org = getOrgExternalId();
    return request<void>(`cashflow/${org}/entries/bulk/delete/`, "POST", { ids });
  },

  /* --- Settle Process --- */
  bulkSettle: (items: BulkSettleItem[], atomic: boolean = true) => {
    const org = getOrgExternalId();
    return request<BulkSettleResponse>(
      `cashflow/${org}/settlements/bulk/`,
      "POST",
      { items, atomic }
    );
  },

  // Cria settlement para UMA entrada específica (opcional se quiseres usar sempre o bulk)
  addSettlement: (
    entryExternalId: string,
    payload: { bank_id: string; amount_minor?: number; amount?: string; value_date: string }
  ) => {
    const org = getOrgExternalId();
    return request<Entry>(
      `cashflow/${org}/entries/${entryExternalId}/settlements/`,
      "POST",
      payload
    );
  },

  /* --- Settled Entries --- */
  getSettledEntries: (payload: GetSettledEntryRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<GetSettledEntry>(
      `cashflow/${orgExternalId}/settlements/`,
      "GET",
      payload
    );
  },

  getSettledEntry: (ids: string[], payload?: GetSettledEntryRequest) => {
    const orgExternalId = getOrgExternalId();
    const params = { ...(payload || {}), ids: ids.join(",") };
    return request<SettledEntry[]>(
      `cashflow/${orgExternalId}/settlements/batch/`,
      "GET",
      params
    );
  },

  editSettledEntry: (id: string, payload: Partial<EditSettledEntryRequest>) => {
    const orgExternalId = getOrgExternalId();
    return request<SettledEntry>(
      `cashflow/${orgExternalId}/settlements/${id}/`,
      "PATCH",
      payload
    );
  },

  bulkDeleteSettledEntries: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<void>(
      `cashflow/${orgExternalId}/settlements/bulk/delete/`,
      "POST",
      { ids }
    );
  },

  deleteSettledEntry: (id: string) => {
    const orgExternalId = getOrgExternalId();
    return request<Entry>(`cashflow/${orgExternalId}/settlements/${id}/`, "DELETE");
  },

  /* --- Transferences --- */
  addTransference: (payload: AddTransferenceRequest) => {
    const org = getOrgExternalId();
    return request<Transference>(`cashflow/${org}/transfers/`, 'POST', payload);
  },

  /* --- Banks --- */
  getAllBanks: () => {
    const orgExternalId = getOrgExternalId();
    return request<Paginated<BankAccount>>(
      `banking/${orgExternalId}/banking/accounts/`,
      "GET"
    );
  },

  getBanksBatch: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<BankAccount[]>(
      `banking/${orgExternalId}/banking/accounts/batch/`,
      "POST",
      { ids }
    );
  },

  getBank: (bankExternalId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<BankAccount>(
      `banking/${orgExternalId}/banking/accounts/${bankExternalId}/`,
      "GET"
    );
  },

  addBank: (payload: Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">) => {
    const orgExternalId = getOrgExternalId();
    return request<BankAccount>(
      `banking/${orgExternalId}/banking/accounts/`,
      "POST",
      payload
    );
  },

  editBank: (bankExternalId: string, payload: Partial<Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">>) => {
    const orgExternalId = getOrgExternalId();
    return request<BankAccount>(
      `banking/${orgExternalId}/banking/accounts/${bankExternalId}/`,
      "PATCH",
      payload
    );
  },

  deleteBank: (bankExternalId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<unknown>(
      `banking/${orgExternalId}/banking/accounts/${bankExternalId}/`,
      "DELETE"
    );
  },

  /* --- General Ledger Acccounts --- */
  getLedgerAccounts: (params?: GetLedgerAccountsRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<GetLedgerAccountsResponse>(
      `ledger/${orgExternalId}/ledger/accounts/`,
      "GET",
      params
    );
  },

  getLedgerAccountsBatch: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<GLAccount[]>(
      `ledger/${orgExternalId}/ledger/accounts/batch/`,
      "POST",
      { ids }
    );
  },

  getLedgerAccount: (glaId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<GLAccount>(
      `ledger/${orgExternalId}/ledger/accounts/${glaId}/`,
      "GET"
    );
  },

  addLedgerAccount: (payload: AddGLAccountRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<GLAccount>(
      `ledger/${orgExternalId}/ledger/accounts/`,
      "POST",
      payload
    );
  },

  editLedgerAccount: (glaId: string, payload: EditGLAccountRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<GLAccount>(
      `ledger/${orgExternalId}/ledger/accounts/${glaId}/`,
      "PATCH",
      payload
    );
  },

  deleteAllLedgerAccounts: () => {
    const orgExternalId = getOrgExternalId();
    return request<{ message: string; deleted_count: number }>(
      `ledger/${orgExternalId}/ledger/accounts/bulk-delete/`,
      "DELETE",
      { confirm_delete_all: true }
    );
  },

  deleteLedgerAccount: (glaId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<unknown>(
      `ledger/${orgExternalId}/ledger/accounts/${glaId}/`,
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
    const orgExternalId = getOrgExternalId();
    return request<GetDepartmentsResponse>(
      `departments/${orgExternalId}/departments/`,
      "GET",
      params
    );
  },

  getDepartment: (departmentId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<GetDepartmentResponse>(
      `departments/${orgExternalId}/departments/${departmentId}/`,
      "GET"
    );
  },

  getDepartmentsBatch: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<Department[]>(
      `departments/${orgExternalId}/departments/batch/`,
      "POST",
      { ids }
    );
  },

  addDepartment: (payload: AddDepartmentRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<Department>(
      `departments/${orgExternalId}/departments/`,
      "POST",
      payload
    );
  },

  editDepartment: (departmentId: string, payload: Partial<EditDepartmentRequest>) => {
    const orgExternalId = getOrgExternalId();
    return request<Department>(
      `departments/${orgExternalId}/departments/${departmentId}/`,
      "PATCH",
      payload
    );
  },

  deleteDepartment: (departmentId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<void>(
      `departments/${orgExternalId}/departments/${departmentId}/`,
      "DELETE"
    );
  },

  /* --- Projects --- */
  getProjects: (params?: { cursor?: string; page_size?: number; active?: "true" | "false"; type?: string; q?: string }) => {
    const orgExternalId = getOrgExternalId();
    return request<GetProjectsResponse>(
      `projects/${orgExternalId}/projects/`,
      "GET",
      params
    );
  },

  getProjectsBatch: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<Project[]>(
      `projects/${orgExternalId}/projects/batch/`,
      "POST",
      { ids }
    );
  },

  getProject: (projectId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<Project>(
      `projects/${orgExternalId}/projects/${projectId}/`,
      "GET"
    );
  },

  addProject: (payload: AddProjectRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<Project>(
      `projects/${orgExternalId}/projects/`,
      "POST",
      payload
    );
  },

  editProject: (projectId: string, payload: EditProjectRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<Project>(
      `projects/${orgExternalId}/projects/${projectId}/`,
      "PATCH",
      payload
    );
  },

  deleteProject: (projectId: string) => {
    const orgExternalId = getOrgExternalId();
    return request<void>(
      `projects/${orgExternalId}/projects/${projectId}/`,
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
    const orgExternalId = getOrgExternalId();
    return request<GetInventoryItemsResponse>(
      `inventory/${orgExternalId}/inventory/items/`,
      "GET",
      params
    );
  },

  getInventoryItemsBatch: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<InventoryItem[]>(
      `inventory/${orgExternalId}/inventory/items/batch/`,
      "POST",
      { ids }
    );
  },

  getInventoryItem: (id: string) => {
    const orgExternalId = getOrgExternalId();
    return request<InventoryItem>(
      `inventory/${orgExternalId}/inventory/items/${id}/`,
      "GET"
    );
  },

  addInventoryItem: (payload: AddInventoryItemRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<InventoryItem>(
      `inventory/${orgExternalId}/inventory/items/`,
      "POST",
      payload
    );
  },

  editInventoryItem: (id: string, payload: EditInventoryItemRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<InventoryItem>(
      `inventory/${orgExternalId}/inventory/items/${id}/`,
      "PATCH",
      payload
    );
  },

  deleteInventoryItem: (id: string) => {
    const orgExternalId = getOrgExternalId();
    return request<void>(
      `inventory/${orgExternalId}/inventory/items/${id}/`,
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
    const orgExternalId = getOrgExternalId();
    return request<GetEntitiesResponse>(
      `crm/${orgExternalId}/crm/entities/`,
      "GET",
      params
    );
  },

  getEntitiesBatch: (ids: string[]) => {
    const orgExternalId = getOrgExternalId();
    return request<Entity[]>(
      `crm/${orgExternalId}/crm/entities/batch/`,
      "POST",
      { ids }
    );
  },

  getEntity: (id: string) => {
    const orgExternalId = getOrgExternalId();
    return request<GetEntityResponse>(
      `crm/${orgExternalId}/crm/entities/${id}/`,
      "GET"
    );
  },

  addEntity: (payload: AddEntityRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<Entity>(
      `crm/${orgExternalId}/crm/entities/`,
      "POST",
      payload
    );
  },

  editEntity: (id: string, payload: EditEntityRequest) => {
    const orgExternalId = getOrgExternalId();
    return request<Entity>(
      `crm/${orgExternalId}/crm/entities/${id}/`,
      "PATCH",
      payload
    );
  },

  deleteEntity: (id: string) => {
    const orgExternalId = getOrgExternalId();
    return request<void>(
      `crm/${orgExternalId}/crm/entities/${id}/`,
      "DELETE"
    );
  },
}
