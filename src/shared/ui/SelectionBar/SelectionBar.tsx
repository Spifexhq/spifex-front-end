import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import type { HTMLAttributes, ReactNode } from "react";
import classNames from "classnames";
import { useFeedbackStack } from "@/shared/ui/FeedbackStack";

type SelectionBarProps = {
  open: boolean;
  label: string;
  children: ReactNode;
  role?: "region" | "alertdialog";
  /** Width cap, e.g. `max-w-[320px]` or `max-w-3xl`. */
  className?: string;
  layout?: boolean;
  onKeyDown?: HTMLAttributes<HTMLDivElement>["onKeyDown"];
};

/**
 * Shared bottom selection bar. It portals into the feedback stack so it cannot
 * collide with snackbars or confirmations; without the provider it stays fixed
 * at the bottom center.
 */
export default function SelectionBar({ open, label, children, role = "region", className, layout = false, onKeyDown }: SelectionBarProps) {
  const stack = useFeedbackStack();
  const reduced = useReducedMotion();
  const bar = (
    <motion.div
      layout={layout || undefined}
      role={role}
      aria-label={label}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: reduced ? 0 : 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : 5 }}
      transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }}
      className={classNames(
        stack ? "pointer-events-auto" : "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[15000] -translate-x-1/2 sm:bottom-6",
        "w-[calc(100vw-24px)] rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_32px_#26334d20] sm:p-4",
        className
      )}
    >
      {children}
    </motion.div>
  );

  const content = (
    <AnimatePresence initial={false}>
      {open && bar}
    </AnimatePresence>
  );

  return stack ? createPortal(content, stack) : content;
}
