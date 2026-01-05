// src/api/auth.ts

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "@/redux/store";
import { api } from "@/api/requests";

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
  getUserIdStored,
  setUserIdStored,
  clearUserIdStored,
} from "@/lib/tokens";

import { clearHttpCaches, AUTH_SYNC_EVENT, SUBSCRIPTION_BLOCKED_EVENT } from "@/lib/http";
import type { ApiErrorBody } from "@/models/Api";

const AUTH_HINT_KEY = "auth_status";
const AUTH_BOOTSTRAP_FAILED_KEY = "spifex:auth_bootstrap_failed";

// Cross-tab token bridge (kept local to auth.ts)
const AUTH_BC_NAME = "spifex:auth";
const TAB_ID_KEY = "spifex:tab-id";

const AUTH_SYNC_MIN_GAP_MS = 5_000;

// Helps in React strict-mode / remounts: ensure we only run bootstrap once per tab session.
let AUTH_BOOTSTRAP_STARTED = false;

export const handleGetAccessToken = () => getAccess();

/* --------------------------------- Helpers -------------------------------- */

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  return typeof err === "object" && err != null && typeof (err as Record<string, unknown>).code === "string";
}

function shouldHardSignOut(err: unknown): boolean {
  // Hard sign-out only for clearly-invalid auth states.
  if (isApiErrorBody(err)) {
    if (err.status === 401) return true;
    if (err.code === "token_not_valid" || err.code === "authentication_failed") return true;
    return false;
  }

  if (err instanceof Error) {
    if (/(^|\s)401(\s|$)/.test(err.message)) return true;
    if (/refresh-failed/i.test(err.message)) return true;
    if (/refresh-user-mismatch/i.test(err.message)) return true;
    if (/refresh-user-missing/i.test(err.message)) return true;
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
    // ignore
  }
}

function clearAuthHint(): void {
  try {
    localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    // ignore
  }
}

function clearBootstrapFailedFlag(): void {
  try {
    sessionStorage.removeItem(AUTH_BOOTSTRAP_FAILED_KEY);
  } catch {
    // ignore
  }
}

function emitAuthSync(reason: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SYNC_EVENT, { detail: { reason } }));
}

/* -----------------------------------------------------------------------------
 * Cross-tab token bridge (BroadcastChannel)
 * - Used only to "hand off" a short-lived access token from an existing tab
 *   to a new tab, without persisting it in localStorage.
 * - We also bridge orgExternalId and userId (external_id) to avoid cross-user mixups.
 * -------------------------------------------------------------------------- */

type AuthBCReq = { type: "REQ_TOKENS"; from: string };
type AuthBCTok = { type: "TOKENS"; to: string; access: string; orgExternalId?: string; userId?: string };
type AuthBCMsg = AuthBCReq | AuthBCTok;

