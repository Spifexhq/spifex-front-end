import { Permission } from './Permission';

export type CounterUsage = {
  id: number;
  user_id: number;
  permission: Permission;
  counter: number;
  checkpoint_usage: string;
};

export type ApiGetCounterUsage = {
  counter_usages?: CounterUsage[];
  detail?: string; 
};

export type ApiIncrementCounterUsage = 
  | CounterUsage
  | { detail: string };