import { motion, useReducedMotion } from "framer-motion";
// src/components/CookieBanner.tsx
import { useContext, useState, useEffect } from "react";
import { CookieContext } from "@/contexts/CookieContext";
import Checkbox from "@/shared/ui/Checkbox";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";

export const CookieBanner = () => {
  const { ready, consent, setConsent } = useContext(CookieContext);
  const { t } = useTranslation("cookies");

  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [localState, setLocalState] = useState(consent);

  useEffect(() => {
    if (!ready) return;

    const cookieExists = document.cookie.includes("cookie_consent=");
    setVisible(!cookieExists);
  }, [ready]);

  useEffect(() => {
    const reopen = () => { setLocalState(consent); setExpanded(true); setVisible(true); };
    window.addEventListener("spifex:cookie-preferences", reopen);
    return () => window.removeEventListener("spifex:cookie-preferences", reopen);
  }, [consent]);

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
      <motion.section role="region" aria-label={t("banner.title")} initial={{opacity:0,y:reduced ? 0 : 16}} animate={{opacity:1,y:0}} transition={{duration:reduced ? 0 : .2}} className="pointer-events-auto max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_12px_48px_#0f172a14] backdrop-blur-xl sm:px-6">

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
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-[14px]">
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

            <label className="flex items-center gap-2 sm:col-span-2">
              <Checkbox checked={localState.personalization} onChange={() => update("personalization")}/>
              <span>{t("modal.personalization")}</span>
            </label>

            <Button
              onClick={confirm}
              variant="outlineBlack"
              className="sm:col-span-2"
            >
              {t("modal.confirm")}
            </Button>
          </div>
        )}

        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-slate-500 underline underline-offset-4">{t("privacyLink")}</a>
        {!expanded && (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button onClick={acceptAll} variant="outline" className="w-full">
              {t("banner.acceptAll")}
            </Button>
            <Button onClick={rejectAll} variant="outline" className="w-full">
              {t("banner.rejectAll")}
            </Button>
            <Button onClick={() => { setLocalState(consent); setExpanded(true); }} variant="outline" className="w-full">
              {t("banner.moreOptions")}
            </Button>
          </div>
        )}

      </motion.section>
    </div>
  );
};

export default CookieBanner;
