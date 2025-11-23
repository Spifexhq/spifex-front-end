// src/components/contexts/CookieContext.tsx
import { createContext } from "react";

export type CookieConsent = {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
};

export const defaultConsent: CookieConsent = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
  personalization: false,
};

export interface CookieContextValue {
  consent: CookieConsent;
  setConsent: (next: CookieConsent) => void;
  ready: boolean;
}

export const CookieContext = createContext<CookieContextValue>({
  consent: defaultConsent,
  setConsent: () => {},
  ready: false,
});
