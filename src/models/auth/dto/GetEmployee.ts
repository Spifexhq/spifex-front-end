import { Employee, Role } from "../domain";

export interface GetEmployeesResponse {
  employees: Employee[];
}

export interface GetEmployeeResponse {
  employee: Employee;
}

export type AddEmployeeRequest = {
  name?: string;
  email: string;
  password?: string;
  role?: Exclude<Role, "owner">;
  group_ids?: number[];
  group_slugs?: string[];
};

export type EditEmployeeRequest = Partial<Omit<AddEmployeeRequest, "password">>;
