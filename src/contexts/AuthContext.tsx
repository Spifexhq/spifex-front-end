// contexts/AuthContext.tsx
import { createContext } from "react";
import type { ApiSuccess } from "@/models";
import type { SignInResponse } from "@/models/auth/auth";
import type { User, UserOrganizationDetail } from "@/models/auth/user";

export interface AuthContextType {
  user: User | null;
  organization: UserOrganizationDetail | null;

  isLogged: boolean;
  isOwner: boolean;
  isSuperUser: boolean;
  isStaff: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  permissions: string[];
  
  isSubscribed: boolean;

  handleInitUser: () => Promise<void>;
  handlePermissionExists: (permissionCodename: string) => boolean;
  handleSignIn: (email: string, password: string) => Promise<ApiSuccess<SignInResponse>>;
  handleSignOut: () => Promise<void> | void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
