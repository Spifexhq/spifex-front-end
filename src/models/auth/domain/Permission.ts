export interface Permission {
  id: number;
  name: string;
  code_name: string;
  permission_type: string;
  usage_limit: Record<string, number | null>;
}
