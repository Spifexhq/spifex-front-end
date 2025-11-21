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

// Persistence flag key (NOT the token itself)
const AUTH_HINT_KEY = 'auth_status';

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
    
    // 4) Clear persistence hint
    localStorage.removeItem(AUTH_HINT_KEY);
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Bootstrap current user if we believe they are logged in
  // ---------------------------------------------------------------------------
  const handleInitUser = useCallback(async () => {
    // 💥 FIX: Do NOT check getAccess() here. It is empty on page reload.
    // Instead, check the localStorage "hint" that indicates a session should exist.
    const shouldBeLoggedIn = localStorage.getItem(AUTH_HINT_KEY) === 'active';
    
    // If we don't think we are logged in, or Redux is already populated, stop.
    if (!shouldBeLoggedIn || auth.user) return; 

    try {
      // We attempt to get the user. 
      // 1. Since memory token is empty, this request sends NO Authorization header.
      // 2. Backend returns 401.
      // 3. http.ts interceptor catches 401 -> calls /refresh using HttpOnly Cookie.
      // 4. If successful, it sets the new Access Token in memory and retries this request.
      const res = await api.getUser();

      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));

      if (res.data.subscription) {
        dispatch(setSubscription(res.data.subscription));
        dispatch(setSubscriptionStatus(res.data.subscription));
      }

      const perms =
        res.data.permissions ??
        res.data.organization?.permissions ??
        [];

      dispatch(setPermissions(perms));
    } catch (err) {
      // If the refresh failed (e.g., cookie expired, invalid), we accept that we are logged out.
      console.warn("Session restoration failed (refresh token likely expired):", err);
      localStorage.removeItem(AUTH_HINT_KEY);
      handleSignOut();
    }
  }, [auth.user, dispatch, handleSignOut]);

  // ---------------------------------------------------------------------------
  // Sign in: calls backend, persists tokens, hydrates redux slices
  // ---------------------------------------------------------------------------
  const handleSignIn = async (email: string, password: string) => {
    const res = await api.signIn({ email, password });

    const access = res.data.access;
    // Note: 'refresh' should be set by the backend in a Set-Cookie header (HttpOnly)

    if (!access) throw new Error("Tokens ausentes");

    // Persist Access Token (Memory)
    setTokens(access);
    
    // Set Persistence Hint (Local Storage)
    localStorage.setItem(AUTH_HINT_KEY, 'active');

    console.log("✅ access salvo:", access.slice(0, 25));

    // Hydrate slices
    dispatch(setUser(res.data.user));
    dispatch(setUserOrganization(res.data.organization));

    if (res.data.subscription) {
      dispatch(setSubscription(res.data.subscription));
      dispatch(setSubscriptionStatus(res.data.subscription));
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