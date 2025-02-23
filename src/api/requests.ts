import { apiRequest } from '@/api';

import { ApiGetEntriesResponse, ApiGetEntryResponse } from '@/models/Entries/Entry';
import { AddEntryPayload, EditEntryPayload } from '@/models/Entries/EntryPayload';
import { ApiGetSettledEntriesResponse, ApiGetSettledEntryResponse } from '@/models/Entries/SettledEntry';
import { EditSettledEntryPayload } from '@/models/Entries/SettledEntryPayload';

import { ApiSignUp, ApiGetUser, ApiSignIn, Subscription } from '@/models/Auth';
import { ApiGetEnterprise, Owner } from '@/models/Enterprise';
import { ApiGetPermissions } from '@/models/Permission';
import { ApiGetGroup, ApiGetGroups } from '@/models/Group';
import { ApiGetEmployee, ApiGetEmployees } from '@/models/Employee';
import { CounterUsage ,ApiGetCounterUsage, ApiIncrementCounterUsage } from '@/models/Counter';
import { ApiGetTask, ApiGetTasks } from '@/models/Task';

import { ApiGetBank, ApiGetBanks } from '@/models/Bank';
import { ApiGetGeneralLedgerAccount, ApiGetGeneralLedgerAccounts } from '@/models/GeneralLedgerAccount';
import { ApiGetDocumentTypes } from '@/models/DocumentType';
import { ApiGetDepartment, ApiGetDepartments } from '@/models/Department';
import { ApiGetProject, ApiGetProjects } from '@/models/Project';
import { ApiGetInventoryItem, ApiGetInventoryItems } from '@/models/Inventory';
import { ApiGetEntities, ApiGetEntity } from '@/models/Entity';

const buildIdsParam = (ids: number[]): string => ids.join(',');

// Authentication
const signUp = async ({
  name,
  email,
  password }: {
    name: string;
    email: string;
    password: string;
  }) => {
    const response = await apiRequest<ApiSignUp>( 'auth/signup', 'POST', {
      name,
      email,
      password
    },
      false
    );
    return response;
  }

const signIn = async ({
  email,
  password
}: {
  email: string;
  password: string;
}) => {
  const response = await apiRequest<ApiSignIn>( 'auth/signin', 'POST', {
    email,
    password
  },
    false
  );
  return response;
};

const verifyEmail = async (uidb64: string, token: string) => {
  const response = await apiRequest(
      `auth/verify-email/${uidb64}/${token}/`,
      'GET',
      undefined,
      false
  );
  return response;
};

const getUser = async () => {
  const response = await apiRequest<ApiGetUser>('auth/user');
  return response;
};

const getEnterprise = async () => {
  const response = await apiRequest<ApiGetEnterprise>('companies/enterprise');
  return response;
};

export const editEnterprise = async (data: { name: string; owner: Owner }) => {
  const response = await apiRequest<ApiGetEnterprise>('companies/enterprise', 'PUT', data);
  return response;
};

// Subscriptions
export const createCheckoutSession = async (price_id: string) => {
  const response = await apiRequest<{ url?: string; message?: string }>(
    'payments/create-checkout-session/',
    'POST',
    { price_id },
    true
  );
  return response;
};

export const getSubscriptionStatus = async () => {
  const response = await apiRequest<Subscription>(
    'payments/get-subscription-status/',
    'GET',
    undefined,
    true
  );
  return response;
};

export const createCustomerPortalSession = async () => {
  const response = await apiRequest<{ url?: string }>(
    'payments/create-customer-portal-session/',
    'POST',
    {},
    true
  );
  return response;
};

// Groups / Permissions
const getPermissions = async () => {
  const response = await apiRequest<ApiGetPermissions>('companies/permissions');
  return response;
};

const getGroups = async () => {
  const response = await apiRequest<ApiGetGroups>('companies/groups');
  return response;
};

const getAnGroup = async (id: number) => {
  const response = await apiRequest<ApiGetGroup>(`companies/groups/${id}`);
  return response;
};

const addGroup = async ({
  name,
  permissions,
  banks
}: {
  name: string;
  permissions: string;
  banks: string;
}) => {
  const response = await apiRequest('companies/groups', 'POST', {
    name,
    permissions,
    banks
  });
  return response;
};

