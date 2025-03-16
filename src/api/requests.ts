import { apiRequest } from '@/api';

import {
  CashFlowFilters,
  ApiGetEntriesData, ApiGetEntryData,
  AddEntryPayload, EditEntryPayload,
  ApiGetSettledEntriesData, ApiGetSettledEntryData,
  EditSettledEntryPayload,
} from '@/models/Entries';

import { ApiSignUp, ApiGetUser, ApiSignIn, Subscription } from '@/models/Auth';
import { ApiGetEnterprise, Owner } from 'src/models/Auth/Enterprise';
import { ApiGetPermissions } from 'src/models/Auth/Permission';
import { ApiGetGroup, ApiGetGroups } from '@/models/Auth/Group';
import { ApiGetEmployee, ApiGetEmployees } from 'src/models/Auth/Employee';
import {
  CounterUsage,
  ApiGetCounterUsage,
} from '@/models/Counter';
import { ApiGetTask, ApiGetTasks } from '@/models/Task';

import { ApiGetBank, ApiGetBanks } from '@/models/Bank';
import {
  ApiGetGeneralLedgerAccount, ApiGetGeneralLedgerAccounts,
  ApiGetDocumentType, ApiGetDocumentTypes,
  ApiGetDepartment, ApiGetDepartments,
  ApiGetProject, ApiGetProjects,
  ApiGetInventoryItem, ApiGetInventoryItems,
  ApiGetEntity, ApiGetEntities,
} from 'src/models/ForeignKeys';

import { IApiResponse } from '@/models/Api';

const buildIdsParam = (ids: number[]): string => ids.join(',');

function buildQueryParams(url: string, limit: number, offset: number, filters?: CashFlowFilters) {
  let query = `cashflow/${url}/paginated?limit=${limit}&offset=${offset}`;
  
  if (filters?.startDate) {
    query += `&start_date=${filters.startDate}`;
  }
  if (filters?.endDate) {
    query += `&end_date=${filters.endDate}`;
  }
  if (filters?.description) {
    query += `&description=${filters.description}`;
  }
  if (filters?.observation) {
    query += `&observation=${filters.observation}`;
  }
  if (filters?.generalLedgerAccountId && filters.generalLedgerAccountId.length > 0) {
    // Ex: [3, 26] => '3,26'
    const ids = filters.generalLedgerAccountId.join(',');
    query += `&general_ledger_account_id=${ids}`;
  }

  return query;
}

// ======================
//    Authentication
// ======================
const signUp = async (params: {
  name: string;
  email: string;
  password: string;
}): Promise<IApiResponse<ApiSignUp>> => {
  return apiRequest<ApiSignUp>('auth/signup', 'POST', params, false);
};

const signIn = async (params: { email: string; password: string }): Promise<IApiResponse<ApiSignIn>> => {
  return apiRequest<ApiSignIn>('auth/signin', 'POST', params, false);
};

const verifyEmail = async (
  uidb64: string,
  token: string
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `auth/verify-email/${uidb64}/${token}/`,
    'GET',
    undefined,
    false
  );
};

const verifyNewEmail = async (
  uidb64: string,
  token: string
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `auth/verify-pending-email/${uidb64}/${token}/`,
    'GET',
    undefined,
    false
  );
};

const getUser = async (): Promise<IApiResponse<ApiGetUser>> => {
  return apiRequest<ApiGetUser>('auth/user');
};

const getEnterprise = async (): Promise<IApiResponse<ApiGetEnterprise>> => {
  return apiRequest<ApiGetEnterprise>('companies/enterprise');
};

export const editEnterprise = async (
  data: { name: string; owner: Owner }
): Promise<IApiResponse<ApiGetEnterprise>> => {
  return apiRequest<ApiGetEnterprise>('companies/enterprise', 'PUT', data);
};

// ======================
//    Subscriptions
// ======================
export const createCheckoutSession = async (
  price_id: string
): Promise<IApiResponse<{ url?: string; message?: string }>> => {
  return apiRequest<{ url?: string; message?: string }>(
    'payments/create-checkout-session/',
    'POST',
    { price_id },
    true
  );
};

export const getSubscriptionStatus = async (): Promise<
  IApiResponse<Subscription>
> => {
  return apiRequest<Subscription>(
    'payments/get-subscription-status/',
    'GET',
    undefined,
    true
  );
};

