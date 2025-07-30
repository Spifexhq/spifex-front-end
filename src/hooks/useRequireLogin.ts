// src/hooks/useRequireLogin.ts
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/api';
import { useAuthContext } from '@/contexts/useAuthContext';

/**
 * Redireciona automaticamente para /signin quando o usuário **não** estiver logado.
 * Retorna `true` quando o usuário está autenticado e `false` caso contrário,
 * permitindo que o componente “espere” a navegação antes de renderizar qualquer coisa.
 */
export const useRequireLogin = (): boolean => {
  // `useAuth()` é carregado logo depois do refresh; `useAuthContext()` vale
  // para páginas renderizadas após o login.  Usamos o que estiver disponível.
  const { isLogged: isLoggedApi } = useAuth();
  const { isLogged: isLoggedCtx } = useAuthContext();

  const isLogged = isLoggedApi ?? isLoggedCtx ?? false;

  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    if (!isLogged) {
      navigate('/signin', { replace: true, state: { from: location } });
    }
  }, [isLogged, navigate, location]);

  return isLogged;
};
