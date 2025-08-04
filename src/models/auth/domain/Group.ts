import { Bank } from "src/models/enterprise_structure";
import { Permission } from "./Permission";

export interface Group {
  id: number;
  name: string;
}

export type GroupDetail = Group & {
  banks: Bank[];
  permissions: Permission[];
};
