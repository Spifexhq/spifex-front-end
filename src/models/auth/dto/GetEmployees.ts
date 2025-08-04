import { Group } from "../domain";

export interface Employee {
  id: number;
  name: string;
  email: string;
}

export interface EmployeeDetail extends Employee {
  groups: Group[];
}

export interface GetEmployeesResponse {
  employees: Employee[];
}

export interface GetEmployeeResponse {
  employee: EmployeeDetail;
}

// import { Group } from './Group';

// export type Employee = {
//   id: number;
//   name: string;
//   email: string;
// };

// export type EmployeeDetail = Employee & {
//   groups: Group[];
// };

// export type ApiGetEmployees = {
//   employees: Employee[];
// };

// export type ApiGetEmployee = EmployeeDetail;