export const createCustomerPortalSession = async (): Promise<
  IApiResponse<{ url?: string }>
> => {
  return apiRequest<{ url?: string }>(
    'payments/create-customer-portal-session/',
    'POST',
    {},
    true
  );
};

// ======================
//  Groups / Permissions
// ======================
const getPermissions = async (): Promise<IApiResponse<ApiGetPermissions>> => {
  return apiRequest<ApiGetPermissions>('companies/permissions');
};

const getGroups = async (): Promise<IApiResponse<ApiGetGroups>> => {
  return apiRequest<ApiGetGroups>('companies/groups');
};

const getAnGroup = async (id: number): Promise<IApiResponse<ApiGetGroup>> => {
  return apiRequest<ApiGetGroup>(`companies/groups/${id}`);
};

const addGroup = async (params: {
  name: string;
  permissions: string;
  banks: string;
}): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('companies/groups', 'POST', params);
};

const editGroup = async (
  id: number,
  data: {
    name?: string;
    permissions?: string;
    banks?: string;
  }
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(`companies/groups/${id}`, 'PUT', data);
};

const deleteGroup = async (id: number): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(`companies/groups/${id}`, 'DELETE');
};

// ======================
//        Counter
// ======================
const getCounter = async (
  codeName: string
): Promise<IApiResponse<ApiGetCounterUsage>> => {
  return apiRequest<ApiGetCounterUsage>(
    `companies/counter/${codeName}/`,
    'GET',
    undefined,
    true
  );
};

const incrementCounter = async (
  codeName: string
): Promise<IApiResponse<CounterUsage>> => {
  return apiRequest<CounterUsage>(
    `companies/counter/${codeName}/`,
    'PATCH',
    {},
    true
  );
};

// ======================
//       Employees
// ======================
const getEmployees = async (): Promise<IApiResponse<ApiGetEmployees>> => {
  return apiRequest<ApiGetEmployees>('companies/employees');
};

const getAnEmployee = async (
  id: number
): Promise<IApiResponse<ApiGetEmployee>> => {
  return apiRequest<ApiGetEmployee>(`companies/employees/${id}`);
};

const addEmployee = async (params: {
  name: string;
  email: string;
  password: string;
}): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('companies/employees', 'POST', params);
};

const editEmployee = async (
  id: number,
  data: { name?: string; email?: string; groups: string }
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(`companies/employees/${id}`, 'PUT', data);
};

const deleteEmployee = async (id: number): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(`companies/employees/${id}`, 'DELETE');
};

// ======================
//         Tasks
// ======================
const getTasks = async (): Promise<IApiResponse<ApiGetTasks>> => {
  return apiRequest<ApiGetTasks>('companies/tasks');
};

const getAnTask = async (
  id: number
): Promise<IApiResponse<ApiGetTask>> => {
  return apiRequest<ApiGetTask>(`companies/tasks/${id}`);
};

const addTask = async (params: {
  title: string;
  description?: string;
  due_date?: string;
  employee_id: number;
  status_id: number;
}): Promise<IApiResponse<ApiGetTask>> => {
  return apiRequest<ApiGetTask>('companies/tasks', 'POST', params);
};

const editTask = async (
  id: number,
  data: {
    title?: string;
    description?: string;
    due_date?: string;
    employee_id?: number;
    status_id?: number;
  }
): Promise<IApiResponse<ApiGetTask>> => {
  return apiRequest<ApiGetTask>(`companies/tasks/${id}`, 'PUT', data);
};

const deleteTask = async (id: number): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(`companies/tasks/${id}`, 'DELETE');
};

// ======================
//   Cash Flow Entries
// ======================
const getEntries = async (
  limit = 100,
  offset = 0
): Promise<IApiResponse<ApiGetEntriesData>> => {
  return apiRequest<ApiGetEntriesData>(
    `cashflow/entries/paginated?limit=${limit}&offset=${offset}`
  );
};

async function getFilteredEntries(
  limit = 100,
  offset = 0,
  filters?: CashFlowFilters,
  url: string = 'entries'
): Promise<IApiResponse<ApiGetEntriesData>> {
  const endpoint = buildQueryParams(url, limit, offset, filters);
  return apiRequest<ApiGetEntriesData>(endpoint);
}

