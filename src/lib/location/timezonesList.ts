// src/lib/location/timezonesList.ts
import { formatTimezoneLabel } from "./formatTimezoneLabel";

export interface TimezoneOption {
  value: string;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw: string[] = (Intl as any).supportedValuesOf
  ? // API nova
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).supportedValuesOf("timeZone")
  : [];

/* fallback ... */

export const TIMEZONES: TimezoneOption[] = raw.map(
  (tz): TimezoneOption => ({
    value: tz,
    label: formatTimezoneLabel(tz),
  }),
);
