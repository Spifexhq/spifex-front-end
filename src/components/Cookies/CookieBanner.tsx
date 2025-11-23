// src/components/CookieBanner.tsx
import { useContext, useState, useEffect } from "react";
import { CookieContext } from "@/contexts/CookieContext";
import Checkbox from "src/components/ui/Checkbox";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";

export const CookieBanner = () => {
  const { ready, consent, setConsent } = useContext(CookieContext);
  const { t } = useTranslation("cookies");

  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [localState, setLocalState] = useState(consent);

  useEffect(() => {
    if (!ready) return;

    const cookieExists = document.cookie.includes("cookie_consent=");
    setVisible(!cookieExists);
  }, [ready]);

  if (!ready || !visible) return null;

  const acceptAll = () => {
    const next = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    setConsent(next);
    setVisible(false);
  };

  const rejectAll = () => {
    const next = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    setConsent(next);
    setVisible(false);
  };

  const update = (key: keyof typeof localState) => {
    if (key === "essential") return;
    setLocalState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const confirm = () => {
    setConsent(localState);
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[9999] flex justify-center px-4 pb-6">
      <div className="pointer-events-auto w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-xl px-6 py-5">

        {/* HEADER */}
        <div className="flex items-center gap-2 mb-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-800">
            <path d="M21 7L9 19L3.5 13.5L4.91 12.09L9 16.17L19.59 5.59L21 7Z"/>
          </svg>
          <h3 className="text-[15px] font-semibold text-gray-900">
            {expanded ? t("modal.title") : t("banner.title")}
          </h3>
        </div>

        {!expanded && (
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {t("banner.description")}
          </p>
        )}

        {expanded && (
          <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4 text-[14px]">
            <label className="flex items-center gap-2">
              <Checkbox checked disabled />
              <span>{t("modal.essential")}</span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox checked={localState.functional} onChange={() => update("functional")}/>
              <span>{t("modal.functional")}</span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox checked={localState.analytics} onChange={() => update("analytics")}/>
              <span>{t("modal.analytics")}</span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox checked={localState.marketing} onChange={() => update("marketing")}/>
              <span>{t("modal.marketing")}</span>
            </label>

            <label className="flex items-center gap-2 col-span-2">
              <Checkbox checked={localState.personalization} onChange={() => update("personalization")}/>
              <span>{t("modal.personalization")}</span>
            </label>

            <Button
              onClick={confirm}
              variant="outlineBlack"
              className="col-span-2"
            >
              {t("modal.confirm")}
            </Button>
          </div>
        )}

        {!expanded && (
          <div className="flex justify-between mt-5 gap-5">
            <Button onClick={acceptAll} variant="outlineBlack" className="w-full">
              {t("banner.acceptAll")}
            </Button>
            <Button onClick={rejectAll} variant="outline" className="w-full">
              {t("banner.rejectAll")}
            </Button>
            <Button onClick={() => setExpanded(true)} variant="outline" className="w-full">
              {t("banner.moreOptions")}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default CookieBanner;