const getEntry = async (
  ids: number[]
): Promise<IApiResponse<ApiGetEntryData>> => {
  return apiRequest<ApiGetEntryData>(`cashflow/entries/${buildIdsParam(ids)}`);
};

const addEntry = async (
  payload: AddEntryPayload
): Promise<IApiResponse<ApiGetEntryData>> => {
  return apiRequest<ApiGetEntryData>('cashflow/entries', 'POST', payload);
};

const editEntry = async (
  ids: number[],
  payload: EditEntryPayload
): Promise<IApiResponse<ApiGetEntryData>> => {
  return apiRequest<ApiGetEntryData>(
    `cashflow/entries/${buildIdsParam(ids)}`,
    'PUT',
    payload
  );
};

const deleteEntries = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('cashflow/entries', 'DELETE');
};

const deleteEntry = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(`cashflow/entries/${buildIdsParam(ids)}`, 'DELETE');
};

// ======================
// Settled Cash Flow Entries
// ======================
const getSettledEntries = async (): Promise<
  IApiResponse<ApiGetSettledEntriesData>
> => {
  return apiRequest<ApiGetSettledEntriesData>('cashflow/settled-entries');
};

async function getFilteredSettledEntries(
  limit = 100,
  offset = 0,
  filters?: CashFlowFilters,
  url: string = 'settled-entries'
): Promise<IApiResponse<ApiGetSettledEntriesData>> {
  const endpoint = buildQueryParams(url, limit, offset, filters);
  return apiRequest<ApiGetSettledEntriesData>(endpoint);
}

const getSettledEntry = async (
  ids: number[]
): Promise<IApiResponse<ApiGetSettledEntryData>> => {
  const url = `cashflow/settled-entries/${buildIdsParam(ids)}`;
  return apiRequest<ApiGetSettledEntryData>(url);
};

const editSettledEntry = async (
  ids: number[],
  payload: EditSettledEntryPayload
): Promise<IApiResponse<ApiGetSettledEntryData>> => {
  const url = `cashflow/settled-entries/${buildIdsParam(ids)}`;
  return apiRequest<ApiGetSettledEntryData>(url, 'PATCH', payload);
};

const deleteSettledEntries = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('cashflow/settled-entries', 'DELETE');
};

const deleteSettledEntry = async (
  ids: number[]
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `cashflow/settled-entries/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//    Transferences
// ======================
const addTransference = async (params: {
  due_date: string;
  amount: string;
  bank_out_id: number;
  bank_in_id: number;
  observation?: string;
}): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('cashflow/transferences', 'POST', params);
};

// ======================
//    Banks
// ======================
const getBanks = async (): Promise<IApiResponse<ApiGetBanks>> => {
  return apiRequest<ApiGetBanks>('financeconfig/banks');
};

const getBank = async (
  ids: number[]
): Promise<IApiResponse<ApiGetBank>> => {
  return apiRequest<ApiGetBank>(`financeconfig/banks/${buildIdsParam(ids)}`);
};

const addBank = async (params: {
  bank_institution: string;
  bank_account_type: string;
  bank_branch: string;
  bank_account: string;
  initial_balance: string;
  bank_status: boolean;
}): Promise<IApiResponse<ApiGetBank>> => {
  return apiRequest<ApiGetBank>('financeconfig/banks', 'POST', params);
};

const editBank = async (
  ids: number[],
  data: {
    bank_institution?: string;
    bank_account_type?: string;
    bank_branch?: string;
    bank_account?: string;
    initial_balance?: string;
    bank_status?: boolean;
  }
): Promise<IApiResponse<ApiGetBank>> => {
  return apiRequest<ApiGetBank>(
    `financeconfig/banks/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteBanks = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('financeconfig/banks', 'DELETE');
};

