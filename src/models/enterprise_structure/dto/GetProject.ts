import { Project } from "../domain/Project";

export interface GetProjects {
  projects: Project[];
}

export interface GetProject {
  project: Project;
}

export interface ProjectPayloadBase {
  project: string | null;
  project_code: string;
  project_type: string;
  project_description: string;
}

export type AddProjectRequest = ProjectPayloadBase;
export type EditProjectRequest = ProjectPayloadBase;