const editGroup = async (
  id: number,
  {
    name,
    permissions,
    banks
  }: {
    name?: string;
    permissions?: string;
    banks?: string;
  }) => {
  const response = await apiRequest(`companies/groups/${id}`, 'PUT', {
    name,
    permissions,
    banks
  });
  return response;
};

const deleteGroup = async (id: number) => {
  const response = await apiRequest(`companies/groups/${id}`, 'DELETE');
  return response;
};

// Counter
const getCounter = async (codeName: string): Promise<ApiGetCounterUsage> => {
  const response = await apiRequest<ApiGetCounterUsage>(
    `companies/counter/${codeName}/`,
    'GET',
    undefined,
    true
  );
  return response;
};

const incrementCounter = async (codeName: string): Promise<ApiIncrementCounterUsage> => {
  const response = await apiRequest<CounterUsage>(
    `companies/counter/${codeName}/`,
    'PATCH',
    {},
    true
  );
  return response;
};

// Employees
const getEmployees = async () => {
  const response = await apiRequest<ApiGetEmployees>('companies/employees');
  return response;
};

const getAnEmployee = async (id: number) => {
  const response = await apiRequest<ApiGetEmployee>(`companies/employees/${id}`);
  return response;
};

const addEmployee = async ({
  name,
  email,
  password
}: {
  name: string;
  email: string;
  password: string;
}) => {
  const response = await apiRequest('companies/employees', 'POST', {
    name,
    email,
    password
  });
  return response;
};

const editEmployee = async (
  id: number,
  {
    name,
    email,
    groups
  }: {
    name?: string;
    email?: string;
    groups: string;
  }) => {
  const response = await apiRequest(`companies/employees/${id}`, 'PUT', {
    name,
    email,
    groups
  });
  return response;
};

const deleteEmployee = async (id: number) => {
  const response = await apiRequest(`companies/employees/${id}`, 'DELETE');
  return response;
};

// Tasks
const getTasks = async () => {
  const response = await apiRequest<ApiGetTasks>('companies/tasks');
  return response;
};

const getAnTask = async (id: number) => {
  const response = await apiRequest<ApiGetTask>(`companies/tasks/${id}`);
  return response;
};

const addTask = async ({
  title,
  description,
  due_date,
  employee_id,
  status_id
}: {
  title: string;
  description?: string;
  due_date?: string;
  employee_id: number;
  status_id: number;
}) => {
  const response = await apiRequest<ApiGetTask>('companies/tasks', 'POST', {
    title,
    description,
    due_date,
    employee_id,
    status_id
  });
  return response;
};

const editTask = async (
  id: number,
  {
    title,
    description,
    due_date,
    employee_id,
    status_id
  }: {
    title?: string;
    description?: string;
    due_date?: string;
    employee_id?: number;
    status_id?: number;
  }
) => {
  const response = await apiRequest<ApiGetTask>(`companies/tasks/${id}`, 'PUT', {
    title,
    description,
    due_date,
    employee_id,
    status_id
  });
  return response;
};

const deleteTask = async (id: number) => {
  const response = await apiRequest(`companies/tasks/${id}`, 'DELETE');
  return response;
};

// Cash Flow Entries
const getEntries = async (): Promise<ApiGetEntriesResponse> => {
  const response = await apiRequest<ApiGetEntriesResponse>('cashflow/entries');
  return response;
};

const getEntry = async (ids: number[]): Promise<ApiGetEntryResponse> => {
  const response = await apiRequest<ApiGetEntryResponse>(`cashflow/entries/${buildIdsParam(ids)}`);
  return response;
};

const addEntry = async (payload: AddEntryPayload): Promise<ApiGetEntryResponse> => {
  const response = await apiRequest<ApiGetEntryResponse>('cashflow/entries', 'POST', payload);
  return response;
};

const editEntry = async (
  ids: number[],
  payload: EditEntryPayload
): Promise<ApiGetEntryResponse> => {
  const response = await apiRequest<ApiGetEntryResponse>(`cashflow/entries/${buildIdsParam(ids)}`, 'PUT', payload);
  return response;
};

