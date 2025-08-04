import { Employee, EmployeeDetail, Group } from "../domain";

export interface GetEmployeesResponse {
  employees: Employee[];
}

export interface GetEmployeeResponse {
  employee: EmployeeDetail;
}

export interface EmployeePayloadBase {
  name: string;
  email: string;
  groups: Group[];
}

export type AddEmployeeRequest = EmployeePayloadBase & {
  password?: string;
}
export type EditEmployeeRequest = EmployeePayloadBase;
