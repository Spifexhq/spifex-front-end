import { getAuthGeneration } from "@/lib/authGeneration";
// src/api/auth.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "@/redux/store";
import { api } from "@/api/requests";

import {
  setAuthSnapshot,
  setIsSubscribed,
  resetAuth,
} from "@/redux";

import {
  getAccess,
  setTokens,
  clearTokens,
  setOrgExternalIdStored,
  getOrgExternalIdStored,
  clearOrgExternalIdStored,
  getUserIdStored,
  setUserIdStored,
  clearUserIdStored,
  ORG_EXTERNAL_ID_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  reloadStoredIdentity,
} from "@/lib/tokens";

import { clearHttpCaches, AUTH_SYNC_EVENT, SUBSCRIPTION_BLOCKED_EVENT } from "@/lib/http";
import type { ApiErrorBody } from "@/models/Api";
import type { SignInResponse, MfaRequiredPayload } from "@/models/auth/auth";

const AUTH_HINT_KEY = "auth_status";
const AUTH_SESSION_KEY = "spifex:auth-session";
const AUTH_BOOTSTRAP_FAILED_KEY = "spifex:auth_bootstrap_failed";

const AUTH_SYNC_MIN_GAP_MS = 5_000;

let AUTH_BOOTSTRAP_STARTED = false;
let AUTH_BOOTSTRAP_PROMISE: Promise<void> | null = null;

export const handleGetAccessToken = () => getAccess();

/* --------------------------------- Helpers -------------------------------- */

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  return typeof err === "object" && err !== null && typeof (err as Record<string, unknown>).code === "string";
}

function shouldHardSignOut(err: unknown): boolean {
  if (isApiErrorBody(err)) {
    if (err.status === 401) return true;
    if (err.code === "token_not_valid") return true;
    if (err.code === "authentication_failed") return true;
    if (err.code === "session_not_valid") return true;
    if (err.code === "refresh_failed") return true;
    if (err.code === "refresh_user_mismatch") return true;
    if (err.code === "refresh_user_missing") return true;
    return false;
  }

  if (err instanceof Error) {
    if (/(^|\s)401(\s|$)/.test(err.message)) return true;
    if (err.message === "refresh_failed") return true;
    if (err.message === "refresh_user_mismatch") return true;
    if (err.message === "refresh_user_missing") return true;
    if (err.message === "session_not_valid") return true;
    if (err.message === "token_not_valid") return true;
    if (err.message === "authentication_failed") return true;
  }

  return false;
}

function getAuthHintActive(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === "active";
  } catch {
    return false;
  }
}

function setAuthHintActive(): void {
  try {
    localStorage.setItem(AUTH_HINT_KEY, "active");
  } catch {
    //
  }
}

function clearAuthHint(): void {
  try {
    localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    //
  }
}

function clearBootstrapFailedFlag(): void {
  try {
    sessionStorage.removeItem(AUTH_BOOTSTRAP_FAILED_KEY);
  } catch {
    //
  }
}

function emitAuthSync(reason: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT, { detail: { reason } }));
}

function lockUserIdStrict(nextUserId: string) {
  const next = (nextUserId || "").trim();
  if (!next) throw new Error("refresh_user_missing");

  const expected = (getUserIdStored() || "").trim();
  if (expected && expected !== next) {
    throw new Error("refresh_user_mismatch");
  }

  if (!expected) setUserIdStored(next);
}

function isMfaRequiredPayload(value: unknown): value is MfaRequiredPayload {
  if (typeof value !== "object" || value === null) return false;

  const payload = value as Partial<MfaRequiredPayload>;

  return payload.mfa_required === true && typeof payload.challenge_id === "string" && payload.challenge_id.trim().length > 0;
}