const deleteEntries = async () => {
  const response = await apiRequest('cashflow/entries', 'DELETE');
  return response;
};

const deleteEntry = async (ids: number[]) => {
  const response = await apiRequest(`cashflow/entries/${buildIdsParam(ids)}`, 'DELETE');
  return response;
};

// Settled Cash Flow Entries
const getSettledEntries = async (): Promise<ApiGetSettledEntriesResponse> => {
  const response = await apiRequest<ApiGetSettledEntriesResponse>('cashflow/settled-entries');
  return response;
};

const getSettledEntry = async (ids: number[]): Promise<ApiGetSettledEntryResponse> => {
  const url = `cashflow/settled-entries/${buildIdsParam(ids)}`;
  const response = await apiRequest<ApiGetSettledEntryResponse>(url);
  return response;
};

const editSettledEntry = async (
  ids: number[],
  payload: EditSettledEntryPayload
): Promise<ApiGetSettledEntryResponse> => {
  const url = `cashflow/settled-entries/${buildIdsParam(ids)}`;
  const response = await apiRequest<ApiGetSettledEntryResponse>(url, 'PATCH', payload);
  return response;
};

const deleteSettledEntries = async () => {
  const response = await apiRequest('cashflow/settled-entries', 'DELETE');
  return response;
};

const deleteSettledEntry = async (ids: number[]) => {
  const response = await apiRequest(`cashflow/settled-entries/${buildIdsParam(ids)}`, 'DELETE');
  return response;
};

// Transferences
const addTransference = async ({
  due_date,
  amount,
  bank_out_id,
  bank_in_id,
  observation
}: {
  due_date: string;
  amount: string;
  bank_out_id: number;
  bank_in_id: number;
  observation?: string;
}) => {
  const response = await apiRequest('cashflow/transferences', 'POST', {
    due_date,
    amount,
    bank_out_id,
    bank_in_id,
    observation
  });
  return response;
};

// Banks
const getBanks = async () => {
  const response = await apiRequest<ApiGetBanks>('financeconfig/banks');
  return response;
};

const getBank = async (ids: number[]) => {
  const response = await apiRequest<ApiGetBank>(`financeconfig/banks/${buildIdsParam(ids)}`);
  return response;
};

const addBank = async ({
  bank_institution,
  bank_account_type,
  bank_branch,
  bank_account,
  initial_balance,
  bank_status
}: {
  bank_institution: string;
  bank_account_type: string;
  bank_branch: string;
  bank_account: string;
  initial_balance: string;
  bank_status: boolean;
}) => {
  const response = await apiRequest<ApiGetBank>('financeconfig/banks', 'POST', {
    bank_institution,
    bank_account_type,
    bank_branch,
    bank_account,
    initial_balance,
    bank_status
  });
  return response;
};

const editBank = async (
  ids: number[],
  {
    bank_institution,
    bank_account_type,
    bank_branch,
    bank_account,
    initial_balance,
    bank_status
  }: {
    bank_institution?: string;
    bank_account_type?: string;
    bank_branch?: string;
    bank_account?: string;
    initial_balance?: string;
    bank_status?: boolean;
  }
) => {
  const response = await apiRequest<ApiGetBank>(
    `financeconfig/banks/${buildIdsParam(ids)}`,
    'PUT',
    {
      bank_institution,
      bank_account_type,
      bank_branch,
      bank_account,
      initial_balance,
      bank_status
    }
  );
  return response;
};

const deleteBanks = async () => {
  const response = await apiRequest('financeconfig/banks', 'DELETE');
  return response;
};

const deleteBank = async (ids: number[]) => {
  const response = await apiRequest(`financeconfig/banks/${buildIdsParam(ids)}`, 'DELETE');
  return response;
};

// General Ledger Accounts
const getGeneralLedgerAccounts = async () => {
  const response = await apiRequest<ApiGetGeneralLedgerAccounts>(
    'financeconfig/general-ledger-accounts'
  );
  return response;
};

const getGeneralLedgerAccount = async (ids: number[]) => {
  const response = await apiRequest<ApiGetGeneralLedgerAccount>(
    `financeconfig/general-ledger-accounts/${buildIdsParam(ids)}`
  );
  return response;
};

