import { apiRequest } from '@/api';
import { ApiSignUp, ApiGetUser, ApiSignIn, Subscription } from '@/models/Auth';
import { ApiGetPermissions } from '@/models/Permission';
import { CounterUsage ,ApiGetCounterUsage, ApiIncrementCounterUsage } from '@/models/Counter';
import { ApiGetGroup, ApiGetGroups } from '@/models/Group';
import { ApiGetEmployee, ApiGetEmployees } from '@/models/Employee';
import { ApiGetTask, ApiGetTasks } from '@/models/Task';
import { ApiGetEntries, ApiGetEntry } from '@/models/Entry';
import { ApiGetSettledEntries, ApiGetSettledEntry } from '@/models/SettledEntry';
import { ApiGetBank, ApiGetBanks } from '@/models/Bank';
import { ApiGetGeneralLedgerAccount, ApiGetGeneralLedgerAccounts } from '@/models/GeneralLedgerAccount';
import { ApiGetDocumentTypes } from '@/models/DocumentType';
import { ApiGetDepartment, ApiGetDepartments } from '@/models/Department';
import { ApiGetProject, ApiGetProjects } from '@/models/Project';
import { ApiGetInventoryItem, ApiGetInventoryItems } from '@/models/Inventory';
import { ApiGetEntities, ApiGetEntity } from '@/models/Entity';
import { ApiGetEnterprise, Owner } from '@/models/Enterprise';

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
const getEntries = async () => {
  const response = await apiRequest<ApiGetEntries>('cashflow/entries');
  return response;
};

const getEntry = async (ids: number[]) => {
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetEntry>(`cashflow/entries/${idsParam}`);
  return response;
};

const addEntry = async ({
  due_date,
  description,
  observation,
  amount,
  current_installment,
  total_installments,
  tags,
  transaction_type,
  notes,
  periods,
  weekend_action,
  general_ledger_account_id,
  document_type_id,
  project_id,
  entity_id,
  inventory_item_id,
  inventory_item_quantity,
  department_id,
  department_percentage
}: {
  due_date: string;
  description?: string;
  observation?: string;
  amount: string;
  current_installment: number;
  total_installments: number;
  tags?: string;
  transaction_type?: string;
  notes?: string;
  periods?: string;
  weekend_action?: string;
  general_ledger_account_id?: string;
  document_type_id?: string;
  project_id?: string;
  entity_id?: string;
  inventory_item_id?: string;
  inventory_item_quantity?: number;
  department_id?: string;
  department_percentage?: string;
}) => {
  const response = await apiRequest<ApiGetEntry>('cashflow/entries', 'POST', {
    due_date,
    description,
    observation,
    amount,
    current_installment,
    total_installments,
    tags,
    transaction_type,
    notes,
    periods,
    weekend_action,
    general_ledger_account_id,
    document_type_id,
    project_id,
    entity_id,
    inventory_item_id,
    inventory_item_quantity,
    department_id,
    department_percentage
  });
  return response;
};

const editEntry = async (
  ids: number[],
  {
    due_date,
    description,
    observation,
    amount,
    current_installment,
    total_installments,
    tags,
    transaction_type,
    notes,
    periods,
    weekend_action,
    general_ledger_account_id,
    document_type_id,
    project_id,
    entity_id,
    inventory_item_id,
    inventory_item_quantity,
    department_id,
    department_percentage
  }: {
    due_date?: string;
    description?: string;
    observation?: string;
    amount?: string;
    current_installment?: number;
    total_installments?: number;
    tags?: string;
    transaction_type?: string;
    notes?: string;
    periods?: string;
    weekend_action?: string;
    general_ledger_account_id?: string;
    document_type_id?: string;
    project_id?: string;
    entity_id?: string;
    inventory_item_id?: string;
    inventory_item_quantity?: number;
    department_id?: string;
    department_percentage?: string;
  }
) => {
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetEntry>(
    `cashflow/entries/${idsParam}`,
    'PUT',
    {
      due_date,
      description,
      observation,
      amount,
      current_installment,
      total_installments,
      tags,
      transaction_type,
      notes,
      periods,
      weekend_action,
      general_ledger_account_id,
      document_type_id,
      project_id,
      entity_id,
      inventory_item_id,
      inventory_item_quantity,
      department_id,
      department_percentage
    }
  );
  return response;
};

const deleteEntries = async () => {
  const response = await apiRequest('cashflow/entries', 'DELETE');
  return response;
};

const deleteEntry = async (ids: number[]) => {
  const idsParam = ids.join(',');
  const response = await apiRequest(`cashflow/entries/${idsParam}`, 'DELETE');
  return response;
};

// Settled Cash Flow Entries
const getSettledEntries = async () => {
  const response = await apiRequest<ApiGetSettledEntries>(
    'cashflow/settled-entries'
  );
  return response;
};

const getSettledEntry = async (ids: number[]) => {
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetSettledEntry>(
    `cashflow/settled-entries/${idsParam}`
  );
  return response;
};

const editSettledEntry = async (
  ids: number[],
  {
    settlement_due_date,
    bank_id,
    is_partial,
    partial_amount
  }: {
    settlement_due_date: string;
    bank_id: number;
    is_partial: boolean;
    partial_amount?: string;
  }
) => {
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetSettledEntry>(
    `cashflow/settled-entries/${idsParam}`,
    'PATCH',
    { settlement_due_date, bank_id, is_partial, partial_amount }
  );
  return response;
};

const deleteSettledEntries = async () => {
  const response = await apiRequest('cashflow/settled-entries', 'DELETE');
  return response;
};

const deleteSettledEntry = async (ids: number[]) => {
  const idsParam = ids.join(',');
  const response = await apiRequest(
    `cashflow/settled-entries/${idsParam}`,
    'DELETE'
  );
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetBank>(`financeconfig/banks/${idsParam}`);
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetBank>(
    `financeconfig/banks/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest(`financeconfig/banks/${idsParam}`, 'DELETE');
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetGeneralLedgerAccount>(
    `financeconfig/general-ledger-accounts/${idsParam}`
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetGeneralLedgerAccount>(
    `financeconfig/general-ledger-accounts/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest(
    `financeconfig/general-ledger-accounts/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetDepartment>(
    `financeconfig/departments/${idsParam}`
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetDepartment>(
    `financeconfig/departments/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest(
    `financeconfig/departments/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetProject>(
    `financeconfig/projects/${idsParam}`
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetProject>(
    `financeconfig/projects/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest(`financeconfig/projects/${idsParam}`, 'DELETE');
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetInventoryItem>(
    `financeconfig/inventory-items/${idsParam}`
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetInventoryItem>(
    `financeconfig/inventory-items/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest(
    `financeconfig/inventory-items/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetEntity>(
    `financeconfig/entities/${idsParam}`
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
  const idsParam = ids.join(',');
  const response = await apiRequest<ApiGetEntity>(
    `financeconfig/entities/${idsParam}`,
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
  const idsParam = ids.join(',');
  const response = await apiRequest(`financeconfig/entities/${idsParam}`, 'DELETE');
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
