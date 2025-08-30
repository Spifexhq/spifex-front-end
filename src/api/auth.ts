import { useCallback } from 'react';
import { setUser, setUserOrganization, setSubscriptionStatus, setPermissions, resetAuth } from '@/redux';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/rootReducer';
import { api } from 'src/api/requests'

const LOCAL_STORAGE_KEY = 'AUTH_ACCESS';

export const handleGetAccessToken = () => localStorage.getItem(LOCAL_STORAGE_KEY) ?? '';

export const useAuth = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const handleSignOut = useCallback(() => {
    dispatch(resetAuth());
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, [dispatch]);

  const handleInitUser = useCallback(async () => {
    const token = handleGetAccessToken();
    if (!token || auth.user) return;

    try {
      const res = await api.getUser();
      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));
      
      // Handle subscription if returned
      if (res.data.subscription) {
        dispatch(setSubscriptionStatus(res.data.subscription));
      }
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
      handleSignOut();
    }
  }, [auth.user, dispatch, handleSignOut]);

  const handleSignIn = async (email: string, password: string) => {
    const res = await api.signIn({ email, password });
    const token = res.data.access;
    if (!token) throw new Error('Token ausente');
    
    localStorage.setItem('AUTH_ACCESS', token);
    console.log('✅ token salvo (início):', token.slice(0, 25));

    dispatch(setUser(res.data.user));
    dispatch(setUserOrganization(res.data.organization));
    
    // Now subscription is included in signin response
    if (res.data.subscription) {
      dispatch(setSubscriptionStatus(res.data.subscription));
      console.log('💳 Assinatura:', res.data.subscription);
    }

    dispatch(setPermissions(res.data.permissions ?? []));

    console.log('👤 Usuário logado:', res.data.user);
    console.log('🏢 Organização:', res.data.organization);
    console.log('🏢 Permissões:', res.data.permissions);

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
    accessToken: handleGetAccessToken(),
  };
};