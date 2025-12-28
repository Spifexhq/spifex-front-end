// src/components/Modal/SettlementModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "src/components/ui/Button";
import Checkbox from "src/components/ui/Checkbox";
import { DateInput } from "../ui/DateInput";
import { AmountInput } from "../ui/AmountInput";

import { api } from "src/api/requests";
import { formatCurrency } from "@/lib/currency/formatCurrency";

import type { Entry } from "src/models/entries/entries";
import type { BulkSettleItem, BulkSettleResponse } from "src/models/entries/settlements";
import type { BankAccount } from "@/models/enterprise_structure/domain";

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

type TxType = "credit" | "debit" | undefined;

type LocalEntryState = {
  id: string;
  value_date: string;
  description: string;
  amount: string;
  tx_type: TxType;
  isPartial: boolean;
  partial_amount: string;
  server_error?: string | null;
};

const FORM_ID = "settlementForm";

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

function toMajorNumber(v: unknown): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function signedAmount(tx: TxType, major: number): number {
  return tx === "debit" ? -major : major;
}

type BulkSettleErrorItem = { id?: string; entry_id?: string; error: string };
type BulkSettleWithErrors = { updated: Entry[]; errors: BulkSettleErrorItem[] };

function hasErrors(data: BulkSettleResponse): data is BulkSettleWithErrors {
  return (
    typeof data === "object" &&
    data !== null &&
    "errors" in data &&
    Array.isArray((data as { errors?: unknown }).errors)
  );
}

