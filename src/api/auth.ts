// src/api/auth.ts
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/rootReducer';
import { api } from 'src/api/requests';
import {
  setUser,
  setUserOrganization,
  setSubscription,         // novo nome canônico
  setSubscriptionStatus,   // alias p/ compat.
  setPermissions,
  resetAuth,
} from '@/redux';
import { getAccess, setTokens, clearTokens } from '@/lib/tokens';

export const handleGetAccessToken = () => getAccess(); // compat. com código existente

export const useAuth = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const handleSignOut = useCallback(() => {
    dispatch(resetAuth());
    clearTokens();
  }, [dispatch]);

  const handleInitUser = useCallback(async () => {
    const token = getAccess();
    if (!token || auth.user) return;

    try {
      const res = await api.getUser();
      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));

      if (res.data.subscription) {
        // tanto faz qual action você usa, mantive ambas
        dispatch(setSubscription(res.data.subscription));
        dispatch(setSubscriptionStatus(res.data.subscription));
      }
    } catch (err) {
      // ⚠️ Não desloga aqui. Interceptor lida com 401/refresh/429.
      console.warn('handleInitUser falhou:', err);
    }
  }, [auth.user, dispatch]);

  const handleSignIn = async (email: string, password: string) => {
    const res = await api.signIn({ email, password });
    const access = res.data.access;
    const refresh = res.data.refresh; // backend já envia

    if (!access || !refresh) throw new Error('Tokens ausentes');
    setTokens(access, refresh);
    console.log('✅ access salvo:', access.slice(0, 25));

    dispatch(setUser(res.data.user));
    dispatch(setUserOrganization(res.data.organization));

    if (res.data.subscription) {
      dispatch(setSubscription(res.data.subscription));
      dispatch(setSubscriptionStatus(res.data.subscription));
      console.log('💳 Assinatura:', res.data.subscription);
    }

    dispatch(setPermissions(res.data.permissions ?? []));
    return res;
  };

  const handlePermissionExists = useCallback(
    (code: string) => {
      if (auth.organization?.is_owner) return true;
      const list = auth.organization?.permissions ?? [];
      return list.includes(code);
    },
    [auth.organization]
  );

  return {
    user: auth.user,
    organization: auth.organization,
    subscription: auth.subscription,
    isLogged: auth.user != null,
    handleInitUser,
    handlePermissionExists,
    handleSignIn,
    handleSignOut,
    accessToken: getAccess(),
  };
};
