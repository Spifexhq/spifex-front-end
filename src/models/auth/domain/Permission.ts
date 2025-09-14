// models/auth/domain/Permission.ts
export interface Permission {
  code: string;
  name: string;
  description?: string;
  category?: string;
}
