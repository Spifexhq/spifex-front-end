type BuildOpts = { ticket: string };
export function buildWsUrl({ ticket }: BuildOpts): string {
  const raw = String(import.meta.env.VITE_WS_BASE_URL || "").trim().replace(/^http/i, "ws");
  const url = new URL(raw);
  if (!["ws:", "wss:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid WebSocket URL");
  if (import.meta.env.PROD && url.protocol !== "wss:") throw new Error("Production live sync requires WSS");
  url.pathname = "/ws/v1/stream/";
  url.search = "";
  url.hash = "";
  url.searchParams.set("ticket", ticket);
  return url.toString();
}
