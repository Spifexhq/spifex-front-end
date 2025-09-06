import { request } from '@/lib/http'
import {
  GetEmployeeResponse, GetEmployeesResponse, AddEmployeeRequest, EditEmployeeRequest,
  GetUserResponse,
  SignInRequest, SignInResponse, SignUpRequest, SignUpResponse,
  Subscription,
  GetPermissions,
  GetGroups, GetGroup, AddGroupRequest, EditGroupRequest,
} from '@/models/auth/dto'
import { User, Organization, Employee, GroupDetail, CounterUsage, IncrementCounterUsage, PersonalSettings } from '@/models/auth/domain'
import { GetTask, GetTasks, AddTaskRequest, EditTaskRequest } from '@/models/tasks/dto';
import { TaskDetail } from '@/models/tasks/domain';
import { Entry, SettledEntry, Transference, CashflowKpis, SettledKpis } from '@/models/entries/domain'
import {
  GetEntryResponse, GetEntryRequest, AddEntryRequest, EditEntryRequest,
  GetSettledEntry, GetSettledEntryRequest, EditSettledEntryRequest,
  AddTransferenceRequest
} from '@/models/entries/dto'
import {
  GetLedgerAccountsRequest, GetLedgerAccountsResponse, AddGLAccountRequest, EditGLAccountRequest,
  GetDocumentType, GetDocumentTypes,
  GetDepartments, GetDepartment, AddDepartmentRequest, EditDepartmentRequest,
  GetProject, GetProjects, AddProjectRequest, EditProjectRequest,
  GetEntities, GetEntity, AddEntityRequest, EditEntityRequest,
  GetInventoryItem, GetInventoryItems, AddInventoryItemRequest, EditInventoryItemRequest
} from '@/models/enterprise_structure/dto';
import { BankAccount, GLAccount, Department, Project, InventoryItem, Entity } from '@/models/enterprise_structure/domain';
import { Paginated } from '@/models/Api';
import { store } from '@/redux/store';

const getOrgExternalId = (): string => {
  const state = store.getState();
  // Try explicit field then nested organization
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

  getCashflowKpis(orgExtId: string, params: Record<string, string | number | undefined>) {
    return request<CashflowKpis>(`cashflow/${orgExtId}/kpis/cashflow/`, 'GET', params);
  },
  getSettledKpis(orgExtId: string, params: Record<string, string | number | undefined>) {
    return request<SettledKpis>(`cashflow/${orgExtId}/kpis/settled/`, 'GET', params);
  },

  /* --- Permissions --- */
  getPermissions: () =>
    request<GetPermissions>('companies/permissions', "GET"),

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

  /* --- Groups --- */
  getAllGroups: () =>
    request<GetGroups>("companies/groups", "GET"),

  getGroup: (ids: number[]) =>
    request<GetGroup>(`companies/groups/${ids.join(',')}`, "GET"),

  addGroup: (payload: AddGroupRequest) =>
    request<GroupDetail>("companies/groups", "POST", payload),

  editGroup: (ids: number[], payload: Partial<EditGroupRequest>) =>
    request<GroupDetail>(`companies/groups/${ids.join(',')}`, "PUT", payload),
  
  deleteAllGroups: () =>
    request<GroupDetail>("companies/groups", 'DELETE'),

  deleteGroup: (ids: number[]) =>
    request<GroupDetail>(`companies/groups/${ids.join(',')}`, 'DELETE'),

  /* --- Employees --- */
  getEmployees: () =>
    request<GetEmployeesResponse>("companies/employees", "GET"),

  getEmployee: (ids: number[]) =>
    request<GetEmployeeResponse>(`companies/employees/${ids.join(',')}`, "GET"),

  addEmployee: (payload: AddEmployeeRequest) =>
    request<Employee>("companies/employees", "POST", payload),

  editEmployee: (ids: number[], payload: Partial<EditEmployeeRequest>) =>
    request<Employee>(`companies/employees/${ids.join(',')}`, 'PUT', payload),

  deleteEmployee: (ids: number[]) =>
    request<Employee>(`companies/employees/${ids.join(',')}`, 'DELETE'),

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
  addTransference: (payload: AddTransferenceRequest) =>
    request<Transference>("cashflow/transferences", "POST", payload),

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
  getAllDepartments: () =>
    request<GetDepartments>("enterprise_structure/departments", "GET"),

  getDepartment: (ids: number[]) =>
    request<GetDepartment>(`enterprise_structure/departments/${ids.join(',')}`, "GET"),

  addDepartment: (payload: AddDepartmentRequest) =>
    request<Department>("enterprise_structure/departments", "POST", payload),

  editDepartment: (ids: number[], payload: Partial<EditDepartmentRequest>) =>
    request<Department>(`enterprise_structure/departments/${ids.join(',')}`, "PUT", payload),
  
  deleteAllDepartments: () =>
    request<Department>("enterprise_structure/departments", 'DELETE'),

  deleteDepartment: (ids: number[]) =>
    request<Department>(`enterprise_structure/departments/${ids.join(',')}`, 'DELETE'),

  /* --- Projects --- */
  getAllProjects: () =>
    request<GetProjects>("enterprise_structure/projects", "GET"),

  getProject: (ids: number[]) =>
    request<GetProject>(`enterprise_structure/projects/${ids.join(',')}`, "GET"),

  addProject: (payload: AddProjectRequest) =>
    request<Project>("enterprise_structure/projects", "POST", payload),

  editProject: (ids: number[], payload: Partial<EditProjectRequest>) =>
    request<Project>(`enterprise_structure/projects/${ids.join(',')}`, "PUT", payload),
  
  deleteAllProjects: () =>
    request<Project>("enterprise_structure/projects", 'DELETE'),

  deleteProject: (ids: number[]) =>
    request<Project>(`enterprise_structure/projects/${ids.join(',')}`, 'DELETE'),

  /* --- Inventory --- */
  getAllInventoryItems: () =>
    request<GetInventoryItems>("enterprise_structure/inventory-items", "GET"),

  getInventoryItem: (ids: number[]) =>
    request<GetInventoryItem>(`enterprise_structure/inventory-items/${ids.join(',')}`, "GET"),

  addInventoryItem: (payload: AddInventoryItemRequest) =>
    request<InventoryItem>("enterprise_structure/inventory-items", "POST", payload),

  editInventoryItem: (ids: number[], payload: Partial<EditInventoryItemRequest>) =>
    request<InventoryItem>(`enterprise_structure/inventory-items/${ids.join(',')}`, "PUT", payload),
  
  deleteAllInventoryItems: () =>
    request<InventoryItem>("enterprise_structure/inventory-items", 'DELETE'),

  deleteInventoryItem: (ids: number[]) =>
    request<InventoryItem>(`enterprise_structure/inventory-items/${ids.join(',')}`, 'DELETE'),

  /* --- Entities --- */
  getAllEntities: () =>
    request<GetEntities>("enterprise_structure/entities", "GET"),

  getEntity: (ids: number[]) =>
    request<GetEntity>(`enterprise_structure/entities/${ids.join(',')}`, "GET"),

  addEntity: (payload: AddEntityRequest) =>
    request<Entity>("enterprise_structure/entities", "POST", payload),

  editEntity: (ids: number[], payload: Partial<EditEntityRequest>) =>
    request<Entity>(`enterprise_structure/entities/${ids.join(',')}`, "PUT", payload),
  
  deleteAllEntities: () =>
    request<Entity>("enterprise_structure/entities", 'DELETE'),

  deleteEntity: (ids: number[]) =>
    request<Entity>(`enterprise_structure/entities/${ids.join(',')}`, 'DELETE'),
}
