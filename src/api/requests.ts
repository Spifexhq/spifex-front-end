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

import { IApiResponse } from '@/models/Api';

// ======================
//  Groups / Permissions
// ======================
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
  getGroups,
  getAnGroup,
  addGroup,
  editGroup,
  deleteGroup,

  // Counter
  getCounter,
  incrementCounter,
  
  // Tasks
  getTasks,
  getAnTask,
  addTask,
  editTask,
  deleteTask,

});
