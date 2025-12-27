import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_SYNC_EVENT } from "@/lib/http";
import { buildWsUrl } from "@/lib/ws/url";
import { isLiveSyncEnvelope, type LiveSyncEnvelope } from "@/lib/ws/types";

type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

type Options = {
  enabled: boolean;
  tokenProvider: () => string;
  orgExternalId?: string | null;

  onEvent?: (ev: LiveSyncEnvelope) => void;
  onAuthError?: () => void;

  backoffBaseMs?: number;
  backoffMaxMs?: number;
};

function jitter(ms: number) {
  return ms + Math.random() * 250;
}

export function useSpifexWebSocket(opts: Options) {
  const {
    enabled,
    tokenProvider,
    orgExternalId,
    onEvent,
    onAuthError,
    backoffBaseMs = 500,
    backoffMaxMs = 30_000,
  } = opts;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const pingTimer = useRef<number | null>(null);
  const retryCount = useRef<number>(0);

  const connectRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<WsStatus>("idle");

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (pingTimer.current) {
      window.clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  const closeWs = useCallback(
    (code?: number, reason?: string) => {
      clearTimers();
      const ws = wsRef.current;
      wsRef.current = null;

      if (!ws) return;

      try {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.close(code, reason);
      } catch {
        // ignore
      }
    },
    [clearTimers],
  );

  const scheduleReconnect = useCallback(() => {
    if (!enabled) return;
    if (document.hidden) return;

    retryCount.current += 1;
    const attempt = retryCount.current;

    const delay = Math.min(backoffMaxMs, backoffBaseMs * Math.pow(2, attempt - 1));
    const wait = jitter(delay);

    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);

    reconnectTimer.current = window.setTimeout(() => {
      connectRef.current();
    }, wait);
  }, [enabled, backoffBaseMs, backoffMaxMs]);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = (tokenProvider() || "").trim();
    if (!token) {
      setStatus("idle");
      return;
    }

    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus("connecting");

    let url: string;
    try {
      url = buildWsUrl({ token, orgExternalId });
    } catch {
      setStatus("error");
      scheduleReconnect();
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retryCount.current = 0;
      setStatus("open");

      pingTimer.current = window.setInterval(() => {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          // ignore
        }
      }, 30_000);
    };

    ws.onmessage = (m) => {
      try {
        const parsed = JSON.parse(String(m.data));
        if (!isLiveSyncEnvelope(parsed)) return;
        onEvent?.(parsed);
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = (evt) => {
      clearTimers();

      if (evt.code === 4401 || evt.code === 4403) {
        setStatus("closed");
        onAuthError?.();
        return;
      }

      setStatus("closed");
      scheduleReconnect();
    };
  }, [enabled, tokenProvider, orgExternalId, onEvent, onAuthError, clearTimers, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) {
      retryCount.current = 0;
      closeWs(1000, "disabled");
      setStatus("idle");
      return;
    }

    connect();
    return () => closeWs(1000, "unmount");
  }, [enabled, connect, closeWs]);

  useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
      if (!document.hidden && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
        connectRef.current();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onAuthSync = (e: Event) => {
      const ce = e as CustomEvent;
      const reason = (ce.detail as { reason?: string } | undefined)?.reason;

      if (reason === "token_refreshed") {
        closeWs(1000, "token_refreshed");
        connectRef.current();
      }
    };

    window.addEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
    return () => window.removeEventListener(AUTH_SYNC_EVENT, onAuthSync as EventListener);
  }, [enabled, closeWs]);

  return useMemo(
    () => ({
      status,
      reconnectNow: () => {
        retryCount.current = 0;
        closeWs(1000, "manual_reconnect");
        connectRef.current();
      },
      disconnect: () => closeWs(1000, "manual_disconnect"),
    }),
    [status, closeWs],
  );
}
