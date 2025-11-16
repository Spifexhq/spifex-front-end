import { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import { useAuthContext } from 'src/hooks/useAuth';

interface OwnerRouteProps { children: ReactElement }

export const OwnerRoute = ({ children }: OwnerRouteProps) => {
  const isLogged = useRequireLogin();
  const { isOwner } = useAuthContext();

  if (!isLogged) return null;
  if (!isOwner)   return <Navigate to="/settings/personal" replace />;

  return children;
};
