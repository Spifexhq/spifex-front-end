// src/api/auth.ts
// =============================================================================
// Auth hook: sign-in, sign-out, bootstrap user, and permission checks
// =============================================================================

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/redux/rootReducer";
import { api } from "src/api/requests";

import {
  setUser,
  setUserOrganization,
  setSubscription,        // canonical
  setSubscriptionStatus,  // alias for compat
  setPermissions,
  resetAuth,
} from "@/redux";

import { getAccess, setTokens, clearTokens } from "@/lib/tokens";
import { clearHttpCaches } from "@/lib/http";

// Keep this exported for legacy call sites
export const handleGetAccessToken = () => getAccess();

export const useAuth = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  // ---------------------------------------------------------------------------
  // Sign out: wipe redux auth state, tokens, and all in-memory HTTP caches
  // ---------------------------------------------------------------------------
  const handleSignOut = useCallback(() => {
    // 1) Redux → resets user/organization/permissions/subscription
    dispatch(resetAuth());

    // 2) Tokens → purge persisted access/refresh
    clearTokens();

    // 3) HTTP layer → clear in-flight/small cache/throttle state
    clearHttpCaches();
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Bootstrap current user if we have a token and none is loaded yet
  // - Safe: does NOT sign out on failures (401/429 handled by interceptors)
  // ---------------------------------------------------------------------------
  const handleInitUser = useCallback(async () => {
    const token = getAccess();
    if (!token || auth.user) return; // nothing to do

    try {
      const res = await api.getUser();

      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));

      if (res.data.subscription) {
        // Either action works; kept both for compatibility
        dispatch(setSubscription(res.data.subscription));
        dispatch(setSubscriptionStatus(res.data.subscription));
      }
    } catch (err) {
      // Do not log the user out here; interceptors will handle token refresh.
      console.warn("handleInitUser failed:", err);
    }
  }, [auth.user, dispatch]);

  // ---------------------------------------------------------------------------
  // Sign in: calls backend, persists tokens, hydrates redux slices
  // ---------------------------------------------------------------------------
  const handleSignIn = async (email: string, password: string) => {
    const res = await api.signIn({ email, password });

    const access = res.data.access;
    const refresh = res.data.refresh; // backend sends refresh

    if (!access || !refresh) throw new Error("Tokens ausentes");

    // Persist tokens
    setTokens(access, refresh);
    console.log("✅ access salvo:", access.slice(0, 25));

    // Hydrate slices
    dispatch(setUser(res.data.user));
    dispatch(setUserOrganization(res.data.organization));

    if (res.data.subscription) {
      dispatch(setSubscription(res.data.subscription));
      dispatch(setSubscriptionStatus(res.data.subscription));
      console.log("💳 Assinatura:", res.data.subscription);
    }

    dispatch(setPermissions(res.data.permissions ?? []));
    return res;
  };

  // ---------------------------------------------------------------------------
  // Permission check (owners always pass)
  // ---------------------------------------------------------------------------
  const handlePermissionExists = useCallback(
    (code: string) => {
      if (auth.organization?.is_owner) return true;
      const list = auth.organization?.permissions ?? [];
      return list.includes(code);
    },
    [auth.organization]
  );

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
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
