import { Permission } from "./Permission";

export interface CounterUsage {
  id: number;
  user_id: number;
  permission: Permission;
  counter: number;
  checkpoint_usage: string;
};

export interface IncrementCounterUsage {
  counter_usage: CounterUsage;
  message: string;
}
