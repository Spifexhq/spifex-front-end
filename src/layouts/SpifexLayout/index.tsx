// src/layouts/SpifexLayout.tsx
import { useState, useEffect, FC } from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@/api';
import { AuthMiddleware } from '@/middlewares';
import TopProgress from 'src/components/ui/Loaders/TopProgress';
import Navbar from 'src/components/layout/Navbar';

export const SpifexLayout: FC = () => {
  const { handleInitUser } = useAuth();
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await handleInitUser(); } finally { if (mounted) setLoadingAuth(false); }
    })();
    return () => { mounted = false; };
  }, [handleInitUser]);

  if (loadingAuth) return <TopProgress active={true} variant='center' />;

  return (
    <AuthMiddleware>
      <Navbar />
      <div className="min-h-screen pt-16 bg-white text-gray-900">
        <Outlet />
      </div>
    </AuthMiddleware>
  );
};

export default SpifexLayout;
