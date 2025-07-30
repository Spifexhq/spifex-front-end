// src/layouts/SettingsLayout.tsx
import { useState, useEffect, FC, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/api';
import { AuthMiddleware } from '@/middlewares';
import { SuspenseLoader } from '@/components/Loaders';

export const SettingsLayout: FC = () => {
  const { handleInitUser } = useAuth();
  const location = useLocation();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [pageKey, setPageKey] = useState(location.pathname); // controla Suspense

  useEffect(() => {
    const authenticateUser = async () => {
      await handleInitUser();
      setLoadingAuth(false);
    };
    authenticateUser();
  }, [handleInitUser]);

  // Recarrega Suspense a cada mudança de rota interna
  useEffect(() => {
    setPageKey(location.pathname);
  }, [location.pathname]);

  if (loadingAuth) {
    return <SuspenseLoader noLoadNp />;
  }

  return (
    <AuthMiddleware>
      <div className="flex flex-col h-full w-full">
        <div className="relative z-5 flex-1">
          <Suspense fallback={<SuspenseLoader />}>
            <div key={pageKey}>
              <Outlet />
            </div>
          </Suspense>
        </div>
      </div>
    </AuthMiddleware>
  );
};

export default SettingsLayout;
