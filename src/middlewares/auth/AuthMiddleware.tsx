import { ReactNode } from 'react';
import { useRequireLogin } from '@/hooks/useRequireLogin';

type Props = { children: ReactNode };

export const AuthMiddleware = ({ children }: Props) => {
  const isLogged = useRequireLogin();
  if (!isLogged) return null;

  return <>{children}</>;
};
