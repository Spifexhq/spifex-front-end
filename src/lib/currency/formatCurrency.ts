// src/lib/currency/formatCurrency.ts
import i18n from "@/lib/i18n";
import { LanguageCookie, NumberFormatCookie } from "@/lib/cookies";
import store, { type RootState } from "@/redux/store";

export type NumberFormatCode = "EU" | "US";

const ISO_CURRENCY_RE = /^[A-Z]{3}$/;
const NBSP_RE = /[\u00A0\u202F]/g;

function normalizeSpaces(s: string) {
  return s.replace(NBSP_RE, " ");
}

/** cookie language > i18n language > en-US */
export function getAppLanguage(): string {
  const cookieLang =
    typeof document !== "undefined" ? LanguageCookie.get(false) : null;

  const lng = cookieLang || i18n.resolvedLanguage || i18n.language || "en-US";
  return lng === "en" ? "en-US" : lng;
}

function baseLang(lang: string) {
  return (lang || "en-US").split("-")[0];
}

/** Currency-locale follows app language; fallback en-US */
export function getCurrencyLocale(): string {
  const lang = getAppLanguage();
  const b = baseLang(lang);

  if (b === "pt") return "pt-BR";
  if (b === "en") return "en-US";
  if (b === "fr") return "fr-FR";
  if (b === "de") return "de-DE";

  return lang || "en-US";
}

/** Number format cookie overrides; otherwise infer from language; default US */
export function getNumberFormatCode(): NumberFormatCode {
  const cookie =
    typeof document !== "undefined" ? NumberFormatCookie.get() : null;
  if (cookie) return cookie;

  const b = baseLang(getAppLanguage());
  return b === "pt" || b === "fr" || b === "de" ? "EU" : "US";
}

export function getNumberLocale(): string {
  return getNumberFormatCode() === "EU" ? "de-DE" : "en-US";
}

export function normalizeCurrencyCode(raw: unknown): string | null {
  const v = String(raw ?? "").trim().toUpperCase();
  return ISO_CURRENCY_RE.test(v) ? v : null;
}

function getOrgCurrencyFromRedux(): string | null {
  try {
    const state = store.getState() as RootState;
    const raw = state?.auth?.organization?.organization?.currency;
    return normalizeCurrencyCode(raw);
  } catch {
    return null;
  }
}

export function getEffectiveCurrency(currency?: string): string {
  return (
    normalizeCurrencyCode(currency) ||
    getOrgCurrencyFromRedux() ||
    "USD"
  );
}

/**
 * Canonical MAJOR string only:
 * - output: "1234.56" or "-1234.56"
 * - empty input => ""
 * - accepts loose user strings like "R$ 1.234,56" / "(1,234.56)" / "1234.5"
 *
 * No floats needed: parsing is string-based and always fixes to `decimals`.
 */
export function toCanonicalMajorString(
  input: unknown,
  decimals = 2
): string {
  const raw = normalizeSpaces(String(input ?? "")).trim();
  if (!raw) return "";

  // (123,45) => negative
  let neg = false;
  let s = raw;

  if (s.includes("(") && s.includes(")")) {
    neg = true;
    s = s.replace(/[()]/g, "");
  }

  // keep digits, separators and minus
  s = s.replace(/[^\d.,-]/g, "").trim();
  if (!s) return "";

  // any minus anywhere => negative
  if (s.includes("-")) {
    neg = true;
    s = s.replace(/-/g, "");
  }

  const digitsOnly = s.replace(/\D/g, "");
  if (!digitsOnly) return "";

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  let decimalSep: "." | "," | null = null;

  if (lastDot !== -1 && lastComma !== -1) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastDot !== -1) {
    const after = s.length - lastDot - 1;
    if (after > 0 && after <= decimals) decimalSep = ".";
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    if (after > 0 && after <= decimals) decimalSep = ",";
  }

  let intPart = "";
  let fracPart = "";

  if (decimalSep) {
    const [i, f = ""] = s.split(decimalSep);
    intPart = i.replace(/[.,]/g, "");
    fracPart = f.replace(/[.,]/g, "");
  } else {
    intPart = s.replace(/[.,]/g, "");
  }

  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (!intPart) intPart = "0";

  fracPart = (fracPart + "0".repeat(decimals)).slice(0, decimals);

  const major = `${intPart}.${fracPart}`;
  const isZero = /^0(?:\.0+)?$/.test(major);

  return neg && !isZero ? `-${major}` : major;
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(locale: string, currency: string) {
  const key = `${locale}|${currency}`;
  const cached = currencyFormatterCache.get(key);
  if (cached) return cached;

  const nf = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  currencyFormatterCache.set(key, nf);
  return nf;
}

function getNumberFormatter(locale: string) {
  const cached = numberFormatterCache.get(locale);
  if (cached) return cached;

  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  numberFormatterCache.set(locale, nf);
  return nf;
}

function majorStringToNumber(major: string): number {
  const canonical = toCanonicalMajorString(major);
  if (!canonical) return 0;
  const n = Number(canonical);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formats a MAJOR decimal amount (string "1234.56" or number 1234.56)
 * respecting:
 * - currency symbol placement from language (currencyLocale)
 * - numeric separators from NumberFormatCookie (numberLocale)
 */
export function formatCurrency(amount: string | number, currency?: string): string {
  const canonical =
    typeof amount === "number" ? amount : majorStringToNumber(amount);

  const currencyLocale = getCurrencyLocale();
  const numberLocale = getNumberLocale();
  const effectiveCurrency = getEffectiveCurrency(currency);

  const currencyFormatter = getCurrencyFormatter(currencyLocale, effectiveCurrency);
  const numberFormatter = getNumberFormatter(numberLocale);

  const parts = currencyFormatter.formatToParts(canonical);
  const numericText = numberFormatter.format(Math.abs(canonical));

  let insertedNumber = false;
  const out: string[] = [];

  for (const p of parts) {
    if (p.type === "currency") {
      out.push(p.value);
      continue;
    }

    if (
      p.type === "integer" ||
      p.type === "group" ||
      p.type === "decimal" ||
      p.type === "fraction"
    ) {
      if (!insertedNumber) {
        out.push(numericText);
        insertedNumber = true;
      }
      continue;
    }

    out.push(normalizeSpaces(p.value));
  }

  return out.join("");
}

export function formatMajorNumber(amount: string): string {
  const canonical = toCanonicalMajorString(amount);
  if (!canonical) return "";
  const n = Number(canonical);
  if (!Number.isFinite(n)) return "";
  return getNumberFormatter(getNumberLocale()).format(n);
}
