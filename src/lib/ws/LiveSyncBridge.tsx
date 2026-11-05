// src/lib/ws/LiveSyncBridge.tsx
import React, { useCallback, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";

import { useSpifexWebSocket } from "@/lib/ws/useSpifexWebSocket";
import type { LiveSyncEnvelope } from "@/lib/ws/types";
import { setAuthGate, clearAuthGate, clearHttpCaches, invalidateHttpResources } from "@/lib/http";
import { setIsSubscribed } from "@/redux";

type Props = {
  enabled: boolean;
  orgExternalId?: string | null;
  syncAuth: (opts?: { force?: boolean; reason?: string }) => Promise<void> | void;
};

export const LiveSyncBridge: React.FC<Props> = ({ enabled, orgExternalId, syncAuth }) => {
  const dispatch = useDispatch();
  const gatePromiseRef = useRef<Promise<void> | null>(null);

  const queued = useRef(false);
  const latestReason = useRef("");
  const seen = useRef(new Set<string>());
  useEffect(() => { seen.current.clear(); }, [orgExternalId]);

  const runGatedSync = useCallback(
    (reason: string) => {
      latestReason.current = reason;
      if (gatePromiseRef.current) { queued.current = true; return; }
      const p = (async () => {
        do {
          queued.current = false;
          if (latestReason.current.includes("permissions") || latestReason.current === "ws_auth_error") clearHttpCaches();
          else invalidateHttpResources(["identity", "organization", "subscription"]);
          await syncAuth({ force: true, reason: latestReason.current });
        } while (queued.current);
      })();
      gatePromiseRef.current = p;
      setAuthGate(p);

      void p.catch(() => undefined).finally(() => {
        if (gatePromiseRef.current === p) {
          gatePromiseRef.current = null;
          clearAuthGate(p);
        }
      });
    },
    [syncAuth],
  );

  const handleEvent = useCallback(
    (ev: LiveSyncEnvelope) => {
      if (seen.current.has(ev.id)) return;
      seen.current.add(ev.id);
      if (seen.current.size > 500) seen.current.delete(seen.current.values().next().value!);
      const t = ev.type;

      // Multi-tenant safety: ignore events for a different org.
      const evOrg = (ev.scope?.org_external_id || "").trim();
      const curOrg = (orgExternalId || "").trim();
      if (curOrg && evOrg && evOrg !== curOrg) return;

      const shouldSync =
        t === "subscription.updated" ||
        t === "subscription.deleted" ||
        t === "payment.failed" ||
        t === "payment.succeeded" ||
        t === "permissions.updated" ||
        t === "profile.updated" ||
        t === "onboarding.updated";

      if (!shouldSync) return;

      if (t === "payment.failed" || t === "subscription.deleted") {
        dispatch(setIsSubscribed(false));
      }

      runGatedSync(`ws:${t}`);
    },
    [dispatch, runGatedSync, orgExternalId],
  );

  const onAuthError = useCallback(() => {
    runGatedSync("ws_auth_error");
  }, [runGatedSync]);

  const wsEnabled = enabled && !!(orgExternalId || "").trim();

  useSpifexWebSocket({
    enabled: wsEnabled,
    orgExternalId,
    onEvent: handleEvent,
    onAuthError,
    onConnected: () => runGatedSync("ws_connected"),
  });

  return null;
};
