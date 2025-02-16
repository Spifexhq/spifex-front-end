import { Bank } from './Bank';
import { Permission } from './Permission';

export type Group = {
  id: number;
  name: string;
};

export type GroupDetail = Group & {
  banks: Bank[];
  permissions: Permission[];
};

export type ApiGetGroups = {
  groups: GroupDetail[];
};

export type ApiGetGroup = {
  group: GroupDetail;
};
