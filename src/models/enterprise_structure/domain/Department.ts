// models/enterprise_structure/domain/Department.ts
export interface Department {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
}

export interface DepartmentAllocation {
  department_id: string | null;
  code: string;
  name: string;
  percent: string;
}
