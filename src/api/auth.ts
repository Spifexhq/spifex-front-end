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
import { useRequests } from '@/api';
import { ApiSignIn } from '@/models/Auth';
import { Permission } from '@/models/Permission';

const LOCAL_STORAGE_KEY = 'AUTH_ACCESS';

/**
 * Retrieves the stored access token from local storage.
 */
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

  /**
   * Initializes the user session by fetching user data using the stored access token.
   */
  const handleInitUser = useCallback(async () => {
    const access_token = handleGetAccessToken();
    if (!access_token) return;

    const response = await getUser();

    console.log("getUser Response:", response);

    if (response.status === 'success' && response.data) {
      dispatch(setUser(response.data.user));
      dispatch(setUserEnterprise(response.data.enterprise));
      dispatch(setSubscriptionStatus(response.data.subscription));
    } else {
      console.error("Error fetching user:", response.message);
    }
  }, [dispatch, getUser]);

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

  /**
   * Handles user authentication by sending credentials to the API.
   * Stores the access token and user data on successful authentication.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns {Promise<ApiSignIn>} The authenticated user data.
   * @throws An error if authentication fails.
   */
  const handleSignIn = async (email: string, password: string): Promise<ApiSignIn> => {
    const response = await signIn({ email, password });

    if (response.status !== 'success' || !response.data) {
      throw new Error(response.message || "Authentication failed. Please check your credentials.");
    }

    dispatch(setUser(response.data.user));
    dispatch(setUserEnterprise(response.data.enterprise));
    dispatch(setSubscriptionStatus(response.data.subscription));

    localStorage.setItem(LOCAL_STORAGE_KEY, response.data.access);

    return response.data;
  };

  /**
   * Handles user logout by clearing user data and removing the access token.
   */
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
