export interface Department {
  id: number;
  department: string | null;
  uuid_department: string | null;
};

export interface DepartmentAllocation {
  department: Department;
  percentage: string;
};

