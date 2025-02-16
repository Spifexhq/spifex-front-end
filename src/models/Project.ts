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
