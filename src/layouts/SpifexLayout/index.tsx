import { useState, useEffect, FC, ReactNode, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/api';
import { AuthMiddleware } from '@/middlewares';
import { SuspenseLoader } from '@/components/Loaders';

interface SpifexLayoutProps {
  children?: ReactNode;
}

const SpifexLayout: FC<SpifexLayoutProps> = () => {
  const { handleInitUser } = useAuth();
  const location = useLocation();

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [pageKey, setPageKey] = useState(location.pathname); // controla transição

  useEffect(() => {
    const authenticateUser = async () => {
      await handleInitUser();
      setLoadingAuth(false);
    };
    authenticateUser();
  }, [handleInitUser]);

  // Ativa a tela branca com loader ao mudar de rota
  useEffect(() => {
    setPageKey(location.pathname); // força novo suspense render
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

export default SpifexLayout;
