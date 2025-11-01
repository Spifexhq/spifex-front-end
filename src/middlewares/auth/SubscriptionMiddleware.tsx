import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/api";
import { useAuthContext } from "@/contexts/useAuthContext";

import TopProgress from 'src/components/ui/Loaders/TopProgress';

type Props = {
  children: ReactNode;
  redirectTo?: string;
};

export const SubscriptionMiddleware = ({ children, redirectTo }: Props) => {
  const navigate = useNavigate();
  const { handleInitUser } = useAuth();
  const { isSuperUser, isSubscribed, activePlanId } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        await handleInitUser();
      } catch (error) {
        console.error('Erro ao verificar status de assinatura:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [handleInitUser]);

  if (isLoading) {
    return <TopProgress active={true} variant='center' />;
  }

  if ((!isSubscribed || !activePlanId) && !isSuperUser) {
    navigate(redirectTo ?? '/');
    return null;
  }

  return (
      <>{children}</>
    )};
