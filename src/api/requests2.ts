import axios from 'axios';
import { request } from '@/lib/http'
import {
  GetEmployeeResponse, GetEmployeesResponse, AddEmployeeRequest, EditEmployeeRequest,
  GetUserResponse,
  SignInRequest, SignInResponse, SignUpRequest, SignUpResponse,
  Subscription,
  GetPermissions,
  GetGroups, GetGroup, AddGroupRequest, EditGroupRequest,
} from '@/models/auth/dto'
import { User, Enterprise, Employee, GroupDetail, CounterUsage, IncrementCounterUsage } from '@/models/auth/domain'
import { GetTask, GetTasks, AddTaskRequest, EditTaskRequest } from '@/models/tasks/dto';
import { TaskDetail } from '@/models/tasks/domain';
import { Entry, SettledEntry, Transference } from '@/models/entries/domain'
import {
  GetEntryResponse, GetEntryRequest, AddEntryRequest, EditEntryRequest,
  GetSettledEntry, GetSettledEntryRequest, EditSettledEntryRequest,
  AddTransferenceRequest
} from '@/models/entries/dto'
import {
  GetBank, GetBanks,
  GetLedgerAccount, GetLedgerAccounts, AddLedgerAccountRequest, EditLedgerAccountRequest,
  GetDocumentType, GetDocumentTypes,
  GetDepartments, GetDepartment, AddDepartmentRequest, EditDepartmentRequest,
  GetProject, GetProjects, AddProjectRequest, EditProjectRequest,
  GetEntities, GetEntity, AddEntityRequest, EditEntityRequest,
  GetInventoryItem, GetInventoryItems, AddInventoryItemRequest, EditInventoryItemRequest
} from '@/models/enterprise_structure/dto';
import { Bank, LedgerAccount, Department, Project, InventoryItem, Entity } from '@/models/enterprise_structure/domain';


