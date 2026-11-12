import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";

export type ProductTourStep = {
  target?: string;
  title: string;
  body: string;
  /** Visual marker label for the step, e.g. "1 of 4". */
  eyebrow?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;

export default function ProductTour({ open, steps, onClose }: {
  open: boolean;
  steps: ProductTourStep[];
  onClose(): void;
}) {
  const { t } = useTranslation("common");
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const measure = useCallback(() => {
    const target = open ? steps[index]?.target : undefined;
    const element = target ? document.querySelector(target) : null;
    if (!element) {
      setRect(null);
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [index, open, steps]);

  useEffect(() => {
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = steps[index]?.target;
    const element = target ? document.querySelector(target) : null;
    element?.scrollIntoView({ block: "center", inline: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const frame = requestAnimationFrame(measure);
    nextRef.current?.focus({ preventScroll: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, open, index, steps]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !steps.length) return null;

  const step = steps[index];
  const last = index === steps.length - 1;
  const placeBelow = !rect || rect.top < window.innerHeight * 0.55;
  const tooltipTop = rect
    ? placeBelow
      ? Math.min(window.innerHeight - 220, rect.top + rect.height + 14)
      : Math.max(16, rect.top - 190)
    : window.innerHeight / 2 - 100;

  return createPortal(
    <div className="fixed inset-0 z-[20000]" role="dialog" aria-modal="true" aria-label={step.title}>
      <button type="button" aria-label={t("tour.close", { defaultValue: "Close tour" })} className="absolute inset-0 cursor-default bg-transparent" onClick={onClose} />
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg ring-2 ring-white/90 transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
          }}
        />
      ) : <div aria-hidden="true" className="absolute inset-0 bg-slate-950/55" />}

      <section
        className="absolute w-[min(360px,calc(100vw-24px))] rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_48px_#0f172a40]"
        style={{
          top: tooltipTop,
          left: rect ? Math.max(12, Math.min(window.innerWidth - 372, rect.left)) : Math.max(12, window.innerWidth / 2 - 180),
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {step.eyebrow ?? t("tour.step", { current: index + 1, total: steps.length, defaultValue: "Step {{current}} of {{total}}" })}
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">{step.title}</h2>
        <p className="mt-2 text-[13px] leading-5 text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>{t("tour.skip", { defaultValue: "Skip tour" })}</Button>
          <div className="flex items-center gap-2">
            {index > 0 && <Button variant="outline" size="sm" onClick={() => setIndex(value => Math.max(0, value - 1))}>{t("tour.back", { defaultValue: "Back" })}</Button>}
            <Button ref={nextRef} size="sm" onClick={() => last ? onClose() : setIndex(value => Math.min(steps.length - 1, value + 1))}>
              {last ? t("tour.done", { defaultValue: "Done" }) : t("tour.next", { defaultValue: "Next" })}
            </Button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
