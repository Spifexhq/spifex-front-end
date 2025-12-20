// src/hooks/useRequireLogin.ts

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";

const AUTH_HINT_KEY = "auth_status";

type Options = {
  redirectTo?: string; // adjust if your login route differs
};

export function useRequireLogin(opts?: Options): boolean {
  const redirectTo = opts?.redirectTo ?? "/signin";

  const { user, handleInitUser } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [checked, setChecked] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    const hintActive = localStorage.getItem(AUTH_HINT_KEY) === "active";

    // No hint => not logged; redirect to login
    if (!hintActive) {
      setChecked(true);
      if (location.pathname !== redirectTo) {
        navigate(redirectTo, { replace: true, state: { from: location.pathname } });
      }
      return;
    }

    // Already hydrated
    if (user) {
      setChecked(true);
      return;
    }

    // Hint is active but user not loaded yet => hydrate once, do not sign out
    if (!initStarted.current) {
      initStarted.current = true;
      void (async () => {
        try {
          await handleInitUser();
        } finally {
          setChecked(true);
        }
      })();
    }
  }, [user, handleInitUser, navigate, location.pathname, redirectTo]);

  // “Logged” means user is present.
  // While not checked yet, we return false to avoid rendering protected UI prematurely.
  if (!checked) return false;
  return user != null;
}
