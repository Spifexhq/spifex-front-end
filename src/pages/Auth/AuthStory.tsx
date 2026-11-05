import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function AuthStory() {
  const { t } = useTranslation("signUp");
  const reduced = useReducedMotion();
  return <aside className="relative z-10 flex w-full flex-col justify-between p-10 lg:p-16">
    <span className="text-sm font-semibold tracking-wide text-black">SPIFEX</span>
    <div className="max-w-md py-16"><p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accentPrimary)]">{t("story.eyebrow")}</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-black lg:text-5xl">{t("story.heading")}</h2><p className="mt-6 text-base leading-7 text-black/70">{t("story.description")}</p>
    <div aria-hidden="true" className="mt-12 space-y-3 rounded-2xl border border-black/5 bg-white/35 p-6 backdrop-blur-sm">{[75,48,90,62].map((width,index)=><div key={index} className="flex items-center gap-4"><span className="h-2 w-2 rounded-full bg-[var(--accentPrimary)]"/><div className="h-2 flex-1 rounded-full bg-black/5"><motion.div initial={{width: reduced ? `${width}%` : 0}} animate={{width:`${width}%`}} transition={{duration: reduced ? 0 : .7,delay:reduced ? 0 : index*.1}} className="h-full rounded-full bg-gradient-to-r from-[#b66f50] to-[#d7a082]"/></div></div>)}</div></div>
    <p className="text-xs text-black/60">{t("story.footer")}</p>
  </aside>;
}
