import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { formatAmount, unformatAmount, formatDateToDDMMYYYY } from '@/utils/utils';
import { formatCurrency, handleAmountKeyDown } from "@/utils/formUtils";
import { useRequests } from '@/api/requests';
import Input from '@/components/Input';
import { SelectDropdown } from '@/components/SelectDropdown';
import { Bank } from '@/models/Bank';

interface TransferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const initialForm = {
  due_date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  bank_out_id: '',
  bank_in_id: '',
  observation: '',
};

const TransferenceModal: React.FC<TransferenceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState(initialForm);
  const [banks, setBanks] = useState<Bank[]>([]);
  const { getBanks, addTransference } = useRequests();

  const resetForm = useCallback(() => {
    setFormData(initialForm);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
  
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    }
  
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? formatAmount(value) : value,
    }));
  };

  const handleBankChange = (
    field: 'bank_out_id' | 'bank_in_id',
    selected: Bank[]
  ) => {
    const id = selected[0]?.id ? String(selected[0].id) : '';
    setFormData((prev) => ({ ...prev, [field]: id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        due_date: formatDateToDDMMYYYY(formData.due_date),
        amount: unformatAmount(formData.amount),
        bank_out_id: parseInt(formData.bank_out_id),
        bank_in_id: parseInt(formData.bank_in_id),
        observation: formData.observation,
      };

      await addTransference(data);
      onSave();
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar transferência:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    getBanks()
      .then((res) => setBanks(res.data?.banks || []))
      .catch((err) => console.error('Erro ao buscar bancos:', err));
  }, [getBanks, isOpen]);

  if (!isOpen) return null;

  const bankOutOptions = banks.filter((b) => b.id !== parseInt(formData.bank_in_id));
  const bankInOptions = banks.filter((b) => b.id !== parseInt(formData.bank_out_id));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)] z-50">
      <div className="bg-white w-[600px] max-w-full rounded-lg shadow-xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">Transferência entre Bancos</h1>
        </div>
          <form onSubmit={handleSubmit} className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data"
                name="due_date"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
              />

              <Input
                label="Valor"
                type="text"
                placeholder="Digite o valor"
                value={formatCurrency(formData.amount)}
                onKeyDown={(e) =>
                  handleAmountKeyDown(e, formData.amount, setFormData, true)
                }
              />

              <SelectDropdown<Bank>
                label="Banco de Saída"
                items={bankOutOptions}
                selected={
                  formData.bank_out_id
                    ? bankOutOptions.filter((b) => b.id === parseInt(formData.bank_out_id))
                    : []
                }
                onChange={(selected) => handleBankChange('bank_out_id', selected)}
                getItemKey={(b) => b.id}
                getItemLabel={(b) =>
                  `${b.bank_institution} - ${b.bank_branch} - ${b.bank_account}`
                }
                singleSelect
                buttonLabel="Selecione o banco"
              />

              <SelectDropdown<Bank>
                label="Banco de Entrada"
                items={bankInOptions}
                selected={
                  formData.bank_in_id
                    ? bankInOptions.filter((b) => b.id === parseInt(formData.bank_in_id))
                    : []
                }
                onChange={(selected) => handleBankChange('bank_in_id', selected)}
                getItemKey={(b) => b.id}
                getItemLabel={(b) =>
                  `${b.bank_institution} - ${b.bank_branch} - ${b.bank_account}`
                }
                singleSelect
                buttonLabel="Selecione o banco"
              />

              <div className="col-span-2">
                <Input
                  label="Observação"
                  name="observation"
                  placeholder="Digite uma observação"
                  value={formData.observation}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 mt-6 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Salvar
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default TransferenceModal;
