import { ReactNode } from 'react';
import { useRequireLogin } from '@/hooks/useRequireLogin';

export const AuthMiddleware = ({ children }: { children: ReactNode }) => {
  const isLogged = useRequireLogin()
  return isLogged ? <>{children}</> : null
}
