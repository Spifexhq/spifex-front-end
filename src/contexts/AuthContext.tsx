// contexts/AuthContext.tsx
import { createContext } from "react";
import { ApiSuccess } from "src/models";
import { User, Subscription, UserOrganizationDetail, SignInResponse } from "src/models/auth";

export interface AuthContextType {
  user: User | null;
  organization: UserOrganizationDetail | null;
  subscription: Subscription | null;
  isLogged: boolean;
  isOwner: boolean;
  isSuperUser: boolean;
  isStaff: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  permissions: string[];

  isSubscribed: boolean;
  activePlanId: string | null;
  activePlanCode: string | null;
  activePlanName: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  cancelAtPeriodEnd: boolean;

  handleInitUser: () => Promise<void>;
  handlePermissionExists: (permissionCodename: string) => boolean;
  handleSignIn: (email: string, password: string) => Promise<ApiSuccess<SignInResponse>>;
  handleSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
