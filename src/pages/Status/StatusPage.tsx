import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Pause, Play, RotateCw } from "lucide-react";
import Button from "@/shared/ui/Button";
import StatusScene, { type StatusKind } from "./StatusScene";

type Namespace = "status404" | "status500" | "statusMaintenance" | "statusComingSoon";

export default function StatusPage({ kind, namespace }: { kind: StatusKind; namespace: Namespace }) {
  const { t } = useTranslation(namespace);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const staticScene = !!reduced || paused || pageHidden;

  useEffect(() => { document.title = t("documentTitle"); }, [t]);
  useEffect(() => {
    const update = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-[#fdfcfb] text-black">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/overview" className="text-lg font-semibold tracking-tight">Spifex<span className="text-[var(--accentPrimary)]">.</span></Link>
        <span className="rounded-full border border-[#e9ded4] bg-white px-3 py-1 text-[11px] font-medium tracking-wide text-black/60">{t("badge")}</span>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center sm:pb-20">
        <StatusScene kind={kind} paused={staticScene} />
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t("heading")}</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-black/60 sm:text-base">{t("subtitle")}</p>
        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
          {kind === "maintenance" ? <Button variant="outline" onClick={() => window.location.reload()}><RotateCw size={15} className="mr-2" aria-hidden="true" />{t("actions.retry")}</Button> : <Button variant="primary" onClick={() => navigate("/overview")} >{t("actions.overview")}<ArrowRight size={15} className="ml-2" aria-hidden="true" /></Button>}
          {kind === "error" && <Button variant="outline" onClick={() => window.location.reload()}>{t("actions.retry")}</Button>}
        </div>
        {!reduced && <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} className="mt-8 inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-black/50 transition-colors hover:text-black">{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />} {t(paused ? "animation.resume" : "animation.pause")}</button>}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-[#eee6df] px-6 py-5 text-xs text-black/50 sm:justify-between sm:px-10">
        <span>{t("footer")}</span>
        <nav aria-label={t("socialLabel")} className="flex items-center gap-5">{[["facebook", "Facebook", "https://www.facebook.com/spifexHQ"], ["x", "X", "https://x.com/spifexHQ"], ["instagram", "Instagram", "https://instagram.com/spifexhq"]].map(([key,label,url]) => <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-black">{label}</a>)}</nav>
      </footer>
    </div>
  );
}
