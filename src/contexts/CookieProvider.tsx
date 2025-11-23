// src/contexts/CookieProvider.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  CookieContext,
  CookieConsent,
  defaultConsent,
} from "./CookieContext";
import { api } from "@/api/requests";

/** Lê o cookie manualmente do navegador */
function readConsentCookie(): CookieConsent {
  try {
    const raw = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cookie_consent="));

    if (!raw) return defaultConsent;

    const value = raw.split("=")[1];

    const decoded = decodeURIComponent(value);

    const parsed = JSON.parse(decoded);

    return { ...defaultConsent, ...parsed };
  } catch (err) {
    console.warn("Failed to parse cookie_consent:", err);
    return defaultConsent;
  }
}

export const CookieProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [consent, setConsentState] = useState<CookieConsent>(defaultConsent);
  const [ready, setReady] = useState(false);

  /** Carrega consentimento inicial */
  useEffect(() => {
    setConsentState(readConsentCookie());
    setReady(true);
  }, []);

  /** Atualiza consentimento e força nova leitura do cookie */
  const setConsent = useCallback(async (next: CookieConsent) => {
    try {
      setConsentState(next);

      await api.saveCookieConsent(next);

      const updated = readConsentCookie();
      setConsentState(updated);
    } catch (error) {
      console.error("Failed to update cookie consent:", error);
    }
  }, []);

  return (
    <CookieContext.Provider value={{ consent, setConsent, ready }}>
      {children}
    </CookieContext.Provider>
  );
};
