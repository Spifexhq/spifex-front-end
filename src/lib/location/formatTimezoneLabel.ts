// src/lib/location/formatTimezoneLabel.ts
/**
 * Turns "Europe/London" → "London, Europe (GMT +01:00)"
 * Also supports single-part zones like "UTC" → "UTC (GMT +00:00)".
 */
export const formatTimezoneLabel = (iana: string): string => {
  if (!iana) return "";

  const now = new Date();
  let offsetStr: string | undefined;

  // 1) Try longOffset (falls back below if not supported)
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: iana,
      timeZoneName: "longOffset", // e.g., "GMT+01:00"
    }).formatToParts(now);
    offsetStr = parts.find((p) => p.type === "timeZoneName")?.value; // "GMT+01:00"
  } catch {
    // ignore; fallback below
  }

  // 2) Fallback: manual offset calc
  if (!offsetStr || !/^GMT[ +-]/.test(offsetStr)) {
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate  = new Date(now.toLocaleString("en-US", { timeZone: iana }));
    const diffMin = (tzDate.getTime() - utcDate.getTime()) / 60000;

    const sign    = diffMin >= 0 ? "+" : "-";
    const absMin  = Math.abs(diffMin);
    const hours   = String(Math.floor(absMin / 60)).padStart(2, "0");
    const minutes = String(absMin % 60).padStart(2, "0");
    offsetStr     = `GMT ${sign}${hours}:${minutes}`; // "GMT +01:00"
  }

  // 3) Final label (support both "Area/City" and single-part zones like "UTC")
  const parts = iana.split("/");
  if (parts.length >= 2) {
    const continent = parts[0];
    const cityRaw   = parts.slice(1).join("/"); // handle "America/Argentina/Buenos_Aires"
    const city      = cityRaw.replace(/_/g, " ");
    return `${city}, ${continent} (${offsetStr})`;
  }

  // Single-part zones
  const single = iana.replace(/_/g, " ");
  return `${single} (${offsetStr})`;
};
