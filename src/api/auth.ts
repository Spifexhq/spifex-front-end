// src/api/auth.ts
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
const AUTH_SYNC_MIN_GAP_MS = 5_000;

let AUTH_BOOTSTRAP_STARTED = false;

export const handleGetAccessToken = () => getAccess();

function emitAuthSync(reason: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT, { detail: { reason } }));
}

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  return typeof err === "object" && err != null && typeof (err as Record<string, unknown>).code === "string";
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

  const authUserRef = useRef(auth.user);
  useEffect(() => {
    authUserRef.current = auth.user;
  }, [auth.user]);

  const syncInFlight = useRef<Promise<void> | null>(null);
  const lastSyncAt = useRef<number>(0);

  const clearClientSession = useCallback(() => {
    dispatch(resetAuth());
    clearTokens();
    clearOrgExternalIdStored();
    clearHttpCaches();
    localStorage.removeItem(AUTH_HINT_KEY);

    AUTH_BOOTSTRAP_STARTED = false;
    emitAuthSync("signed_out");
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

  const applyGetUserResponse = useCallback(
    (res: Awaited<ReturnType<typeof api.getUser>>) => {
      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));
      dispatch(setIsSubscribed(Boolean(res.data.is_subscribed)));

      // Permissions are USER-scoped in this system:
      dispatch(setPermissions(res.data.permissions ?? []));

      const orgExt = res.data.organization?.organization?.external_id ?? null;
      dispatch(setOrgExternalId(orgExt));
      if (orgExt) setOrgExternalIdStored(orgExt);
      else clearOrgExternalIdStored();

      localStorage.setItem(AUTH_HINT_KEY, "active");
    },
    [dispatch],
  );

  const syncAuth = useCallback(
    async (opts?: { force?: boolean; reason?: string }) => {
      const shouldBeLoggedIn = localStorage.getItem(AUTH_HINT_KEY) === "active";
      if (!shouldBeLoggedIn) return;

      const token = getAccess();
      if (!token) return;

      const mustFetch = Boolean(opts?.force) || authUserRef.current == null;
      if (!mustFetch) return;

      const now = Date.now();
      if (!opts?.force && now - lastSyncAt.current < AUTH_SYNC_MIN_GAP_MS) return;
      lastSyncAt.current = now;

      if (!syncInFlight.current) {
        syncInFlight.current = (async () => {
          try {
            const res = await api.getUser();
            applyGetUserResponse(res);
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
    [applyGetUserResponse, handleSignOut],
  );

  const handleInitUser = useCallback(async () => {
    await syncAuth({ force: authUserRef.current == null, reason: "init_user" });
  }, [syncAuth]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.signIn({ email, password });

      const access = res.data.access;
      if (!access) throw new Error("Missing access token");

      setTokens(access);
      localStorage.setItem(AUTH_HINT_KEY, "active");

      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));
      dispatch(setIsSubscribed(Boolean(res.data.is_subscribed)));
      dispatch(setPermissions(res.data.permissions ?? []));

      const orgExt = res.data.organization?.organization?.external_id ?? null;
      dispatch(setOrgExternalId(orgExt));
      if (orgExt) setOrgExternalIdStored(orgExt);
      else clearOrgExternalIdStored();

      emitAuthSync("signed_in");
      return res;
    },
    [dispatch],
  );

  const handlePermissionExists = useCallback(
    (code: string) => {
      if (auth.organization?.is_owner) return true;
      return (auth.permissions || []).includes(code);
    },
    [auth.organization?.is_owner, auth.permissions],
  );

  useEffect(() => {
    if (AUTH_BOOTSTRAP_STARTED) return;
    AUTH_BOOTSTRAP_STARTED = true;

    void Promise.resolve(handleInitUser()).catch(() => {
      // auth flow handles failures
    });
  }, [handleInitUser]);

  useEffect(() => {
    const onAuthSync = (e: Event) => {
      const ce = e as CustomEvent;
      const reason = (ce.detail as { reason?: string } | undefined)?.reason;

      if (reason === "refresh_failed") {
        void handleSignOut();
      }
    };

    const onSubscriptionBlocked = () => {
      dispatch(setIsSubscribed(false));
    };

    window.addEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onSubscriptionBlocked as EventListener);

    return () => {
      window.removeEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onSubscriptionBlocked as EventListener);
    };
  }, [dispatch, handleSignOut]);

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
