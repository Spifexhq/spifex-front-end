import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/rootReducer';
import { useRequests } from '@/api';
import { setUser, setUserEnterprise, setSubscriptionStatus } from '@/redux';
import { useCallback } from 'react';
import { ApiSignIn } from '@/models/Auth';

const LOCAL_STORAGE_KEY = 'AUTH_ACCESS';

export const handleGetAccessToken = () => localStorage.getItem(LOCAL_STORAGE_KEY) ?? '';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { signIn, getUser } = useRequests();

  const user = {
    ...auth.user,
    enterprise: auth.enterprise,
    subscription: auth.subscription,
  };

  const handleInitUser = useCallback(async () => {
    const access_token = handleGetAccessToken();
    if (!access_token) return;

    const response = await getUser();

    console.log("getUser Response:", response.data);

    if (response.data && !response.detail) {
      dispatch(setUser(response.data.user));
      dispatch(setUserEnterprise(response.data.enterprise));
      dispatch(setSubscriptionStatus(response.data.subscription));
    }
  }, [dispatch, getUser]);

  const handlePermissionExists = useCallback(
    (permissionCodename: string) => {
      if (auth.enterprise?.is_owner) return true;

      return auth.enterprise?.permissions?.some((p) => p.code_name === permissionCodename) ?? false;
    },
    [auth.enterprise]
  );

  const handleSignIn = async (email: string, password: string): Promise<ApiSignIn> => {
    const response = await signIn({ email, password });
  
    if (!response.data) {
      throw new Error("Erro ao autenticar. Verifique suas credenciais.");
    }
  
    dispatch(setUser(response.data.user));
    dispatch(setUserEnterprise(response.data.enterprise));
    dispatch(setSubscriptionStatus(response.data.subscription));
  
    localStorage.setItem(LOCAL_STORAGE_KEY, response.data.access);
  
    return response.data;
  };
  

  const handleSignOut = () => {
    dispatch(setUser(null));
    dispatch(setUserEnterprise(null));
    dispatch(setSubscriptionStatus(null));

    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return {
    user,
    subscription: auth.subscription,
    isLogged: auth.user != null,
    handleInitUser,
    handlePermissionExists,
    handleSignIn,
    handleSignOut,
    accessToken: handleGetAccessToken(),
  };
};
