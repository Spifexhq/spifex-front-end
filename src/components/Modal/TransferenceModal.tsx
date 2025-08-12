import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";

import { api } from "src/api/requests";
import Input from "@/components/Input";
import { SelectDropdown } from "@/components/SelectDropdown";
import { Bank } from "@/models/enterprise_structure";
import Button from "../Button";
import {
  formatAmount,
  formatCurrency,
  formatDateToDDMMYYYY,
  handleAmountKeyDown,
} from "src/lib";

interface TransferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const initialForm = {
  due_date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  bank_out_id: "",
  bank_in_id: "",
  observation: "",
};

const TransferenceModal: React.FC<TransferenceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState(initialForm);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFormData(initialForm);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // keyboard + scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc fecha
      if (e.key === "Escape") handleClose();
      // Ctrl/Cmd+S salva
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const formEl = document.getElementById("transferenceForm") as HTMLFormElement | null;
        formEl?.requestSubmit();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      // foco inicial
      setTimeout(() => amountRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    api
      .getAllBanks()
      .then((res) => {
        const payload = res.data as { banks?: Bank[]; results?: Bank[] };
        const fetched = payload.banks ?? payload.results ?? [];
        setBanks(fetched.filter((b) => b.bank_status).sort((a, b) => a.id - b.id));
      })
      .catch((err) => console.error("Erro ao buscar bancos:", err));
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? formatAmount(value) : value,
    }));
  };

  const handleBankChange = (field: "bank_out_id" | "bank_in_id", selected: Bank[]) => {
    const id = selected[0]?.id ? String(selected[0].id) : "";
    setFormData((prev) => ({ ...prev, [field]: id }));
  };

  const swapBanks = () => {
    setFormData((prev) => ({
      ...prev,
      bank_out_id: prev.bank_in_id,
      bank_in_id: prev.bank_out_id,
    }));
  };

  const bankOutOptions = useMemo(
    () => banks.filter((b) => b.id !== parseInt(formData.bank_in_id || "0")).sort((a, b) => a.id - b.id),
    [banks, formData.bank_in_id]
  );
  const bankInOptions = useMemo(
    () => banks.filter((b) => b.id !== parseInt(formData.bank_out_id || "0")).sort((a, b) => a.id - b.id),
    [banks, formData.bank_out_id]
  );

  const amountCents = useMemo(() => parseInt(formData.amount.replace(/\D/g, ""), 10) || 0, [formData.amount]);
  const isValid =
    amountCents > 0 &&
    !!formData.due_date &&
    !!formData.bank_out_id &&
    !!formData.bank_in_id &&
    formData.bank_out_id !== formData.bank_in_id;

  const labelFor = (b?: Bank) =>
    b ? `${b.bank_institution} - ${b.bank_branch} - ${b.bank_account}` : "";

  const bankOutLabel = useMemo(
    () => labelFor(banks.find((b) => String(b.id) === formData.bank_out_id)),
    [banks, formData.bank_out_id]
  );
  const bankInLabel = useMemo(
    () => labelFor(banks.find((b) => String(b.id) === formData.bank_in_id)),
    [banks, formData.bank_in_id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const data = {
        due_date: formatDateToDDMMYYYY(formData.due_date),
        amount: (parseInt(formData.amount, 10) / 100).toFixed(2),
        bank_out_id: parseInt(formData.bank_out_id, 10),
        bank_in_id: parseInt(formData.bank_in_id, 10),
        observation: formData.observation || undefined,
      };

      await api.addTransference(data);
      onSave();
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar transferência:", err);
      alert("Erro ao salvar transferência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      {/* Tamanho fixo; header/footer fixos; sem overflow do container */}
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-gray-200 rounded-lg shadow-xl w-[720px] max-w-[95vw] h-[350px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                TR
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Transferência</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  Entre contas/bancos
                </h1>
              </div>
            </div>
            <Button
              variant="outline"
              className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
              onClick={handleClose}
            >
              Fechar
            </Button>
          </div>
        </header>

        {/* Conteúdo (sem overflow global) */}
        <form id="transferenceForm" onSubmit={handleSubmit} className="flex-1 px-5 py-4 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Linha 1: Data / Valor / Observação curta */}
            <Input
              label="Data"
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={handleChange}
            />
            <Input
              ref={amountRef}
              label="Valor"
              name="amount"
              type="text"
              placeholder="0,00"
              value={formatCurrency(formData.amount)}
              onKeyDown={(e) => handleAmountKeyDown(e, formData.amount, setFormData, true)}
            />
            <Input
              label="Observação (opcional)"
              name="observation"
              placeholder="Ex.: TED, motivo, etc."
              value={formData.observation}
              onChange={handleChange}
            />

            {/* Linha 2: Banco saída / trocar / Banco entrada */}
            <SelectDropdown<Bank>
              label="Banco de saída"
              items={bankOutOptions}
              selected={
                formData.bank_out_id
                  ? bankOutOptions.filter((b) => b.id === parseInt(formData.bank_out_id))
                  : []
              }
              onChange={(sel) => handleBankChange("bank_out_id", sel)}
              getItemKey={(b) => b.id}
              getItemLabel={labelFor}
              singleSelect
              buttonLabel="Selecione o banco"
              customStyles={{ maxHeight: "180px" }}
            />

            <div className="flex items-end justify-center">
              <Button
                type="button"
                variant="outline"
                className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                onClick={swapBanks}
                disabled={!formData.bank_out_id && !formData.bank_in_id}
                title="Trocar bancos"
              >
                ⇄
              </Button>
            </div>

            <SelectDropdown<Bank>
              label="Banco de entrada"
              items={bankInOptions}
              selected={
                formData.bank_in_id
                  ? bankInOptions.filter((b) => b.id === parseInt(formData.bank_in_id))
                  : []
              }
              onChange={(sel) => handleBankChange("bank_in_id", sel)}
              getItemKey={(b) => b.id}
              getItemLabel={labelFor}
              singleSelect
              buttonLabel="Selecione o banco"
              customStyles={{ maxHeight: "180px" }}
            />

            {/* Aviso se escolherem o mesmo banco */}
            {formData.bank_in_id && formData.bank_out_id && formData.bank_in_id === formData.bank_out_id && (
              <p className="md:col-span-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Os bancos de saída e entrada não podem ser o mesmo.
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
          <div className="text-[12px] text-gray-600">
            {amountCents > 0 ? (
              <>
                <b>{formatCurrency(formData.amount)}</b>
                {bankOutLabel || bankInLabel ? (
                  <>
                    {" "}
                    — {bankOutLabel ? <>de <b>{bankOutLabel}</b></> : null}
                    {bankInLabel ? <> para <b>{bankInLabel}</b></> : null}
                  </>
                ) : null}
              </>
            ) : (
              <>Informe um valor, selecione os bancos e a data.</>
            )}
            <span className="ml-3 text-gray-400">Atalhos: Esc (fechar), Ctrl/Cmd+S (salvar)</span>
          </div>

          <div className="flex gap-2">
            <Button variant="cancel" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" form="transferenceForm" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TransferenceModal;