const addGeneralLedgerAccount = async ({
  general_ledger_account,
  group,
  subgroup,
  transaction_type
}: {
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
}) => {
  const response = await apiRequest<ApiGetGeneralLedgerAccount>(
    'financeconfig/general-ledger-accounts',
    'POST',
    { general_ledger_account, group, subgroup, transaction_type }
  );
  return response;
};

const editGeneralLedgerAccount = async (
  ids: number[],
  {
    general_ledger_account,
    group,
    subgroup,
    transaction_type
  }: {
    general_ledger_account: string;
    group: string;
    subgroup: string;
    transaction_type: string;
  }
) => {
  const response = await apiRequest<ApiGetGeneralLedgerAccount>(
    `financeconfig/general-ledger-accounts/${buildIdsParam(ids)}`,
    'PUT',
    { general_ledger_account, group, subgroup, transaction_type }
  );
  return response;
};

const deleteGeneralLedgerAccounts = async () => {
  const response = await apiRequest(
    'financeconfig/general-ledger-accounts',
    'DELETE'
  );
  return response;
};

const deleteGeneralLedgerAccount = async (ids: number[]) => {
  const response = await apiRequest(
    `financeconfig/general-ledger-accounts/${buildIdsParam(ids)}`,
    'DELETE'
  );
  return response;
};

// Document Type
const getDocumentTypes = async () => {
  const response = await apiRequest<ApiGetDocumentTypes>(
    'financeconfig/document-types'
  );
  return response;
};

// Departments
const getDepartments = async () => {
  const response = await apiRequest<ApiGetDepartments>('financeconfig/departments');
  return response;
};

const getDepartment = async (ids: number[]) => {
  const response = await apiRequest<ApiGetDepartment>(
    `financeconfig/departments/${buildIdsParam(ids)}`
  );
  return response;
};

const addDepartment = async ({ department }: { department: string }) => {
  const response = await apiRequest<ApiGetDepartment>(
    'financeconfig/departments',
    'POST',
    { department }
  );
  return response;
};

const editDepartment = async (
  ids: number[],
  { department }: { department?: string }
) => {
  const response = await apiRequest<ApiGetDepartment>(
    `financeconfig/departments/${buildIdsParam(ids)}`,
    'PUT',
    { department }
  );
  return response;
};

const deleteDepartments = async () => {
  const response = await apiRequest('financeconfig/departments', 'DELETE');
  return response;
};

const deleteDepartment = async (ids: number[]) => {
  const response = await apiRequest(
    `financeconfig/departments/${buildIdsParam(ids)}`,
    'DELETE'
  );
  return response;
};

// Projects
const getProjects = async () => {
  const response = await apiRequest<ApiGetProjects>('financeconfig/projects');
  return response;
};

const getProject = async (ids: number[]) => {
  const response = await apiRequest<ApiGetProject>(
    `financeconfig/projects/${buildIdsParam(ids)}`
  );
  return response;
};

const addProject = async ({
  project,
  project_code,
  project_type,
  project_description
}: {
  project: string;
  project_code: string;
  project_type: string;
  project_description: string;
}) => {
  const response = await apiRequest<ApiGetProject>(
    'financeconfig/projects',
    'POST',
    { project, project_code, project_type, project_description }
  );
  return response;
};

const editProject = async (
  ids: number[],
  {
    project,
    project_code,
    project_type,
    project_description
  }: {
    project?: string;
    project_code?: string;
    project_type?: string;
    project_description?: string;
  }
) => {
  const response = await apiRequest<ApiGetProject>(
    `financeconfig/projects/${buildIdsParam(ids)}`,
    'PUT',
    { project, project_code, project_type, project_description }
  );
  return response;
};

const deleteProjects = async () => {
  const response = await apiRequest('financeconfig/projects', 'DELETE');
  return response;
};

const deleteProject = async (ids: number[]) => {
  const response = await apiRequest(`financeconfig/projects/${buildIdsParam(ids)}`, 'DELETE');
  return response;
};

// Inventory
const getInventoryItems = async () => {
  const response = await apiRequest<ApiGetInventoryItems>(
    'financeconfig/inventory-items'
  );
  return response;
};

