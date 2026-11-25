import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useAuthContext } from "@/hooks/useAuth";
import type { PnlConfig, PnlSource, PnlTreatment } from "@/models/finance/profitLoss";
import type { AccountingBook } from "@/models/settings/accounting";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

type Snack =
  | { message: string; severity: "success" | "error" | "warning" | "info" }
  | null;

type Row = {
  categoryId: string;
  code: string;
  name: string;
  treatment: PnlTreatment;
  line: string;
};

const TREATMENT_SECTION: Record<PnlTreatment, string | null> = {
  operating_revenue: "revenue",
  revenue_deduction: "revenue_deductions",
  cost_of_sales: "cost_of_sales",
  operating_expense: "operating_expenses",
  depreciation: "depreciation_amortization",
  financial_income: "financial_income",
  financial_expense: "financial_expenses",
  income_tax: "income_tax",
  other: "other",
  exclude: null,
  unclassified: null,
};

const TREATMENTS: PnlTreatment[] = [
  "operating_revenue",
  "revenue_deduction",
  "cost_of_sales",
  "operating_expense",
  "depreciation",
  "financial_income",
  "financial_expense",
  "income_tax",
  "other",
  "exclude",
  "unclassified",
];

function toRows(config: PnlConfig): Row[] {
  const rows = new Map<string, Row>();
  for (const mapping of config.category_mappings) {
    rows.set(mapping.category_id, {
      categoryId: mapping.category_id,
      code: mapping.code,
      name: mapping.name,
      treatment: mapping.treatment,
      line: mapping.line ?? "",
    });
  }
  for (const category of config.unmapped_categories) {
    if (!rows.has(category.id)) {
      rows.set(category.id, {
        categoryId: category.id,
        code: category.code,
        name: category.name,
        treatment: "unclassified",
        line: "",
      });
    }
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function ProfitLossConfiguration() {
  const { t } = useTranslation("profitLoss");
  const { permissions, isOwner, isSuperUser } = useAuthContext();
  const canViewLedger =
    isOwner || isSuperUser || permissions.includes("view_ledger_account");
  const [config, setConfig] = useState<PnlConfig | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState("");
  const [template, setTemplate] = useState("generic");
  const [sourceMode, setSourceMode] = useState<PnlSource>("cash_settled");
  const [acknowledgeLedger, setAcknowledgeLedger] = useState(false);
  const [books, setBooks] = useState<AccountingBook[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [bookId, setBookId] = useState("");
  const [accountDraft, setAccountDraft] = useState<Record<string, string>>({});
  const [dirtyAccounts, setDirtyAccounts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const applyConfig = useCallback((next: PnlConfig) => {
    setConfig(next);
    setRows(toRows(next));
    setDirty(new Set());
    setTemplate(next.template_code);
    setSourceMode(next.source_mode);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getProfitLossConfig();
      applyConfig(response.data);
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("config.loadError")), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [applyConfig, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!config?.accounting_enabled || !canViewLedger) {
      setBooks([]);
      setAccounts([]);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const [booksResponse, accountsResponse] = await Promise.all([
          api.getAccountingBooks(),
          api.getLedgerAccounts({ active: "true", account_type: "posting", page_size: 500 }),
        ]);
        if (!alive) return;
        const bookList = Array.isArray(booksResponse.data)
          ? booksResponse.data
          : (booksResponse.data as { results?: AccountingBook[] }).results ?? [];
        const accountList = Array.isArray(accountsResponse.data)
          ? accountsResponse.data
          : (accountsResponse.data as { results?: LedgerAccount[] }).results ?? [];
        setBooks(bookList);
        setAccounts(
          accountList.filter(
            (account) => account.statement_section === "income" || account.statement_section === "expense"
          )
        );
        const primary = bookList.find((book) => book.is_primary && book.is_active) ?? bookList[0];
        setBookId(primary?.id ?? "");
      } catch (cause) {
        setSnack({ message: apiErrorMessage(cause, t("config.saveError")), severity: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [config?.accounting_enabled, canViewLedger, t]);

  useEffect(() => {
    if (!config || !bookId) return;
    const draft: Record<string, string> = {};
    for (const mapping of config.account_mappings) {
      if (mapping.book_id === bookId && mapping.ledger_account_id) {
        draft[mapping.ledger_account_id] = mapping.line;
      }
    }
    setAccountDraft(draft);
    setDirtyAccounts(new Set());
  }, [bookId, config]);

  const lineOptions = useMemo(() => {
    if (!config) return {} as Record<string, Array<{ code: string; name: string }>>;
    const bySection: Record<string, Array<{ code: string; name: string }>> = {};
    for (const line of config.lines) {
      if (line.is_subtotal) continue;
      bySection[line.section] = bySection[line.section] ?? [];
      bySection[line.section].push({ code: line.code, name: line.name });
    }
    return bySection;
  }, [config]);

  const updateRow = (categoryId: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.categoryId === categoryId ? { ...row, ...patch } : row))
    );
    setDirty((current) => new Set(current).add(categoryId));
  };

  const saveMappings = async () => {
    const changed = rows.filter((row) => dirty.has(row.categoryId));
    if (!changed.length) return;
    setBusy(true);
    try {
      const response = await api.updateProfitLossCategoryMappings({
        mappings: changed.map((row) => ({
          category_id: row.categoryId,
          treatment: row.treatment,
          line: row.treatment === "exclude" || row.treatment === "unclassified" ? null : row.line || null,
        })),
        current_password: password,
      });
      applyConfig(response.data);
      setPassword("");
      setSnack({ message: t("config.savedMappings"), severity: "success" });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("config.saveError")), severity: "error" });
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = async () => {
    setBusy(true);
    try {
      const response = await api.applyProfitLossTemplate({
        template_code: template,
        current_password: password,
      });
      applyConfig(response.data);
      setPassword("");
      setSnack({ message: t("config.templateApplied"), severity: "success" });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("config.saveError")), severity: "error" });
    } finally {
      setBusy(false);
    }
  };

  const saveSource = async () => {
    setBusy(true);
    try {
      const response = await api.updateProfitLossSettings({
        source_mode: sourceMode,
        acknowledge_ledger_source: acknowledgeLedger,
        current_password: password,
      });
      applyConfig(response.data);
      setPassword("");
      setSnack({ message: t("config.sourceSaved"), severity: "success" });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("config.saveError")), severity: "error" });
    } finally {
      setBusy(false);
    }
  };

  const saveLedgerMappings = async () => {
    const changed = Object.entries(accountDraft).filter(
      ([accountId, line]) => dirtyAccounts.has(accountId) && line
    );
    if (!bookId || !changed.length) return;
    setBusy(true);
    try {
      const response = await api.updateProfitLossAccountMappings({
        book_id: bookId,
        mappings: changed.map(([accountId, line]) => ({
          ledger_account_id: accountId,
          line,
        })),
        current_password: password,
      });
      applyConfig(response.data);
      setPassword("");
      setSnack({ message: t("config.savedLedger"), severity: "success" });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("config.saveError")), severity: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !config) return <TopProgress active variant="center" />;

  if (!config) {
    return (
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <Card padding="compact" className="space-y-3">
          <p className="text-[13px] text-gray-800">{t("config.loadError")}</p>
          <Button variant="secondary" onClick={() => void load()}>
            {t("config.retry")}
          </Button>
        </Card>
        <Snackbar
          open={snack != null}
          message={snack?.message}
          severity={snack?.severity}
          onClose={() => setSnack(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Card padding="compact" className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs leading-5 text-gray-600">{t("config.intro")}</p>
        <Link className="text-xs font-medium text-sky-700 hover:underline" to="/b/pnl">
          {t("config.backToReport")}
        </Link>
      </Card>

      <Card padding="compact" className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">{t("config.templateTitle")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-gray-600">
            <span>{t("config.template")}</span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-[13px]"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
            >
              <option value="generic">{t("templates.generic")}</option>
              <option value="services">{t("templates.services")}</option>
              <option value="retail">{t("templates.retail")}</option>
            </select>
          </label>
          <Button variant="secondary" onClick={() => void applyTemplate()} isLoading={busy} disabled={!password}>
            {t("config.applyTemplate")}
          </Button>
          <span className="text-xs text-gray-500">
            {t("config.currentTemplate", { template: t(`templates.${config.template_code}`) })}
          </span>
        </div>
      </Card>

      <Card padding="compact" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">{t("config.mappingsTitle")}</h2>
          <span className="text-xs text-gray-500">
            {t("config.mappingVersion", { version: config.mapping_version })}
          </span>
        </div>
        <p className="text-xs leading-5 text-gray-600">{t("config.mappingsHint")}</p>
        {config.unmapped_categories.length > 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("config.unmapped", { count: config.unmapped_categories.length })}
          </p>
        )}
        <div className="max-h-[520px] overflow-auto rounded-md border border-gray-200">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">{t("config.category")}</th>
                <th className="px-3 py-2">{t("config.treatment")}</th>
                <th className="px-3 py-2">{t("config.line")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const section = TREATMENT_SECTION[row.treatment];
                const options = section ? lineOptions[section] ?? [] : [];
                return (
                  <tr key={row.categoryId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.code}</p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[12px]"
                        value={row.treatment}
                        onChange={(event) => {
                          const treatment = event.target.value as PnlTreatment;
                          const nextSection = TREATMENT_SECTION[treatment];
                          const firstLine = nextSection ? lineOptions[nextSection]?.[0]?.code ?? "" : "";
                          updateRow(row.categoryId, { treatment, line: firstLine });
                        }}
                      >
                        {TREATMENTS.map((treatment) => (
                          <option key={treatment} value={treatment}>
                            {t(`treatments.${treatment}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[12px] disabled:opacity-50"
                        value={row.line}
                        disabled={!section}
                        onChange={(event) => updateRow(row.categoryId, { line: event.target.value })}
                      >
                        <option value="">{section ? t("config.chooseLine") : t("config.notApplicable")}</option>
                        {options.map((line) => (
                          <option key={line.code} value={line.code}>
                            {line.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="compact" className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">{t("config.sourceTitle")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-gray-600">
            <span>{t("config.source")}</span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-[13px]"
              value={sourceMode}
              onChange={(event) => setSourceMode(event.target.value as PnlSource)}
            >
              <option value="cash_settled">{t("sources.cash_settled.label")}</option>
              <option value="cash_committed">{t("sources.cash_committed.label")}</option>
              <option value="ledger" disabled={!config.accounting_enabled}>
                {t("sources.ledger.label")}
              </option>
            </select>
          </label>
          {sourceMode === "ledger" && (
            <label className="flex items-center gap-2 pb-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={acknowledgeLedger}
                onChange={(event) => setAcknowledgeLedger(event.target.checked)}
              />
              {t("config.acknowledgeLedger")}
            </label>
          )}
          <Button variant="secondary" onClick={() => void saveSource()} isLoading={busy} disabled={!password}>
            {t("config.saveSource")}
          </Button>
        </div>
        {!config.accounting_enabled && (
          <p className="text-xs text-gray-500">{t("config.ledgerUnavailable")}</p>
        )}
      </Card>

      {config.accounting_enabled && canViewLedger && (
        <Card padding="compact" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{t("config.ledgerTitle")}</h2>
            <select
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[12px]"
              value={bookId}
              onChange={(event) => setBookId(event.target.value)}
            >
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.code} · {book.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs leading-5 text-gray-600">{t("config.ledgerHint")}</p>
          <div className="max-h-[420px] overflow-auto rounded-md border border-gray-200">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">{t("config.ledgerAccount")}</th>
                  <th className="px-3 py-2">{t("config.ledgerLine")}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">
                        {account.code} · {account.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.statement_section}
                        {account.report_group ? ` · ${account.report_group}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-[12px]"
                        value={accountDraft[account.id] ?? ""}
                        onChange={(event) => {
                          const line = event.target.value;
                          setAccountDraft((current) => ({ ...current, [account.id]: line }));
                          setDirtyAccounts((current) => new Set(current).add(account.id));
                        }}
                      >
                        <option value="">{t("config.chooseLine")}</option>
                        {config.lines
                          .filter((line) => !line.is_subtotal)
                          .map((line) => (
                            <option key={line.code} value={line.code}>
                              {line.name}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-xs text-gray-500" colSpan={2}>
                      {t("config.noLedgerAccounts")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => void saveLedgerMappings()}
              isLoading={busy}
              disabled={!password || dirtyAccounts.size === 0}
            >
              {t("config.saveLedger", { count: dirtyAccounts.size })}
            </Button>
          </div>
        </Card>
      )}

      <Card padding="compact" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t("config.passwordTitle")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] space-y-1 text-xs font-medium text-gray-600">
            <span>{t("config.password")}</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <Button onClick={() => void saveMappings()} isLoading={busy} disabled={!password || dirty.size === 0}>
            {t("config.saveMappings", { count: dirty.size })}
          </Button>
        </div>
        <p className="text-xs text-gray-500">{t("config.passwordHint")}</p>
      </Card>

      <Snackbar
        open={snack != null}
        message={snack?.message}
        severity={snack?.severity}
        onClose={() => setSnack(null)}
      />
    </div>
  );
}