function hasStringProp<K extends string>(obj: unknown, key: K): obj is Record<K, string> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    key in obj &&
    typeof (obj as Record<string, unknown>)[key] === "string"
  );
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
    const partial = toMajorNumber(row.partial_amount);
    const full = toMajorNumber(row.amount);
    return partial <= 0 || partial > full;
  }, []);

  const somePartialInvalid = useMemo(() => entriesState.some(rowHasError), [entriesState, rowHasError]);

  const totalOriginalSigned = useMemo(() => {
    return selectedEntries.reduce((sum, e) => {
      const tx = e.tx_type as TxType;
      const amt = toMajorNumber(e.amount);
      return sum + signedAmount(tx, amt);
    }, 0);
  }, [selectedEntries]);

  const totalToSettleSigned = useMemo(() => {
    return entriesState.reduce((sum, row) => {
      const amt = row.isPartial ? toMajorNumber(row.partial_amount) : toMajorNumber(row.amount);
      return sum + signedAmount(row.tx_type, amt);
    }, 0);
  }, [entriesState]);

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
        amount: String(e.amount ?? "0.00"),
        tx_type: e.tx_type as TxType,
        isPartial: false,
        partial_amount: "",
        server_error: null,
      };
    });

    setEntriesState(mapped);
    setBulkDate(today);
  }, [isOpen, selectedEntries]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
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
  }, [isOpen, onClose]);

  /* -------------------------------- handlers -------------------------------- */

  const updateEntryDate = useCallback((id: string, val: string) => {
    setEntriesState((prev) => prev.map((row) => (row.id === id ? { ...row, value_date: val } : row)));
  }, []);

  const togglePartial = useCallback((id: string) => {
    setEntriesState((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, isPartial: !row.isPartial, partial_amount: "", server_error: null } : row
      )
    );
  }, []);

  const updatePartialAmount = useCallback((id: string, val: string) => {
    setEntriesState((prev) => prev.map((row) => (row.id === id ? { ...row, partial_amount: val, server_error: null } : row)));
  }, []);

  const applyDateToAll = useCallback(() => {
    if (!bulkDate) return;
    setEntriesState((prev) => prev.map((row) => ({ ...row, value_date: bulkDate })));
  }, [bulkDate]);

  const markAllPartial = useCallback(() => {
    setEntriesState((prev) => prev.map((row) => ({ ...row, isPartial: true, partial_amount: "", server_error: null })));
  }, []);

  const clearAllPartial = useCallback(() => {
    setEntriesState((prev) => prev.map((row) => ({ ...row, isPartial: false, partial_amount: "", server_error: null })));
  }, []);

  /* -------------------------------- submit --------------------------------- */

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBankId) return;

      setEntriesState((prev) => prev.map((r) => ({ ...r, server_error: null })));

      try {
        const items: BulkSettleItem[] = entriesState.map((row) => ({
          entry_id: row.id,
          bank_id: selectedBankId,
          // Money rule: keep major strings
          amount: row.isPartial ? (row.partial_amount || "0.00") : (row.amount || "0.00"),
          value_date: row.value_date,
        }));

        // request<T>() ALWAYS resolves as ApiSuccess<T> (or throws),
        // so `res.data` is always the payload here.
        const res = await api.addSettlementsBulk(items, true);
        const data: BulkSettleResponse = res.data;

        if (hasErrors(data) && data.errors.length) {
          setEntriesState((prev) =>
            prev.map((r) => {
              const hit = data.errors.find((ee) => ee.entry_id === r.id || ee.id === r.id);
              return hit ? { ...r, server_error: hit.error } : r;
            })
          );
          console.error("Erros no bulk settle:", data.errors);
          return;
        }

        onSave();
        onClose();
      } catch (err: unknown) {
        console.error(err);
        const msg = hasStringProp(err, "message") ? err.message : t("errors.bulk");
        window.alert(msg);
      }
    },
    [entriesState, onClose, onSave, selectedBankId, t]
  );

  /* --------------------------------- UI ------------------------------------ */

  if (!isOpen) return null;

  const selectedCount = selectedEntries.length;
  const headerTitle =
    selectedCount === 1 ? t("header.title.one") : t("header.title.many", { n: selectedCount });

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("aria.dialog")}
        className="bg-white border border-gray-200 rounded-lg shadow-xl
                   w-[1500px] max-w-[96vw]
                   h-[640px] max-h-[92vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                LQ
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.kind")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{headerTitle}</h1>
              </div>
            </div>

            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={onClose}
              aria-label={t("actions.close")}
              title={t("actions.close")}
            >
              &times;
            </button>
          </div>
        </header>

        {/* Content */}
        <form
          id={FORM_ID}
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 px-5 py-4 grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 min-w-0"
        >
          {/* ----------------- Banks Pane (35%) ----------------- */}
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

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200 bg-white">
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
                          className={`h-4 w-4 rounded-full border ${
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

          {/* ----------------- Entries Pane (65%) ----------------- */}
          <section
            aria-label={t("entries.aria")}
            className="min-w-0 flex flex-col border border-gray-300 rounded-md overflow-hidden"
          >
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-600">{t("entries.title")}</span>
                  <span className="text-[10px] text-gray-500">{t("entries.count", { n: entriesState.length })}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap min-w-0">
                  <DateInput
                    value={bulkDate}
                    onChange={(iso) => setBulkDate(iso)}
                    variant="default"
                    aria-label={t("actions.bulkDate")}
                    className="w-[130px]"
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

                  <div className="hidden md:block w-px h-5 bg-gray-300 mx-1" />

                  <Button type="button" variant="outline" className="!h-8 !px-2 text-[12px]" onClick={markAllPartial}>
                    {t("actions.markAllPartial")}
                  </Button>
                  <Button type="button" variant="outline" className="!h-8 !px-2 text-[12px]" onClick={clearAllPartial}>
                    {t("actions.clearAllPartial")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-[140px_1fr_140px_80px_180px] gap-2 items-center px-3 py-2 bg-white text-[11px] text-gray-600 border-b border-gray-200 sticky top-0 z-10">
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
                  const clientInvalid = rowHasError(row);
                  const serverInvalid = !!row.server_error;
                  const invalid = clientInvalid || serverInvalid;

                  return (
                    <div key={row.id} className="px-3 py-2 border-b border-gray-200 hover:bg-gray-50">
                      <div className="grid grid-cols-[140px_1fr_140px_80px_180px] gap-2 items-center text-[12px]">
                        <div className="text-center">
                          <DateInput
                            value={row.value_date}
                            onChange={(iso) => updateEntryDate(row.id, iso)}
                            aria-label={t("table.due")}
                            variant="default"
                            className="w-[130px] mx-auto"
                          />
                        </div>

                        <div className="truncate pr-2">{row.description}</div>

                        <div className="text-center tabular-nums font-semibold text-gray-900">
                          {formatCurrency(row.amount)}
                        </div>

                        <div className="flex items-center justify-center">
                          <Checkbox size="sm" checked={row.isPartial} onChange={() => togglePartial(row.id)} />
                        </div>

                        <div className="flex items-center justify-center">
                          {row.isPartial ? (
                            <AmountInput
                              value={row.partial_amount || ""}
                              onValueChange={(val) => updatePartialAmount(row.id, val)}
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

                      {clientInvalid ? <p className="pt-2 text-[11px] text-red-700">{t("table.partialInvalid")}</p> : null}
                      {serverInvalid ? <p className="pt-2 text-[11px] text-red-700">{row.server_error}</p> : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </form>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
          <div className="text-[12px] text-gray-600">
            <span className="mr-3">
              {t("footer.original")}&nbsp;
              <b className="text-gray-900 tabular-nums">{formatCurrency(String(totalOriginalSigned))}</b>
            </span>

            <span className="mr-3">
              {t("footer.toSettle")}&nbsp;
              <b className="text-gray-900 tabular-nums">{formatCurrency(String(totalToSettleSigned))}</b>
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
        </footer>
      </div>
    </div>
  );
};

export default SettlementModal;
