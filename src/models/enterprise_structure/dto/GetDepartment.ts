import { Department } from "../domain/Department";

export interface GetDepartments {
  departments: Department[];
}

export interface GetDepartment {
  department: Department;
}

export interface DepartmentPayloadBase {
  name: string;
  code?: string;
  is_active?: boolean;
}

export type AddDepartmentRequest = DepartmentPayloadBase;
export type EditDepartmentRequest = DepartmentPayloadBase;