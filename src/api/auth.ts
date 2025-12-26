/* -----------------------------------------------------------------------------
 * File: src/api/auth.ts
 * ---------------------------------------------------------------------------- */

import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { api } from "src/api/requests";

import {
  setUser,
  setUserOrganization,
  setIsSubscribed,
  setPermissions,
  resetAuth,
  setOrgExternalId,
} from "@/redux";

import {
  getAccess,
  setTokens,
  clearTokens,
  setOrgExternalIdStored,
  clearOrgExternalIdStored,
} from "@/lib/tokens";

import { clearHttpCaches, AUTH_SYNC_EVENT, SUBSCRIPTION_BLOCKED_EVENT } from "@/lib/http";

import type { ApiErrorBody } from "@/models/Api";

const AUTH_HINT_KEY = "auth_status";

// conservative default: avoids storms in case syncAuth is called multiple times
const AUTH_SYNC_MIN_GAP_MS = 5_000;

export const handleGetAccessToken = () => getAccess();

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  if (typeof err !== "object" || err == null) return false;
  if (!("code" in err)) return false;
  const code = (err as Record<string, unknown>).code;
  return typeof code === "string";
}

function shouldHardSignOut(err: unknown): boolean {
  if (isApiErrorBody(err)) {
    if (err.status === 401) return true;
    if (err.code === "token_not_valid" || err.code === "authentication_failed") return true;
    return false;
  }

  if (err instanceof Error) {
    if (/(^|\s)401(\s|$)/.test(err.message)) return true;
    if (/refresh-failed/i.test(err.message)) return true;
  }

  return false;
}

export const useAuth = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const syncInFlight = useRef<Promise<void> | null>(null);
  const lastSyncAt = useRef<number>(0);

  const clearClientSession = useCallback(() => {
    dispatch(resetAuth());
    clearTokens();
    clearOrgExternalIdStored();
    clearHttpCaches();
    localStorage.removeItem(AUTH_HINT_KEY);
  }, [dispatch]);

  const handleSignOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch {
      // ignore
    } finally {
      clearClientSession();
    }
  }, [clearClientSession]);

  /**
   * syncAuth is now NOT a "keep fresh" mechanism.
   * It only hits getUser() when needed:
   * - bootstrap (auth.user == null)
   * - explicit force (e.g., user clicked "Refresh account", or post-checkout return page)
   */
  const syncAuth = useCallback(
    async (opts?: { force?: boolean; reason?: string }) => {
      const shouldBeLoggedIn = localStorage.getItem(AUTH_HINT_KEY) === "active";
      if (!shouldBeLoggedIn) return;

      const mustFetch = !!opts?.force || auth.user == null;
      if (!mustFetch) return;

      const now = Date.now();
      if (!opts?.force && now - lastSyncAt.current < AUTH_SYNC_MIN_GAP_MS) return;
      lastSyncAt.current = now;

      if (!syncInFlight.current) {
        syncInFlight.current = (async () => {
          try {
            const res = await api.getUser();

            dispatch(setUser(res.data.user));
            dispatch(setUserOrganization(res.data.organization));
            dispatch(setIsSubscribed(!!res.data.is_subscribed));

            const perms = res.data.permissions ?? res.data.organization?.permissions ?? [];
            dispatch(setPermissions(perms));

            const orgExt = res.data.organization?.organization?.external_id ?? null;
            dispatch(setOrgExternalId(orgExt));
            if (orgExt) setOrgExternalIdStored(orgExt);
            else clearOrgExternalIdStored();

            localStorage.setItem(AUTH_HINT_KEY, "active");
          } catch (err) {
            console.warn("Auth sync failed:", opts?.reason || "unknown", err);

            if (shouldHardSignOut(err)) {
              localStorage.removeItem(AUTH_HINT_KEY);
              await handleSignOut();
            }
          } finally {
            syncInFlight.current = null;
          }
        })();
      }

      return syncInFlight.current;
    },
    [auth.user, dispatch, handleSignOut],
  );

  /**
   * Initializer:
   * Only bootstraps user once (if missing). No background refresh.
   */
  const handleInitUser = useCallback(async () => {
    await syncAuth({
      force: auth.user == null,
      reason: "init_user",
    });
  }, [auth.user, syncAuth]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.signIn({ email, password });

      const access = res.data.access;
      if (!access) throw new Error("Missing access token");

      setTokens(access);
      localStorage.setItem(AUTH_HINT_KEY, "active");

      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));
      dispatch(setIsSubscribed(!!res.data.is_subscribed));
      dispatch(setPermissions(res.data.permissions ?? []));

      const orgExt = res.data.organization?.organization?.external_id ?? null;
      dispatch(setOrgExternalId(orgExt));
      if (orgExt) setOrgExternalIdStored(orgExt);
      else clearOrgExternalIdStored();

      return res;
    },
    [dispatch],
  );

  const handlePermissionExists = useCallback(
    (code: string) => {
      if (auth.organization?.is_owner) return true;
      const list = auth.organization?.permissions ?? [];
      return list.includes(code);
    },
    [auth.organization],
  );

  useEffect(() => {
    // One-time bootstrap only
    void handleInitUser();

    // Token refresh events should NOT cause getUser().
    // Only react to refresh failure to hard sign out.
    const onAuthSync = (e: Event) => {
      const ce = e as CustomEvent;
      const reason = (ce.detail as { reason?: string } | undefined)?.reason;

      if (reason === "refresh_failed") {
        void handleSignOut();
      }
    };

    // If backend blocks due to subscription, update local UI state.
    // Do NOT call getUser() here.
    const onSubscriptionBlocked = () => {
      // idempotent
      dispatch(setIsSubscribed(false));
      // Optional: also clear permissions to avoid optimistic UI gates
      // dispatch(setPermissions([]));
    };

    window.addEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onSubscriptionBlocked as EventListener);

    return () => {
      window.removeEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onSubscriptionBlocked as EventListener);
    };
  }, [dispatch, handleInitUser, handleSignOut]);

  return {
    user: auth.user,
    organization: auth.organization,
    isSubscribed: auth.isSubscribed,
    isLogged: auth.user != null,

    handleInitUser,
    handlePermissionExists,
    handleSignIn,
    handleSignOut,

    // Keep exposed; now it will NOT spam getUser().
    // Only calls getUser() when auth.user is null or force=true.
    syncAuth,

    accessToken: getAccess(),
  };
};
