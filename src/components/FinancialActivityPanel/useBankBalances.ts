import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/requests";
import { formatCurrency } from "@/lib";
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

type State = { hasLoaded?: boolean; history?: number[]; currency?: string | null; mixed?: boolean; canViewBalance?: boolean; banks: BankAccountTableRow[]; count: number; total: number; loading: boolean; error: string | null };
export function useBankBalances(selectedBankIds: string[] | undefined, refreshKey: number, enabled: boolean) {
 const { t } = useTranslation("banksTable");
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
    if (!enabled) return;
    let alive = true;

    (async () => {
      setState((p) => ({ ...p, loading: true, error: null }));

      try {
        const res: ApiSuccess<GetBanksTableResponse> = await api.getBanksTable({
          active: true,
          include_history: true,
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
          hasLoaded: true,
          history: payload.balance_history?.map(point => Number(point.value)),
          currency: payload.balance_currency,
          mixed: payload.mixed_currencies,
          canViewBalance: payload.can_view_balance,
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
  }, [enabled, ids, refreshKey, retryKey, t]);

  const sorted = useMemo(
    () => state.banks.slice().sort((a, b) => a.institution.localeCompare(b.institution)),
    [state.banks],
  );

  const totalFmt = useMemo(() => state.mixed ? t("mixedCurrencies") : formatCurrency(Number(state.total || 0), state.currency || undefined), [state.total, state.mixed, state.currency, t]);


 return { state, ids, sorted, totalFmt, retryBanks: () => setRetryKey(key => key + 1) };
}