/* ---------------------------------- Hook ---------------------------------- */

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const [isAuthResolved, setIsAuthResolved] = useState(false);

  const authUserRef = useRef(auth.user);
  useEffect(() => {
    authUserRef.current = auth.user;
  }, [auth.user]);

  const syncInFlight = useRef<Promise<void> | null>(null);
  const syncQueued = useRef(false);
  const lastSyncAt = useRef<number>(0);
  const lastValidatedAt = useRef(0);

  const applyUserSnapshot = useCallback(
    (payload: Awaited<ReturnType<typeof api.getUser>>["data"]) => {
      const uid = String(payload.user?.id || "").trim();
      lockUserIdStrict(uid);

      const orgExt = payload.organization?.organization?.id ?? null;
      if (orgExt !== (getOrgExternalIdStored() || null)) clearHttpCaches();
      dispatch(setAuthSnapshot(payload));

      if (orgExt) setOrgExternalIdStored(orgExt);
      else clearOrgExternalIdStored();

      setAuthHintActive();
      clearBootstrapFailedFlag();
    },
    [dispatch],
  );

  const clearClientSession = useCallback(() => {
    syncInFlight.current = null;
    syncQueued.current = false;
    authUserRef.current = null;
    dispatch(resetAuth());

    clearTokens();
    clearOrgExternalIdStored();
    clearUserIdStored();
    clearHttpCaches();
    clearAuthHint();

    AUTH_BOOTSTRAP_STARTED = false;
    AUTH_BOOTSTRAP_PROMISE = null;

    emitAuthSync("signed_out");
  }, [dispatch]);

  const handleSignOut = useCallback(async () => {
    clearClientSession();
    try {
      await api.signOut();
    } catch {
      //
    } finally {
      setIsAuthResolved(true);
    }
  }, [clearClientSession]);

  const syncAuth = useCallback(
    async (opts?: { force?: boolean; reason?: string }) => {
      // Access tokens are memory-only. After reload, getAccess() is expected to be empty.
      // AUTH_HINT_KEY is a non-secret hint that tells the app to attempt cookie-backed refresh.
      if (!getAuthHintActive() && !getAccess()) {
        return;
      }

      const mustFetch = Boolean(opts?.force) || authUserRef.current == null;
      if (!mustFetch) return;

      const now = Date.now();
      if (!opts?.force && now - lastSyncAt.current < AUTH_SYNC_MIN_GAP_MS) return;
      lastSyncAt.current = now;

      if (syncInFlight.current) { syncQueued.current = true; return syncInFlight.current; }
      const generation = getAuthGeneration();

      syncInFlight.current = (async () => {
        try {
          // Do not request access tokens from other tabs.
          // Each tab should recover its own memory-only access token through /auth/refresh/
          // using the HttpOnly refresh/session cookies.
          do {
            syncQueued.current = false;
            const res = await api.getUser();
            if (generation !== getAuthGeneration()) return;
            applyUserSnapshot(res.data);
            lastValidatedAt.current = Date.now();
          } while (syncQueued.current);

          emitAuthSync(opts?.reason || "sync_auth");
        } catch (err) {
          console.warn("Auth sync failed:", opts?.reason || "unknown", err);

          if (generation !== getAuthGeneration()) return;
          if (shouldHardSignOut(err)) {
            clearAuthHint();
            await handleSignOut();
          }
        } finally {
          if (generation === getAuthGeneration()) syncInFlight.current = null;
        }
      })();

      return syncInFlight.current;
    },
    [applyUserSnapshot, handleSignOut],
  );

  const handleInitUser = useCallback(async () => {
    try {
      if (!getAuthHintActive() && !getAccess()) return;

      await syncAuth({
        force: authUserRef.current == null,
        reason: "init_user",
      });
    } finally {
      setIsAuthResolved(true);
    }
  }, [syncAuth]);

  const applySignInSnapshot = useCallback(
    (data: SignInResponse) => {
      const access = data.access;
      if (!access) throw new Error("Missing access token");

      const uid = String(data.user?.id || "").trim();
      if (!uid) throw new Error("Missing user identity");
      setUserIdStored(uid);

      // Memory-only access token. tokens.ts no longer persists this value.
      setTokens(access);
      setAuthHintActive();
      clearBootstrapFailedFlag();

      dispatch(setAuthSnapshot(data));
      const orgExt = data.organization?.organization?.id ?? null;

      if (orgExt) setOrgExternalIdStored(orgExt);
      else clearOrgExternalIdStored();

      try { localStorage.setItem(AUTH_SESSION_KEY, `${Date.now()}:${Math.random()}`); } catch { /* Storage may be blocked. */ }
      lastValidatedAt.current = Date.now();
      emitAuthSync("signed_in");
      setIsAuthResolved(true);
    },
    [dispatch],
  );

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      clearClientSession();
      const generation = getAuthGeneration();
      const res = await api.signIn({ email, password });
      if (generation !== getAuthGeneration()) throw new Error("Authentication was superseded");

      if (isMfaRequiredPayload(res.data)) {
        // MFA challenge is not an authenticated session yet.
        // Do not set AUTH_HINT_KEY here, because no refresh/session cookies should exist yet.
        clearBootstrapFailedFlag();
        setIsAuthResolved(true);
        return res;
      }

      applySignInSnapshot(res.data);
      return res;
    },
    [applySignInSnapshot, clearClientSession],
  );

  const handleVerifyTwoFactor = useCallback(
    async (args: { challenge_id: string; code: string }) => {
      const generation = getAuthGeneration();
      const res = await api.signInVerify2FA(args);
      if (generation !== getAuthGeneration()) throw new Error("Authentication was superseded");
      applySignInSnapshot(res.data);
      return res;
    },
    [applySignInSnapshot],
  );

  const handleResendTwoFactor = useCallback(async (args: { challenge_id: string }) => {
    return await api.signInResend2FA(args);
  }, []);

  const handlePermissionExists = useCallback(
    (code: string) => {
      if (auth.organization?.is_owner) return true;
      return (auth.permissions || []).includes(code);
    },
    [auth.organization?.is_owner, auth.permissions],
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;

      if (event.key === AUTH_SESSION_KEY || event.key === AUTH_HINT_KEY || event.key === USER_ID_STORAGE_KEY || event.key === ORG_EXTERNAL_ID_STORAGE_KEY) {
        clearTokens();
        clearHttpCaches();
        syncInFlight.current = null;
        reloadStoredIdentity();
        dispatch(resetAuth());
        authUserRef.current = null;
        if (getAuthHintActive()) {
          void syncAuth({ force: true, reason: "storage_identity_change" }).finally(() => setIsAuthResolved(true));
        } else {
          setIsAuthResolved(true);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [dispatch, syncAuth]);

  useEffect(() => {
    if (AUTH_BOOTSTRAP_STARTED) {
      if (AUTH_BOOTSTRAP_PROMISE) {
        void AUTH_BOOTSTRAP_PROMISE.finally(() => setIsAuthResolved(true));
      } else {
        setIsAuthResolved(true);
      }
      return;
    }

    AUTH_BOOTSTRAP_STARTED = true;
    AUTH_BOOTSTRAP_PROMISE = Promise.resolve(handleInitUser())
      .catch(() => undefined)
      .finally(() => {
        setIsAuthResolved(true);
      });

    void AUTH_BOOTSTRAP_PROMISE;
  }, [handleInitUser]);

  useEffect(() => {
    const onAuthSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      const reason = (customEvent.detail as { reason?: string } | undefined)?.reason;

      if (
        reason === "refresh_failed" ||
        reason === "refresh_user_mismatch" ||
        reason === "refresh_user_missing" ||
        reason === "session_not_valid" ||
        reason === "token_not_valid" ||
        reason === "authentication_failed" ||
        reason === "refresh_missing" ||
        reason === "password_changed"
      ) {
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

  useEffect(() => {
    let lastFocusAttempt = 0;
    const recover = () => {
      if (document.hidden || Date.now() - lastValidatedAt.current < 60_000 || Date.now() - lastFocusAttempt < 5_000) return;
      lastFocusAttempt = Date.now();
      void syncAuth({ force: true, reason: "focus_revalidated" });
    };
    const reconnect = () => { void syncAuth({ force: true, reason: "connection_recovered" }); };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("focus", recover);
    return () => { window.removeEventListener("online", reconnect); document.removeEventListener("visibilitychange", recover); window.removeEventListener("focus", recover); };
  }, [syncAuth]);

  const accessToken = getAccess();

  return useMemo(
    () => ({
      user: auth.user,
      organization: auth.organization,
      isSubscribed: auth.isSubscribed,
      isLogged: auth.user != null,
      isAuthResolved,

      handleInitUser,
      handlePermissionExists,
      handleSignIn,
      handleVerifyTwoFactor,
      handleResendTwoFactor,
      handleSignOut,

      syncAuth,
      accessToken,
    }),
    [
      auth.user,
      auth.organization,
      auth.isSubscribed,
      isAuthResolved,
      handleInitUser,
      handlePermissionExists,
      handleSignIn,
      handleVerifyTwoFactor,
      handleResendTwoFactor,
      handleSignOut,
      syncAuth,
      accessToken,
    ],
  );
};
