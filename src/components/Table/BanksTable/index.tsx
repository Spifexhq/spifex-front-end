import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ArrowUpRight, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib";
import { api } from "@/api/requests";
import { PermissionMiddleware } from "@/middlewares";
import Button from "@/shared/ui/Button";
import type { BankAccountTableRow, GetBanksTableResponse } from "@/models/settings/banking";
import type { ApiSuccess } from "@/models/Api";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && typeof err.message === "string") return err.message;
  if (isRecord(err)) {
    const msg = err["message"];
    if (typeof msg === "string") return msg;
    const detail = err["detail"];
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

function toKey(v: unknown) {
  return String(v ?? "");
}

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

type BanksTableProps = {
  selectedBankIds?: Array<string | number>;
  active?: boolean;
  refreshKey?: number;
  expanded: boolean;
  onExpandedChange(next: boolean): void;
  onGoToBanks?(): void;
};
type State = { banks: BankAccountTableRow[]; count: number; total: number; loading: boolean; error: string | null };

export default function BanksTable({ selectedBankIds, active = true, refreshKey = 0, expanded, onExpandedChange, onGoToBanks }: BanksTableProps) {
  const { t } = useTranslation(["banksTable", "kpiCards"]);
  const navigate = useNavigate();
  const detailsId = useId();
  const reduced = useReducedMotion();
  const ids = useMemo(() => {
    const raw = Array.isArray(selectedBankIds) ? selectedBankIds : [];
    return raw.map(toKey).filter(Boolean).sort();
  }, [selectedBankIds]);

  const [retryKey, setRetryKey] = useState(0);

  const [state, setState] = useState<State>({
    banks: [],
    count: 0,
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      setState((p) => ({ ...p, loading: true, error: null }));

      try {
        const res: ApiSuccess<GetBanksTableResponse> = await api.getBanksTable({
          active,
          ids: ids.length ? ids : [],
        });

        if (!alive) return;

        const payload = res.data;

        const banks = Array.isArray(payload?.banks) ? payload.banks : [];
        const count = Number(payload?.count ?? banks.length) || banks.length;

        const totalN = Number(String(payload?.total_consolidated_balance ?? "0"));
        const total = Number.isFinite(totalN) ? totalN : 0;

        setState({
          banks,
          count,
          total,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!alive) return;
        setState({
          banks: [],
          count: 0,
          total: 0,
          loading: false,
          error: getErrorMessage(err, t("banksTable:loadError")),
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [active, ids, refreshKey, retryKey, t]);

  const sorted = useMemo(
    () => state.banks.slice().sort((a, b) => a.institution.localeCompare(b.institution)),
    [state.banks],
  );

  const totalFmt = useMemo(() => formatCurrency(Number(state.total || 0)), [state.total]);


  return <>
    <div className="min-w-0 px-4 py-3 sm:px-5">
      <div className="text-xs leading-5 text-gray-500">{t("kpiCards:panel.consolidatedBalance")}</div>
      <PermissionMiddleware codeName="view_consolidated_balance">
        <div aria-busy={state.loading} className="mt-1 whitespace-nowrap text-base font-semibold leading-7 tracking-tight text-gray-900 tabular-nums sm:text-2xl">
          {state.loading || state.error ? "—" : totalFmt}
        </div>
      </PermissionMiddleware>
      <button type="button" onClick={() => onExpandedChange(!expanded)} aria-expanded={expanded} aria-controls={detailsId}
        className="mt-1 inline-flex min-h-7 max-w-full items-center gap-1 rounded text-[11px] font-medium text-gray-600 transition-colors hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">
        <span>{state.error ? t("banksTable:details") : t("kpiCards:panel.accountsCount", { count: state.loading ? 0 : state.count })}</span>
        <ChevronDown size={13} aria-hidden className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
      </button>
      <p className="hidden text-[11px] leading-4 text-gray-400 sm:block">{t(ids.length ? "banksTable:balanceScope" : "banksTable:allAccountsScope")}</p>
    </div>
    <AnimatePresence initial={false}>
      {expanded && <motion.section id={detailsId} key="bank-details" aria-label={t("banksTable:aria.section")}
        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={{ duration: reduced ? 0 : .16, ease: "easeOut" }}
        className="order-last col-span-full min-w-0 overflow-hidden border-t border-gray-100 bg-gray-50/40">
        <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-700"><Landmark size={14} aria-hidden />{t("banksTable:aria.section")}</h3>
          <button type="button" onClick={() => onGoToBanks ? onGoToBanks() : navigate("/settings/banks")}
            className="inline-flex items-center gap-1 rounded py-1 text-[11px] font-medium text-gray-600 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">
            {t("banksTable:manage")}<ArrowUpRight size={12} aria-hidden />
          </button>
        </div>
        <div className="max-h-44 overflow-y-auto overscroll-contain px-4 pb-2 sm:px-5">
          {state.loading ? <p role="status" className="py-4 text-xs text-gray-500">{t("banksTable:aria.loading")}</p>
          : state.error ? <div role="status" className="flex items-center justify-between gap-3 py-3"><p className="text-xs text-red-700">{state.error}</p><Button variant="outline" size="xs" onClick={() => setRetryKey(key => key + 1)}>{t("kpiCards:overview.retry")}</Button></div>
          : !sorted.length ? <p className="py-4 text-xs text-gray-500">{t("banksTable:empty")}</p>
          : <ul className="divide-y divide-gray-100">{sorted.map(bank => <li key={bank.id} className="flex items-center justify-between gap-3 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-[10px] font-semibold text-gray-500">{getInitials(bank.institution)}</span>
              <div className="min-w-0"><div className="truncate text-xs font-medium text-gray-800">{bank.institution}</div>
                <div className="truncate text-[11px] text-gray-500">{bank.iban || t("banksTable:labels.branchAccount", { branch: bank.branch || "—", account: bank.account_number || "—" })}</div>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-gray-800 tabular-nums">{formatCurrency(Number(bank.consolidated_balance || 0))}</span>
          </li>)}</ul>}
        </div>
      </motion.section>}
    </AnimatePresence>
  </>;
}
