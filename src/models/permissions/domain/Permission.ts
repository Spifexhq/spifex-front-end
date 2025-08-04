export interface Permission {
  id: number;
  label: string;
  code_name: string;
  permission_type: string;
  usage_limit: {
    [key: string]: number | null;
  };
};
