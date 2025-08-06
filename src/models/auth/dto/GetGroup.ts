import { GroupDetail } from "../domain";

export interface GetGroups {
  groups: GroupDetail[];
}

export interface GetGroup {
  group: GroupDetail;
}

export interface GroupPayloadBase {
  name: string;
  banks: string;
  permissions: string;
}

export type AddGroupRequest = GroupPayloadBase;
export type EditGroupRequest = GroupPayloadBase;
