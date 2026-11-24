import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/core/api/requests";
import { formatCurrency } from "@/lib";
import type { BankAccountTableRow, GetBanksTableResponse } from "@/models/settings/banking";
import type { ApiSuccess } from "@/models/Api";
import { personalApi } from "@/products/personal/services/api";
import type { PersonalAccount } from "@/products/personal/types";
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

type State = { hasLoaded?: boolean; history?: number[]; currency?: string | null; mixed?: boolean; mixedHasBaseTotal?: boolean; baseCurrency?: string | null; canViewBalance?: boolean; banks: BankAccountTableRow[]; count: number; total: number; totalsByCurrency?: Record<string, string>; rateDate?: string | null; ratesMissing?: string[]; loading: boolean; error: string | null };
export function useBankBalances(selectedBankIds: string[] | undefined, refreshKey: number, enabled: boolean, personal = false) {
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
        let banks: BankAccountTableRow[];
        let count: number;
        let total: number;
        let history: number[] | undefined;
        let currency: string | null | undefined;
        let mixed: boolean | undefined;
        let mixedHasBaseTotal = false;
        let baseCurrency: string | null | undefined;
        let canViewBalance: boolean | undefined;
        let totalsByCurrency: Record<string, string> | undefined;
        let rateDate: string | null | undefined;
        let ratesMissing: string[] | undefined;

        if (personal) {
          // Personal workspaces must use their scoped API. The Business banking
          // table endpoint enforces Business `view_bank` plan entitlements.
          const res = await personalApi.list<PersonalAccount>("accounts", {
            is_active: true,
            page: 1,
            page_size: 100,
          });
          if (!alive) return;
          const accounts = Array.isArray(res.data?.results) ? res.data.results : [];
          const visible = ids.length ? accounts.filter(account => ids.includes(String(account.id))) : accounts;
          banks = visible.map(account => ({
            id: account.id,
            institution: account.institution || account.name,
            branch: account.branch || "",
            account_number: account.account_number || "",
            iban: account.iban || "",
            currency: account.currency,
            is_active: account.is_active,
            consolidated_balance: account.consolidated_balance ?? account.balance ?? null,
          }));
          count = visible.length;
          total = visible.reduce((sum, account) => sum + Number(account.consolidated_balance ?? account.balance ?? 0), 0);
          currency = banks[0]?.currency ?? null;
          const groups = new Map<string, number>();
          for (const row of banks) {
            const code = String(row.currency || "").toUpperCase();
            if (!code) continue;
            groups.set(code, (groups.get(code) ?? 0) + Number(row.consolidated_balance ?? 0));
          }
          mixed = groups.size > 1;
          totalsByCurrency = Object.fromEntries(
            Array.from(groups.entries()).map(([code, value]) => [code, value.toFixed(2)])
          );
          canViewBalance = true;
        } else {
          const res: ApiSuccess<GetBanksTableResponse> = await api.getBanksTable({
            active: true,
            include_history: true,
            ids: ids.length ? ids : [],
          });
          if (!alive) return;
          const payload = res.data;
          banks = Array.isArray(payload?.banks) ? payload.banks : [];
          count = Number(payload?.count ?? banks.length) || banks.length;
          mixed = payload?.mixed_currencies === true;
          baseCurrency = payload?.base_currency ?? null;
          totalsByCurrency = payload?.totals_by_currency;
          rateDate = payload?.rate_date ?? null;
          ratesMissing = payload?.rates_missing;
          mixedHasBaseTotal = mixed && payload?.total_base_balance != null;
          const rawTotal = mixed ? payload?.total_base_balance : payload?.total_consolidated_balance;
          const totalN = rawTotal == null ? NaN : Number(String(rawTotal));
          total = Number.isFinite(totalN) ? totalN : 0;
          history = payload.balance_history?.map(point => Number(point.value));
          currency = mixed && mixedHasBaseTotal ? baseCurrency : payload.balance_currency;
          canViewBalance = payload.can_view_balance;
        }

        if (!alive) return;

        setState({
          banks,
          hasLoaded: true,
          history,
          currency,
          mixed,
          mixedHasBaseTotal,
          baseCurrency,
          totalsByCurrency,
          rateDate,
          ratesMissing,
          canViewBalance,
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
  }, [enabled, ids, personal, refreshKey, retryKey, t]);

  const sorted = useMemo(
    () => state.banks.slice().sort((a, b) => a.institution.localeCompare(b.institution)),
    [state.banks],
  );

  const totalFmt = useMemo(() => {
    if (state.mixed) {
      return state.mixedHasBaseTotal
        ? formatCurrency(Number(state.total || 0), state.baseCurrency || undefined)
        : t("mixedCurrencies");
    }
    return formatCurrency(Number(state.total || 0), state.currency || undefined);
  }, [state.total, state.mixed, state.mixedHasBaseTotal, state.baseCurrency, state.currency, t]);


 return { state, ids, sorted, totalFmt, retryBanks: () => setRetryKey(key => key + 1) };
}
