/* -------------------------------------------------------------------------- */
/* File: src/components/SelectionActionsBar/SelectionActionsBar.mobile.tsx     */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";

/* -------------------------------- Helpers --------------------------------- */

function safeCurrency(raw: unknown) {
  const v = String(raw ?? "").trim().toUpperCase();
  return v || "USD";
}

function toFiniteNumber(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function inferTxType(raw: unknown): "credit" | "debit" | null {
  const v = String(raw ?? "").toLowerCase();
  if (!v) return null;
  if (v.includes("credit")) return "credit";
  if (v.includes("debit")) return "debit";
  return null;
}

function formatMoney(amount: number, locale: string, currency: string): string {
  const ccy = safeCurrency(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${ccy}`;
  }
}

/* --------------------------------- Types ---------------------------------- */

export type MinimalEntry = {
  amount?: number | string | null;

  // Settled mapping uses this
  transaction_type?: string | null;

  // CashFlow Entry model uses this
  tx_type?: string | null;

  due_date?: string | null;
  settlement_due_date?: string | null;
  value_date?: string | null;
};

export type SelectionActionsContext = "cashflow" | "settled" | (string & {});

export type SelectionActionsBarProps = {
  context: SelectionActionsContext;

  selectedIds: string[];
  selectedEntries: MinimalEntry[];

  isProcessing?: boolean;

  onCancel: () => void;

  // CashFlow actions
  onLiquidate?: () => void;
  onDelete?: () => Promise<void> | void;

  // Settled actions
  onReturn?: () => Promise<void> | void;

  /**
   * Optional currency override.
   * If omitted/empty, defaults to USD.
   * (Desktop variant may use org currency; mobile stays minimal by design.)
   */
  currency?: string | null;

  className?: string;
};

/* ------------------------- Mobile: shared sidebar signal ------------------- */

const MOBILE_SIDEBAR_EVENT = "spifex:mobileSidebar:setHidden";

declare global {
  interface Window {
    __SPX_MOBILE_SIDEBAR_HIDDEN__?: boolean;
  }
}

const setMobileSidebarHidden = (hidden: boolean) => {
  window.__SPX_MOBILE_SIDEBAR_HIDDEN__ = hidden;
  window.dispatchEvent(new CustomEvent(MOBILE_SIDEBAR_EVENT, { detail: { hidden } }));
};

/* --------------------------------- Icons ---------------------------------- */

const TrashIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 16h10l1-16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ReturnIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-1" />
  </svg>
);

/* ------------------------------- Component -------------------------------- */

const SelectionActionsBarMobile: React.FC<SelectionActionsBarProps> = ({
  context,
  selectedIds,
  selectedEntries,
  isProcessing = false,
  onCancel,
  onLiquidate,
  onDelete,
  onReturn,
  currency,
  className = "",
}) => {
  const { t, i18n } = useTranslation("selectionActionsBar");

  const hasSelection = (selectedIds?.length ?? 0) > 0;
  const disableAll = Boolean(isProcessing);

  // Expanded/collapsed on mobile (minimal)
  const [collapsed, setCollapsed] = useState(false);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevCountRef.current;
    const next = selectedIds.length;

    // New selection -> default to expanded
    if (prev === 0 && next > 0) setCollapsed(false);

    prevCountRef.current = next;
  }, [selectedIds.length]);

  // ESC cancels (useful on devices with keyboard)
  useEffect(() => {
    if (!hasSelection) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSelection, onCancel]);

  // Hide the mobile sidebar bar + push layout using CSS var
  useEffect(() => {
    if (!hasSelection) return;

    setMobileSidebarHidden(true);

    // This var is consumed by page/container padding
    document.documentElement.style.setProperty(
      "--spx-selection-bar-offset",
      "calc(76px + env(safe-area-inset-bottom))",
    );

    return () => {
      setMobileSidebarHidden(false);
      document.documentElement.style.removeProperty("--spx-selection-bar-offset");
    };
  }, [hasSelection]);

  // Minimal totals (net + count). No extra text.
  const resolvedCurrency = useMemo(() => safeCurrency(currency), [currency]);

  const net = useMemo(() => {
    let creditAbs = 0;
    let debitAbs = 0;

    for (const e of selectedEntries ?? []) {
      const amt = Math.abs(toFiniteNumber(e?.amount));
      const tx = inferTxType(e?.transaction_type) ?? inferTxType(e?.tx_type);

      if (tx === "credit") creditAbs += amt;
      else if (tx === "debit") debitAbs += amt;
    }

    return creditAbs - debitAbs;
  }, [selectedEntries]);

  const netLabel = useMemo(
    () => formatMoney(net, i18n.language, resolvedCurrency),
    [net, i18n.language, resolvedCurrency],
  );

  const showLiquidate = context === "cashflow" && typeof onLiquidate === "function";
  const showDelete = context === "cashflow" && typeof onDelete === "function";
  const showReturn = context === "settled" && typeof onReturn === "function";

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  if (!hasSelection) return null;

  // Collapsed pill (bottom-right)
  if (collapsed) {
    return (
      <div
        className={[
          "sm:hidden",
          "fixed z-[80]",
          "right-[max(1rem,env(safe-area-inset-right))]",
          "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
          className,
        ].join(" ")}
        role="region"
        aria-label={t("aria.bar", { defaultValue: "Selection actions bar" })}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          disabled={disableAll}
          aria-busy={disableAll || undefined}
          className={[
            "flex items-center gap-2",
            "rounded-2xl border border-gray-200 bg-white/90 px-3 py-2",
            "shadow-lg backdrop-blur",
            "text-gray-900",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
            "disabled:opacity-60",
          ].join(" ")}
        >
          <span className="text-[12px] font-semibold tabular-nums">{selectedIds.length}</span>
          <span className="h-4 w-px bg-gray-200" />
          <span className="text-[12px] font-semibold tabular-nums">{netLabel}</span>
          <span className="ml-1 text-[12px] text-gray-500" aria-hidden="true">
            ↑
          </span>
        </button>
      </div>
    );
  }

  // Expanded bar (centered bottom)
  return (
    <nav
      className={[
        "sm:hidden",
        "fixed left-1/2 -translate-x-1/2 z-[80]",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        "w-[min(92vw,560px)]",
        className,
      ].join(" ")}
      aria-label={t("aria.bar", { defaultValue: "Selection actions bar" })}
    >
      <div
        className={[
          "rounded-2xl border border-gray-200 bg-white/90 shadow-lg backdrop-blur",
          "px-2 py-2",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: count + net */}
          <button
            type="button"
            onClick={toggleCollapsed}
            disabled={disableAll}
            aria-busy={disableAll || undefined}
            className={[
              "flex items-center gap-2",
              "rounded-xl px-2 py-2",
              "text-left",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
              "disabled:opacity-60",
            ].join(" ")}
            aria-label={t("actions.minimize", { defaultValue: "Minimize" })}
            title={t("actions.minimize", { defaultValue: "Minimize" })}
          >
            <span className="text-[12px] font-semibold tabular-nums text-gray-900">{selectedIds.length}</span>
            <span className="h-4 w-px bg-gray-200" />
            <span className="text-[12px] font-semibold tabular-nums text-gray-900">{netLabel}</span>
            <span className="text-[12px] text-gray-500" aria-hidden="true">
              ↓
            </span>
          </button>

          {/* Right: actions (icons only, minimal text) */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={disableAll}
              aria-busy={disableAll || undefined}
              title={t("actions.cancel", { defaultValue: "Cancel" })}
              className="!h-10 !w-10 !p-0 rounded-xl"
            >
              <XIcon className="h-4 w-4" />
            </Button>

            {showLiquidate && (
              <Button
                onClick={onLiquidate}
                disabled={disableAll}
                aria-busy={disableAll || undefined}
                title={t("actions.liquidate", { defaultValue: "Settle" })}
                className={[
                  "!h-10 !w-10 !p-0 rounded-xl",
                  "bg-emerald-600 border border-emerald-600 text-white",
                  "hover:bg-emerald-700 hover:border-emerald-700",
                  "active:bg-emerald-800 active:border-emerald-800",
                ].join(" ")}
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
            )}

            {showReturn && (
              <Button
                onClick={onReturn}
                disabled={disableAll}
                aria-busy={disableAll || undefined}
                title={t("actions.return", { defaultValue: "Revert" })}
                className={[
                  "!h-10 !w-10 !p-0 rounded-xl",
                  "bg-amber-500 border border-amber-500 text-white",
                  "hover:bg-amber-600 hover:border-amber-600",
                ].join(" ")}
              >
                <ReturnIcon className="h-4 w-4" />
              </Button>
            )}

            {showDelete && (
              <Button
                variant="outline"
                onClick={onDelete}
                disabled={disableAll}
                aria-busy={disableAll || undefined}
                title={t("actions.delete", { defaultValue: "Delete" })}
                className="!h-10 !w-10 !p-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SelectionActionsBarMobile;
