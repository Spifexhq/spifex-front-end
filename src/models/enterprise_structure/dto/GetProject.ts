// models/enterprise_structure/dto/GetProject.ts
import { Project } from "../domain/Project";

export interface GetProjectsResponse {
  results: Project[];
  next?: string | null;
  previous?: string | null;
  count?: number;
}

export type GetProjectResponse = Project;

export type AddProjectRequest = {
  name: string;
  code?: string;
  type: string;
  description?: string;
  is_active?: boolean;
};

export type EditProjectRequest = Partial<AddProjectRequest>;
