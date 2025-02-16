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
