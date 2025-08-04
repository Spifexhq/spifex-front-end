import { Bank } from "src/models/enterprise_structure";
import { GroupDetail, Permission } from "../domain";

export interface GetGroups {
  groups: GroupDetail[];
}

export interface GetGroup {
  group: GroupDetail;
}

export interface GroupPayloadBase {
  name: string;
  banks: Bank[];
  permissions: Permission[];
}

export type AddGroupRequest = GroupPayloadBase;
export type EditGroupRequest = GroupPayloadBase;
