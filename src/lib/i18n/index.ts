import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
// import Backend from "i18next-http-backend"; // opção para carregar via HTTP

export const LANGS = ["pt", "en", "fr", "de"] as const;
export type AppLang = typeof LANGS[number];

/* ===================== Imports de JSON (sem require) ===================== */
// PT
import ptCommon from "./locales/pt/common.json";
import ptSettings from "./locales/pt/settings.json";
// EN
import enCommon from "./locales/en/common.json";
import enSettings from "./locales/en/settings.json";
// FR
import frCommon from "./locales/fr/common.json";
import frSettings from "./locales/fr/settings.json";
// DE
import deCommon from "./locales/de/common.json";
import deSettings from "./locales/de/settings.json";

/* ========================= Objeto de recursos ============================ */
const resources: Resource = {
  pt: { common: ptCommon, settings: ptSettings },
  en: { common: enCommon, settings: enSettings },
  fr: { common: frCommon, settings: frSettings },
  de: { common: deCommon, settings: deSettings },
};

i18n
  // .use(Backend) // se for carregar via HTTP
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "pt",
    supportedLngs: LANGS as unknown as string[], // i18next espera string[]
    resources,
    ns: ["common", "settings"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      // ordem: querystring > localStorage > navegador
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: { useSuspense: false },
  });

export default i18n;
