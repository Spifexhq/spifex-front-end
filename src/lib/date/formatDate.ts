// src/lib/date/formatDate.ts
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { ptBR, enUS, fr, de } from "date-fns/locale";
import i18n from "@/lib/i18n";

export type DateFormatPreference = "AUTO" | "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO";

export const DATE_COOKIE_NAME = "app_date_format";

/* ------------------------------ Cookies ------------------------------ */

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ").filter((c) => c.startsWith(`${name}=`));
  if (!parts.length) return null;
  try {
    return decodeURIComponent(parts[0].split("=")[1]);
  } catch {
    return null;
  }
}

/* ------------------------------ Helpers ------------------------------ */

function getBaseLang(): string {
  const lng = i18n.resolvedLanguage || i18n.language || "en";
  return lng.split("-")[0]; // pt-BR -> pt
}

function getDateLocale(base: string): Locale {
  switch (base) {
    case "pt":
      return ptBR;
    case "fr":
      return fr;
    case "de":
      return de;
    default:
      return enUS;
  }
}

/** Language → default date format code (when AUTO) */
export function inferSystemDateFormatCode(
  base: string
): Exclude<DateFormatPreference, "AUTO"> {
  if (base === "pt" || base === "fr" || base === "de") return "DMY_SLASH";
  if (base === "en") return "MDY_SLASH";
  return "YMD_ISO";
}

/** Reads the cookie; if not set or invalid, returns AUTO */
export function getCurrentDateFormatPreference(): DateFormatPreference {
  const cookie = getCookie(DATE_COOKIE_NAME);
  if (cookie === "DMY_SLASH" || cookie === "MDY_SLASH" || cookie === "YMD_ISO") {
    return cookie;
  }
  return "AUTO";
}

/** Effective format = cookie (if NOT AUTO) or inferred by language */
export function getEffectiveDateFormat(): {
  code: Exclude<DateFormatPreference, "AUTO">;
  locale: Locale;
} {
  const base = getBaseLang();
  const pref = getCurrentDateFormatPreference();
  const code =
    pref === "AUTO" ? inferSystemDateFormatCode(base) : (pref as Exclude<DateFormatPreference, "AUTO">);
  const locale = getDateLocale(base);
  return { code, locale };
}

/** Format an ISO date string (YYYY-MM-DD or full ISO) according to preferences */
export function formatDateFromISO(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";

  const { code, locale } = getEffectiveDateFormat();

  switch (code) {
    case "DMY_SLASH":
      return format(d, "dd/MM/yyyy", { locale });
    case "MDY_SLASH":
      return format(d, "MM/dd/yyyy", { locale });
    case "YMD_ISO":
    default:
      return format(d, "yyyy-MM-dd", { locale });
  }
}

/** Format an ISO datetime string (YYYY-MM-DDTHH:mm:ssZ) with date + time */
export function formatDateTimeFromISO(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "";

  const { code, locale } = getEffectiveDateFormat();

  switch (code) {
    case "DMY_SLASH":
      // 24h time, cookie-based date
      return format(d, "dd/MM/yyyy HH:mm", { locale });
    case "MDY_SLASH":
      return format(d, "MM/dd/yyyy HH:mm", { locale });
    case "YMD_ISO":
    default:
      return format(d, "yyyy-MM-dd HH:mm", { locale });
  }
}
