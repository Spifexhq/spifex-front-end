// contexts/AuthProvider.tsx
import { useMemo, useCallback, ReactNode } from "react";
import { useSelector } from "react-redux";
import { useAuth as useAuthHook } from "@/api/auth";
import { AuthContext } from "@/contexts/AuthContext";
import { RootState } from "@/redux/rootReducer";
import { User, UserOrganizationDetail, Subscription } from "src/models/auth";

interface UserInfo {
  user: User | null;
  organization: UserOrganizationDetail | null;
  subscription: Subscription | null;
  isLogged: boolean;
  isSuperUser: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  permissions: string[];
}

const useCombinedUserInfo = (): UserInfo => {
  const auth = useSelector((state: RootState) => state.auth);
  return {
    user: auth.user,
    organization: auth.organization,
    subscription: auth.subscription,
    isLogged: auth.user !== null,
    isSuperUser: auth.user?.is_superuser ?? false,
    isOwner: auth.organization?.is_owner ?? false,
    isStaff: auth.user?.is_staff ?? false,
    isActive: auth.user?.is_active ?? false,
    isEmailVerified: auth.user?.is_email_verified ?? false,
    permissions: auth.permissions ?? (auth.organization?.permissions ?? []),
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { handleInitUser, handleSignIn, handleSignOut } = useAuthHook();
  const userInfo = useCombinedUserInfo();

  // 👇 derived fields from subscription
  const isSubscribed =
    ["active", "trialing"].includes(userInfo.subscription?.status ?? "");

  const activePlanId = userInfo.subscription?.plan_price_id ?? null;
  const activePlanCode = userInfo.subscription?.plan?.code ?? null;
  const activePlanName = userInfo.subscription?.plan?.name ?? null;
  const subscriptionStatus = userInfo.subscription?.status ?? null;
  const stripeCustomerId = userInfo.subscription?.customer?.stripe_customer_id ?? null;
  const cancelAtPeriodEnd = !!userInfo.subscription?.cancel_at_period_end;

  const handlePermissionExists = useCallback(
    (codename: string) => (userInfo.permissions || []).includes(codename),
    [userInfo.permissions]
  );

  const authContextValue = useMemo(
    () => ({
      ...userInfo,
      // expose derived legacy fields
      isSubscribed,
      activePlanId,
      activePlanCode,
      activePlanName,
      subscriptionStatus,
      stripeCustomerId,
      cancelAtPeriodEnd,

      // methods
      handleInitUser,
      handleSignIn,
      handleSignOut,
      handlePermissionExists,
    }),
    [
      userInfo,
      isSubscribed,
      activePlanId,
      activePlanCode,
      activePlanName,
      subscriptionStatus,
      stripeCustomerId,
      cancelAtPeriodEnd,
      handleInitUser,
      handleSignIn,
      handleSignOut,
      handlePermissionExists,
    ]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