const deleteBank = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `financeconfig/banks/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//  General Ledger Accounts
// ======================
const getGeneralLedgerAccounts = async (): Promise<
  IApiResponse<ApiGetGeneralLedgerAccounts>
> => {
  return apiRequest<ApiGetGeneralLedgerAccounts>(
    'financeconfig/general-ledger-accounts'
  );
};

const getGeneralLedgerAccount = async (
  ids: number[]
): Promise<IApiResponse<ApiGetGeneralLedgerAccount>> => {
  return apiRequest<ApiGetGeneralLedgerAccount>(
    `financeconfig/general-ledger-accounts/${buildIdsParam(ids)}`
  );
};

const addGeneralLedgerAccount = async (params: {
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
}): Promise<IApiResponse<ApiGetGeneralLedgerAccount>> => {
  return apiRequest<ApiGetGeneralLedgerAccount>(
    'financeconfig/general-ledger-accounts',
    'POST',
    params
  );
};

const editGeneralLedgerAccount = async (
  ids: number[],
  data: {
    general_ledger_account: string;
    group: string;
    subgroup: string;
    transaction_type: string;
  }
): Promise<IApiResponse<ApiGetGeneralLedgerAccount>> => {
  return apiRequest<ApiGetGeneralLedgerAccount>(
    `financeconfig/general-ledger-accounts/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteGeneralLedgerAccounts = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('financeconfig/general-ledger-accounts', 'DELETE');
};

const deleteGeneralLedgerAccount = async (
  ids: number[]
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `financeconfig/general-ledger-accounts/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//     Document Type
// ======================
const getDocumentTypes = async (): Promise<IApiResponse<ApiGetDocumentTypes>> => {
  return apiRequest<ApiGetDocumentTypes>('financeconfig/document-types');
};

const getDocumentType = async (
  ids: number[]
): Promise<IApiResponse<ApiGetDocumentType>> => {
  return apiRequest<ApiGetDocumentType>(
    `financeconfig/document-types/${buildIdsParam(ids)}`
  );
};

// ======================
//     Departments
// ======================
const getDepartments = async (): Promise<IApiResponse<ApiGetDepartments>> => {
  return apiRequest<ApiGetDepartments>('financeconfig/departments');
};

const getDepartment = async (
  ids: number[]
): Promise<IApiResponse<ApiGetDepartment>> => {
  return apiRequest<ApiGetDepartment>(
    `financeconfig/departments/${buildIdsParam(ids)}`
  );
};

const addDepartment = async (data: { department: string }): Promise<IApiResponse<ApiGetDepartment>> => {
  return apiRequest<ApiGetDepartment>('financeconfig/departments', 'POST', data);
};

const editDepartment = async (
  ids: number[],
  data: { department?: string }
): Promise<IApiResponse<ApiGetDepartment>> => {
  return apiRequest<ApiGetDepartment>(
    `financeconfig/departments/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteDepartments = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('financeconfig/departments', 'DELETE');
};

const deleteDepartment = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `financeconfig/departments/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Projects
// ======================
const getProjects = async (): Promise<IApiResponse<ApiGetProjects>> => {
  return apiRequest<ApiGetProjects>('financeconfig/projects');
};

const getProject = async (
  ids: number[]
): Promise<IApiResponse<ApiGetProject>> => {
  return apiRequest<ApiGetProject>(
    `financeconfig/projects/${buildIdsParam(ids)}`
  );
};

const addProject = async (data: {
  project: string;
  project_code: string;
  project_type: string;
  project_description: string;
}): Promise<IApiResponse<ApiGetProject>> => {
  return apiRequest<ApiGetProject>('financeconfig/projects', 'POST', data);
};

const editProject = async (
  ids: number[],
  data: {
    project?: string;
    project_code?: string;
    project_type?: string;
    project_description?: string;
  }
): Promise<IApiResponse<ApiGetProject>> => {
  return apiRequest<ApiGetProject>(
    `financeconfig/projects/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteProjects = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('financeconfig/projects', 'DELETE');
};

const deleteProject = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `financeconfig/projects/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Inventory
// ======================
const getInventoryItems = async (): Promise<IApiResponse<ApiGetInventoryItems>> => {
  return apiRequest<ApiGetInventoryItems>('financeconfig/inventory-items');
};

const getInventoryItem = async (
  ids: number[]
): Promise<IApiResponse<ApiGetInventoryItem>> => {
  return apiRequest<ApiGetInventoryItem>(
    `financeconfig/inventory-items/${buildIdsParam(ids)}`
  );
};

const addInventoryItem = async (data: {
  inventory_item_code: string;
  inventory_item: string;
  inventory_item_quantity: number;
}): Promise<IApiResponse<ApiGetInventoryItem>> => {
  return apiRequest<ApiGetInventoryItem>('financeconfig/inventory-items', 'POST', data);
};

const editInventoryItem = async (
  ids: number[],
  data: {
    inventory_item_code?: string;
    inventory_item?: string;
    inventory_item_quantity?: number;
  }
): Promise<IApiResponse<ApiGetInventoryItem>> => {
  return apiRequest<ApiGetInventoryItem>(
    `financeconfig/inventory-items/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteInventoryItems = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('financeconfig/inventory-items', 'DELETE');
};

