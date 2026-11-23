import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFeedbackStack } from "@/shared/ui/FeedbackStack";
import { usageActionKey, usageResourceKey } from "@/core/permissions/usageResources";
import {
  USAGE_CHANGE_EVENT,
  type UsageChangeEvent,
  type UsagePeriod,
} from "@/lib/usageEvents";

const MAX_VISIBLE = 3;
const AUTO_HIDE_MS = 4200;

type Entry = UsageChangeEvent & { id: number };

const PERIOD_KEYS: Record<UsagePeriod, string> = {
  daily: "periods.daily",
  weekly: "periods.weekly",
  monthly: "periods.monthly",
  lifetime: "periods.lifetime",
};

function percent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

function humanize(code: string): string {
  const words = code.replace(/^personal_/, "").replace(/_/g, " ").trim();
  if (!words) return code;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Animate the displayed counter from the previous value, honouring reduced motion. */
function useCountUp(value: number, from: number, duration = 520): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduced ? value : from));

  useEffect(() => {
    if (reduced || from === value || typeof requestAnimationFrame === "undefined") {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, from, reduced, value]);

  return display;
}

function UsageToastCard({ event, onDismiss }: { event: Entry; onDismiss: () => void }) {
  const { t, i18n } = useTranslation(["common", "limits"]);
  const reduced = useReducedMotion();
  const isIncrease = event.direction === "increase";
  const before = isIncrease
    ? Math.max(event.used - event.delta, 0)
    : Math.max(event.used + event.delta, 0);
  const pctBefore = percent(before, event.limit);
  const pctAfter = percent(event.used, event.limit);
  const exhausted = pctAfter >= 100;
  const nearLimit = pctAfter >= 90;
  const displayUsed = useCountUp(event.used, before);
  const remaining = Math.max(event.limit - event.used, 0);
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language || "en", { maximumFractionDigits: 0 }),
    [i18n.language],
  );
  const resource = usageResourceKey(event.code);
  const permissionLabel =
    event.direction === "increase"
      ? t(`perms.${event.code}.label`, { ns: "limits", defaultValue: "" })
      : "";
  const label =
    permissionLabel ||
    (resource
      ? t(`usageResources.${resource}`, { defaultValue: humanize(event.code) })
      : humanize(event.code));
  const actionLabel = permissionLabel
    ? ""
    : t(`usageActions.${usageActionKey(event.code, event.direction)}`);
  const periodLabel = t(PERIOD_KEYS[event.period] ?? "periods.monthly", {
    ns: "limits",
    defaultValue: event.period,
  });

  const tile = isIncrease
    ? exhausted
      ? "bg-rose-50 text-rose-600 ring-rose-200/60"
      : nearLimit
        ? "bg-amber-50 text-amber-700 ring-amber-200/60"
        : "bg-slate-100 text-slate-600 ring-slate-200/60"
    : "bg-emerald-50 text-emerald-700 ring-emerald-200/60";
  const chip = isIncrease
    ? exhausted
      ? "bg-rose-50 text-rose-700"
      : nearLimit
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600"
    : "bg-emerald-50 text-emerald-700";
  const fill = isIncrease
    ? exhausted
      ? "bg-rose-500"
      : nearLimit
        ? "bg-amber-500"
        : "bg-slate-500"
    : "bg-emerald-500";
  const DirectionIcon = isIncrease ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-auto w-[calc(100vw-2rem)] max-w-[380px] rounded-xl border border-white/80 bg-white/95 p-2.5 text-slate-800 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-900/10 supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${tile}`}
        >
          <DirectionIcon size={14} strokeWidth={1.9} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="sr-only">{t("usageToast.title")}: </span>
            <p className="min-w-0 truncate text-xs font-semibold leading-4 text-slate-900">
              {label}
            </p>
            {actionLabel && (
              <span className="shrink-0 text-[10.5px] font-medium leading-4 text-slate-500">
                · {actionLabel}
              </span>
            )}
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums ${chip}`}
            >
              <span aria-hidden>{isIncrease ? "+" : "−"}</span>
              {numberFormat.format(event.delta)}
            </span>
            <span className="sr-only">
              {isIncrease
                ? t("usageToast.increased", { count: event.delta })
                : t("usageToast.decreased", { count: event.delta })}
            </span>
          </div>

          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: `${pctBefore}%` }}
              animate={{ width: `${pctAfter}%` }}
              transition={
                reduced ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
              }
              className={`h-full rounded-full ${fill}`}
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] leading-4 text-slate-500">
            <span className="tabular-nums">
              <span className="font-semibold text-slate-700">
                {numberFormat.format(displayUsed)}
              </span>{" "}
              / {numberFormat.format(event.limit)}
            </span>
            <span aria-hidden>·</span>
            <span>{periodLabel}</span>
            <span aria-hidden>·</span>
            <span
              className={`font-medium ${exhausted ? "text-rose-600" : "text-slate-500"}`}
            >
              {exhausted
                ? t("usageToast.limitReached")
                : t("usageToast.remaining", { count: remaining })}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={t("notifications.dismiss")}
          onClick={onDismiss}
          className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100/80 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-slate-500"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Bottom-center stack for plan-usage changes. Mounted once next to QuotaWarning.
 */
export default function UsageToastHost() {
  const stack = useFeedbackStack();
  const reduced = useReducedMotion();
  const [queue, setQueue] = useState<Entry[]>([]);
  const [paused, setPaused] = useState(false);
  const current = queue[0];

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<UsageChangeEvent[]>).detail;
      if (!Array.isArray(detail) || detail.length === 0) return;
      const stamp = Date.now();
      setQueue((entries) =>
        [
          ...entries,
          ...detail.map((item, index) => ({ ...item, id: stamp + index })),
        ].slice(0, MAX_VISIBLE),
      );
    };
    window.addEventListener(USAGE_CHANGE_EVENT, receive);
    return () => window.removeEventListener(USAGE_CHANGE_EVENT, receive);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((entries) => entries.slice(1));
  }, []);

  useEffect(() => {
    setPaused(false);
  }, [current?.id]);

  useEffect(() => {
    if (!current || paused) return;
    const timer = setTimeout(dismiss, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [current, dismiss, paused]);

  if (typeof document === "undefined") return null;

  const card = (
    <AnimatePresence initial={false} mode="wait">
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 14, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: 8,
            scale: 0.97,
            transition: reduced ? { duration: 0 } : { duration: 0.16, ease: [0.4, 0, 1, 1] },
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 480, damping: 34, mass: 0.7 }
          }
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <UsageToastCard event={current} onDismiss={dismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (stack) return createPortal(card, stack);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[15000] flex flex-col items-center">
      {card}
    </div>,
    document.body,
  );
}
