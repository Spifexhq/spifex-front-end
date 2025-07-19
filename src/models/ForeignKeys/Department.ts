export type Department = {
  id: number;
  department: string | null;
  uuid_department: string | null;
};

export type DepartmentAllocation = {
  department: Department;
  percentage: string;
};

export type ApiGetDepartments = {
  departments: Department[];
};

export type ApiGetDepartment = {
  department: Department;
};
