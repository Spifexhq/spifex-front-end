import { ReactNode } from "react";
import { useAuth as useAuthHook } from "@/api/auth";
import { AuthContext } from "@/contexts/AuthContext";
import { useUserInfo } from "@/hooks/useUserInfo";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthHook();
  const userInfo = useUserInfo();

  const authContextValue = {
    ...auth,
    ...userInfo,
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};
