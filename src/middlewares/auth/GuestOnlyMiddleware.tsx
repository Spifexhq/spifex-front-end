import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";

type Props = {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
};

export default function GuestOnlyMiddleware({
  children,
  redirectTo = "/overview",
  fallback = null,
}: Props) {
  const { isLogged, isAuthResolved } = useAuthContext();

  if (!isAuthResolved) {
    return <>{fallback}</>;
  }

  if (isLogged) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}