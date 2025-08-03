// import {
//   SignUpRequest,
//   SignUpResponse,
//   SignInRequest,
//   SignInResponse,
//   GetUserResponse,
//   GetEnterpriseResponse,
//   GetEmployeesResponse,
//   GetEmployeeResponse,
//   GetGroupsResponse,
//   GetGroupResponse,
//   SubscriptionStatusResponse,
// } from "@/models/auth";

import { apiRequest } from '@/api';

import { ApiGetPermissions,
  ApiGetGroup, ApiGetGroups,
  ApiGetEmployee, ApiGetEmployees
 } from 'src/models/auth';
 
import {
  CounterUsage,
  ApiGetCounterUsage,
} from '@/models/Counter';
import { ApiGetTask, ApiGetTasks } from '@/models/Task';

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
//  General Ledger Accounts
// ======================
const getGeneralLedgerAccounts = async (): Promise<
  IApiResponse<ApiGetGeneralLedgerAccounts>
> => {
  return apiRequest<ApiGetGeneralLedgerAccounts>(
    'enterprise_structure/general-ledger-accounts'
  );
};

const getGeneralLedgerAccount = async (
  ids: number[]
): Promise<IApiResponse<ApiGetGeneralLedgerAccount>> => {
  return apiRequest<ApiGetGeneralLedgerAccount>(
    `enterprise_structure/general-ledger-accounts/${buildIdsParam(ids)}`
  );
};

const addGeneralLedgerAccount = async (params: {
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
}): Promise<IApiResponse<ApiGetGeneralLedgerAccount>> => {
  return apiRequest<ApiGetGeneralLedgerAccount>(
    'enterprise_structure/general-ledger-accounts',
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
    `enterprise_structure/general-ledger-accounts/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteGeneralLedgerAccounts = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('enterprise_structure/general-ledger-accounts', 'DELETE');
};

const deleteGeneralLedgerAccount = async (
  ids: number[]
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `enterprise_structure/general-ledger-accounts/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//     Document Type
// ======================
const getDocumentTypes = async (): Promise<IApiResponse<ApiGetDocumentTypes>> => {
  return apiRequest<ApiGetDocumentTypes>('enterprise_structure/document-types');
};

const getDocumentType = async (
  ids: number[]
): Promise<IApiResponse<ApiGetDocumentType>> => {
  return apiRequest<ApiGetDocumentType>(
    `enterprise_structure/document-types/${buildIdsParam(ids)}`
  );
};

// ======================
//     Departments
// ======================
const getDepartments = async (): Promise<IApiResponse<ApiGetDepartments>> => {
  return apiRequest<ApiGetDepartments>('enterprise_structure/departments');
};

const getDepartment = async (
  ids: number[]
): Promise<IApiResponse<ApiGetDepartment>> => {
  return apiRequest<ApiGetDepartment>(
    `enterprise_structure/departments/${buildIdsParam(ids)}`
  );
};

const addDepartment = async (data: { department: string }): Promise<IApiResponse<ApiGetDepartment>> => {
  return apiRequest<ApiGetDepartment>('enterprise_structure/departments', 'POST', data);
};

const editDepartment = async (
  ids: number[],
  data: { department?: string }
): Promise<IApiResponse<ApiGetDepartment>> => {
  return apiRequest<ApiGetDepartment>(
    `enterprise_structure/departments/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteDepartments = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('enterprise_structure/departments', 'DELETE');
};

const deleteDepartment = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `enterprise_structure/departments/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Projects
// ======================
const getProjects = async (): Promise<IApiResponse<ApiGetProjects>> => {
  return apiRequest<ApiGetProjects>('enterprise_structure/projects');
};

const getProject = async (
  ids: number[]
): Promise<IApiResponse<ApiGetProject>> => {
  return apiRequest<ApiGetProject>(
    `enterprise_structure/projects/${buildIdsParam(ids)}`
  );
};

const addProject = async (data: {
  project: string;
  project_code: string;
  project_type: string;
  project_description: string;
}): Promise<IApiResponse<ApiGetProject>> => {
  return apiRequest<ApiGetProject>('enterprise_structure/projects', 'POST', data);
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
    `enterprise_structure/projects/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteProjects = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('enterprise_structure/projects', 'DELETE');
};

const deleteProject = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `enterprise_structure/projects/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Inventory
// ======================
const getInventoryItems = async (): Promise<IApiResponse<ApiGetInventoryItems>> => {
  return apiRequest<ApiGetInventoryItems>('enterprise_structure/inventory-items');
};

const getInventoryItem = async (
  ids: number[]
): Promise<IApiResponse<ApiGetInventoryItem>> => {
  return apiRequest<ApiGetInventoryItem>(
    `enterprise_structure/inventory-items/${buildIdsParam(ids)}`
  );
};

const addInventoryItem = async (data: {
  inventory_item_code: string;
  inventory_item: string;
  inventory_item_quantity: number;
}): Promise<IApiResponse<ApiGetInventoryItem>> => {
  return apiRequest<ApiGetInventoryItem>('enterprise_structure/inventory-items', 'POST', data);
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
    `enterprise_structure/inventory-items/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteInventoryItems = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('enterprise_structure/inventory-items', 'DELETE');
};

const deleteInventoryItem = async (
  ids: number[]
): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `enterprise_structure/inventory-items/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Entities
// ======================
const getEntities = async (): Promise<IApiResponse<ApiGetEntities>> => {
  return apiRequest<ApiGetEntities>('enterprise_structure/entities');
};

const getEntity = async (
  ids: number[]
): Promise<IApiResponse<ApiGetEntity>> => {
  return apiRequest<ApiGetEntity>(
    `enterprise_structure/entities/${buildIdsParam(ids)}`
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
  return apiRequest<ApiGetEntity>('enterprise_structure/entities', 'POST', data);
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
    `enterprise_structure/entities/${buildIdsParam(ids)}`,
    'PUT',
    data
  );
};

const deleteEntities = async (): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>('enterprise_structure/entities', 'DELETE');
};

const deleteEntity = async (ids: number[]): Promise<IApiResponse<unknown>> => {
  return apiRequest<unknown>(
    `enterprise_structure/entities/${buildIdsParam(ids)}`,
    'DELETE'
  );
};

// ======================
//       Export
// ======================
export const useRequests = () => ({
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
