export interface Employee {
  id: number;
  name: string;
  email: string;
}

export interface EmployeeDetail extends Employee {
  groups: number[];
}

export interface GetEmployeesResponse {
  employees: Employee[];
}

export interface GetEmployeeResponse {
  employee: EmployeeDetail;
}
