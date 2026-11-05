import { isValidElement, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useSnackbarLifecycle } from "./useSnackbarLifecycle";
import type { SnackbarProps } from "./Snackbar.types";

const tones = {
  success: { icon: Check, color: "bg-emerald-50 text-emerald-700 ring-emerald-200/60" },
  error: { icon: AlertCircle, color: "bg-rose-50 text-rose-700 ring-rose-200/60" },
  warning: { icon: AlertTriangle, color: "bg-amber-50 text-amber-700 ring-amber-200/60" },
  info: { icon: Info, color: "bg-slate-100 text-slate-600 ring-slate-200/60" },
};

export default function Snackbar({ open, notificationKey, autoHideDuration = 5000, onClose, message, severity = "info", children, anchor = { vertical: "bottom", horizontal: "center" }, transitionDuration = 180, pauseOnHover = true, dismissOnClick = false, showCloseButton = true, maxWidthClassName = "max-w-md", className = "" }: SnackbarProps) {
  const { t } = useTranslation("common");
  const reduced = useReducedMotion();
  const content = children ?? (isValidElement(message) || Array.isArray(message) || typeof message === "number" ? message : apiErrorMessage(message, t("notifications.genericError")));
  const identity = notificationKey ?? message ?? children;
  const lifecycle = useSnackbarLifecycle(open, identity, autoHideDuration, onClose);
  const snapshot = useRef({ content, severity, custom: children != null });
  if (open) snapshot.current = { content, severity, custom: children != null };
  const displayed = snapshot.current;
  const tone = tones[displayed.severity], Icon = tone.icon;
  const horizontal = anchor.horizontal === "center" ? "left-1/2 -translate-x-1/2" : anchor.horizontal === "left" ? "left-4" : "right-4";
  if (typeof document === "undefined") return null;
  return createPortal(<div className={`pointer-events-none fixed z-[15000] w-[calc(100vw_-_2rem)] ${maxWidthClassName} ${horizontal} ${anchor.vertical === "top" ? "top-[max(1rem,env(safe-area-inset-top))]" : "bottom-[max(1rem,env(safe-area-inset-bottom))]"}`}>
    <AnimatePresence initial={false}>
      {lifecycle.visible && <motion.div key="notification" initial={{ opacity: 0, y: anchor.vertical === "top" ? -8 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: anchor.vertical === "top" ? -6 : 6 }} transition={{ duration: reduced ? 0 : transitionDuration / 1000 }}
        onMouseEnter={() => { if (pauseOnHover) lifecycle.pause("hover", true); }} onMouseLeave={() => lifecycle.pause("hover", false)}
        onFocusCapture={() => lifecycle.pause("focus", true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) lifecycle.pause("focus", false); }}
        onClick={dismissOnClick ? lifecycle.dismiss : undefined}
        className={`pointer-events-auto ${displayed.custom ? "" : "flex items-start gap-3 rounded-xl border border-white/80 bg-white/95 p-3.5 text-slate-800 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-900/10 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150"} ${className}`}>
        {displayed.custom ? displayed.content : <><span aria-hidden className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${tone.color}`}><Icon size={16} strokeWidth={1.8} /></span><div role={displayed.severity === "error" ? "alert" : "status"} aria-atomic="true" className="min-w-0 flex-1 self-center break-words text-[13px] leading-5">{displayed.content}</div>{showCloseButton && <button type="button" aria-label={t("notifications.dismiss")} onClick={event => { event.stopPropagation(); lifecycle.dismiss(); }} className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100/80 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-slate-500"><X size={15} /></button>}</>}
      </motion.div>}
    </AnimatePresence>
  </div>, document.body);
}
