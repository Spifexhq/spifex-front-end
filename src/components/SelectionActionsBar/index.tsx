import React, { useMemo, useEffect, useState } from "react";
import Button from "@/components/Button";

/* ------------------------------ Types ------------------------------ */
export type MinimalEntry = {
  amount: string | number;
  /** legacy */
  transaction_type?: "credit" | "debit" | string;
  /** new api label via get_tx_type_display */
  tx_type?: "credit" | "debit" | string;
  /** planned/forecast date */
  due_date?: string | null;
  /** realized date (settlement value date) */
  settlement_due_date?: string | null;
};

type Props = {
  context?: "cashflow" | "settled";
  selectedIds: Array<number | string>;
  selectedEntries: MinimalEntry[];
  onLiquidate?: () => void;
  onDelete?: () => void | Promise<void>;
  onReturn?: () => void | Promise<void>;
  onCancel?: () => void;
  isProcessing?: boolean;
};

/* ------------------------------ Utils ------------------------------ */
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Parses "1234.56" or 1234.56. (Backend already sends dot-decimal.) */
function parseAmount(a: string | number | null | undefined): number {
  if (a == null) return 0;
  if (typeof a === "number") return Number.isFinite(a) ? a : 0;
  const trimmed = a.trim();
  if (!trimmed) return 0;
  // Keep digits, dot, minus. Back-end uses dot-decimal; keep it simple.
  const normalized = trimmed.replace(/[^\d.-]/g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Normalizes transaction type to "credit" | "debit" */
function normalizeTxType(e: MinimalEntry): "credit" | "debit" {
  const raw = String(e.transaction_type ?? e.tx_type ?? "").toLowerCase();
  // Fallback: anything not "credit" treated as "debit"
  return raw === "credit" ? "credit" : "debit";
}

/** Picks the most relevant date for context */
function pickDate(e: MinimalEntry, context: "cashflow" | "settled"): string | null | undefined {
  if (context === "settled") return e.settlement_due_date ?? e.due_date;
  return e.due_date ?? e.settlement_due_date;
}

/* ------------------------------ Icons ------------------------------ */
const IconMinimize = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" {...p}>
    <path d="M4 10.5h12" strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);
const IconCancel = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" {...p}>
    <path d="M5 5l10 10M15 5L5 15" strokeWidth={1.6} strokeLinecap="round" />
  </svg>
);
const IconLiquidate = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" {...p}>
    <circle cx="10" cy="10" r="7.2" strokeWidth={1.4} />
    <path d="M6.5 10l2.2 2.2L13.5 7.8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconDelete = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" {...p}>
    <path d="M3.5 6h13" strokeWidth={1.6} strokeLinecap="round" />
    <path d="M7.5 6V4.8c0-.44.36-.8.8-.8h3.4c.44 0 .8.36.8.8V6" strokeWidth={1.4} />
    <path d="M6.2 6.8l.7 9c.04.48.45.86.93.86h4.34c.48 0 .89-.38.93-.86l.7-9" strokeWidth={1.2} />
  </svg>
);
const IconReturn = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path d="M9 14L4 9l5-5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------ Component ------------------------------ */

