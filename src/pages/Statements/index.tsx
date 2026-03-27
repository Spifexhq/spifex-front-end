/* --------------------------------------------------------------------------
 * File: src/pages/Statements/index.tsx
 * -------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import { PermissionMiddleware } from "src/middlewares";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import StatementImportModal from "@/components/Modal/StatementImportModal";
import type { Statement, GetStatementsResponse } from "@/models/settings/statements";
import type { BankAccount } from "@/models/settings/banking";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type SelectItem = {
  label: string;
  value: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ||
      error.response?.data?.detail ||
      error.message ||
      fallback
    );
  }
  return fallback;
}

const formatBytes = (n: number) => {
  if (!Number.isFinite(n)) return "-";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const Statements: React.FC = () => {
  const { t } = useTranslation("statements");
  const { handleInitUser, isSuperUser, isSubscribed, permissions, isOwner } =
    useAuthContext();

  const canViewBanks = useMemo(
    () => (isOwner ? true : permissions.includes("view_bank")),
    [isOwner, permissions]
  );

  const canViewStatements = useMemo(
    () => (isOwner ? true : permissions.includes("view_statement")),
    [isOwner, permissions]
  );

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [rows, setRows] = useState<Statement[]>([]);

  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("");

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  useEffect(() => {
    (async () => {
      try {
        await handleInitUser();
      } finally {
        setIsAuthLoading(false);
      }
    })();
  }, [handleInitUser]);

  const isAccessLocked = !isAuthLoading && !isSubscribed && !isSuperUser;

  const refreshBanks = useCallback(async () => {
    if (isAccessLocked || !canViewBanks) return;

    try {
      const res = await api.getBanks();
      setBanks(res.data?.results ?? []);
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, t("toast.banksFetchError")),
        severity: "error",
      });
    }
  }, [canViewBanks, isAccessLocked, t]);

  const refreshStatements = useCallback(async () => {
    if (isAccessLocked || !canViewStatements) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = (await api.getStatements()) as GetStatementsResponse;
      setRows(res.results ?? []);
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, t("toast.listFetchError")),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [canViewStatements, isAccessLocked, t]);

  useEffect(() => {
    refreshBanks().catch(() => undefined);
    refreshStatements().catch(() => undefined);
  }, [refreshBanks, refreshStatements]);

  const bankOptions = useMemo<SelectItem[]>(
    () =>
      [...banks]
        .sort((a, b) => a.institution.localeCompare(b.institution))
        .map((b) => ({
          label: `${b.institution} • ${b.branch || "-"} / ${b.account_number || "-"}`,
          value: b.id,
        })),
    [banks]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (bankFilter && row.bank_account_id !== bankFilter) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          row.original_filename.toLowerCase().includes(q) ||
          (row.bank_account_label || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [rows, search, bankFilter]);

  const selectedStatement = useMemo(
    () => rows.find((item) => item.id === selectedStatementId) || null,
    [rows, selectedStatementId]
  );

  const handleDownload = useCallback(
    async (statement: Statement) => {
      if (isAccessLocked) {
        setSnack({
          message: t("paywall.body"),
          severity: "warning",
        });
        return;
      }

      try {
        await api.downloadStatement(statement.id);
      } catch (err) {
        setSnack({
          message: getErrorMessage(err, t("toast.downloadJsonFail")),
          severity: "error",
        });
      }
    },
    [isAccessLocked, t]
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return;

    if (isAccessLocked) {
      setSnack({
        message: t("paywall.body"),
        severity: "warning",
      });
      setConfirmDeleteId(null);
      return;
    }

    setBusy(true);
    try {
      await api.deleteStatement(confirmDeleteId);
      setRows((prev) => prev.filter((item) => item.id !== confirmDeleteId));

      if (selectedStatementId === confirmDeleteId) {
        setSelectedStatementId(null);
      }

      setSnack({
        message: t("toast.deleteOk"),
        severity: "success",
      });
    } catch (err) {
      setSnack({
        message: getErrorMessage(err, t("toast.deleteFail")),
        severity: "error",
      });
    } finally {
      setBusy(false);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, isAccessLocked, selectedStatementId, t]);

  if (isAuthLoading || loading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={8} />
      </>
    );
  }

  return (
    <>
      <TopProgress active={busy} variant="top" topOffset={64} />

      <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold leading-snug text-gray-900">
                  {t("header.title")}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => refreshStatements().catch(() => undefined)}
                  disabled={busy || isAccessLocked}
                >
                  {t("badge.syncing")}
                </Button>

                <PermissionMiddleware codeName={"add_statement"}>
                  <Button
                    variant="primary"
                    disabled={isAccessLocked}
                    onClick={() => {
                      if (isAccessLocked) {
                        setSnack({
                          message: t("paywall.body"),
                          severity: "warning",
                        });
                        return;
                      }

                      setSelectedStatementId(null);
                      setImportOpen(true);
                    }}
                  >
                    {t("btn.upload")}
                  </Button>
                </PermissionMiddleware>
              </div>
            </div>
          </header>

          {isAccessLocked ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50">
              <div className="px-5 py-10 text-center">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-amber-700">
                  {t("paywall.badge")}
                </div>
                <h2 className="mt-2 text-[18px] font-semibold text-amber-900">
                  {t("paywall.title")}
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-[13px] text-amber-800">
                  {t("paywall.body")}
                </p>
                <p className="mt-3 text-[12px] text-amber-700">{t("paywall.note")}</p>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-1 gap-3 border-b border-gray-200 px-4 py-4 sm:px-5 lg:grid-cols-[1.1fr_320px]">
                <Input
                  label={t("filters.searchLabel")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("filters.placeholder")}
                />

                <SelectDropdown<SelectItem>
                  label={t("filters.bank")}
                  items={bankOptions}
                  selected={
                    bankFilter
                      ? bankOptions.filter((o) => o.value === bankFilter)
                      : []
                  }
                  onChange={(items) => setBankFilter(items[0]?.value || "")}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("filters.bankPick")}
                  customStyles={{ maxHeight: "220px" }}
                />
              </div>

              <div className="divide-y divide-gray-200">
                {filteredRows.length === 0 ? (
                  <div className="px-5 py-10 text-sm text-gray-600">
                    {t("list.empty")}
                  </div>
                ) : (
                  filteredRows.map((s) => (
                    <div key={s.id} className="px-4 py-4 sm:px-5">
                      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1.2fr_220px_220px_auto]">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-gray-900">
                            {s.original_filename}
                          </p>
                          <p className="mt-1 text-[12px] text-gray-600">
                            {formatBytes(s.size_bytes)} • {s.pages ?? "-"} page(s)
                          </p>
                          <p className="mt-1 text-[12px] text-gray-500">
                            {new Date(s.created_at).toLocaleString()}
                          </p>
                          {s.error_message ? (
                            <p className="mt-2 text-[12px] text-rose-700">
                              {s.error_message}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-gray-600">
                            {t("filters.bank")}
                          </p>
                          <p className="text-[13px] text-gray-900">
                            {s.bank_account_label || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-gray-600">
                            {t("filters.status")}
                          </p>
                          <p className="text-[13px] text-gray-900">
                            {s.import_status
                              ? t(`statuses.${s.import_status}`, {
                                  defaultValue: String(s.import_status)
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                                })
                              : "—"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <PermissionMiddleware codeName={"change_statement"}>
                            <Button
                              variant="outline"
                              onClick={() => handleDownload(s)}
                              disabled={busy || isAccessLocked}
                            >
                              {t("actions.download")}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => {
                                if (isAccessLocked) {
                                  setSnack({
                                    message: t("paywall.body"),
                                    severity: "warning",
                                  });
                                  return;
                                }

                                setSelectedStatementId(s.id);
                                setImportOpen(true);
                              }}
                              disabled={busy || isAccessLocked}
                            >
                              {t("actions.analyze")}
                            </Button>
                          </PermissionMiddleware>

                          <PermissionMiddleware codeName={"delete_statement"}>
                            <Button
                              variant="cancel"
                              onClick={() => {
                                if (isAccessLocked) {
                                  setSnack({
                                    message: t("paywall.body"),
                                    severity: "warning",
                                  });
                                  return;
                                }

                                setConfirmDeleteId(s.id);
                              }}
                              disabled={busy || isAccessLocked}
                            >
                              {t("actions.delete")}
                            </Button>
                          </PermissionMiddleware>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <StatementImportModal
        open={importOpen && !isAccessLocked}
        statement={selectedStatement}
        bankOptions={bankOptions}
        onClose={() => setImportOpen(false)}
        onStatementCreated={(created) => {
          setRows((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
          setSelectedStatementId(created.id);
          setSnack({
            message: t("toast.uploadOk"),
            severity: "success",
          });
        }}
        onCommitted={({ createdCount }) => {
          setSnack({
            message: `${createdCount} cashflow entr${
              createdCount === 1 ? "y" : "ies"
            } created successfully.`,
            severity: "success",
          });
          refreshStatements().catch(() => undefined);
          setImportOpen(false);
        }}
      />

      <ConfirmToast
        open={!!confirmDeleteId && !isAccessLocked}
        text={t("confirm.deleteText")}
        confirmLabel={t("confirm.confirmLabel")}
        cancelLabel={t("confirm.cancelLabel")}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
        busy={busy}
        variant="danger"
      />

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default Statements;