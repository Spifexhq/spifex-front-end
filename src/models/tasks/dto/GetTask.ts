import { TaskDetail } from "../domain/Task";

export interface GetTasks {
  tasks: TaskDetail[];
}

export interface GetTask {
  task: TaskDetail;
}

export interface TaskPayloadBase {
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  status: string;
}

export type AddTaskRequest = TaskPayloadBase;
export type EditTaskRequest = TaskPayloadBase;
