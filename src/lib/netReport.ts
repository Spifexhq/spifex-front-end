// src/lib/netReport.ts
// --- NetReport: coleta telemetria de requests no browser ---
import type { Method } from "axios";

type NetEvent = {
  t: number;                 // epoch ms
  method: Method;
  url: string;               // path sem query (normalizado)
  fullUrl: string;           // com query
  status?: number;           // HTTP status
  ms?: number;               // duração
  retried429?: number;       // nº de retries por 429
  retryAfterMs?: number;     // backoff aplicado
  reqId?: string;            // X-Request-Id
};

type Row = {
  url: string;
  method: string;
  count: number;
  ok: number;
  s429: number;
  s4xx: number;
  s5xx: number;
  avgMs: number;
};

function normalizeUrl(u: string) {
  try {
    const path = new URL(u, location.origin).pathname;
    return path.endsWith("/") ? path.slice(0, -1) : path;
  } catch {
    return u.split("?")[0];
  }
}

function csvEscape(s: string) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

class NetReportImpl {
  private events: NetEvent[] = [];
  private startedAt = Date.now();

  push(ev: NetEvent) { this.events.push(ev); }

  snapshot(minutes = 5) {
    const cutoff = Date.now() - minutes * 60_000;
    return this.events.filter(e => e.t >= cutoff);
  }

  table(minutes = 5): Row[] {
    const data = this.snapshot(minutes);
    const byKey = new Map<string, Row>();
    for (const e of data) {
      const key = `${e.method} ${normalizeUrl(e.url)}`;
      let row = byKey.get(key);
      if (!row) {
        row = { url: normalizeUrl(e.url), method: String(e.method), count: 0, ok: 0, s429: 0, s4xx: 0, s5xx: 0, avgMs: 0 };
        byKey.set(key, row);
      }
      row.count++;
      if (e.status) {
        if (e.status === 429) row.s429++;
        else if (e.status >= 500) row.s5xx++;
        else if (e.status >= 400) row.s4xx++;
        else row.ok++;
      }
      if (e.ms != null) {
        // média incremental
        row.avgMs += (e.ms - row.avgMs) / row.count;
      }
    }
    return [...byKey.values()].sort((a,b)=> (b.count - a.count) || a.url.localeCompare(b.url));
  }

  print(minutes = 5) {
    console.table(this.table(minutes));
  }

  downloadCSV(minutes = 5) {
    const data = this.snapshot(minutes);
    const header = ["t", "method", "url", "fullUrl", "status", "ms", "retried429", "retryAfterMs", "reqId"];
    const rows = data.map(e => [
      new Date(e.t).toISOString(), e.method, normalizeUrl(e.url), e.fullUrl ?? e.url,
      e.status ?? "", e.ms ?? "", e.retried429 ?? "", e.retryAfterMs ?? "", e.reqId ?? ""
    ].map(x => csvEscape(String(x))).join(","));
    const csv = header.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `net_report_${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
    a.click();
  }

  sinceStartSeconds() { return Math.round((Date.now() - this.startedAt)/1000); }
}

declare global {
  interface Window { NetReport: NetReportImpl; }
}

if (!window.NetReport) window.NetReport = new NetReportImpl();
