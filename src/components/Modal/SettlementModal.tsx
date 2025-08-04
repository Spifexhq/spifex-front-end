// SettlementModal.tsx
import React, { useEffect, useState } from "react";

// Hooks
import { useBanks } from "@/hooks/useBanks";

// Components
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import Input from "../Input";
import { InlineLoader } from "../Loaders";

// Utils
import { centsToDecimalString } from "src/utils/utils";
import { formatCurrency, handleUtilitaryAmountKeyDown } from "@/utils/formUtils";

// API and models
import { api } from "src/api/requests2";
import { Entry } from "src/models/entries/domain";
import { EditSettledEntryRequest } from "@/models/entries/dto";

interface SettlementModalProps {
  isOpen: boolean;
  onClose(): void;
  selectedEntries: Entry[];
  onSave(): void;
}
interface LocalEntryState {
  id: number;
  due_date: string;
  description: string;
  amount: string;
  isPartial: boolean;
  partialAmount: string;
}
/** Modal para liquidação de lançamentos selecionados */
const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  selectedEntries,
  onSave,
}) => {
  /* -------------------------------------------------------------------------- */
  /*                                Requests                                    */
  /* -------------------------------------------------------------------------- */
  const { banks, loading: loadingBanks, error } = useBanks();
  /* -------------------------------------------------------------------------- */
  /*                                  State                                     */
  /* -------------------------------------------------------------------------- */
  const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);
  const [entriesState, setEntriesState] = useState<LocalEntryState[]>([]);
    const somePartialWithoutValue = entriesState.some(
    (e) => e.isPartial && (!e.partialAmount || parseInt(e.partialAmount, 10) === 0)
    );
  /* -------------------------------------------------------------------------- */
  /*                               Side‑effects                                 */
  /* -------------------------------------------------------------------------- */
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = "hidden";
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        if (entriesState.length === 0) {
            const today = new Date().toISOString().slice(0, 10);
            const mapped: LocalEntryState[] = selectedEntries.map((e) => ({
            id: e.id,
            due_date: new Date(e.due_date) > new Date() ? today : e.due_date,
            description: e.description,
            amount: e.amount,
            isPartial: false,
            partialAmount: "",
            }));
            setEntriesState(mapped);
        }
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleEsc);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, onClose, selectedEntries]);
  /* -------------------------------------------------------------------------- */
  /*                               Handlers                                     */
  /* -------------------------------------------------------------------------- */
  const toggleBank = (id: number) =>
    setSelectedBankIds((prev) => (prev.includes(id) ? [] : [id]));
  const updateEntryDate = (id: number, val: string) =>
    setEntriesState((prev) => prev.map((e) => (e.id === id ? { ...e, due_date: val } : e)));
    const togglePartial = (id: number) => {
    console.log("Toggling parcial para ID", id);
    setEntriesState((prev) =>
        prev.map((e) =>
        e.id === id ? { ...e, isPartial: !e.isPartial, partialAmount: "" } : e
        )
    );
    };
  const updatePartialAmount = (id: number, val: string) =>
    setEntriesState((prev) => prev.map((e) => (e.id === id ? { ...e, partialAmount: val } : e)));
  /* -------------------------------------------------------------------------- */
  /*                                Submit                                      */
  /* -------------------------------------------------------------------------- */
  const handleLiquidate = async () => {
    if (selectedBankIds.length === 0) return;
    const bankId = selectedBankIds[0];
    try {
      await Promise.all(
        entriesState.map((e) => {
          const payload: EditSettledEntryRequest = {
            settlement_due_date: e.due_date,
            bank_id: bankId,
            is_partial: e.isPartial,
            partial_amount: e.isPartial ? centsToDecimalString(e.partialAmount) : undefined,
          };
          return api.editSettledEntry([e.id], payload);
        })
      );
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao liquidar lançamentos.");
    }
  };
  /* -------------------------------------------------------------------------- */
  /*                                   UI                                       */
  /* -------------------------------------------------------------------------- */
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)] z-[9999]">
      <div className="relative bg-white rounded-lg shadow-xl w-[85%] h-[80%] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-semibold select-none">Liquidar Lançamentos</h1>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
          {/* Bancos */}
          <div className="border border-gray-300 rounded-lg overflow-y-auto max-h-[200px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="w-[5%] px-2 py-1" />
                  <th className="px-2 py-1">Instituição</th>
                  <th className="px-2 py-1">Agência</th>
                  <th className="px-2 py-1">Conta</th>
                  <th className="px-2 py-1 text-center">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {loadingBanks ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4"><InlineLoader color="orange" className="w-8 h-8" /></td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="text-center text-red-500 py-4">{error}</td>
                  </tr>
                ) : banks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Nenhum banco disponível</td>
                  </tr>
                ) : (
                  banks.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 text-[12px]">
                      <td className="px-2 py-1 text-center">
                        <Checkbox
                          size="sm"
                          checked={selectedBankIds.includes(b.id)}
                          onChange={() => toggleBank(b.id)}
                        />
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">{b.bank_institution}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{b.bank_branch}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{b.bank_account}</td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        {Number(b.consolidated_balance).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Lançamentos */}
          <div className="border border-gray-300 rounded-lg overflow-y-auto max-h-[200px] min-h-[200px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-1 text-center w-[18%]">Vencimento</th>
                  <th className="px-2 py-1 w-[38%]">Descrição</th>
                  <th className="px-2 py-1 text-center w-[14%]">Valor</th>
                  <th className="px-2 py-1 text-center w-[10%]">Parcial?</th>
                  <th className="px-2 py-1 text-center w-[20%]">Valor parcial</th>
                </tr>
              </thead>
              <tbody>
                {entriesState.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Nenhum lançamento selecionado</td>
                  </tr>
                ) : (
                  entriesState.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 text-[12px]">
                      <td className="px-2 py-2 text-center">
                        <input
                          type="date"
                          value={e.due_date}
                          onChange={(ev) => updateEntryDate(e.id, ev.target.value)}
                          className="border border-gray-300 rounded px-1 py-1 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">{e.description}</td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        {Number(e.amount).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <Checkbox
                            size="sm"
                            checked={e.isPartial}
                            onChange={() => togglePartial(e.id)}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        {e.isPartial ? (
                        <Input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrency(e.partialAmount)}
                        onKeyDown={(ev) =>
                            handleUtilitaryAmountKeyDown(ev, e.partialAmount, (val) =>
                            updatePartialAmount(e.id, val)
                            )
                        }
                        onChange={() => {}}
                        className="border border-gray-300 rounded px-1 py-1 text-xs w-24 text-right"
                        />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Footer */}
        <div className="p-4 bg-white flex justify-end gap-4">
          <Button variant="cancel" onClick={onClose}>
            Cancelar
          </Button>
            <Button
            variant="primary"
            onClick={handleLiquidate}
            disabled={
                selectedBankIds.length === 0 ||
                entriesState.length === 0 ||
                somePartialWithoutValue
            }
            >
            Liquidar
          </Button>
        </div>
      </div>
    </div>
  );
};
export default SettlementModal;
