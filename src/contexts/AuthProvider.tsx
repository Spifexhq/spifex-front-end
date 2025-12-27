// contexts/AuthProvider.tsx
import { useMemo, useCallback, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { useAuth as useAuthHook } from "@/api/auth";
import { AuthContext } from "@/contexts/AuthContext";
import type { RootState } from "@/redux/store";
import type { User, UserOrganizationDetail } from "src/models/auth";
import { LiveSyncBridge } from "src/lib/ws/LiveSyncBridge";

interface UserInfo {
  user: User | null;
  organization: UserOrganizationDetail | null;

  isLogged: boolean;
  isSuperUser: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  permissions: string[];
  
  isSubscribed: boolean;
}

const useCombinedUserInfo = (): UserInfo => {
  const auth = useSelector((state: RootState) => state.auth);

  return {
    user: auth.user,
    organization: auth.organization,

    isLogged: auth.user !== null,
    isSuperUser: auth.user?.is_superuser ?? false,
    isOwner: auth.organization?.is_owner ?? false,
    isStaff: auth.user?.is_staff ?? false,
    isActive: auth.user?.is_active ?? false,
    isEmailVerified: auth.user?.is_email_verified ?? false,
    permissions: auth.permissions ?? [],

    isSubscribed: Boolean(auth.isSubscribed),
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { handleInitUser, handleSignIn, handleSignOut, syncAuth } = useAuthHook();
  const userInfo = useCombinedUserInfo();

  const handlePermissionExists = useCallback(
    (codename: string) => (userInfo.permissions || []).includes(codename),
    [userInfo.permissions],
  );

  const authContextValue = useMemo(
    () => ({
      ...userInfo,
      handleInitUser,
      handleSignIn,
      handleSignOut,
      handlePermissionExists,
    }),
    [userInfo, handleInitUser, handleSignIn, handleSignOut, handlePermissionExists],
  );

  const orgExternalId = userInfo.organization?.organization?.external_id ?? null;

  return (
    <AuthContext.Provider value={authContextValue}>
      <LiveSyncBridge
        enabled={userInfo.isLogged}
        orgExternalId={orgExternalId}
        syncAuth={syncAuth}
      />
      {children}
    </AuthContext.Provider>
  );
};
