// src/components/LanguageSwitcher.tsx
import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGS } from "@/lib/i18n";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

type AppLang = (typeof LANGS)[number];

const LABELS: Record<AppLang, string> = {
  pt: "Português",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

const COOKIE_NAME = "app_language";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const I18NEXT_STORAGE_KEY = "i18nextLng";

function baseOf(lang?: string) {
  if (!lang) return "";
  const idx = lang.indexOf("-");
  return (idx > 0 ? lang.slice(0, idx) : lang).toLowerCase();
}

const isAppLang = (x: string): x is AppLang =>
  (LANGS as readonly string[]).includes(x);

/* ----------------------- Cookie helpers ----------------------- */

function getLanguageFromCookie(): AppLang | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split("; ");
  const langCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!langCookie) return null;

  const value = langCookie.split("=")[1];
  return isAppLang(value) ? value : null;
}

function setLanguageCookie(lang: AppLang): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; secure; samesite=lax`;
}

/* ------------------------- Component -------------------------- */

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentBase = baseOf(i18n.resolvedLanguage || i18n.language);
  const current: AppLang = isAppLang(currentBase) ? currentBase : "en";

  const items = useMemo<AppLang[]>(() => [...LANGS], []);

  // Sync cookie + localStorage the first time the user lands
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cookieLang = getLanguageFromCookie();
    const stored = window.localStorage.getItem(I18NEXT_STORAGE_KEY);

    const storedBase = stored ? baseOf(stored) : null;
    const storedLang = storedBase && isAppLang(storedBase) ? storedBase : null;

    const effective = cookieLang ?? storedLang;

    if (!effective) {
      // First visit: persist whatever i18next resolved
      setLanguageCookie(current);
      window.localStorage.setItem(I18NEXT_STORAGE_KEY, current);
    } else {
      // Make sure cookie/localStorage are aligned with the effective lang
      if (effective !== cookieLang) setLanguageCookie(effective);
      if (effective !== storedLang) {
        window.localStorage.setItem(I18NEXT_STORAGE_KEY, effective);
      }
    }
  }, [current]);

  const handleLanguageChange = (updated: AppLang[]) => {
    const next = updated[0];

    if (!next || next === current) return;

    // 1) Persist choice for next load
    setLanguageCookie(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(I18NEXT_STORAGE_KEY, next);
    }

    // 2) Hard reload so the whole app mounts with the new language
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="inline-block">
      <SelectDropdown<AppLang>
        items={items}
        selected={[current]}
        onChange={handleLanguageChange}
        getItemKey={(l: AppLang) => l}
        getItemLabel={(l: AppLang) => LABELS[l]}
        singleSelect
        hideCheckboxes
        hideFilter
      />
    </div>
  );
}
