export type Department = {
  id: number;
  department: string | null;
  uuid_department: string | null;
};

export type ApiGetDepartments = {
  departments: Department[];
};

export type ApiGetDepartment = {
  department: Department;
};
