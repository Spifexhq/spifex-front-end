// models/auth/dto/GetGroup.ts
import { GroupDetail, GroupListItem } from "../domain";

export interface GetGroupsResponse {
  results: GroupListItem[];
  next?: string | null;
  previous?: string | null;
  count?: number;
}

export type GetGroupResponse = GroupDetail;

export interface GroupPayloadBase {
  name: string;
  description?: string;
  is_system?: boolean;
  permission_codes?: string[];
}

export type AddGroupRequest = GroupPayloadBase;
export type EditGroupRequest = GroupPayloadBase;
