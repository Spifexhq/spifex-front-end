import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";

/** Authentication is hydrated once by AuthProvider, never by each route. */
export function useRequireLogin(opts?: { redirectTo?: string }): { isLogged: boolean; checking: boolean } {
  const { user, isAuthResolved } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = opts?.redirectTo ?? "/signin";
  useEffect(() => {
    if (isAuthResolved && !user && location.pathname !== redirectTo) {
      navigate(redirectTo, { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthResolved, user, location.pathname, redirectTo, navigate]);
  return { isLogged: !!user, checking: !isAuthResolved };
}