const SelectionActionsBar: React.FC<Props> = ({
  context = "cashflow",
  selectedIds,
  selectedEntries,
  onLiquidate,
  onDelete,
  onReturn,
  onCancel,
  isProcessing = false,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const { count, credits, debits, sumCredits, sumDebits, net, minDue, maxDue } =
    useMemo(() => {
      const count = selectedIds.length;

      let sumCredits = 0;
      let sumDebits = 0;
      let credits = 0;
      let debits = 0;

      const dates: Date[] = [];

      for (const e of selectedEntries) {
        const amt = parseAmount(e.amount);
        if (normalizeTxType(e) === "credit") {
          credits += 1;
          sumCredits += amt;
        } else {
          debits += 1;
          sumDebits += amt;
        }

        const rawDate = pickDate(e, context);
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) dates.push(d);
        }
      }

      const net = sumCredits - sumDebits;
      const minDue = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
      const maxDue = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

      return { count, credits, debits, sumCredits, sumDebits, net, minDue, maxDue };
    }, [selectedIds, selectedEntries, context]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  if (selectedIds.length === 0) return null;

  // Collapsed pill
  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded="false"
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 shadow-lg backdrop-blur px-3 py-2 hover:bg-white transition"
          title="Expandir"
        >
          <span className="text-[12px] text-gray-700">
            {count} selecionado{count > 1 ? "s" : ""}
          </span>
          <span className={`text-[12px] ${net >= 0 ? "text-emerald-700" : "text-rose-700"} font-medium`}>
            {fmtBRL(net)}
          </span>
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" aria-hidden>
            <path d="M5 12l5-5 5 5" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
      <div
        className="
          pointer-events-auto relative
          rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur
          p-3 md:p-4 transition-all
          max-w-[60vw] w-[min(560px,60vw)]
        "
        role="region"
        aria-live="polite"
      >
        {/* Minimize */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Minimizar"
          title="Minimizar"
          className="absolute -top-2 -right-2 h-7 w-7 grid place-items-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 shadow"
        >
          <IconMinimize className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-[1fr_auto] gap-5">
          {/* Info */}
          <div>
            <div className="text-[13px] text-gray-800">
              <b>{count}</b> selecionado{count > 1 ? "s" : ""}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600">
              <div>
                Créditos: <b className="text-emerald-700">{credits}</b>
              </div>
              <div>
                Débitos: <b className="text-rose-700">{debits}</b>
              </div>
              <div>
                Σ Créditos: <b className="text-emerald-700">{fmtBRL(sumCredits)}</b>
              </div>
              <div>
                Σ Débitos: <b className="text-rose-700">{fmtBRL(sumDebits)}</b>
              </div>
              <div className="col-span-2">
                Saldo líquido:{" "}
                <b className={net >= 0 ? "text-emerald-700" : "text-rose-700"}>{fmtBRL(net)}</b>
              </div>
              {minDue && maxDue && (
                <div className="col-span-2">
                  Venc.: <b>{minDue.toLocaleDateString()} – {maxDue.toLocaleDateString()}</b>
                </div>
              )}
            </div>
            <div className="mt-2 text-[10.5px] text-gray-500">
              Dica: pressione <kbd className="px-1 py-0.5 border rounded">Esc</kbd> para cancelar a seleção.
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            {context === "settled" ? (
              <>
                <Button
                  variant="danger"
                  onClick={onReturn}
                  disabled={isProcessing}
                  className="!px-3 !py-2 flex items-center justify-center gap-2"
                  title="Retornar"
                >
                  <IconReturn className="w-4 h-4" />
                  <span>Retornar</span>
                </Button>

                <Button
                  variant="outline"
                  className="!border-gray-300 !text-gray-700 hover:!bg-gray-50 !px-3 !py-2 flex items-center justify-center gap-2"
                  onClick={onCancel}
                  disabled={isProcessing}
                  title="Cancelar seleção (Esc)"
                >
                  <IconCancel className="w-4 h-4" />
                  <span>Cancelar</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  onClick={onLiquidate}
                  disabled={isProcessing}
                  className="!px-3 !py-2 flex items-center justify-center gap-2"
                  title="Liquidar selecionados"
                >
                  <IconLiquidate className="w-4 h-4" />
                  <span>Liquidar</span>
                </Button>

                <Button
                  variant="danger"
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="!px-3 !py-2 flex items-center justify-center gap-2"
                  title="Excluir selecionados"
                >
                  <IconDelete className="w-4 h-4" />
                  <span>Excluir</span>
                </Button>

                <Button
                  variant="outline"
                  className="!border-gray-300 !text-gray-700 hover:!bg-gray-50 !px-3 !py-2 flex items-center justify-center gap-2"
                  onClick={onCancel}
                  disabled={isProcessing}
                  title="Cancelar seleção (Esc)"
                >
                  <IconCancel className="w-4 h-4" />
                  <span>Cancelar</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionActionsBar;
