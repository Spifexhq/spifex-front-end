/* -------------------------------------------------------------------------- */
/* File: src/components/SelectionActionsBar/index.tsx
 * Update requested:
 * - Delete button uses a trash icon (inline SVG) instead of ⌫
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import { useAuthContext } from "@/hooks/useAuth";

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

function parseDateSafe(raw: unknown): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateShort(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
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
   * If omitted/empty, uses org currency (BankSettings pattern), then "USD".
   */
  currency?: string | null;

  className?: string;
};

/* ------------------------------- Icons ------------------------------------ */

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

/* ------------------------------- Component -------------------------------- */
const SelectionActionsBar: React.FC<SelectionActionsBarProps> = ({
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
  const { organization: authOrg } = useAuthContext();

  /* Currency (BankSettings logic) */
  const orgCurrency = useMemo(() => safeCurrency(authOrg?.organization?.currency), [authOrg]);
  const resolvedCurrency = useMemo(() => safeCurrency(currency ?? orgCurrency), [currency, orgCurrency]);

  const hasSelection = (selectedIds?.length ?? 0) > 0;
  const disableAll = !!isProcessing;

  /* Minimize / Expand */
  const [minimized, setMinimized] = useState(false);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevCountRef.current;
    const next = selectedIds.length;

    // When a new selection starts, default to expanded
    if (prev === 0 && next > 0) setMinimized(false);

    prevCountRef.current = next;
  }, [selectedIds.length]);

  /* ESC to cancel selection */
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

  /* Compute stats */
  const stats = useMemo(() => {
    let creditAbsSum = 0;
    let debitAbsSum = 0;
    let creditCount = 0;
    let debitCount = 0;

    let earliestDue: Date | null = null;

    for (const e of selectedEntries ?? []) {
      const amt = toFiniteNumber(e?.amount);
      const tx = inferTxType(e?.transaction_type) ?? inferTxType(e?.tx_type);

      if (tx === "credit") {
        creditAbsSum += Math.abs(amt);
        creditCount += 1;
      } else if (tx === "debit") {
        debitAbsSum += Math.abs(amt);
        debitCount += 1;
      }

      const dueCandidate =
        parseDateSafe(e?.settlement_due_date) ?? parseDateSafe(e?.due_date) ?? parseDateSafe(e?.value_date);

      if (dueCandidate) {
        if (!earliestDue || dueCandidate.getTime() < earliestDue.getTime()) {
          earliestDue = dueCandidate;
        }
      }
    }

    const net = creditAbsSum - debitAbsSum;

    return {
      creditAbsSum,
      debitAbsSum,
      net,
      creditCount,
      debitCount,
      earliestDue,
    };
  }, [selectedEntries]);

  const creditLabel = useMemo(
    () => formatMoney(stats.creditAbsSum, i18n.language, resolvedCurrency),
    [stats.creditAbsSum, i18n.language, resolvedCurrency],
  );

  const debitLabel = useMemo(
    () => formatMoney(stats.debitAbsSum, i18n.language, resolvedCurrency),
    [stats.debitAbsSum, i18n.language, resolvedCurrency],
  );

  const netLabel = useMemo(
    () => formatMoney(stats.net, i18n.language, resolvedCurrency),
    [stats.net, i18n.language, resolvedCurrency],
  );

  const dueLabel = useMemo(() => {
    if (!stats.earliestDue) return "";
    return formatDateShort(stats.earliestDue, i18n.language);
  }, [stats.earliestDue, i18n.language]);

  /* Context actions */
  const showLiquidate = context === "cashflow" && typeof onLiquidate === "function";
  const showDelete = context === "cashflow" && typeof onDelete === "function";
  const showReturn = context === "settled" && typeof onReturn === "function";

  const toggleMinimize = useCallback(() => setMinimized((p) => !p), []);

  if (!hasSelection) return null;

  return (
    <div
      className={[
        "sticky bottom-0 z-40 w-full overflow-x-hidden",
        "border-t border-gray-200 bg-white/95 backdrop-blur",
        "px-3 py-2 sm:px-4 sm:py-3",
        className,
      ].join(" ")}
      role="region"
      aria-label={t("aria.bar", { defaultValue: "Selection actions bar" })}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        {/* INFO */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            <div className="text-[11px] sm:text-[12px] font-semibold text-gray-900">
              {t("labels.selected", {
                defaultValue: "{{count}} selected",
                count: selectedIds.length,
              })}
            </div>

            {dueLabel ? (
              <div className="text-[10px] sm:text-[11px] text-gray-600 truncate min-w-0">
                <span className="text-gray-500">{t("labels.dueShort", { defaultValue: "Due:" })}</span>{" "}
                <span className="font-medium text-gray-800">{dueLabel}</span>
              </div>
            ) : null}

            <div className="sm:hidden text-[10px] text-gray-600 truncate min-w-0">
              <span className="text-gray-500">{t("labels.net", { defaultValue: "Net balance:" })}</span>{" "}
              <span className="font-semibold text-gray-900">{netLabel}</span>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="mt-1.5 hidden sm:flex text-[11px] text-gray-600 flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-gray-500">{t("labels.credits", { defaultValue: "Credits" })}:</span>
                  <span className="font-medium text-gray-800">{stats.creditCount}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{t("labels.sumCredits", { defaultValue: "Σ Credits" })}:</span>
                  <span className="font-medium text-gray-800">{creditLabel}</span>
                </span>

                <span className="text-gray-300">|</span>

                <span className="inline-flex items-center gap-1.5">
                  <span className="text-gray-500">{t("labels.debits", { defaultValue: "Debits" })}:</span>
                  <span className="font-medium text-gray-800">{stats.debitCount}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{t("labels.sumDebits", { defaultValue: "Σ Debits" })}:</span>
                  <span className="font-medium text-gray-800">{debitLabel}</span>
                </span>

                <span className="text-gray-300">|</span>

                <span className="inline-flex items-center gap-1.5">
                  <span className="text-gray-500">{t("labels.net", { defaultValue: "Net balance:" })}</span>
                  <span className="font-semibold text-gray-900">{netLabel}</span>
                </span>

                <span className="text-gray-400">
                  {t("hints.escToCancel", { defaultValue: "Tip: press" })}{" "}
                  <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-700 font-mono text-[10px]">
                    Esc
                  </kbd>{" "}
                  {t("actions.cancelSelection", { defaultValue: "Cancel selection (Esc)" })
                    .replace("(Esc)", "")
                    .trim()}
                </span>
              </div>

              <div className="mt-1.5 sm:hidden text-[10px] text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="text-gray-500">{t("labels.credits", { defaultValue: "Credits" })}:</span>
                  <span className="font-medium text-gray-800">{stats.creditCount}</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-800 truncate">{creditLabel}</span>
                </span>

                <span className="text-gray-300">|</span>

                <span className="inline-flex items-center gap-1 min-w-0">
                  <span className="text-gray-500">{t("labels.debits", { defaultValue: "Debits" })}:</span>
                  <span className="font-medium text-gray-800">{stats.debitCount}</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-800 truncate">{debitLabel}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* ACTIONS */}
        <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 sm:gap-2 max-w-full">
          <Button
            variant="outline"
            onClick={toggleMinimize}
            disabled={disableAll}
            aria-busy={disableAll || undefined}
            title={
              minimized
                ? t("actions.expand", { defaultValue: "Expand" })
                : t("actions.minimize", { defaultValue: "Minimize" })
            }
            className="!py-1 !px-2 sm:!py-1.5 sm:!px-3 !text-[11px] sm:!text-[12px]"
          >
            <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              <span aria-hidden="true" className="text-[13px] leading-none">
                {minimized ? "+" : "–"}
              </span>
              <span className="hidden sm:inline">
                {minimized
                  ? t("actions.expand", { defaultValue: "Expand" })
                  : t("actions.minimize", { defaultValue: "Minimize" })}
              </span>
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            disabled={disableAll}
            aria-busy={disableAll || undefined}
            title={t("actions.cancelSelection", { defaultValue: "Cancel selection (Esc)" })}
            className="!py-1 !px-2 sm:!py-1.5 sm:!px-3 !text-[11px] sm:!text-[12px]"
          >
            <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              <span aria-hidden="true" className="text-[13px] leading-none">
                ✕
              </span>
              <span className="hidden sm:inline">{t("actions.cancel", { defaultValue: "Cancel" })}</span>
            </span>
          </Button>

          {showLiquidate && (
            <Button
              onClick={onLiquidate}
              disabled={disableAll}
              aria-busy={disableAll || undefined}
              title={t("actions.liquidateSelected", { defaultValue: "Settle selected" })}
              className={[
                "!py-1 !px-2 sm:!py-1.5 sm:!px-3 !text-[11px] sm:!text-[12px]",
                "bg-emerald-600 border border-emerald-600 text-white",
                "hover:bg-emerald-700 hover:border-emerald-700",
                "active:bg-emerald-800 active:border-emerald-800",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                <span aria-hidden="true" className="text-[13px] leading-none">
                  ✓
                </span>
                <span>{t("actions.liquidate", { defaultValue: "Settle" })}</span>
              </span>
            </Button>
          )}

          {showReturn && (
            <Button
              onClick={onReturn}
              disabled={disableAll}
              aria-busy={disableAll || undefined}
              title={t("actions.return", { defaultValue: "Revert" })}
              className={[
                "!py-1 !px-2 sm:!py-1.5 sm:!px-3 !text-[11px] sm:!text-[12px]",
                "bg-amber-500 border border-amber-500 text-white",
                "hover:bg-amber-600 hover:border-amber-600",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                <span aria-hidden="true" className="text-[13px] leading-none">
                  ↩
                </span>
                <span>{t("actions.return", { defaultValue: "Revert" })}</span>
              </span>
            </Button>
          )}

          {/* Delete: Trash icon */}
          {showDelete && (
            <Button
              variant="outline"
              onClick={onDelete}
              disabled={disableAll}
              aria-busy={disableAll || undefined}
              title={t("actions.deleteSelected", { defaultValue: "Delete selected" })}
              className="!py-1 !px-2 sm:!py-1.5 sm:!px-3 !text-[11px] sm:!text-[12px] border-red-200 text-red-600 hover:bg-red-50"
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{t("actions.delete", { defaultValue: "Delete" })}</span>
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectionActionsBar;
