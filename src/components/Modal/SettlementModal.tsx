// src/components/Modal/SettlementModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";

import { api } from "@/api/requests";
import { formatCurrency } from "@/lib/currency/formatCurrency";

import type { Entry } from "@/models/entries/entries";
import type { BulkSettleItem } from "@/models/entries/settlements";
import type { BankAccount } from "@/models/settings/banking";
import type { ApiError } from "@/models/Api";

interface SettlementModalProps {
  isOpen: boolean;
  onClose(): void;
  selectedEntries: Entry[];
  onSave(): void;
  banksData: {
    banks: BankAccount[];
    loading: boolean;
    error: string | null;
  };
}

type TxType = "credit" | "debit";

type LocalEntryState = {
  id: string;
  value_date: string;
  description: string;
  amount: string;
  tx_type: TxType;
  isPartial: boolean;
  partial_amount: string;
};

const FORM_ID = "settlementForm";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ helpers ------------------------------ */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toISODate(input: unknown, fallback = todayISO()): string {
  const s = String(input ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : fallback;
}

function isFutureISO(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`).getTime();
  const t = new Date(`${todayISO()}T00:00:00Z`).getTime();
  return Number.isFinite(d) && d > t;
}

function signedEffect(tx: TxType, amountRaw: unknown): number {
  const n = Number(amountRaw);
  if (!Number.isFinite(n)) return 0;
  return tx === "debit" ? -n : n;
}

function firstText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstText(item);
      if (text) return text;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return (
      firstText(obj.message) ||
      firstText(obj.detail) ||
      firstText(obj.non_field_errors) ||
      firstText(obj.bank) ||
      firstText(obj.bank_id) ||
      firstText(obj.book) ||
      firstText(obj.category) ||
      firstText(obj.policy) ||
      firstText(obj.items) ||
      firstText(obj.error) ||
      null
    );
  }

  return null;
}

function getSettlementErrorMessage(errorLike: unknown, fallback: string): string {
  if (axios.isAxiosError(errorLike)) {
    return firstText(errorLike.response?.data) || fallback;
  }

  if (errorLike && typeof errorLike === "object") {
    const obj = errorLike as Record<string, unknown>;
    return firstText(obj.error) || firstText(obj) || fallback;
  }

  return fallback;
}

/* ------------------------------ component ------------------------------ */

const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  selectedEntries,
  onSave,
  banksData,
}) => {
  const { t } = useTranslation("settlementModal");
  const { banks, loading: loadingBanks, error: banksError } = banksData;

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [entriesState, setEntriesState] = useState<LocalEntryState[]>([]);
  const [bulkDate, setBulkDate] = useState<string>("");
  const [snack, setSnack] = useState<Snack>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const submitDisabledRef = useRef(true);

  /* ----------------------------- derived data ----------------------------- */

  const sortedBanks = useMemo(
    () => [...banks].sort((a, b) => a.institution.localeCompare(b.institution)),
    [banks]
  );

  const chosenBank = useMemo(
    () => sortedBanks.find((b) => b.id === selectedBankId) || null,
    [sortedBanks, selectedBankId]
  );

  const rowHasError = useCallback((row: LocalEntryState) => {
    if (!row.isPartial) return false;

    const partial = Number(row.partial_amount);
    const full = Number(row.amount);

    if (!Number.isFinite(partial) || !Number.isFinite(full)) return true;
    return partial <= 0 || partial > full;
  }, []);

  const somePartialInvalid = useMemo(() => entriesState.some(rowHasError), [entriesState, rowHasError]);

  const totalOriginalSigned = useMemo(() => {
    return selectedEntries.reduce((sum, e) => {
      const tx = e.tx_type as TxType;
      return sum + signedEffect(tx, e.amount);
    }, 0);
  }, [selectedEntries]);

  const totalToSettleSigned = useMemo(() => {
    return entriesState.reduce((sum, row) => {
      const raw = row.isPartial ? row.partial_amount : row.amount;
      return sum + signedEffect(row.tx_type, raw);
    }, 0);
  }, [entriesState]);

  const partialCount = useMemo(() => entriesState.filter((r) => r.isPartial).length, [entriesState]);

  const isSubmitDisabled = useMemo(() => {
    return loadingBanks || !!banksError || !selectedBankId || entriesState.length === 0 || somePartialInvalid;
  }, [banksError, entriesState.length, loadingBanks, selectedBankId, somePartialInvalid]);

  useEffect(() => {
    submitDisabledRef.current = isSubmitDisabled;
  }, [isSubmitDisabled]);

  /* -------------------------------- effects -------------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    const today = todayISO();
    setSelectedBankId(null);

    const mapped: LocalEntryState[] = selectedEntries.map((e) => {
      const due = toISODate(e.due_date, today);
      const valueDate = isFutureISO(due) ? today : due;

      return {
        id: e.id,
        value_date: valueDate,
        description: e.description ?? "",
        amount: e.amount ?? "",
        tx_type: e.tx_type as TxType,
        isPartial: false,
        partial_amount: "",
      };
    });

    setEntriesState(mapped);
    setBulkDate(today);
  }, [isOpen, selectedEntries]);

  window.useGlobalEsc(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        if (!submitDisabledRef.current) formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  /* -------------------------------- handlers -------------------------------- */

  const updateEntryDate = useCallback((id: string, val: string) => {
    setEntriesState((prev) => prev.map((row) => (row.id === id ? { ...row, value_date: val } : row)));
  }, []);

  const togglePartial = useCallback((id: string) => {
    setEntriesState((prev) =>
      prev.map((row) => (row.id === id ? { ...row, isPartial: !row.isPartial, partial_amount: "" } : row))
    );
  }, []);

  const updatePartialAmount = useCallback((id: string, val: string) => {
    setEntriesState((prev) => prev.map((row) => (row.id === id ? { ...row, partial_amount: val } : row)));
  }, []);

  const applyDateToAll = useCallback(() => {
    if (!bulkDate) return;
    setEntriesState((prev) => prev.map((row) => ({ ...row, value_date: bulkDate })));
  }, [bulkDate]);

  const markAllPartial = useCallback(() => {
    setEntriesState((prev) => prev.map((row) => ({ ...row, isPartial: true, partial_amount: "" })));
  }, []);

  const clearAllPartial = useCallback(() => {
    setEntriesState((prev) => prev.map((row) => ({ ...row, isPartial: false, partial_amount: "" })));
  }, []);

  /* -------------------------------- submit --------------------------------- */

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBankId) return;

      try {
        const items: BulkSettleItem[] = entriesState.map((row) => {
          const raw = row.isPartial ? row.partial_amount : row.amount;

          return {
            entry_id: row.id,
            bank_id: selectedBankId,
            amount: raw || "0",
            value_date: row.value_date,
          };
        });

        type ApiOk<T> = { data: T };
        type ApiResult<T> = ApiOk<T> | ApiError;

        const res: ApiResult<unknown> = await api.addSettlementsBulk(items, true);

        if (!("data" in res)) {
          const apiError = res as ApiError;
          setSnack({
            message: getSettlementErrorMessage(apiError, t("errors.bulk")),
            severity: "error",
          });
          return;
        }

        onSave();
        onClose();
      } catch (err) {
        setSnack({
          message: getSettlementErrorMessage(err, t("errors.bulk")),
          severity: "error",
        });
      }
    },
    [entriesState, onClose, onSave, selectedBankId, t]
  );

  /* --------------------------------- UI ------------------------------------ */

  if (!isOpen) return null;

  const selectedCount = selectedEntries.length;
  const headerTitle = selectedCount === 1 ? t("header.title.one") : t("header.title.many", { n: selectedCount });

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9999] md:grid md:place-items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("aria.dialog")}
          className={[
            "fixed inset-x-0 bottom-0 h-[100dvh] max-h-[100dvh] rounded-none border-0",
            "md:static md:rounded-lg md:border md:border-gray-200",
            "md:w-[1500px] md:max-w-[96vw] md:h-[640px] md:max-h-[92vh]",
            "bg-white shadow-xl overflow-hidden flex flex-col",
          ].join(" ")}
        >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header — desktop layout preserved exactly; mobile gets close button via X icon */}
        <header className="border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-3 md:pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700 shrink-0">
                LQ
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.kind")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{headerTitle}</h1>
                {/* Sub-line visible on mobile only */}
                <p className="md:hidden mt-0.5 text-[11px] text-gray-500">
                  {t("entries.count", { n: entriesState.length })}
                  {partialCount > 0 ? ` • ${partialCount} ${t("actions.markAllPartial")}` : ""}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center shrink-0"
              onClick={onClose}
              aria-label={t("actions.close")}
              title={t("actions.close")}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ── Mobile summary strip ── */}
        <div className="md:hidden shrink-0 grid grid-cols-2 gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">{t("footer.original")}</div>
            <div className="text-[13px] font-semibold text-gray-900 tabular-nums">
              {formatCurrency(totalOriginalSigned.toFixed(2))}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">{t("footer.toSettle")}</div>
            <div className="text-[13px] font-semibold text-gray-900 tabular-nums">
              {formatCurrency(totalToSettleSigned.toFixed(2))}
            </div>
          </div>
        </div>

        {/* Content — desktop: unchanged grid; mobile: single scrollable column */}
        <form
          id={FORM_ID}
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 px-4 md:px-5 py-4 grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 min-w-0 overflow-y-auto md:overflow-hidden"
        >
          {/* ----------------- Banks Pane ----------------- */}
          <section
            aria-label={t("banks.aria")}
            className="min-w-0 flex flex-col border border-gray-300 rounded-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-600">{t("banks.title")}</span>
                <span className="text-[10px] text-gray-500">{t("banks.count", { n: sortedBanks.length })}</span>
              </div>

              {selectedBankId && (
                <span className="text-[11px] text-gray-600">
                  {t("banks.balance")}&nbsp;
                  <b className="text-gray-900">{formatCurrency(String(chosenBank?.consolidated_balance ?? "0.00"))}</b>
                </span>
              )}
            </div>

            {/* On mobile, cap height so both panes are visible without full-height flex */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200 bg-white max-h-[220px] md:max-h-none">
              {loadingBanks ? null : banksError ? (
                <div className="py-4 text-center text-xs text-red-600">{banksError}</div>
              ) : sortedBanks.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-600">{t("banks.none")}</div>
              ) : (
                sortedBanks.map((b) => {
                  const selected = selectedBankId === b.id;
                  const balance = formatCurrency(String(b.consolidated_balance ?? "0.00"));

                  return (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setSelectedBankId(selected ? null : b.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 focus:bg-gray-50 ${
                        selected ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`h-4 w-4 rounded-full border shrink-0 ${
                            selected
                              ? "border-[color:var(--accentPrimary)] bg-[color:var(--accentPrimary)]"
                              : "border-gray-300"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] text-gray-800 truncate leading-tight">{b.institution}</span>
                          <span className="text-[10px] text-gray-500 truncate leading-tight">
                            {t("banks.agency")} {b.branch} • {t("banks.account")} {b.account_number}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-[13px] font-semibold text-gray-800 tabular-nums">{balance}</div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* ----------------- Entries Pane ----------------- */}
          <section
            aria-label={t("entries.aria")}
            className="min-w-0 flex flex-col border border-gray-300 rounded-md overflow-hidden"
          >
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-300">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-gray-600">{t("entries.title")}</span>
                    <span className="text-[10px] text-gray-500">{t("entries.count", { n: entriesState.length })}</span>
                  </div>
                </div>

                {/* Controls — stacked on mobile, inline on desktop */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      kind="date"
                      value={bulkDate}
                      size="sm"
                      onValueChange={(iso: string) => setBulkDate(iso)}
                      variant="default"
                      aria-label={t("actions.bulkDate")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="!h-8 !px-2 text-[12px]"
                      onClick={applyDateToAll}
                      disabled={!bulkDate}
                    >
                      {t("actions.applyDateAll")}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden md:block w-px h-5 bg-gray-300" />
                    <Button type="button" variant="outline" className="!h-8 !px-2 text-[12px] flex-1 md:flex-none" onClick={markAllPartial}>
                      {t("actions.markAllPartial")}
                    </Button>
                    <Button type="button" variant="outline" className="!h-8 !px-2 text-[12px] flex-1 md:flex-none" onClick={clearAllPartial}>
                      {t("actions.clearAllPartial")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop table — unchanged */}
            <div className="hidden md:block flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-[140px_1fr_140px_80px_180px] gap-2 items-center px-3 py-2 bg-white text-[11px] text-gray-600 border-b border-gray-200 sticky top-0 z-[9999]">
                <div className="text-center">{t("table.due")}</div>
                <div className="text-center">{t("table.desc")}</div>
                <div className="text-center">{t("table.amount")}</div>
                <div className="text-center">{t("table.partialQ")}</div>
                <div className="text-center">{t("table.partialAmount")}</div>
              </div>

              {entriesState.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-600">{t("table.none")}</div>
              ) : (
                entriesState.map((row) => {
                  const invalid = rowHasError(row);

                  return (
                    <div key={row.id} className="px-3 py-2 border-b border-gray-200 hover:bg-gray-50">
                      <div className="grid grid-cols-[140px_1fr_140px_80px_180px] gap-2 items-center text-[12px]">
                        <div className="text-center">
                          <Input
                            kind="date"
                            value={row.value_date}
                            size="sm"
                            onValueChange={(iso: string) => updateEntryDate(row.id, iso)}
                            aria-label={t("table.due")}
                            variant="default"
                            className="w-[130px] mx-auto"
                          />
                        </div>

                        <div className="truncate pr-2">{row.description}</div>

                        <div className="text-center tabular-nums font-semibold text-gray-900">
                          <span className="mr-1">{row.tx_type === "debit" ? "-" : ""}</span>
                          {formatCurrency(row.amount)}
                        </div>

                        <div className="flex items-center justify-center">
                          <Checkbox size="sm" checked={row.isPartial} onChange={() => togglePartial(row.id)} />
                        </div>

                        <div className="flex items-center justify-center">
                          {row.isPartial ? (
                            <Input
                              kind="amount"
                              value={row.partial_amount || ""}
                              size="sm"
                              onValueChange={(val: string) => updatePartialAmount(row.id, val)}
                              display="currency"
                              zeroAsEmpty
                              className={invalid ? "!border-red-400 bg-red-50" : ""}
                              aria-invalid={invalid || undefined}
                              aria-label={t("table.partialAmount")}
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>

                      {invalid ? <p className="pt-2 text-[11px] text-red-700">{t("table.partialInvalid")}</p> : null}
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200">
              {entriesState.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-600">{t("table.none")}</div>
              ) : (
                entriesState.map((row) => {
                  const invalid = rowHasError(row);

                  return (
                    <div key={row.id} className="p-3 space-y-3">
                      {/* Row header: description + amount + partial toggle */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 break-words leading-snug">
                            {row.description || <span className="text-gray-400">{t("table.noDescription", { defaultValue: "No description" })}</span>}
                          </p>
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            <span className={`font-semibold ${row.tx_type === "debit" ? "text-red-600" : "text-green-700"}`}>
                              {row.tx_type === "debit" ? "−" : "+"}{formatCurrency(row.amount)}
                            </span>
                          </p>
                        </div>

                        <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                          <Checkbox size="sm" checked={row.isPartial} onChange={() => togglePartial(row.id)} />
                          <span className="text-[11px] text-gray-600 select-none">{t("table.partialQ")}</span>
                        </label>
                      </div>

                      {/* Date + optional partial amount */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                            {t("table.due")}
                          </label>
                          <Input
                            kind="date"
                            value={row.value_date}
                            size="sm"
                            onValueChange={(iso: string) => updateEntryDate(row.id, iso)}
                            aria-label={t("table.due")}
                            variant="default"
                          />
                        </div>

                        {row.isPartial && (
                          <div>
                            <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                              {t("table.partialAmount")}
                            </label>
                            <Input
                              kind="amount"
                              value={row.partial_amount || ""}
                              size="sm"
                              onValueChange={(val: string) => updatePartialAmount(row.id, val)}
                              display="currency"
                              zeroAsEmpty
                              className={invalid ? "!border-red-400 bg-red-50" : ""}
                              aria-invalid={invalid || undefined}
                              aria-label={t("table.partialAmount")}
                            />
                          </div>
                        )}
                      </div>

                      {invalid && (
                        <p className="text-[11px] text-red-700 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                          {t("table.partialInvalid")}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </form>

        {/* Footer — desktop layout preserved; mobile gets stacked layout */}
        <footer
          className="border-t border-gray-200 bg-white px-4 md:px-5 py-3 shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {/* Desktop footer — unchanged */}
          <div className="hidden md:flex items-center justify-between">
            <div className="text-[12px] text-gray-600">
              <span className="mr-3">
                {t("footer.original")}&nbsp;
                <b className="text-gray-900 tabular-nums">{formatCurrency(totalOriginalSigned.toFixed(2))}</b>
              </span>

              <span className="mr-3">
                {t("footer.toSettle")}&nbsp;
                <b className="text-gray-900 tabular-nums">{formatCurrency(totalToSettleSigned.toFixed(2))}</b>
              </span>

              {chosenBank ? (
                <span className="text-gray-600">
                  {t("footer.bankLabel")}&nbsp;
                  <b className="text-gray-900">
                    {chosenBank.institution} • {t("banks.agency")} {chosenBank.branch} • {t("banks.account")}{" "}
                    {chosenBank.account_number}
                  </b>
                </span>
              ) : (
                <span className="text-gray-500">{t("footer.selectBank")}</span>
              )}

              <span className="ml-3 text-gray-400">{t("footer.shortcuts")}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={onClose}>
                {t("actions.cancel")}
              </Button>
              <Button type="submit" form={FORM_ID} disabled={isSubmitDisabled}>
                {t("actions.settle")}
              </Button>
            </div>
          </div>

          {/* Mobile footer — selected bank hint + action buttons */}
          <div className="md:hidden space-y-2">
            {chosenBank ? (
              <p className="text-[11px] text-gray-600 truncate">
                {t("footer.bankLabel")}&nbsp;
                <b className="text-gray-900">{chosenBank.institution} • {chosenBank.account_number}</b>
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">{t("footer.selectBank")}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="cancel" type="button" onClick={onClose} className="w-full">
                {t("actions.cancel")}
              </Button>
              <Button type="submit" form={FORM_ID} disabled={isSubmitDisabled} className="w-full">
                {t("actions.settle")}
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>

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

export default SettlementModal;