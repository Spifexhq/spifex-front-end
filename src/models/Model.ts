// Model.ts

// Api
export type ApiError = {
  detail: string;
  code?: string;
};

// Auth
export type User = {
  name: string;
  email: string;
  password: string;
  is_superuser: boolean;
};

export type UserEnterpriseDetail = {
  is_owner: boolean;
  permissions: Permission[];
};

export type ApiGetUser = {
  user: User;
  enterprise: UserEnterpriseDetail;
};

export type ApiSignIn = {
  user: User;
  enterprise: UserEnterpriseDetail;
  refresh: string;
  access: string;
};

export type ApiSignUp = {
  name: string;
  email: string;
  password: string;
}

// Enterprise
export type Owner = {
  name: string;
  email: string;
};

export type Enterprise = {
  id: number;
  name: string;
  owner: Owner;
};

export type ApiGetEnterprise = {
  enterprise: Enterprise;
};

// Employee
export type Employee = {
  id: number;
  name: string;
  email: string;
};

export type EmployeeDetail = Employee & {
  groups: Group[];
};

export type ApiGetEmployees = {
  employees: Employee[];
};

export type ApiGetEmployee = EmployeeDetail;

// Group
export type Group = {
  id: number;
  name: string;
};

export type GroupDetail = Group & {
  permissions: Permission[];
  banks: Bank[];
};

export type ApiGetGroups = {
  groups: GroupDetail[];
};

export type ApiGetGroup = {
  group: GroupDetail;
};

// Permission
export type Permission = {
  id: number;
  label: string;
  code_name: string;
  permission_type: string;
  usage_limit: {
    [key: string]: number | null;
  };
};

export type PermissionDetail = {
  id: number;
  name: string;
  code_name: string;
  permission_type: string;
  usage_limit: {
    [key: string]: number | null;
  };
};

export type ApiGetPermissions = {
  permissions: PermissionDetail[];
};

// Bank
export type Bank = {
  id: number;
  bank_institution: string;
  bank_account_type: string;
  bank_branch: string;
  bank_account: string;
  initial_balance: string;
  current_balance: string;
  consolidated_balance: number;
  bank_status: boolean;
};

export type ApiGetBanks = {
  banks: Bank[];
};

export type ApiGetBank = {
  bank: Bank;
};

// Counter
export type CounterUsage = {
  id: number;
  user_id: number;
  permission: Permission;
  counter: number;
  checkpoint_usage: string;
};

export type ApiGetCounterUsage = {
  counter_usages?: CounterUsage[];
  detail?: string; 
};

export type ApiIncrementCounterUsage = 
  | CounterUsage
  | { detail: string };

// General Ledger Account
export type GeneralLedgerAccount = {
  id: number;
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
  uuid_general_ledger_account: string;
};

export type ApiGetGeneralLedgerAccounts = {
  general_ledger_accounts: GeneralLedgerAccount[];
};

export type ApiGetGeneralLedgerAccount = {
  general_ledger_account: GeneralLedgerAccount;
};

// Document Type
export type DocumentType = {
  id: number;
  document_type: string | null;
  uuid_document_type: string | null;
};

export type ApiGetDocumentTypes = {
  document_types: DocumentType[];
};

export type ApiGetDocumentType = {
  document_type: DocumentType;
};

// Departments
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

// Project
export type Project = {
  id: number;
  project: string | null;
  project_code: string;
  project_type: string;
  project_description: string;
  uuid_project: string | null;
};

export type ApiGetProjects = {
  projects: Project[];
};

export type ApiGetProject = {
  project: Project;
};

// Inventory
export type Inventory = {
  id: number;
  inventory_item_code: string | null;
  inventory_item: string | null;
  inventory_item_quantity: number;
  uuid_inventory_item: string;
};

export type ApiGetInventoryItems = {
  inventory_items: Inventory[];
};

export type ApiGetInventoryItem = {
  inventory_item: Inventory;
};

// Entity
export type Entity = {
  id: number;
  full_name: string | null;
  ssn_tax_id: string | null;
  ein_tax_id: string | null;
  alias_name: string | null;
  area_code: string | null;
  phone_number: string | null;
  street: string | null;
  street_number: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  email: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  checking_account: string | null;
  account_holder_tax_id: string | null;
  account_holder_name: string | null;
  entity_type: string | null;
  uuid_entity: string | null;
};

export type ApiGetEntities = {
  entities: Entity[];
};

export type ApiGetEntity = {
  entity: Entity;
};

// Task
export type Task = {
  id: number;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  status: string;
};

export type TaskDetail = Task & {
  employee: Employee;
};

export type ApiGetTasks = {
  tasks: Task[];
};

export type ApiGetTask = {
  task: TaskDetail;
};
