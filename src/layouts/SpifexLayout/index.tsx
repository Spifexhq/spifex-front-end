import { useState, useEffect, FC, useMemo, useCallback } from "react";
import { Outlet } from "react-router-dom";

import { useAuthContext } from "@/hooks/useAuth";
import { AuthMiddleware, LocaleProfileMiddleware } from "@/middlewares";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import ApplicationShell from "./ApplicationShell";
import { CookieBanner } from "@/components/Cookies/CookieBanner";
import { api } from "@/api/requests";
import type { OnboardingStatus } from "@/models/auth/onboarding";
import { AUTH_SYNC_EVENT } from "@/lib/http";


export const SpifexLayout: FC = () => {
  const { handleInitUser } = useAuthContext();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  const loadOnboarding = useCallback(async () => {
    const { data } = await api.getOnboardingStatus();
    setOnboarding(data);
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
        const { data } = await api.getOnboardingStatus();
        if (mounted) setOnboarding(data);
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
  }, [loadingAuth]);

  useEffect(() => {
    const onAuthSync = () => {
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