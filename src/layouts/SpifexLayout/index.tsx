// src/layouts/SpifexLayout.tsx
import { useState, useEffect, FC } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuthContext } from "src/hooks/useAuth";
import { AuthMiddleware, LocaleProfileMiddleware } from '@/middlewares';
import TopProgress from 'src/components/ui/Loaders/TopProgress';
import Navbar from 'src/components/layout/Navbar';
import { CookieBanner } from "@/components/Cookies/CookieBanner";

export const SpifexLayout: FC = () => {
  const { handleInitUser } = useAuthContext();
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await handleInitUser(); }
      finally { if (mounted) setLoadingAuth(false); }
    })();
    return () => { mounted = false; };
  }, [handleInitUser]);

  if (loadingAuth) return <TopProgress active={true} variant='center' />;

  return (
    <AuthMiddleware>
      <LocaleProfileMiddleware>
        <Navbar />
        <div className="min-h-screen pt-16 bg-white text-gray-900">
          <Outlet />
        </div>
        <CookieBanner />
      </LocaleProfileMiddleware>
    </AuthMiddleware>
  );
};

export default SpifexLayout;
