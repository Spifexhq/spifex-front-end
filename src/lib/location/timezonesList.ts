// src/lib/location/timezonesList.ts
import { formatTimezoneLabel } from "./formatTimezoneLabel";

export interface TimezoneOption {
  value: string;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw: string[] = (Intl as any).supportedValuesOf
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).supportedValuesOf("timeZone")
  : [];

// Fallback list used when Intl.supportedValuesOf("timeZone") is not available.
// Keep it reasonably broad to cover common user bases.
const FALLBACK_TIMEZONES: readonly string[] = [
  "UTC",

  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Vienna",
  "Europe/Prague",
  "Europe/Warsaw",
  "Europe/Budapest",
  "Europe/Athens",
  "Europe/Dublin",
  "Europe/Oslo",
  "Europe/Stockholm",
  "Europe/Copenhagen",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Europe/Kyiv",

  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Toronto",

  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",

  "Asia/Dubai",
  "Asia/Jerusalem",
  "Asia/Riyadh",
  "Asia/Tehran",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",

  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const timezonesSource = raw.length > 0 ? raw : (FALLBACK_TIMEZONES as string[]);

export const TIMEZONES: TimezoneOption[] = timezonesSource.map(
  (tz): TimezoneOption => ({
    value: tz,
    label: formatTimezoneLabel(tz),
  }),
);

// ✅ fast membership check against TIMEZONES
const TIMEZONE_SET: ReadonlySet<string> = new Set(TIMEZONES.map((t) => t.value));

export const isSupportedTimezone = (iana: string): boolean => {
  const tz = (iana || "").trim();
  if (!tz) return false;

  // primary: must exist in our list
  if (TIMEZONE_SET.size > 0) return TIMEZONE_SET.has(tz);

  // safety fallback (in case TIMEZONES is empty on some env)
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
};
