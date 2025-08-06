import { Employee, EmployeeDetail } from "../domain";

export interface GetEmployeesResponse {
  employees: Employee[];
}

export interface GetEmployeeResponse {
  employee: EmployeeDetail;
}

export interface EmployeePayloadBase {
  name: string;
  email: string;
  groups: number[];
}

export type AddEmployeeRequest = EmployeePayloadBase & {
  password?: string;
}
export type EditEmployeeRequest = EmployeePayloadBase;
