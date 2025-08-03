export interface Permission {
  id: number;
  label: string;
  code_name: string;
  permission_type: string;
  usage_limit: Record<string, number | null>;
}
