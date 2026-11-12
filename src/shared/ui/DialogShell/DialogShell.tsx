import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import classNames from "classnames";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";

type DialogVariant = "center" | "drawer";

type DialogShellProps = {
  open: boolean;
  onClose(): void;
  closeLabel: string;
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  header?: ReactNode;
  labelledBy?: string;
  tabs?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Nested dialog: traps focus and makes the main content inert. */
  overlay?: ReactNode;
  /** Visual layer inside the panel, e.g. a busy overlay. Not focus-trapped. */
  panelOverlay?: ReactNode;
  variant?: DialogVariant;
  width?: number;
  height?: number;
  maxWidthClass?: string;
  panelClassName?: string;
  bodyClassName?: string;
  busy?: boolean;
  closeOnBackdrop?: boolean;
  escapeEnabled?: boolean;
  panelRef?: RefObject<HTMLDivElement>;
};

/**
 * One overlay, focus, Escape, scroll-lock and header contract for centered
 * dialogs and right-side drawers.
 */
export default function DialogShell({
  open,
  onClose,
  closeLabel,
  title,
  description,
  eyebrow,
  header,
  labelledBy,
  tabs,
  footer,
  children,
  overlay,
  panelOverlay,
  variant = "center",
  width,
  height,
  maxWidthClass,
  panelClassName,
  bodyClassName,
  busy = false,
  closeOnBackdrop = false,
  escapeEnabled = true,
  panelRef,
}: DialogShellProps) {
  const id = useId();
  const localRef = useRef<HTMLDivElement>(null);
  const ref = panelRef ?? localRef;
  const bodyRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const titleId = labelledBy ?? `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;

  window.useGlobalEsc(open && escapeEnabled && !busy, onClose);
  useDialogFocus(open, ref);
  useDialogFocus(open && Boolean(overlay), overlayRef);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    bodyRef.current?.toggleAttribute("inert", open && Boolean(overlay));
  }, [overlay, open]);

  const isDrawer = variant === "drawer";
  const panelClasses = isDrawer
    ? classNames("settings-drawer settings-modal text-slate-800", panelClassName)
    : classNames(
        "relative flex min-h-0 w-full max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl outline-none",
        maxWidthClass,
        panelClassName
      );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={classNames(
            "fixed inset-0 z-[10030] bg-slate-950/35 backdrop-blur-[2px]",
            isDrawer ? "" : "grid place-items-center p-3 sm:p-6"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : isDrawer ? 0.18 : 0.16 }}
          onClick={event => {
            if (event.target === event.currentTarget && closeOnBackdrop && !busy) onClose();
          }}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            aria-busy={busy || undefined}
            tabIndex={-1}
            style={isDrawer ? undefined : {
              width: width ? `min(${width}px, 100%)` : undefined,
              height: height ? `min(${height}px, calc(100dvh - 3rem))` : undefined,
            }}
            className={panelClasses}
            initial={isDrawer ? { x: "100%" } : { opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.99 }}
            animate={isDrawer ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isDrawer ? { x: "100%" } : { opacity: 0, y: reduced ? 0 : 6 }}
            transition={{ duration: reduced ? 0 : isDrawer ? 0.18 : 0.16, ease: "easeOut" }}
          >
            {header ?? (
              <header className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {eyebrow && <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">{eyebrow}</p>}
                    {title && <h2 id={titleId} className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>}
                    {description && <div id={descriptionId} className="mt-1 text-xs leading-relaxed text-slate-500">{description}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    aria-label={closeLabel}
                    className="grid size-11 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 sm:size-8"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                {tabs && <div className="mt-4">{tabs}</div>}
              </header>
            )}

            <div ref={bodyRef} className={classNames("flex min-h-0 flex-1 flex-col", bodyClassName)}>
              {children}
            </div>

            {footer && (
              <footer className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6">
                {footer}
              </footer>
            )}

            {panelOverlay}

            {overlay && (
              <div ref={overlayRef} className="contents [&_button]:min-h-11 sm:[&_button]:min-h-9">
                {overlay}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
