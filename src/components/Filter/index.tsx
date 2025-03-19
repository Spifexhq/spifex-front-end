// Filter.tsx

import React, { FC, useEffect, useState } from "react";
import Button from "@/components/Button";
import { useRequests } from "@/api/requests";
import type { Bank } from "@/models/Bank";
import { GeneralLedgerAccount } from "src/models/ForeignKeys/GeneralLedgerAccount";
import { SelectDropdown } from "@/components/SelectDropdown";
import { useBanks } from "@/hooks/useBanks";
import Input from "../Input";

export interface FilterData {
  startDate?: string;
  endDate?: string;
  generalLedgerAccountId?: number[];
  banksId?: number[];
  description?: string;
  observation?: string;
}

interface FilterProps {
  onApply: (filters: FilterData) => void;
}

const Filter: FC<FilterProps> = ({ onApply }) => {
  const { getGeneralLedgerAccounts } = useRequests();
  
  // Here we fetch ALL active banks (no specific IDs)
  const { banks } = useBanks();

  const [formData, setFormData] = useState<FilterData>({
    startDate: "",
    endDate: "",
    generalLedgerAccountId: [],
    banksId: [],
    description: "",
    observation: "",
  });

  const [ledgerAccounts, setLedgerAccounts] = useState<GeneralLedgerAccount[]>([]);

  useEffect(() => {
    getGeneralLedgerAccounts()
      .then((response) => {
        setLedgerAccounts(response.data?.general_ledger_accounts || []);
      })
      .catch((error) => {
        console.error("Error fetching ledger accounts:", error);
      });
  }, [getGeneralLedgerAccounts]);

  const selectedLedgerAccounts = ledgerAccounts.filter((acc) =>
    formData.generalLedgerAccountId?.includes(acc.id)
  );

  const selectedBanks = banks.filter((bank) =>
    formData.banksId?.includes(bank.id)
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLedgerAccountChange = (updatedAccounts: GeneralLedgerAccount[]) => {
    const newIds = updatedAccounts.map((acc) => acc.id);
    setFormData((prev) => ({ ...prev, generalLedgerAccountId: newIds }));
  };

  const handleBankChange = (updatedBanks: Bank[]) => {
    const newIds = updatedBanks.map((bank) => bank.id);
    setFormData((prev) => ({ ...prev, banksId: newIds }));
  };

  const handleApply = () => {
    onApply(formData);
  };

  return (
    <div className="relative rounded-md shadow-md h-auto p-4 bg-white max-w-5xl">
      <div className="grid grid-cols-2 gap-2">
        {/* First Column, Row 1: Date Fields */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <Input
              label="Data Inicial"
              type="date"
              name="startDate"
              value={formData.startDate || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Data Final"
              type="date"
              name="endDate"
              value={formData.endDate || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* First Column, Row 1 or 2 (your layout choice) */}
        <div>
          <SelectDropdown<GeneralLedgerAccount>
            label="Conta Contábil"
            items={ledgerAccounts}
            selected={selectedLedgerAccounts}
            onChange={handleLedgerAccountChange}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.general_ledger_account}
            buttonLabel="Contas Contábeis"
            customStyles={{
              maxHeight: "250px",
            }}
          />
        </div>

        {/* Description Field */}
        <div>
          <Input
            label="Descrição"
            type="text"
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
          />
        </div>

        {/* Observation Field */}
        <div>
          <Input
            label="Observação"
            type="text"
            name="observation"
            value={formData.observation || ""}
            onChange={handleChange}
          />
        </div>

        {/* Bank MultiSelect */}
        <div>
          <SelectDropdown<Bank>
            label="Banco"
            items={banks}
            selected={selectedBanks}
            onChange={handleBankChange}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.bank_institution}
            buttonLabel="Bancos"
            customStyles={{
              maxHeight: "250px",
            }}
          />
        </div>
      {/* Apply Filters Button */}
      <div className="flex justify-end mt-4">
        <Button
          variant="primary"
          onClick={handleApply}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          Aplicar Filtros
        </Button>
      </div>
      </div>

    </div>
  );
};

export default Filter;