function getTabId(): string {
  try {
    const existing = sessionStorage.getItem(TAB_ID_KEY);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    sessionStorage.setItem(TAB_ID_KEY, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function openAuthChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(AUTH_BC_NAME);
}

function readSessionValue(key: string): string | undefined {
  try {
    const v = sessionStorage.getItem(key) || "";
    return v.trim() || undefined;
  } catch {
    return undefined;
  }
}

function startAuthTokenResponder(): () => void {
  const ch = openAuthChannel();
  if (!ch) return () => {};

  const channel: BroadcastChannel = ch;

  const onMessage = (ev: MessageEvent<AuthBCMsg>) => {
    const msg = ev.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "REQ_TOKENS") {
      const access = getAccess();
      if (!access) return;

      const orgExternalId = readSessionValue("spifex:org-external-id");
      const userId = getUserIdStored().trim() || undefined;

      // If we don't know who we are (no userId), do not bridge tokens.
      if (!userId) return;

      const reply: AuthBCTok = { type: "TOKENS", to: msg.from, access, orgExternalId, userId };
      channel.postMessage(reply);
      return;
    }

    if (msg.type === "TOKENS" && msg.to === getTabId()) {
      const incomingAccess = typeof msg.access === "string" ? msg.access : "";
      const incomingUserId = typeof msg.userId === "string" ? msg.userId.trim() : "";
      const incomingOrgExternalId = typeof msg.orgExternalId === "string" ? msg.orgExternalId.trim() : "";

      if (!incomingAccess || !incomingUserId) return;

      const expectedUserId = (getUserIdStored() || "").trim();

      // If this tab already knows the user, do not accept cross-user tokens.
      if (expectedUserId && expectedUserId !== incomingUserId) return;

      // Otherwise lock identity now.
      if (!expectedUserId) setUserIdStored(incomingUserId);

      setTokens(incomingAccess);
      if (incomingOrgExternalId) setOrgExternalIdStored(incomingOrgExternalId);
    }
  };

  channel.addEventListener("message", onMessage as EventListener);

  return () => {
    channel.removeEventListener("message", onMessage as EventListener);
    channel.close();
  };
}

let tokenRequestInFlight: Promise<boolean> | null = null;

async function requestTokensFromOtherTabs(timeoutMs = 800): Promise<boolean> {
  if (getAccess()) return true;
  if (tokenRequestInFlight) return tokenRequestInFlight;

  tokenRequestInFlight = (async () => {
    const ch = openAuthChannel();
    if (!ch) return false;

    const channel: BroadcastChannel = ch;
    const me = getTabId();

    return await new Promise<boolean>((resolve) => {
      let done = false;

      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve(Boolean(getAccess()));
      }, timeoutMs);

      const onMessage = (ev: MessageEvent<AuthBCMsg>) => {
        const msg = ev.data;
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "TOKENS" && msg.to === me) {
          const incomingAccess = typeof msg.access === "string" ? msg.access : "";
          const incomingUserId = typeof msg.userId === "string" ? msg.userId.trim() : "";
          const incomingOrgExternalId = typeof msg.orgExternalId === "string" ? msg.orgExternalId.trim() : "";

          if (!incomingAccess || !incomingUserId) return;

          const expectedUserId = (getUserIdStored() || "").trim();
          if (expectedUserId && expectedUserId !== incomingUserId) return;

          if (!expectedUserId) setUserIdStored(incomingUserId);

          setTokens(incomingAccess);
          if (incomingOrgExternalId) setOrgExternalIdStored(incomingOrgExternalId);

          if (done) return;
          done = true;
          cleanup();
          resolve(true);
        }
      };

      function cleanup() {
        window.clearTimeout(timer);
        channel.removeEventListener("message", onMessage as EventListener);
        channel.close();
      }

      channel.addEventListener("message", onMessage as EventListener);
      channel.postMessage({ type: "REQ_TOKENS", from: me } satisfies AuthBCReq);
    });
  })().finally(() => {
    tokenRequestInFlight = null;
  });

  return tokenRequestInFlight;
}

/* ---------------------------------- Hook ---------------------------------- */

