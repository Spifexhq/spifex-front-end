import { useState, useEffect, FC, useMemo, useCallback, useRef } from "react";
import { Outlet } from "react-router-dom";

import { useAuthContext } from "@/hooks/useAuth";
import { AuthMiddleware, LocaleProfileMiddleware } from "@/middlewares";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import ApplicationShell from "./ApplicationShell";
import { CookieBanner } from "@/components/Cookies/CookieBanner";
import { api } from "@/api/requests";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import { AUTH_SYNC_EVENT } from "@/lib/http";


export const SpifexLayout: FC = () => {
  const { handleInitUser, user, organization } = useAuthContext();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [onboarding, setOnboarding] = useState<ConfigurationStatus | null>(null);

  const onboardingValidatedAt = useRef(0);
  const onboardingInFlight = useRef(false);
  const loadOnboarding = useCallback(async () => {
    if (onboardingInFlight.current) return;
    onboardingInFlight.current = true;
    try {
      const { data } = await api.getConfigurationStatus();
      setOnboarding(data);
      onboardingValidatedAt.current = Date.now();
    } finally { onboardingInFlight.current = false; }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await handleInitUser();
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [handleInitUser]);

  useEffect(() => {
    if (loadingAuth) return;

    let mounted = true;

    (async () => {
      try {
        const { data } = await api.getConfigurationStatus();
        if (mounted) { setOnboarding(data); onboardingValidatedAt.current = Date.now(); }
      } catch (error) {
        console.error("Failed to load onboarding status:", error);
        if (mounted) setOnboarding(null);
      } finally {
        if (mounted) setLoadingOnboarding(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadingAuth, user?.id, organization?.organization?.id]);

  useEffect(() => {
    const onAuthSync = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason || "";
      const relevant = ["ws:onboarding.updated", "ws:profile.updated", "ws_connected", "connection_recovered"].includes(reason);
      const staleFocus = reason === "focus_revalidated" && Date.now() - onboardingValidatedAt.current >= 300_000;
      if (!relevant && !staleFocus) return;
      void loadOnboarding().catch((error) => {
        console.error("Failed to refresh onboarding status:", error);
      });
    };

    window.addEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
    return () => {
      window.removeEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
    };
  }, [loadOnboarding]);

  const showOnboardingWarning = useMemo(() => {
    return !loadingOnboarding && !!onboarding && onboarding.completed !== true;
  }, [loadingOnboarding, onboarding]);

  if (loadingAuth) {
    return <TopProgress active variant="center" />;
  }

  return (
    <AuthMiddleware>
      <LocaleProfileMiddleware>
        <ApplicationShell onboarding={onboarding} showOnboardingWarning={showOnboardingWarning}>
          <Outlet />
        </ApplicationShell>

        <CookieBanner />
      </LocaleProfileMiddleware>
    </AuthMiddleware>
  );
};

export default SpifexLayout;