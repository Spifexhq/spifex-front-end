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

import { getAccess, setTokens, clearTokens, setOrgExternalIdStored, clearOrgExternalIdStored } from "@/lib/tokens";
import {
  clearHttpCaches,
  AUTH_SYNC_EVENT,
  SUBSCRIPTION_BLOCKED_EVENT,
} from "@/lib/http";

import type { ApiErrorBody } from "@/models/Api";

const AUTH_HINT_KEY = "auth_status";

// conservative default: avoids storms, but keeps state fresh enough after portal actions
const AUTH_SYNC_MIN_GAP_MS = 5_000;
const AUTH_SYNC_POLL_MS = 120_000;

export const handleGetAccessToken = () => getAccess();

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  if (typeof err !== "object" || err == null) return false;
  if (!("code" in err)) return false;
  const code = (err as Record<string, unknown>).code;
  return typeof code === "string";
}

function shouldHardSignOut(err: unknown): boolean {
  // Only sign out when it is clearly an auth/session problem.
  if (isApiErrorBody(err)) {
    if (err.status === 401) return true;
    if (err.code === "token_not_valid" || err.code === "authentication_failed") return true;
    return false;
  }

  if (err instanceof Error) {
    // Covers axios-wrapped errors we rethrow as Error("401 ...") etc.
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
   * Single-flight auth sync that:
   * - refreshes subscription/permissions/org snapshot
   * - throttles to avoid storms
   * - only signs out on real auth/session errors (401/token invalid)
   */
  const syncAuth = useCallback(
    async (opts?: { force?: boolean; reason?: string }) => {
      const shouldBeLoggedIn = localStorage.getItem(AUTH_HINT_KEY) === "active";
      if (!shouldBeLoggedIn) return;

      const now = Date.now();
      const force = !!opts?.force;

      if (!force && now - lastSyncAt.current < AUTH_SYNC_MIN_GAP_MS) return;

      // Set early to throttle storms (even if request fails)
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
    [dispatch, handleSignOut],
  );

  /**
   * Initializer used across the app.
   * - If user is missing, force a sync (session restoration).
   * - Otherwise, do a throttled refresh.
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
    // Boot sync: covers “subscription changed while tab was closed”
    void syncAuth({ reason: "boot" });

    const onAuthSync = () => void syncAuth({ reason: "event_auth_sync" });
    const onSubscriptionBlocked = () => void syncAuth({ force: true, reason: "event_subscription_blocked" });

    window.addEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onSubscriptionBlocked as EventListener);

    const onFocus = () => void syncAuth({ reason: "focus" });
    window.addEventListener("focus", onFocus);

    const onVis = () => {
      if (!document.hidden) void syncAuth({ reason: "visibility" });
    };
    document.addEventListener("visibilitychange", onVis);

    // BFCache / "back from checkout" reliability
    const onPageShow = (e: PageTransitionEvent) => {
      // If the page was restored from bfcache, it may have stale auth/subscription state.
      if (e.persisted) void syncAuth({ force: true, reason: "pageshow_bfcache" });
      else void syncAuth({ reason: "pageshow" });
    };
    window.addEventListener("pageshow", onPageShow);

    const poll = window.setInterval(() => {
      if (document.hidden) return;
      void syncAuth({ reason: "poll" });
    }, AUTH_SYNC_POLL_MS);

    return () => {
      window.removeEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onSubscriptionBlocked as EventListener);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(poll);
    };
  }, [syncAuth]);

  return {
    user: auth.user,
    organization: auth.organization,
    isSubscribed: auth.isSubscribed,
    isLogged: auth.user != null,

    handleInitUser,
    handlePermissionExists,
    handleSignIn,
    handleSignOut,
    
    syncAuth,

    accessToken: getAccess(),
  };
};
