import { useEffect, useRef, useState } from "react";
import { AUTH_SYNC_EVENT, request } from "@/core/api/http";
import { buildWsUrl } from "./url";
import { isLiveSyncEnvelope, type LiveSyncEnvelope } from "./types";

type Options = { enabled: boolean; orgExternalId?: string | null; onEvent?: (event: LiveSyncEnvelope) => void; onAuthError?: () => void; onConnected?: () => void };

/** One socket per workspace. Callback changes do not reconnect the socket. */
export function useSpifexWebSocket(opts: Options) {
  const callbacks = useRef(opts);
  callbacks.current = opts;
  const [status, setStatus] = useState("idle");
  const { enabled, orgExternalId } = opts;
  useEffect(() => {
    if (!enabled || !orgExternalId) { setStatus("idle"); return; }
    let disposed = false, connecting = false, attempt = 0;
    let socket: WebSocket | null = null;
    let retry: number | undefined, heartbeat: number | undefined;
    let lastMessage = 0;
    const clear = () => { window.clearTimeout(retry); window.clearInterval(heartbeat); };
    const reconnect = () => {
      if (disposed || document.hidden) return;
      window.clearTimeout(retry);
      const delay = Math.min(30_000, 500 * 2 ** Math.min(attempt++, 6));
      retry = window.setTimeout(() => void connect(), delay + Math.random() * 300);
    };
    const connect = async () => {
      if (disposed || connecting || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
      connecting = true;
      setStatus("connecting");
      try {
        const response = await request<{ ticket: string }>("auth/live-ticket/", "POST", { org_external_id: orgExternalId }, { skipAuthGate: true });
        if (disposed) return;
        const ws = new WebSocket(buildWsUrl({ ticket: response.data.ticket }));
        socket = ws;
        ws.onopen = () => {
          if (disposed) { ws.close(); return; }
          setStatus("open"); attempt = 0; lastMessage = Date.now();
          callbacks.current.onConnected?.();
          heartbeat = window.setInterval(() => {
            if (Date.now() - lastMessage > 75_000) { ws.close(); return; }
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "livesync.ping" }));
          }, 30_000);
        };
        ws.onmessage = event => {
          if (disposed || socket !== ws) return;
          try {
            const data = JSON.parse(String(event.data));
            if (data?.v !== 1) return;
            lastMessage = Date.now();
            if (isLiveSyncEnvelope(data)) callbacks.current.onEvent?.(data);
          } catch { /* Ignore malformed server messages. */ }
        };
        ws.onerror = () => { if (!disposed) setStatus("error"); };
        ws.onclose = event => {
          if (disposed || socket !== ws) return;
          clear(); socket = null; setStatus("closed");
          if (event.code === 4401 || event.code === 4403) callbacks.current.onAuthError?.();
          reconnect();
        };
      } catch (error) {
        if (!disposed) {
          setStatus("error");
          const code = (error as { status?: number }).status;
          if (code === 401 || code === 403) callbacks.current.onAuthError?.();
          reconnect();
        }
      } finally { connecting = false; }
    };
    const resume = () => { if (!document.hidden) void connect(); };
    const onAuth = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
      if (reason === "token_refreshed") resume();
    };
    void connect();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener(AUTH_SYNC_EVENT, onAuth);
    return () => {
      disposed = true; clear();
      if (socket) { socket.onclose = null; socket.close(1000, "workspace changed"); }
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener(AUTH_SYNC_EVENT, onAuth);
    };
  }, [enabled, orgExternalId]);
  return { status };
}
