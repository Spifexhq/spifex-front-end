// models/enterprise_structure/dto/GetDepartment.ts
import { Department } from "../domain/Department";

export interface GetDepartmentsResponse {
  results: Department[];
  next?: string | null;
  previous?: string | null;
  count?: number;
}

export interface GetDepartmentResponse {
  department: Department;
}

export interface DepartmentPayloadBase {
  name: string;
  code?: string;
  is_active?: boolean;
}

export type AddDepartmentRequest = DepartmentPayloadBase;
export type EditDepartmentRequest = DepartmentPayloadBase;