import { GroupDetail } from "../domain";

export interface GetGroupsResponse {
  groups: GroupDetail[];
}

export interface GetGroupResponse {
  group: GroupDetail;
}
