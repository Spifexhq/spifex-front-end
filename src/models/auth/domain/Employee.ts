import { Group } from "./Group";

export interface Employee {
  id: number;
  name: string;
  email: string;
}

export interface EmployeeDetail extends Employee {
  groups: Group[];
}
