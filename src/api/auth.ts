import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { api } from "src/api/requests";

import {
  setUser,
  setUserOrganization,
  setIsSubscribed,
  setPermissions,
  resetAuth,
} from "@/redux";

import { getAccess, setTokens, clearTokens } from "@/lib/tokens";
import { clearHttpCaches } from "@/lib/http";

const AUTH_HINT_KEY = "auth_status";

export const handleGetAccessToken = () => getAccess();

export const useAuth = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const clearClientSession = useCallback(() => {
    dispatch(resetAuth());
    clearTokens();
    clearHttpCaches();
    localStorage.removeItem(AUTH_HINT_KEY);
  }, [dispatch]);

  const handleSignOut = useCallback(async () => {
    try {
      await api.signOut(); // best-effort (clears HttpOnly cookie server-side)
    } catch {
      // ignore
    } finally {
      clearClientSession();
    }
  }, [clearClientSession]);

  const handleInitUser = useCallback(async () => {
    const shouldBeLoggedIn = localStorage.getItem(AUTH_HINT_KEY) === "active";
    if (!shouldBeLoggedIn || auth.user) return;

    try {
      const res = await api.getUser();

      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));
      dispatch(setIsSubscribed(!!res.data.is_subscribed));

      const perms = res.data.permissions ?? res.data.organization?.permissions ?? [];
      dispatch(setPermissions(perms));
    } catch (err) {
      console.warn("Session restoration failed:", err);
      localStorage.removeItem(AUTH_HINT_KEY);
      await handleSignOut();
    }
  }, [auth.user, dispatch, handleSignOut]);

  const handleSignIn = async (email: string, password: string) => {
    const res = await api.signIn({ email, password });

    const access = res.data.access;
    if (!access) throw new Error("Missing access token");

    setTokens(access);
    localStorage.setItem(AUTH_HINT_KEY, "active");

    dispatch(setUser(res.data.user));
    dispatch(setUserOrganization(res.data.organization));
    dispatch(setIsSubscribed(!!res.data.is_subscribed));
    dispatch(setPermissions(res.data.permissions ?? []));

    return res;
  };

  const handlePermissionExists = useCallback(
    (code: string) => {
      if (auth.organization?.is_owner) return true;
      const list = auth.organization?.permissions ?? [];
      return list.includes(code);
    },
    [auth.organization],
  );

  return {
    user: auth.user,
    organization: auth.organization,
    isSubscribed: auth.isSubscribed,
    isLogged: auth.user != null,

    handleInitUser,
    handlePermissionExists,
    handleSignIn,
    handleSignOut,

    accessToken: getAccess(),
  };
};
