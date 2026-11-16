import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PersonalSettingsLayout() {
  const { t } = useTranslation(["personal", "personalSettings"]);
  const location = useLocation();
  const page = location.pathname.split("/")[3] || "profile";
  const isPersonalPage = page === "personal";
  const section = page === "personal-data" ? "personalData" : page;
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{isPersonalPage ? t("personalSettings:title") : t(`settingsPages.${section}.title`)}</h1></header>
    <Outlet/>
  </div>;
}
