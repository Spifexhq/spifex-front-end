// models/enterprise_structure/domain/Project.ts
export type Project = {
  id: string;        // external_id from the API
  name: string;
  code: string;
  type: string;
  description: string;
  is_active: boolean;
};
