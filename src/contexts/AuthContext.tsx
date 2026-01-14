// contexts/AuthContext.tsx
import { createContext } from "react";
import type { ApiSuccess } from "@/models";
import type { MfaRequiredPayload, SignInResponse, VerifyTwoFactorArgs } from "@/models/auth/auth";
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
  handleSignIn: (email: string, password: string) => Promise<ApiSuccess<SignInResponse | MfaRequiredPayload>>;
  handleVerifyTwoFactor: (args: VerifyTwoFactorArgs) => Promise<ApiSuccess<SignInResponse>>;
  handleResendTwoFactor: (args: { challenge_id: string }) => Promise<ApiSuccess<{ challenge_id: string; expires_at?: string; channel?: string }>>;
  handleSignOut: () => Promise<void> | void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
