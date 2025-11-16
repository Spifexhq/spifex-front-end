import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import { useAuthContext } from 'src/hooks/useAuth';

interface Props { children: ReactElement }

export const SuccessRouteMiddleware = ({ children }: Props) => {
  const isLogged = useRequireLogin();
  const { isSubscribed, isOwner } = useAuthContext();
  const location = useLocation();

  if (!isLogged) return null;

  const query      = new URLSearchParams(location.search);
  const sessionId  = query.get('session_id');

  const invalid =
    !sessionId ||                    // sem session_id
    (!isSubscribed && !isOwner);     // assinante/owner obrigatório

  if (invalid) return <Navigate to="/settings/personal" replace />;

  return children;
};
