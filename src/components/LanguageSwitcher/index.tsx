// src/components/LanguageSwitcher.tsx
import { useTranslation } from "react-i18next";
import { LANGS } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select
      className="text-[12px] border border-gray-200 rounded px-2 py-1"
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {LANGS.map(l => (
        <option key={l} value={l}>
          {({ pt: "Português", en: "English", fr: "Français", de: "Deutsch" })[l]}
        </option>
      ))}
    </select>
  );
}
