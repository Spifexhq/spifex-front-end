import { ReactNode } from "react";
import { useSelector } from 'react-redux';
import { useAuth as useAuthHook } from "@/api/auth";
import { AuthContext } from "@/contexts/AuthContext";
import { RootState } from '@/redux/rootReducer';
import { User, UserEnterpriseDetail, Subscription, Permission } from '@/models/Auth';

interface UserInfo {
  user: User | null;
  enterprise: UserEnterpriseDetail | null;
  subscription: Subscription | null;
  isLogged: boolean;
  isSuperUser: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  isSubscribed: boolean;
  activePlanId: string | null;
  stripeCustomerId: string | null;
  permissions: string[];
  lastPasswordChange: string | null;
}

const useCombinedUserInfo = (): UserInfo => {
  const auth = useSelector((state: RootState) => state.auth);

  return {
    user: auth.user,
    enterprise: auth.enterprise,
    subscription: auth.subscription,
    isLogged: auth.user !== null,
    isSuperUser: auth.user?.is_superuser ?? false,
    isOwner: auth.user?.is_owner ?? false,
    isStaff: auth.user?.is_staff ?? false,
    isActive: auth.user?.is_active ?? false,
    isEmailVerified: auth.user?.is_email_verified ?? false,
    isSubscribed: auth.user?.is_subscribed ?? false,
    activePlanId: auth.subscription?.plan_id ?? null,
    stripeCustomerId: auth.user?.stripe_customer_id ?? null,
    permissions: auth.enterprise?.permissions?.map((p: Permission) => p.code_name) ?? [],
    lastPasswordChange: auth.user?.last_password_change ?? null,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthHook();
  const userInfo = useCombinedUserInfo();

  const authContextValue = {
    ...auth,
    ...userInfo,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
