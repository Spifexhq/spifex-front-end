/* --------------------------------------------------------------------------
 * File: src/pages/FormatSettings.tsx
 * Manage display formats for dates and numbers.
 * - Uses "formatPreferences" i18n namespace
 * - If no choice is made (AUTO): inferred from i18n language
 * - Overrides are saved in cookies and take precedence
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { ptBR, enUS, fr, de } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";

import { useAuthContext } from "src/hooks/useAuth";

/* ------------------------------- Types ----------------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type DateFormatCode = "AUTO" | "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO";
type NumberFormatCode = "AUTO" | "EU" | "US";

/* ------------------------------ Cookies ---------------------------------- */
const DATE_COOKIE_NAME = "app_date_format";
const NUMBER_COOKIE_NAME = "app_number_format";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

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

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAgeSeconds}; secure; samesite=lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/* -------------------------------- Helpers -------------------------------- */
function getInitials(name?: string) {
  if (!name) return "FM";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

const Row = ({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {action}
  </div>
);

function getBaseLang(i18nLang: string | undefined): string {
  return (i18nLang || "en").split("-")[0];
}

function getDateLocale(base: string) {
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
function inferSystemDateFormatCode(base: string): Exclude<DateFormatCode, "AUTO"> {
  if (base === "pt" || base === "fr" || base === "de") return "DMY_SLASH";
  if (base === "en") return "MDY_SLASH";
  return "YMD_ISO";
}

/** Language → default number format code (when AUTO) */
function inferSystemNumberFormatCode(base: string): Exclude<NumberFormatCode, "AUTO"> {
  if (base === "pt" || base === "fr" || base === "de") return "EU";
  return "US";
}

function formatSampleDate(code: Exclude<DateFormatCode, "AUTO">, d: Date, locale: Locale) {
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

function formatSampleNumber(code: Exclude<NumberFormatCode, "AUTO">, value: number) {
  if (code === "EU") {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  // US default
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/* -------------------------------------------------------------------------- */
const FormatSettings: React.FC = () => {
  const { t, i18n } = useTranslation("formatSettings");
  const { user: authUser } = useAuthContext();

  /* ----------------------------- Title + lang ------------------------------ */
  useEffect(() => {
    document.title = t("title");
  }, [t]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const baseLang = getBaseLang(i18n.language);
  const dateLocale = useMemo(() => getDateLocale(baseLang), [baseLang]);

  const today = useMemo(() => new Date(), []);
  const sampleNumberValue = 1234567.89;

  /* ------------------------------ Flags/State ------------------------------ */
  const [isInitialLoading] = useState(false); // no backend call needed
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const [dateFormat, setDateFormat] = useState<DateFormatCode>("AUTO");
  const [numberFormat, setNumberFormat] = useState<NumberFormatCode>("AUTO");

  const [initialDateFormat, setInitialDateFormat] = useState<DateFormatCode>("AUTO");
  const [initialNumberFormat, setInitialNumberFormat] = useState<NumberFormatCode>("AUTO");

  /* ------------------------------ Bootstrap -------------------------------- */
  useEffect(() => {
    const cookieDate = getCookie(DATE_COOKIE_NAME);
    const cookieNumber = getCookie(NUMBER_COOKIE_NAME);

    let d: DateFormatCode = "AUTO";
    let n: NumberFormatCode = "AUTO";

    if (cookieDate === "DMY_SLASH" || cookieDate === "MDY_SLASH" || cookieDate === "YMD_ISO") {
      d = cookieDate;
    }

    if (cookieNumber === "EU" || cookieNumber === "US") {
      n = cookieNumber;
    }

    setDateFormat(d);
    setNumberFormat(n);
    setInitialDateFormat(d);
    setInitialNumberFormat(n);
  }, []);

  /* ---------------------- Effective formats (with AUTO) -------------------- */
  const effectiveDateFormat: Exclude<DateFormatCode, "AUTO"> = useMemo(
    () =>
      dateFormat === "AUTO"
        ? inferSystemDateFormatCode(baseLang)
        : (dateFormat as Exclude<DateFormatCode, "AUTO">),
    [dateFormat, baseLang]
  );

  const effectiveNumberFormat: Exclude<NumberFormatCode, "AUTO"> = useMemo(
    () =>
      numberFormat === "AUTO"
        ? inferSystemNumberFormatCode(baseLang)
        : (numberFormat as Exclude<NumberFormatCode, "AUTO">),
    [numberFormat, baseLang]
  );

  const systemDateFormat = useMemo(
    () => inferSystemDateFormatCode(baseLang),
    [baseLang]
  );
  const systemNumberFormat = useMemo(
    () => inferSystemNumberFormatCode(baseLang),
    [baseLang]
  );

  const systemDateSample = useMemo(
    () => formatSampleDate(systemDateFormat, today, dateLocale),
    [systemDateFormat, today, dateLocale]
  );
  const systemNumberSample = useMemo(
    () => formatSampleNumber(systemNumberFormat, sampleNumberValue),
    [systemNumberFormat]
  );

  /* ------------------------------ Derived UI ------------------------------- */
  const effectiveDateSample = useMemo(
    () => formatSampleDate(effectiveDateFormat, today, dateLocale),
    [effectiveDateFormat, today, dateLocale]
  );

  const effectiveNumberSample = useMemo(
    () => formatSampleNumber(effectiveNumberFormat, sampleNumberValue),
    [effectiveNumberFormat]
  );

  const hasUnsavedChanges =
    dateFormat !== initialDateFormat || numberFormat !== initialNumberFormat;

  /* ------------------------------ Handlers --------------------------------- */
  const handleSave = useCallback(() => {
    setIsSubmitting(true);

    try {
      // Date format
      if (dateFormat === "AUTO") {
        clearCookie(DATE_COOKIE_NAME);
      } else {
        setCookie(DATE_COOKIE_NAME, dateFormat, COOKIE_MAX_AGE);
      }

      // Number format
      if (numberFormat === "AUTO") {
        clearCookie(NUMBER_COOKIE_NAME);
      } else {
        setCookie(NUMBER_COOKIE_NAME, numberFormat, COOKIE_MAX_AGE);
      }

      setInitialDateFormat(dateFormat);
      setInitialNumberFormat(numberFormat);

      setSnack({
        message: t("toast.saved"),
        severity: "success",
      });
    } catch (err) {
      console.error("Error saving format preferences", err);
      setSnack({
        message: t("toast.error"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [dateFormat, numberFormat, t]);

  /* ----------------------------- Loading UI -------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={5} />
      </>
    );
  }

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      {/* thin progress while saving */}
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(authUser?.name)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.title")}
                  </h1>
                  <p className="mt-0.5 text-[12px] text-gray-600">
                    {t("header.subtitle")}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Main card */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {t("section.formats")}
                </span>
              </div>

              <div className="divide-y divide-gray-200">
                {/* Date row */}
                <Row
                  label={t("field.date")}
                  value={
                    <span className="text-[13px]">
                      {dateFormat === "AUTO"
                        ? t("date.currentAuto", {
                            example: systemDateSample,
                          })
                        : t("date.currentCustom", {
                            example: effectiveDateSample,
                          })}
                    </span>
                  }
                />

                {/* Date choices */}
                <div className="px-4 pb-3 pt-1">
                  <div className="grid gap-3 md:grid-cols-3">
                    {/* AUTO */}
                    <button
                      type="button"
                      onClick={() => setDateFormat("AUTO")}
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        dateFormat === "AUTO"
                          ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimarySoft)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {t("date.auto")}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            dateFormat === "AUTO"
                              ? "border-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {dateFormat === "AUTO" && (
                            <span className="h-2 w-2 rounded-full bg-[color:var(--accentPrimary)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-600">
                        {t("date.autoHint", {
                          example: systemDateSample,
                        })}
                      </p>
                    </button>

                    {/* DMY */}
                    <button
                      type="button"
                      onClick={() => setDateFormat("DMY_SLASH")}
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        dateFormat === "DMY_SLASH"
                          ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimarySoft)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {t("date.dmyTitle")}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            dateFormat === "DMY_SLASH"
                              ? "border-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {dateFormat === "DMY_SLASH" && (
                            <span className="h-2 w-2 rounded-full bg-[color:var(--accentPrimary)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-600">
                        {t("date.dmyHint", {
                          example: formatSampleDate("DMY_SLASH", today, dateLocale),
                        })}
                      </p>
                    </button>

                    {/* MDY / ISO (third option, label depends on language) */}
                    <button
                      type="button"
                      onClick={() =>
                        setDateFormat(baseLang === "en" ? "MDY_SLASH" : "YMD_ISO")
                      }
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        dateFormat === "MDY_SLASH" || dateFormat === "YMD_ISO"
                          ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimarySoft)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {baseLang === "en"
                            ? t("date.mdyTitle")
                            : t("date.isoTitle")}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            dateFormat === "MDY_SLASH" || dateFormat === "YMD_ISO"
                              ? "border-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {(dateFormat === "MDY_SLASH" || dateFormat === "YMD_ISO") && (
                            <span className="h-2 w-2 rounded-full bg-[color:var(--accentPrimary)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-600">
                        {baseLang === "en"
                          ? t("date.mdyHint", {
                              example: formatSampleDate("MDY_SLASH", today, dateLocale),
                            })
                          : t("date.isoHint", {
                              example: formatSampleDate("YMD_ISO", today, dateLocale),
                            })}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Number row */}
                <Row
                  label={t("field.number")}
                  value={
                    <span className="text-[13px]">
                      {numberFormat === "AUTO"
                        ? t("number.currentAuto", {
                            example: systemNumberSample,
                          })
                        : t("number.currentCustom", {
                            example: effectiveNumberSample,
                          })}
                    </span>
                  }
                />

                {/* Number choices */}
                <div className="px-4 pb-4 pt-1">
                  <div className="grid gap-3 md:grid-cols-3">
                    {/* AUTO */}
                    <button
                      type="button"
                      onClick={() => setNumberFormat("AUTO")}
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        numberFormat === "AUTO"
                          ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimarySoft)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {t("number.auto")}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            numberFormat === "AUTO"
                              ? "border-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {numberFormat === "AUTO" && (
                            <span className="h-2 w-2 rounded-full bg-[color:var(--accentPrimary)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-600">
                        {t("number.autoHint", {
                          example: systemNumberSample,
                        })}
                      </p>
                    </button>

                    {/* EU */}
                    <button
                      type="button"
                      onClick={() => setNumberFormat("EU")}
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        numberFormat === "EU"
                          ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimarySoft)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {t("number.euTitle")}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            numberFormat === "EU"
                              ? "border-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {numberFormat === "EU" && (
                            <span className="h-2 w-2 rounded-full bg-[color:var(--accentPrimary)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-600">
                        {t("number.euHint", {
                          example: formatSampleNumber("EU", sampleNumberValue),
                        })}
                      </p>
                    </button>

                    {/* US */}
                    <button
                      type="button"
                      onClick={() => setNumberFormat("US")}
                      className={`text-left rounded-lg border px-3 py-2.5 transition ${
                        numberFormat === "US"
                          ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimarySoft)]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {t("number.usTitle")}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            numberFormat === "US"
                              ? "border-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                        >
                          {numberFormat === "US" && (
                            <span className="h-2 w-2 rounded-full bg-[color:var(--accentPrimary)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-gray-600">
                        {t("number.usHint", {
                          example: formatSampleNumber("US", sampleNumberValue),
                        })}
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <p className="text-[12px] text-gray-600">
                  {t("footer.preview", {
                    date: effectiveDateSample,
                    number: effectiveNumberSample,
                  })}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSubmitting || !hasUnsavedChanges}
                >
                  {t("btn.save")}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default FormatSettings;
