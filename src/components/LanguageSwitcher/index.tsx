import { useTranslation } from "react-i18next";
import { LANGS } from "@/lib/i18n";

const LABELS: Record<string, string> = {
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

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = baseOf(i18n.resolvedLanguage || i18n.language) || "en";

  return (
    <select
      className="text-[12px] border border-gray-200 rounded px-2 py-1"
      value={current}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {LANGS.map((l) => (
        <option key={l} value={l}>
          {LABELS[l] || l}
        </option>
      ))}
    </select>
  );
}
