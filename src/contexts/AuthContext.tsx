import { createContext } from "react";
import { User, Subscription, UserEnterpriseDetail, ApiSignIn } from "src/models/auth";

export interface AuthContextType {
  user: User | null;
  enterprise: UserEnterpriseDetail | null;
  subscription: Subscription | null;
  isLogged: boolean;
  accessToken: string;
  isOwner: boolean;
  isSuperUser: boolean;
  isStaff: boolean;
  isActive: boolean;
  isSubscribed: boolean;
  activePlanId: string | null;
  isEmailVerified: boolean;
  permissions: string[];
  handleInitUser: () => Promise<void>;
  handlePermissionExists: (permissionCodename: string) => boolean;
  handleSignIn: (email: string, password: string) => Promise<ApiSignIn>;
  handleSignOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
