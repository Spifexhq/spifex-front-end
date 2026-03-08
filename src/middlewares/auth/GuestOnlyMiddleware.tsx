import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/api/auth";

type Props = {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
};

export default function GuestOnlyMiddleware({
  children,
  redirectTo = "/cashflow",
  fallback = null,
}: Props) {
  const { isLogged, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return <>{fallback}</>;
  }

  if (isLogged) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}