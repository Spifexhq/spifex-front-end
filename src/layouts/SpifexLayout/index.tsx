import { useState, useEffect, FC } from "react";
import { Outlet } from "react-router-dom";

import { useAuthContext } from "@/hooks/useAuth";
import { AuthMiddleware, LocaleProfileMiddleware } from "@/middlewares";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { Navbar } from "@/shared/layout/Navbar";
import { CookieBanner } from "@/components/Cookies/CookieBanner";

export const SpifexLayout: FC = () => {
  const { handleInitUser } = useAuthContext();
  const [loadingAuth, setLoadingAuth] = useState(true);

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

  if (loadingAuth) return <TopProgress active={true} variant="center" />;

  return (
    <AuthMiddleware>
      <LocaleProfileMiddleware>
        <div className="h-[100dvh] overflow-hidden bg-white text-gray-900">
          
          <Navbar />

          <div className="h-full pt-16">
            <main className="h-[calc(100dvh-64px)] overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>

        <CookieBanner />
      </LocaleProfileMiddleware>
    </AuthMiddleware>
  );
};

export default SpifexLayout;