import { useState, useEffect, FC, useMemo } from "react";
import { Outlet } from "react-router-dom";

import { useAuthContext } from "@/hooks/useAuth";
import { AuthMiddleware, LocaleProfileMiddleware } from "@/middlewares";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { Navbar } from "@/shared/layout/Navbar";
import { CookieBanner } from "@/components/Cookies/CookieBanner";
import { api } from "@/api/requests";
import type { OnboardingStatus } from "@/models/auth/onboarding";

const NAVBAR_HEIGHT = 64;

export const SpifexLayout: FC = () => {
  const { handleInitUser } = useAuthContext();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

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

  const showOnboardingWarning = useMemo(() => {
    return !loadingOnboarding && !!onboarding && onboarding.completed !== true;
  }, [loadingOnboarding, onboarding]);

  if (loadingAuth) {
    return <TopProgress active variant="center" />;
  }

  return (
    <AuthMiddleware>
      <LocaleProfileMiddleware>
        <div className="h-[100dvh] overflow-hidden bg-white text-gray-900">
          <Navbar
            onboarding={onboarding}
            showOnboardingWarning={showOnboardingWarning}
          />

          <main
            className="overflow-y-auto"
            style={{
              height: `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
              marginTop: `${NAVBAR_HEIGHT}px`,
            }}
          >
            <Outlet />
          </main>
        </div>

        <CookieBanner />
      </LocaleProfileMiddleware>
    </AuthMiddleware>
  );
};

export default SpifexLayout;