import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, type FormEventHandler, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";

type Props = {
  isOpen: boolean;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  closeLabel: string;
  onClose(): void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  formId?: string;
  formRef?: RefObject<HTMLFormElement>;
  /** Fixed desktop dimensions, clamped to the available viewport. */
  width?: number;
  height?: number;
  busy?: boolean;
  loading?: boolean;
  tabs?: ReactNode;
  footer: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
};

/** Centered, fixed-size form dialog. The form scrolls; its header/actions stay visible. */
export default function FloatingDialog({ isOpen, title, description, eyebrow, closeLabel, onClose, onSubmit, formId, formRef, width = 800, height = 640, busy = false, loading = false, tabs, footer, overlay, children }: Props) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  window.useGlobalEsc(isOpen && !busy && !overlay, onClose);
  useDialogFocus(isOpen, ref);
  useDialogFocus(isOpen && Boolean(overlay), overlayRef);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  useEffect(() => {
    contentRef.current?.toggleAttribute("inert", Boolean(overlay));
  }, [overlay, isOpen]);

  return createPortal(<AnimatePresence>{isOpen && <motion.div
    className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-6"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .16 }}
  >
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1}
      style={{ width: `min(${width}px, 100%)`, height: `min(${height}px, calc(100dvh - 3rem))` }}
      className="relative flex min-h-0 max-w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl outline-none"
      initial={{ opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : .99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 6 }} transition={{ duration: reduced ? 0 : .16, ease: "easeOut" }}
    >
      <div ref={contentRef} className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">{eyebrow}</p>}
              <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
              {description && <div id={`${id}-description`} className="mt-1 text-xs leading-relaxed text-slate-500">{description}</div>}
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label={closeLabel} className="grid size-11 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-40 sm:size-8"><X size={18} /></button>
          </div>
          {tabs && <div className="mt-4">{tabs}</div>}
        </header>
        <form id={formId} ref={formRef} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <fieldset disabled={busy || loading} aria-busy={loading} className="m-0 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain border-0 px-4 py-5 sm:px-6 sm:py-6">{children}</fieldset>
          <footer className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] [&_button]:min-h-11 sm:px-6 sm:[&_button]:min-h-9">{footer}</footer>
        </form>
      </div>
      {overlay && <div ref={overlayRef} className="contents [&_button]:min-h-11 sm:[&_button]:min-h-9">{overlay}</div>}
    </motion.div>
  </motion.div>}</AnimatePresence>, document.body);
}

export function DialogSkeleton({ fields = 6, label }: { fields?: number; label: string }) {
  return <div role="status" aria-label={label} className="grid grid-cols-1 gap-x-5 gap-y-6 motion-safe:animate-pulse sm:grid-cols-2">
    <span className="sr-only">{label}</span>
    {Array.from({ length: fields }, (_, i) => <div key={i} aria-hidden="true" className={i === fields - 1 ? "sm:col-span-2" : ""}><div className="mb-2 h-3 w-24 rounded bg-slate-100" /><div className={`rounded-md border border-slate-100 bg-slate-50 ${i === fields - 1 ? "h-20" : "h-10"}`} /></div>)}
  </div>;
}
