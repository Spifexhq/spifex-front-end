// src/components/Modal/SettlementModal.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";

// Components
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Input from "@/components/Input";
import { InlineLoader } from "@/components/Loaders";

// Utils
import {
  handleUtilitaryAmountKeyDown,
  formatCurrency,
} from "src/lib";

// API and models
import { api } from "src/api/requests";
import type { Entry } from "src/models/entries/domain";
import type { BankAccount } from "@/models/enterprise_structure/domain";
import type { BulkSettleItem } from "@/models/entries/domain";

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

interface LocalEntryState {
  id: string;           // external_id da entry
  due_date: string;
  description: string;
  amount: string;       // decimal "3000.00" (já vem correto)
  isPartial: boolean;
  partialAmount: string; // string de centavos ("", "1234", ...)
}

/* -------------------------------- helpers -------------------------------- */
const formatBRL = (valueNumber: number) =>
  valueNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const decimalToCents = (decStr: string) => {
  const n = parseFloat(decStr || "0");
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

/* ------------------------------- component -------------------------------- */
const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  selectedEntries,
  onSave,
  banksData,
}) => {
  const { banks, loading: loadingBanks, error } = banksData;

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null); // não auto-seleciona
  const [entriesState, setEntriesState] = useState<LocalEntryState[]>([]);
  const [bulkDate, setBulkDate] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  /* ----------------------------- derived data ----------------------------- */
  const typeById = useMemo(() => {
    const m = new Map<string, "credit" | "debit" | undefined>();
    selectedEntries.forEach((e) => m.set(e.id, e.tx_type as "credit" | "debit" | undefined));
    return m;
  }, [selectedEntries]);

  const totalOriginalCentsSigned = useMemo(
    () =>
      selectedEntries.reduce((sum, e) => {
        const sign = (e.tx_type as string) === "debit" ? -1 : 1;
        return sum + sign * decimalToCents(String(e.amount ?? "0"));
      }, 0),
    [selectedEntries]
  );

  const totalToSettleCentsSigned = useMemo(
    () =>
      entriesState.reduce((sum, e) => {
        const sign = typeById.get(e.id) === "debit" ? -1 : 1;
        const cents = e.isPartial
          ? (parseInt(e.partialAmount || "0", 10) || 0)
          : decimalToCents(e.amount);
        return sum + sign * cents;
      }, 0),
    [entriesState, typeById]
  );

  const rowHasError = useCallback((e: LocalEntryState) => {
    if (!e.isPartial) return false;
    const p = parseInt(e.partialAmount || "0", 10) || 0;
    const full = decimalToCents(e.amount);
    return p <= 0 || p > full;
  }, []);

  const somePartialInvalid = useMemo(
    () => entriesState.some(rowHasError),
    [entriesState, rowHasError]
  );

  const isSubmitDisabled =
    !selectedBankId || entriesState.length === 0 || somePartialInvalid;

  const chosenBank = useMemo(
    () => banks.find((b) => b.id === selectedBankId) || null,
    [banks, selectedBankId]
  );

  /* -------------------------------- effects -------------------------------- */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        if (!isSubmitDisabled) formRef.current?.requestSubmit();
      }
    };

    if (!entriesState.length) {
      const today = new Date().toISOString().slice(0, 10);
      const mapped: LocalEntryState[] = selectedEntries.map((e) => ({
        id: e.id,
        due_date: new Date(e.due_date) > new Date() ? today : e.due_date,
        description: e.description ?? "",
        amount: String(e.amount ?? "0"),
        isPartial: false,
        partialAmount: "",
      }));
      setEntriesState(mapped);
      setBulkDate(today);
      // não escolher banco automaticamente
    }

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose, entriesState.length, selectedEntries, isSubmitDisabled]);

  /* -------------------------------- handlers -------------------------------- */
  const updateEntryDate = (id: string, val: string) =>
    setEntriesState((prev) => prev.map((e) => (e.id === id ? { ...e, due_date: val } : e)));

  const togglePartial = (id: string) =>
    setEntriesState((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isPartial: !e.isPartial, partialAmount: "" } : e))
    );

  const updatePartialAmount = (id: string, val: string) =>
    setEntriesState((prev) => prev.map((e) => (e.id === id ? { ...e, partialAmount: val } : e)));

  const applyDateToAll = () => {
    if (!bulkDate) return;
    setEntriesState((prev) => prev.map((e) => ({ ...e, due_date: bulkDate })));
  };

  const markAllPartial = () =>
    setEntriesState((prev) =>
      prev.map((e) => ({ ...e, isPartial: true, partialAmount: "" }))
    );

  const clearAllPartial = () =>
    setEntriesState((prev) =>
      prev.map((e) => ({ ...e, isPartial: false, partialAmount: "" }))
    );

  /* -------------------------------- submit --------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId) return;

    try {
      // monta payload do bulk (sem settled_on, para casar com o backend)
      const items = entriesState.map((row) => {
        const amount_minor = row.isPartial
          ? (parseInt(row.partialAmount || "0", 10) || 0)
          : decimalToCents(row.amount);

        return {
          entry_id: row.id,
          bank_id: selectedBankId,
          amount_minor,
          value_date: row.due_date,
        };
      }) as unknown as BulkSettleItem[];

      const res = await api.bulkSettle(items, true);

      // Se vier com errors, sinaliza por linha e mantém o modal aberto
      if ("errors" in res && Array.isArray((res).errors) && (res).errors.length) {
        const errs = (res).errors as Array<{ id?: string; entry_id?: string; error: string }>;
        setEntriesState((prev) =>
          prev.map((r) => {
            const hit = errs.find((e) => e.entry_id === r.id || e.id === r.id);
            return hit ? { ...r, /* podemos exibir embaixo se quiser */ } : r;
          })
        );
        // opcional: mostrar toast/alert com resumo dos erros
        console.error("Erros no bulk settle:", errs);
        return;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao liquidar lançamentos.");
    }
  };

  /* --------------------------------- UI ------------------------------------ */
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      {/* container — largura fixa 1500px + max-w para telas menores */}
      <div
        role="dialog"
        aria-modal="true"
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
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Liquidação</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {selectedEntries.length} lançamento{selectedEntries.length > 1 ? "s" : ""} selecionado
                  {selectedEntries.length > 1 ? "s" : ""}
                </h1>
              </div>
            </div>
            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={onClose}
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        </header>

        {/* Content */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 px-5 py-4 grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 min-w-0"
        >
          {/* ----------------- Banks Pane (35%) ----------------- */}
          <section
            aria-label="Selecionar banco"
            className="min-w-0 flex flex-col border border-gray-300 rounded-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-600">Bancos</span>
                <span className="text-[10px] text-gray-500">({banks.length})</span>
              </div>
              {selectedBankId && (
                <span className="text-[11px] text-gray-600">
                  Saldo:&nbsp;
                  <b className="text-gray-900">
                    {formatBRL(
                      Number(banks.find((b) => b.id === selectedBankId)?.consolidated_balance ?? "0")
                    )}
                  </b>
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200 bg-white">
              {loadingBanks ? (
                <div className="py-4 grid place-items-center">
                  <InlineLoader color="orange" />
                </div>
              ) : error ? (
                <div className="py-4 text-center text-xs text-red-600">{error}</div>
              ) : banks.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-600">Nenhum banco disponível</div>
              ) : (
                banks
                  .slice()
                  .sort((a, b) => a.institution.localeCompare(b.institution))
                  .map((b) => {
                    const selected = selectedBankId === b.id;
                    const balance = formatBRL(Number(b.consolidated_balance ?? "0"));
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
                            <span className="text-[13px] text-gray-800 truncate leading-tight">
                              {b.institution}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate leading-tight">
                              Agência {b.branch} • Conta {b.account_number}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3 shrink-0 text-[13px] font-semibold text-gray-800 tabular-nums">
                          {balance}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </section>

          {/* ----------------- Entries Pane (65%) ----------------- */}
          <section
            aria-label="Lançamentos"
            className="min-w-0 flex flex-col border border-gray-300 rounded-md overflow-hidden"
          >
            {/* header + ferramentas */}
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-600">Lançamentos</span>
                  <span className="text-[10px] text-gray-500">({entriesState.length})</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap min-w-0">
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-[120px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="!h-8 !px-2 text-[12px]"
                    onClick={applyDateToAll}
                    disabled={!bulkDate}
                  >
                    Aplicar data a todos
                  </Button>

                  <div className="hidden md:block w-px h-5 bg-gray-300 mx-1" />

                  <Button
                    type="button"
                    variant="outline"
                    className="!h-8 !px-2 text-[12px]"
                    onClick={markAllPartial}
                  >
                    Marcar todos como parcial
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="!h-8 !px-2 text-[12px]"
                    onClick={clearAllPartial}
                  >
                    Limpar parciais
                  </Button>
                </div>
              </div>
            </div>

            {/* tabela com scroll interno; última coluna mais larga */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-[140px_1fr_120px_80px_180px] items-center px-3 py-2 bg-white text-[11px] text-gray-600 border-b border-gray-200 sticky top-0 z-10">
                <div className="text-center">Vencimento</div>
                <div>Descrição</div>
                <div className="text-center">Valor</div>
                <div className="text-center">Parcial?</div>
                <div className="text-center">Valor parcial</div>
              </div>

              {entriesState.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-600">Nenhum lançamento selecionado</div>
              ) : (
                entriesState.map((e) => {
                  const invalid = rowHasError(e);
                  const amountNumber = parseFloat(e.amount || "0"); // decimal correto
                  return (
                    <div
                      key={e.id}
                      className="grid grid-cols-[140px_1fr_120px_80px_180px] items-center px-3 py-2 border-b border-gray-200 text-[12px] hover:bg-gray-50"
                    >
                      <div className="text-center">
                        <input
                          type="date"
                          value={e.due_date}
                          onChange={(ev) => updateEntryDate(e.id, ev.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-[120px]"
                        />
                      </div>

                      <div className="truncate pr-2">{e.description}</div>

                      <div className="text-center tabular-nums font-semibold text-gray-900">
                        {formatBRL(amountNumber)}
                      </div>

                      <div className="flex items-center justify-center">
                        <Checkbox size="sm" checked={e.isPartial} onChange={() => togglePartial(e.id)} />
                      </div>

                      <div className="flex items-center justify-center">
                        {e.isPartial ? (
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatCurrency(e.partialAmount || "")}
                            placeholder="0,00"
                            onKeyDown={(ev) =>
                              handleUtilitaryAmountKeyDown(ev, e.partialAmount, (val) =>
                                updatePartialAmount(e.id, val)
                              )
                            }
                            onChange={() => {}}
                            className={`border border-gray-300 rounded px-2 py-1 text-xs w-[180px] text-right ${
                              invalid ? "!border-red-400 bg-red-50" : ""
                            }`}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>

                      {invalid && (
                        <div className="col-span-5 -mt-1">
                          <p className="px-3 pt-3 text-[11px] text-red-700">
                            Valor parcial inválido (0 ou maior que o valor do lançamento).
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </form>

        {/* Footer — totais com sinal por tipo */}
        <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
          <div className="text-[12px] text-gray-600">
            <span className="mr-3">
              Original:&nbsp;
              <b className="text-gray-900 tabular-nums">
                {formatBRL(totalOriginalCentsSigned / 100)}
              </b>
            </span>
            <span className="mr-3">
              A liquidar:&nbsp;
              <b className="text-gray-900 tabular-nums">
                {formatBRL(totalToSettleCentsSigned / 100)}
              </b>
            </span>
            {chosenBank ? (
              <span className="text-gray-600">
                Banco:&nbsp;
                <b className="text-gray-900">
                  {chosenBank.institution} • Ag. {chosenBank.branch} • Conta {chosenBank.account_number}
                </b>
              </span>
            ) : (
              <span className="text-gray-500">Selecione um banco</span>
            )}
            <span className="ml-3 text-gray-400">Atalhos: Esc (fechar), Ctrl/Cmd+Enter (salvar)</span>
          </div>

          <div className="flex gap-2">
            <Button variant="cancel" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formRef.current ? undefined : "fake"}
              disabled={isSubmitDisabled}
              onClick={() => formRef.current?.requestSubmit()}
            >
              Liquidar
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SettlementModal;
