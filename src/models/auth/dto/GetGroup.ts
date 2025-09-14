// models/auth/dto/GetGroup.ts
import { GroupDetail, GroupListItem } from "../domain";

export type GetGroups = GroupListItem[] | { results: GroupListItem[] };
export type GetGroup = GroupDetail;

export interface GroupPayloadBase {
  name: string;
  description?: string;
  is_system?: boolean;
  permission_codes?: string[];
}

export type AddGroupRequest = GroupPayloadBase;
export type EditGroupRequest = GroupPayloadBase;
