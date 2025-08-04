import { Department } from "../domain/Department";

export interface GetDepartments {
  departments: Department[];
}

export interface GetDepartment {
  department: Department;
}

export interface DepartmentPayloadBase {
  department: string;
}

export type AddDepartmentRequest = DepartmentPayloadBase;
export type EditDepartmentRequest = DepartmentPayloadBase;