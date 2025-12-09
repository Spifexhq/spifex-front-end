// src/middlewares/auth/SubscriptionMiddleware.tsx
import { type ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/api";
import { useAuthContext } from "src/hooks/useAuth";
import TopProgress from "src/components/ui/Loaders/TopProgress";

type Props = {
  children: ReactNode;
  redirectTo?: string;
};

export const SubscriptionMiddleware = ({ children, redirectTo }: Props) => {
  const location = useLocation();
  const { handleInitUser } = useAuth();
  const { isSuperUser, isSubscribed } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await handleInitUser();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [handleInitUser]);

  if (isLoading) return <TopProgress active variant="center" />;

  if (!isSubscribed && !isSuperUser) {
    return <Navigate to={redirectTo ?? "/"} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
