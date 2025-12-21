// src/lib/location/formatTimezoneLabel.ts
/**
 * Turns "Europe/London" → "London, Europe (GMT +01:00)"
 * Also supports single-part zones like "UTC" → "UTC (GMT +00:00)".
 * Never throws if the timezone is invalid.
 */
const isValidIanaTimezone = (iana: string): boolean => {
  const tz = (iana || "").trim();
  if (!tz) return false;
  try {
    // Any formatting call will throw RangeError if timeZone is invalid
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const formatTimezoneLabel = (iana: string): string => {
  const tz = (iana || "").trim();
  if (!tz) return "";

  // If invalid, do NOT attempt offset calculations (would throw). Just show raw.
  if (!isValidIanaTimezone(tz)) {
    return tz.replace(/_/g, " ");
  }

  const now = new Date();
  let offsetStr: string | undefined;

  // 1) Try longOffset (nice when supported)
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      timeZoneName: "longOffset", // may not be supported everywhere
    }).formatToParts(now);

    offsetStr = parts.find((p) => p.type === "timeZoneName")?.value; // "GMT+01:00"
  } catch {
    // ignore; fallback below
  }

  // 2) Fallback: manual offset calc (safe because tz is valid)
  if (!offsetStr || !/^GMT[ +-]/.test(offsetStr)) {
    try {
      const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
      const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
      const diffMin = (tzDate.getTime() - utcDate.getTime()) / 60000;

      const sign = diffMin >= 0 ? "+" : "-";
      const absMin = Math.abs(diffMin);
      const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
      const minutes = String(absMin % 60).padStart(2, "0");
      offsetStr = `GMT ${sign}${hours}:${minutes}`; // "GMT +01:00"
    } catch {
      // super safe fallback (should be rare since tz is valid)
      offsetStr = "GMT";
    }
  }

  // 3) Final label (support both "Area/City" and single-part zones like "UTC")
  const parts = tz.split("/");
  if (parts.length >= 2) {
    const continent = parts[0];
    const cityRaw = parts.slice(1).join("/"); // handle "America/Argentina/Buenos_Aires"
    const city = cityRaw.replace(/_/g, " ");
    return `${city}, ${continent} (${offsetStr})`;
  }

  // Single-part zones
  const single = tz.replace(/_/g, " ");
  return `${single} (${offsetStr})`;
};
