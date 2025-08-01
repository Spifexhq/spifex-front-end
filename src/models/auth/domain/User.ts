import { Permission } from "./Permission";

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  jobTitle: string;
  department: string;
  userTimezone: string;
  isOwner: boolean;
  isSuperuser: boolean;
  stripeCustomerId: string | null;
  isSubscribed: boolean;
  isActive: boolean;
  isStaff: boolean;
  isEmailVerified: boolean;
  dateJoined: string;          // ISO-8601
  lastPasswordChange: string | null; // ISO-8601
}

export interface UserEnterpriseDetail {
  isOwner: boolean;
  permissions: Permission[];
}