export const useAuth = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();

  const authUserRef = useRef(auth.user);
  useEffect(() => {
    authUserRef.current = auth.user;
  }, [auth.user]);

  const syncInFlight = useRef<Promise<void> | null>(null);
  const lastSyncAt = useRef<number>(0);

  const applyUserSnapshot = useCallback(
    (payload: Awaited<ReturnType<typeof api.getUser>>["data"]) => {
      dispatch(setUser(payload.user));
      dispatch(setUserOrganization(payload.organization));
      dispatch(setIsSubscribed(Boolean(payload.is_subscribed)));
      dispatch(setPermissions(payload.permissions ?? []));

      // Lock user identity (external id) tab-scoped
      const uid = String(payload.user?.id || "").trim();
      if (uid) setUserIdStored(uid);
      else clearUserIdStored();

      const orgExt = payload.organization?.organization?.id ?? null;
      dispatch(setOrgExternalId(orgExt));
      if (orgExt) setOrgExternalIdStored(orgExt);
      else clearOrgExternalIdStored();

      setAuthHintActive();
      clearBootstrapFailedFlag();
    },
    [dispatch],
  );

  const clearClientSession = useCallback(() => {
    dispatch(resetAuth());
    clearTokens();
    clearOrgExternalIdStored();
    clearUserIdStored();
    clearHttpCaches();
    clearAuthHint();

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

  const syncAuth = useCallback(
    async (opts?: { force?: boolean; reason?: string }) => {
      if (!getAuthHintActive()) return;

      const mustFetch = Boolean(opts?.force) || authUserRef.current == null;
      if (!mustFetch) return;

      const now = Date.now();
      if (!opts?.force && now - lastSyncAt.current < AUTH_SYNC_MIN_GAP_MS) return;
      lastSyncAt.current = now;

      if (syncInFlight.current) return syncInFlight.current;

      syncInFlight.current = (async () => {
        try {
          // If this tab has no access token, try to obtain it from another open tab.
          // If it fails, proceed anyway: http.ts may refresh via cookie.
          if (!getAccess()) {
            await requestTokensFromOtherTabs(800);
          }

          const res = await api.getUser();
          applyUserSnapshot(res.data);
        } catch (err) {
          console.warn("Auth sync failed:", opts?.reason || "unknown", err);

          if (shouldHardSignOut(err)) {
            clearAuthHint();
            await handleSignOut();
          }
        } finally {
          syncInFlight.current = null;
        }
      })();

      return syncInFlight.current;
    },
    [applyUserSnapshot, handleSignOut],
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
      setAuthHintActive();
      clearBootstrapFailedFlag();

      dispatch(setUser(res.data.user));
      dispatch(setUserOrganization(res.data.organization));
      dispatch(setIsSubscribed(Boolean(res.data.is_subscribed)));
      dispatch(setPermissions(res.data.permissions ?? []));

      // Lock user identity (external id) tab-scoped
      const uid = String(res.data.user?.id || "").trim();
      if (uid) setUserIdStored(uid);
      else clearUserIdStored();

      const orgExt = res.data.organization?.organization?.id ?? null;
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

  // Start the token responder (cross-tab) once per mount.
  useEffect(() => startAuthTokenResponder(), []);

  // Cross-tab sign-in/sign-out via localStorage key changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_HINT_KEY) return;

      // Another tab signed in
      if (e.newValue === "active") {
        void syncAuth({ force: true, reason: "storage_active" });
        return;
      }

      // Another tab signed out
      if (e.oldValue === "active" && e.newValue !== "active") {
        // local-only cleanup; do NOT call api.signOut() here
        dispatch(resetAuth());
        clearTokens();
        clearOrgExternalIdStored();
        clearUserIdStored();
        clearHttpCaches();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [dispatch, syncAuth]);

  // Bootstrap this tab once
  useEffect(() => {
    if (AUTH_BOOTSTRAP_STARTED) return;
    AUTH_BOOTSTRAP_STARTED = true;

    void Promise.resolve(handleInitUser()).catch(() => {
      // auth flow handles failures
    });
  }, [handleInitUser]);

  // In-tab events (refresh_failed / refresh_user_mismatch / subscription blocked)
  useEffect(() => {
    const onAuthSync = (e: Event) => {
      const ce = e as CustomEvent;
      const reason = (ce.detail as { reason?: string } | undefined)?.reason;

      if (
        reason === "refresh_failed" ||
        reason === "refresh_user_mismatch" ||
        reason === "refresh_user_missing"
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

  const accessToken = getAccess();

  return useMemo(
    () => ({
      user: auth.user,
      organization: auth.organization,
      isSubscribed: auth.isSubscribed,
      isLogged: auth.user != null,

      handleInitUser,
      handlePermissionExists,
      handleSignIn,
      handleSignOut,

      syncAuth,
      accessToken,
    }),
    [
      auth.user,
      auth.organization,
      auth.isSubscribed,
      handleInitUser,
      handlePermissionExists,
      handleSignIn,
      handleSignOut,
      syncAuth,
      accessToken,
    ],
  );
};
