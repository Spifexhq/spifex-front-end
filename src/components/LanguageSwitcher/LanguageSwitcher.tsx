import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LANGS } from "@/lib/i18n";
import { SelectDropdown } from "../ui/SelectDropdown";

type AppLang = (typeof LANGS)[number];

const LABELS: Record<AppLang, string> = {
  pt: "Português",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

function baseOf(lang?: string) {
  if (!lang) return "";
  const idx = lang.indexOf("-");
  return (idx > 0 ? lang.slice(0, idx) : lang).toLowerCase();
}

const isAppLang = (x: string): x is AppLang =>
  (LANGS as readonly string[]).includes(x);

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentBase = baseOf(i18n.resolvedLanguage || i18n.language);
  const current: AppLang = isAppLang(currentBase) ? currentBase : "en";

  // LANGS é readonly; criamos um array mutável para o componente
  const items = useMemo<AppLang[]>(() => [...LANGS], []);

  return (
    <div className="inline-block">
      <SelectDropdown<AppLang>
        items={items}
        selected={[current]}
        onChange={(updated: AppLang[]) => {
          const next = updated[0];
          if (next && next !== current) void i18n.changeLanguage(next);
        }}
        getItemKey={(l: AppLang) => l}
        getItemLabel={(l: AppLang) => LABELS[l]}
        singleSelect
        hideCheckboxes
        hideFilter
      />
    </div>
  );
}