const getInventoryItem = async (ids: number[]) => {
  const response = await apiRequest<ApiGetInventoryItem>(
    `financeconfig/inventory-items/${buildIdsParam(ids)}`
  );
  return response;
};

const addInventoryItem = async ({
  inventory_item_code,
  inventory_item,
  inventory_item_quantity
}: {
  inventory_item_code: string;
  inventory_item: string;
  inventory_item_quantity: number;
}) => {
  const response = await apiRequest<ApiGetInventoryItem>(
    'financeconfig/inventory-items',
    'POST',
    { inventory_item_code, inventory_item, inventory_item_quantity }
  );
  return response;
};

const editInventoryItem = async (
  ids: number[],
  {
    inventory_item_code,
    inventory_item,
    inventory_item_quantity
  }: {
    inventory_item_code?: string;
    inventory_item?: string;
    inventory_item_quantity?: number;
  }
) => {
  const response = await apiRequest<ApiGetInventoryItem>(
    `financeconfig/inventory-items/${buildIdsParam(ids)}`,
    'PUT',
    { inventory_item_code, inventory_item, inventory_item_quantity }
  );
  return response;
};

const deleteInventoryItems = async () => {
  const response = await apiRequest('financeconfig/inventory-items', 'DELETE');
  return response;
};

const deleteInventoryItem = async (ids: number[]) => {
  const response = await apiRequest(
    `financeconfig/inventory-items/${buildIdsParam(ids)}`,
    'DELETE'
  );
  return response;
};

// Entities
const getEntities = async () => {
  const response = await apiRequest<ApiGetEntities>('financeconfig/entities');
  return response;
};

const getEntity = async (ids: number[]) => {
  const response = await apiRequest<ApiGetEntity>(
    `financeconfig/entities/${buildIdsParam(ids)}`
  );
  return response;
};

const addEntity = async ({
  full_name,
  ssn_tax_id,
  ein_tax_id,
  alias_name,
  area_code,
  phone_number,
  street,
  street_number,
  state,
  city,
  postal_code,
  email,
  bank_name,
  bank_branch,
  checking_account,
  account_holder_tax_id,
  account_holder_name,
  entity_type
}: {
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
}) => {
  const response = await apiRequest<ApiGetEntity>(
    'financeconfig/entities',
    'POST',
    {
      full_name,
      ssn_tax_id,
      ein_tax_id,
      alias_name,
      area_code,
      phone_number,
      street,
      street_number,
      state,
      city,
      postal_code,
      email,
      bank_name,
      bank_branch,
      checking_account,
      account_holder_tax_id,
      account_holder_name,
      entity_type
    }
  );
  return response;
};

const editEntity = async (
  ids: number[],
  {
    full_name,
    ssn_tax_id,
    ein_tax_id,
    alias_name,
    area_code,
    phone_number,
    street,
    street_number,
    state,
    city,
    postal_code,
    email,
    bank_name,
    bank_branch,
    checking_account,
    account_holder_tax_id,
    account_holder_name,
    entity_type
  }: {
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
) => {
  const response = await apiRequest<ApiGetEntity>(
    `financeconfig/entities/${buildIdsParam(ids)}`,
    'PUT',
    {
      full_name,
      ssn_tax_id,
      ein_tax_id,
      alias_name,
      area_code,
      phone_number,
      street,
      street_number,
      state,
      city,
      postal_code,
      email,
      bank_name,
      bank_branch,
      checking_account,
      account_holder_tax_id,
      account_holder_name,
      entity_type
    }
  );
  return response;
};

const deleteEntities = async () => {
  const response = await apiRequest('financeconfig/entities', 'DELETE');
  return response;
};

const deleteEntity = async (ids: number[]) => {
  const response = await apiRequest(`financeconfig/entities/${buildIdsParam(ids)}`, 'DELETE');
  return response;
};

// Exporting all requests
export const useRequests = () => ({
  // Auth
  signUp,
  signIn,
  verifyEmail,
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
  getEntry,
  addEntry,
  editEntry,
  deleteEntries,
  deleteEntry,

  // Settled Entries
  getSettledEntries,
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
