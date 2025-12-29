// src/hooks/useRequireLogin.ts
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuth";

const AUTH_HINT_KEY = "auth_status";
const AUTH_BOOTSTRAP_FAILED_KEY = "spifex:auth_bootstrap_failed";

type Options = {
  redirectTo?: string;
};

function readHintActive(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(AUTH_HINT_KEY) === "active";
  } catch {
    return false;
  }
}

function readBootstrapFailed(): boolean {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(AUTH_BOOTSTRAP_FAILED_KEY) === "1";
  } catch {
    return false;
  }
}

function markBootstrapFailed(): void {
  try {
    sessionStorage.setItem(AUTH_BOOTSTRAP_FAILED_KEY, "1");
  } catch {
    // ignore
  }
}

function clearBootstrapFailed(): void {
  try {
    sessionStorage.removeItem(AUTH_BOOTSTRAP_FAILED_KEY);
  } catch {
    // ignore
  }
}

export function useRequireLogin(opts?: Options): { isLogged: boolean; checking: boolean } {
  const redirectTo = opts?.redirectTo ?? "/signin";

  const { user, handleInitUser } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const initStarted = useRef(false);

  const hintActive = readHintActive();
  const bootstrapFailed = readBootstrapFailed();

  // If we ever get a user, clear any tab-local “bootstrap failed” marker.
  useEffect(() => {
    if (user) clearBootstrapFailed();
  }, [user]);

  useEffect(() => {
    // If no hint (or this tab already failed to restore), treat as logged out.
    if (!hintActive || bootstrapFailed) {
      setChecking(false);
      if (location.pathname !== redirectTo) {
        navigate(redirectTo, { replace: true, state: { from: location.pathname } });
      }
      return;
    }

    // Hint is active:
    // - if user already loaded -> ok
    if (user) {
      setChecking(false);
      return;
    }

    // - else hydrate once
    if (initStarted.current) return;

    initStarted.current = true;
    setChecking(true);

    void (async () => {
      try {
        await handleInitUser();
      } finally {
        setChecking(false);
      }
    })();
  }, [hintActive, bootstrapFailed, user, handleInitUser, navigate, location.pathname, redirectTo]);

  // If we attempted hydration (hintActive) and still have no user after checking, redirect and prevent loops in this tab.
  useEffect(() => {
    if (checking) return;
    if (!hintActive) return;
    if (user) return;

    markBootstrapFailed();
    if (location.pathname !== redirectTo) {
      navigate(redirectTo, { replace: true, state: { from: location.pathname } });
    }
  }, [checking, hintActive, user, navigate, location.pathname, redirectTo]);

  return { isLogged: user != null, checking };
}