export const api = {
  /* --- Auth --- */
  signIn: (payload: SignInRequest) =>
    request<SignInResponse>('auth/signin', 'POST', payload),

  signUp: (payload: SignUpRequest) =>
    request<SignUpResponse>('auth/signup', 'POST', payload),

  verifyEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-email/${uidb64}/${token}/`, "GET"),

  verifyNewEmail: <T>(uidb64: string, token: string) =>
    request<T>(`auth/verify-pending-email/${uidb64}/${token}/`, "GET"),

  /* --- User --- */
  getUser: () =>
    request<GetUserResponse>('auth/user', "GET"),

  editUser:(payload: Partial<User>) =>
    request<User>('auth/user', 'PUT', payload),

  /* --- Password --- */
  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<unknown>('auth/password-change/', 'PUT', payload),

  requestPasswordReset: (email: string) =>
    axios.post('auth/password-reset/', { email }),

  confirmPasswordReset: (uid: string, token: string, password: string) =>
    axios.post(`auth/password-reset/${uid}/${token}/`, { password }),

  /* --- Subscriptions --- */
  getSubscriptionStatus: () =>
    request<Subscription>('payments/get-subscription-status', 'GET'),
  
  createCheckoutSession: (price_id: string) =>
    request<{ url?: string; message?: string }>('payments/create-checkout-session/', 'POST', { price_id }),

  createCustomerPortalSession: () =>
    request<{ url?: string }>('payments/create-customer-portal-session/', 'POST', {}),

  /* --- Counter --- */
  getCounter: (codeName: string) =>
    request<CounterUsage>(`companies/counter/${codeName}/`, 'GET'),
  
  incrementCounter: (codeName: string) =>
    request<IncrementCounterUsage>(`companies/counter/${codeName}/`, 'PATCH'),

  /* --- Enterprise --- */
  getEnterprise: () =>
    request<Enterprise>('companies/enterprise', "GET"),

  editEnterprise: (payload: Partial<Enterprise>) =>
    request<Enterprise>('companies/enterprise', 'PUT', payload),

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
  getEntries: (payload: GetEntryRequest) =>
    request<GetEntryResponse>("cashflow/entries/paginated", "GET", payload),

  getAllEntries: () =>
    request<GetEntryResponse>("cashflow/entries", "GET"),

  getEntry: (ids: number[], payload: GetEntryRequest) =>
    request<GetEntryResponse>(`cashflow/entries/${ids.join(',')}`, "GET", payload),

  addEntry: (payload: AddEntryRequest) =>
    request<Entry>("cashflow/entries", "POST", payload),

  editEntry: (ids: number[], payload: Partial<EditEntryRequest>) =>
    request<Entry>(`cashflow/entries/${ids.join(',')}`, 'PUT', payload),

  deleteAllEntries: () =>
    request<Entry>("cashflow/entries", 'DELETE'),

  deleteEntry: (ids: number[]) =>
    request<Entry>(`cashflow/entries/${ids.join(',')}`, 'DELETE'),

  /* --- Settled Entries --- */
  getSettledEntries: (payload: GetSettledEntryRequest) =>
    request<GetSettledEntry>("cashflow/settled-entries/paginated", "GET", payload),

  getAllSettledEntries: () =>
    request<GetSettledEntry>("cashflow/settled-entries", "GET"),

  getSettledEntry: (ids: number[], payload: GetSettledEntryRequest) =>
    request<GetSettledEntry>(`cashflow/settled-entries/${ids.join(',')}`, "GET", payload),

  editSettledEntry: (ids: number[], payload: Partial<EditSettledEntryRequest>) =>
    request<SettledEntry>(`cashflow/settled-entries/${ids.join(',')}`, 'PATCH', payload),

  deleteAllSettledEntries: () =>
    request<SettledEntry>("cashflow/settled-entries", 'DELETE'),

  deleteSettledEntry: (ids: number[]) =>
    request<SettledEntry>(`cashflow/settled-entries/${ids.join(',')}`, 'DELETE'),

  /* --- Transferences --- */
  addTransference: (payload: AddTransferenceRequest) =>
    request<Transference>("cashflow/transferences", "POST", payload),

  /* --- Banks --- */
  getAllBanks: () =>
    request<GetBanks>("enterprise_structure/banks", "GET"),

  getBank: (ids: number[]) =>
    request<GetBank>(`enterprise_structure/banks/${ids.join(',')}`, "GET"),

  addBank: (payload: Bank) =>
    request<Bank>("enterprise_structure/banks", 'POST', payload),

  editBank: (ids: number[], payload: Partial<Bank>) =>
    request<Bank>(`enterprise_structure/banks/${ids.join(',')}`, 'PUT', payload),

  deleteAllBanks: () =>
    request<Bank>("enterprise_structure/banks", 'DELETE'),

  deleteBank: (ids: number[]) =>
    request<Bank>(`enterprise_structure/banks/${ids.join(',')}`, 'DELETE'),

  /* --- General Ledger Acccounts --- */
  getAllLedgerAccounts: () =>
    request<GetLedgerAccounts>("enterprise_structure/general-ledger-accounts", "GET"),

  getLedgerAccount: (ids: number[]) =>
    request<GetLedgerAccount>(`enterprise_structure/general-ledger-accounts/${ids.join(',')}`, "GET"),

  addLedgerAccount: (payload: AddLedgerAccountRequest) =>
    request<LedgerAccount>("enterprise_structure/general-ledger-accounts", "POST", payload),

  editLedgerAccount: (ids: number[], payload: Partial<EditLedgerAccountRequest>) =>
    request<LedgerAccount>(`enterprise_structure/general-ledger-accounts/${ids.join(',')}`, "PUT", payload),
  
  deleteAllLedgerAccounts: () =>
    request<LedgerAccount>("enterprise_structure/general-ledger-accounts", 'DELETE'),

  deleteLedgerAccount: (ids: number[]) =>
    request<LedgerAccount>(`enterprise_structure/general-ledger-accounts/${ids.join(',')}`, 'DELETE'),

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
