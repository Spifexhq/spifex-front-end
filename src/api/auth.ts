/**
 * auth.ts
 * 
 * This custom hook manages authentication and user state.
 * 
 * Features:
 * - Retrieves the access token from local storage
 * - Initializes the user session by fetching user data
 * - Handles user sign-in and stores authentication tokens
 * - Supports sign-out functionality by clearing stored user data
 * - Checks if a user has a specific permission
 * 
 * Usage:
 * ```tsx
 * const { isLogged, handleSignIn, handleSignOut } = useAuth();
 * if (isLogged) {
 *   console.log("User is authenticated!");
 * }
 * ```
 */

import { useCallback } from 'react';
import { setUser, setUserEnterprise, setSubscriptionStatus } from '@/redux';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/rootReducer';
import { api } from 'src/api/requests'
import { Permission } from 'src/models/auth';

const LOCAL_STORAGE_KEY = 'AUTH_ACCESS';

/**
 * Retrieves the stored access token from local storage.
 */
export const handleGetAccessToken = () => localStorage.getItem(LOCAL_STORAGE_KEY) ?? '';

export const useAuth = () => {
  const auth  = useSelector((s:RootState)=>s.auth)
  const dispatch = useDispatch()

  /**
   * Handles user logout by clearing user data and removing the access token.
   */
  const handleSignOut = useCallback(() => {
    dispatch(setUser(null));
    dispatch(setUserEnterprise(null));
    dispatch(setSubscriptionStatus(null));
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, [dispatch]);

  /**
   * Initializes the user session by fetching user data using the stored access token.
   */
  const handleInitUser = useCallback(async () => {
    const token = handleGetAccessToken();
    if (!token || auth.user) return;

    try {
      const res = await api.getUser();
      dispatch(setUser(res.data.user));
      dispatch(setUserEnterprise(res.data.enterprise));
      dispatch(setSubscriptionStatus(res.data.subscription));
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
      handleSignOut(); // ✅ agora está seguro
    }
  }, [auth.user, dispatch, handleSignOut]);

  /**
   * Handles user authentication by sending credentials to the API.
   * Stores the access token and user data on successful authentication.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns {Promise<ApiSignIn>} The authenticated user data.
   * @throws An error if authentication fails.
   */
  const handleSignIn = async (email: string, password: string) => {
    const res = await api.signIn({ email, password })
    const token = res.data.access               // string crua
    if (!token) throw new Error('Token ausente')
    localStorage.setItem('AUTH_ACCESS', token)
    console.log('✅ token salvo (início):', token.slice(0,25))

    dispatch(setUser(res.data.user))
    dispatch(setUserEnterprise(res.data.enterprise))
    dispatch(setSubscriptionStatus(res.data.subscription))

    console.log('👤 Usuário logado:', res.data.user);
    console.log('🏢 Empresa:', res.data.enterprise);
    console.log('📦 Assinatura:', res.data.subscription);

    return res;
  }

  /**
   * Checks whether the authenticated user has a specific permission.
   * @param permissionCodename - The code name of the permission to check.
   * @returns {boolean} True if the user has the permission, otherwise false.
   */
  const handlePermissionExists = useCallback(
    (permissionCodename: string) => {
      if (auth.enterprise?.is_owner) return true;
  
      return (
        auth.enterprise?.permissions?.some((p: Permission) => p.code_name === permissionCodename) ??
        false
      );
    },
    [auth.enterprise]
  );

  return {
    user: auth.user,
    subscription: auth.subscription,
    isLogged: auth.user != null,
    handleInitUser,
    handlePermissionExists,
    handleSignIn,
    handleSignOut,
    accessToken: handleGetAccessToken(),
  };
};
