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

});
