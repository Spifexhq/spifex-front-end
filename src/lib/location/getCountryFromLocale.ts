// src/lib/location/getCountryFromLocale.ts
import { useEffect, useState } from "react";

/** Construtor de Intl.Locale (quando disponível no runtime) */
interface IntlLocale {
  maximize: () => { region?: string };
  region?: string;
}
type IntlWithLocale = typeof Intl & { Locale?: new (tag: string) => IntlLocale };

/** GeoIP providers (retornam ISO-2) */
async function fetchFromIpApi(signal?: AbortSignal): Promise<string | null> {
  const r = await fetch("https://ipapi.co/country/", { signal });
  if (!r.ok) return null;
  const t = (await r.text()).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : null;
}

async function fetchFromIpWho(signal?: AbortSignal): Promise<string | null> {
  const r = await fetch("https://ipwho.is/?fields=country_code", { signal });
  if (!r.ok) return null;
  const j: { country_code?: string } = await r.json();
  const t = (j.country_code || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : null;
}

/** 1) GEOIP (preferido) com race + timeout */
export async function fetchCountryByIP(
  { timeoutMs = 3500 }: { timeoutMs?: number } = {}
): Promise<string | null> {
  if (typeof fetch !== "function") return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    // Tenta ambos os provedores em paralelo; usa o primeiro que retornar não-nulo
    const results = await Promise.allSettled([
      fetchFromIpApi(ctrl.signal),
      fetchFromIpWho(ctrl.signal),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) return r.value;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 2) Locale do navegador (ex.: "pt-BR" -> "BR") */
export function getCountryFromLocale(): string | null {
  try {
    const { locale } = Intl.DateTimeFormat().resolvedOptions();
    const IntlWL = Intl as unknown as IntlWithLocale;

    if (typeof IntlWL.Locale === "function") {
      const loc = new IntlWL.Locale(locale);
      const region = loc.maximize()?.region ?? loc.region;
      return region ? String(region).toUpperCase() : null;
    }

    const parts = String(locale).split("-");
    return parts[1] ? parts[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

/** 3) (Opcional) Heurística simples por timezone para casos sem IP/locale */
export function getCountryFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    // Mapeamentos mínimos e explícitos. Expanda conforme a necessidade.
    if (/lisbon/i.test(tz)) return "PT";
    if (/london/i.test(tz)) return "GB";
    return null;
  } catch {
    return null;
  }
}

/** Detecta país priorizando IP (rede atual), depois locale e por fim timezone */
export async function detectCountry(
  { timeoutMs = 3500 }: { timeoutMs?: number } = {}
): Promise<string | null> {
  // cache por sessão para evitar hits repetidos
  try {
    const cached = sessionStorage.getItem("autoCountryISO2");
    if (cached) return cached;
  } catch { /* ignore */ }

  const fromIP = await fetchCountryByIP({ timeoutMs });
  if (fromIP) {
    try { sessionStorage.setItem("autoCountryISO2", fromIP); } catch { /* ignore */ }
    return fromIP;
  }

  const fromLocale = getCountryFromLocale();
  if (fromLocale) {
    try { sessionStorage.setItem("autoCountryISO2", fromLocale); } catch { /* ignore */ }
    return fromLocale;
  }

  const fromTZ = getCountryFromTimezone();
  if (fromTZ) {
    try { sessionStorage.setItem("autoCountryISO2", fromTZ); } catch { /* ignore */ }
    return fromTZ;
  }

  return null;
}

/** Hook React */
export function useAutoCountry(
  { timeoutMs = 3500, ipOnly = false }: { timeoutMs?: number; ipOnly?: boolean } = {}
): { user_country: string; isLoading: boolean } {
  const [country, setCountry] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Se ipOnly for true, ignora locale/timezone e tenta só rede
        if (ipOnly) {
          const ipC = await fetchCountryByIP({ timeoutMs });
          if (alive && ipC) setCountry(ipC);
          return;
        }

        const c = await detectCountry({ timeoutMs });
        if (alive && c) setCountry(c);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [timeoutMs, ipOnly]);

  return { user_country: country, isLoading };
}
