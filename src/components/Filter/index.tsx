// Filter.tsx

import React, { FC, useEffect, useState } from "react";
import Button from "@/components/Button";
import { useRequests } from "@/api/requests";
import type { Bank } from "@/models/Bank";
import { GeneralLedgerAccount } from "src/models/ForeignKeys/GeneralLedgerAccount";
import { SelectDropdown } from "@/components/SelectDropdown";
import { useBanks } from "@/hooks/useBanks";
import Input from "../Input";
import { EntryFilters } from "src/models/Entries/domain";

interface FilterProps {
  onApply: (filters: EntryFilters) => void;
}

const Filter: FC<FilterProps> = ({ onApply }) => {
  const { getGeneralLedgerAccounts } = useRequests();
  const { banks } = useBanks();

  const [formData, setFormData] = useState<EntryFilters>({
    start_date: "",
    end_date: "",
    description: "",
    observation: "",
    general_ledger_account_id: [],
    bank_id: [],
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
    formData.general_ledger_account_id?.includes(acc.id)
  );

  const selectedBanks = banks.filter((bank) =>
    formData.bank_id?.includes(bank.id)
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLedgerAccountChange = (list: GeneralLedgerAccount[]) =>
    setFormData((p) => ({ ...p, general_ledger_account_id: list.map((x) => Number(x.id)) }));

  const handleBankChange = (list: Bank[]) =>
    setFormData((p) => ({ ...p, bank_id: list.map((x) => Number(x.id)) }));

  const handleApply = () => {
    onApply(formData);
  };

  return (
    <div className="relative rounded-md border border-gray-300 h-auto p-4 bg-white max-w-5xl">
      <div className="grid grid-cols-2 gap-2">
        {/* First Column, Row 1: Date Fields */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <Input
              label="Data Inicial"
              type="date"
              name="start_date"
              value={formData.start_date || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Data Final"
              type="date"
              name="end_date"
              value={formData.end_date || ""}
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
            groupBy={(item) => item.subgroup}
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
        >
          Aplicar Filtros
        </Button>
      </div>
      </div>

    </div>
  );
};

export default Filter;
