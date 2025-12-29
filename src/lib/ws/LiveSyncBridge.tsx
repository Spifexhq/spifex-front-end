// src/lib/ws/LiveSyncBridge.tsx
import React, { useCallback, useRef } from "react";
import { useDispatch } from "react-redux";

import { useSpifexWebSocket } from "@/lib/ws/useSpifexWebSocket";
import type { LiveSyncEnvelope } from "@/lib/ws/types";
import { getAccess } from "@/lib/tokens";
import { setAuthGate, clearAuthGate } from "@/lib/http";
import { setIsSubscribed } from "@/redux";

type Props = {
  enabled: boolean;
  orgExternalId?: string | null;
  syncAuth: (opts?: { force?: boolean; reason?: string }) => Promise<void> | void;
};

export const LiveSyncBridge: React.FC<Props> = ({ enabled, orgExternalId, syncAuth }) => {
  const dispatch = useDispatch();
  const gatePromiseRef = useRef<Promise<void> | null>(null);

  const tokenProvider = useCallback(() => getAccess(), []);

  const runGatedSync = useCallback(
    (reason: string) => {
      const p = Promise.resolve(syncAuth({ force: true, reason })) as Promise<void>;
      gatePromiseRef.current = p;
      setAuthGate(p);

      p.finally(() => {
        if (gatePromiseRef.current === p) {
          gatePromiseRef.current = null;
          clearAuthGate();
        }
      });
    },
    [syncAuth],
  );

  const handleEvent = useCallback(
    (ev: LiveSyncEnvelope) => {
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
        t === "profile.updated";

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
    tokenProvider,
    orgExternalId,
    onEvent: handleEvent,
    onAuthError,
  });

  return null;
};