const deleteInventoryItem = async (
  ids: number[]
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `financeconfig/inventory-items/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Entities
// ======================
const getEntities = async (): Promise<IApiResponse<ApiGetEntities>> => {
  return apiRequest<ApiGetEntities>('financeconfig/entities');
};

const getEntity = async (
  ids: number[]
): Promise<IApiResponse<ApiGetEntity>> => {
  return apiRequest<ApiGetEntity>(
    `financeconfig/entities/${buildIdsParam(ids)}`
  );
};

const addEntity = async (data: {
  full_name?: string;
  ssn_tax_id?: string;
  ein_tax_id?: string;
  alias_name?: string;
  area_code?: string;
  phone_number?: string;
  street?: string;
  street_number?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  email?: string;
  bank_name?: string;
  bank_branch?: string;
  checking_account?: string;
  account_holder_tax_id?: string;
  account_holder_name?: string;
  entity_type?: string;
}): Promise<IApiResponse<ApiGetEntity>> => {
  return apiRequest<ApiGetEntity>('financeconfig/entities', 'POST', data);
};

const editEntity = async (
  ids: number[],
  data: {
    full_name?: string;
    ssn_tax_id?: string;
    ein_tax_id?: string;
    alias_name?: string;
    area_code?: string;
    phone_number?: string;
    street?: string;
    street_number?: string;
    state?: string;
    city?: string;
    postal_code?: string;
    email?: string;
    bank_name?: string;
    bank_branch?: string;
    checking_account?: string;
    account_holder_tax_id?: string;
    account_holder_name?: string;
    entity_type?: string;
  }
): Promise<IApiResponse<ApiGetEntity>> => {
  return apiRequest<ApiGetEntity>(
    `financeconfig/entities/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteEntities = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('financeconfig/entities', 'DELETE');
};

const deleteEntity = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `financeconfig/entities/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Export
// ======================
export const useRequests = () => ({
  // Auth
  signUp,
  signIn,
  verifyEmail,
  verifyNewEmail,
  getUser,
  getEnterprise,
  editEnterprise,

  // Subscriptions
  createCheckoutSession,
  getSubscriptionStatus,
  createCustomerPortalSession,

  // Groups/ Permissions
  getPermissions,
  getGroups,
  getAnGroup,
  addGroup,
  editGroup,
  deleteGroup,

  // Counter
  getCounter,
  incrementCounter,

  // Employees
  getEmployees,
  getAnEmployee,
  addEmployee,
  editEmployee,
  deleteEmployee,

  // Tasks
  getTasks,
  getAnTask,
  addTask,
  editTask,
  deleteTask,

  // Cash Flow Entries
  getEntries,
  getFilteredEntries,
  getEntry,
  addEntry,
  editEntry,
  deleteEntries,
  deleteEntry,

  // Settled Entries
  getSettledEntries,
  getFilteredSettledEntries,
  getSettledEntry,
  editSettledEntry,
  deleteSettledEntries,
  deleteSettledEntry,

  // Transferences
  addTransference,

  //Banks
  getBanks,
  getBank,
  addBank,
  editBank,
  deleteBanks,
  deleteBank,

  // General Ledger Accounts
  getGeneralLedgerAccounts,
  getGeneralLedgerAccount,
  addGeneralLedgerAccount,
  editGeneralLedgerAccount,
  deleteGeneralLedgerAccounts,
  deleteGeneralLedgerAccount,

  // Document Types
  getDocumentTypes,
  getDocumentType,

  // Departments
  getDepartments,
  getDepartment,
  addDepartment,
  editDepartment,
  deleteDepartments,
  deleteDepartment,

  //Projects
  getProjects,
  getProject,
  addProject,
  editProject,
  deleteProjects,
  deleteProject,

  // Inventory
  getInventoryItems,
  getInventoryItem,
  addInventoryItem,
  editInventoryItem,
  deleteInventoryItems,
  deleteInventoryItem,

  // Entities
  getEntities,
  getEntity,
  addEntity,
  editEntity,
  deleteEntities,
  deleteEntity
});
