export interface Permission {
  id: number;
  label: string;
  codeName: string;
  permissionType: string;
  usageLimit: Record<string, number | null>;
}
