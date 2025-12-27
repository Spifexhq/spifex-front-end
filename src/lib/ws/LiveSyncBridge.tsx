import React, { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";

import { useSpifexWebSocket } from "@/lib/ws/useSpifexWebSocket";
import type { LiveSyncEnvelope } from "@/lib/ws/types";
import { getAccess } from "@/lib/tokens";
import { setAuthGate, clearAuthGate } from "@/lib/authGate";

import { setIsSubscribed } from "@/redux";

type Props = {
  enabled: boolean;
  orgExternalId?: string | null;
  syncAuth: (opts?: { force?: boolean; reason?: string }) => Promise<void> | void;
};

export const LiveSyncBridge: React.FC<Props> = ({ enabled, orgExternalId, syncAuth }) => {
  const dispatch = useDispatch();

  const tokenProvider = useCallback(() => getAccess(), []);

  const handleEvent = useCallback(
    (ev: LiveSyncEnvelope) => {
      const t = ev.type;

      const isSubEvent =
        t === "subscription.updated" ||
        t === "subscription.deleted" ||
        t === "payment.failed" ||
        t === "payment.succeeded";

      if (!isSubEvent) return;

      if (t === "payment.failed") {
        dispatch(setIsSubscribed(false));
      }

      const p = Promise.resolve(syncAuth({ force: true, reason: `ws:${t}` })) as Promise<void>;
      setAuthGate(p);
      p.finally(() => clearAuthGate());
    },
    [dispatch, syncAuth],
  );

  const onAuthError = useMemo(
    () => () => {
      void syncAuth({ force: true, reason: "ws_auth_error" });
    },
    [syncAuth],
  );

  useSpifexWebSocket({
    enabled,
    tokenProvider,
    orgExternalId,
    onEvent: handleEvent,
    onAuthError,
  });

  return null;
};
