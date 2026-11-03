import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPageTitleKey, getSettingsDescriptionKey } from "@/shared/layout/Navbar/pageTitle";
export default function SettingsPageHeading() {
  const { pathname } = useLocation();
  const { t } = useTranslation(["navbar", "settingsSidebar", "accountingSettings"]);
  return <div className="settings-page-heading"><header className="settings-content">
    <h1 className="text-xl font-semibold tracking-tight text-gray-900">{t(getPageTitleKey(pathname))}</h1>
    <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-gray-500">{t(getSettingsDescriptionKey(pathname), { defaultValue: t("navbar:settingsDescription") })}</p>
  </header></div>;
}
