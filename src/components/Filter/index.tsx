import React, { FC, useEffect, useState } from "react";
import Button from "@/components/Button";
import { useRequests } from "@/api/requests";
import { GeneralLedgerAccount } from "src/models/ForeignKeys/GeneralLedgerAccount";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import Input from "../Input";

export interface FilterData {
  startDate?: string;
  endDate?: string;
  generalLedgerAccountId?: number[];
  description?: string;
  observation?: string;
}

interface FilterProps {
  onApply: (filters: FilterData) => void;
}

const Filter: FC<FilterProps> = ({ onApply }) => {
  const { getGeneralLedgerAccounts } = useRequests();

  const [formData, setFormData] = useState<FilterData>({
    startDate: "",
    endDate: "",
    generalLedgerAccountId: [],
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

  // Convert the currently selected IDs into an array of GeneralLedgerAccount objects
  // so we can pass them to <MultiSelectDropdown>.
  const selectedLedgerAccounts = ledgerAccounts.filter((acc) =>
    formData.generalLedgerAccountId?.includes(acc.id)
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLedgerAccountChange = (updatedAccounts: GeneralLedgerAccount[]) => {
    // Convert array of GeneralLedgerAccount objects back to an array of IDs
    const newIds = updatedAccounts.map((acc) => acc.id);
    setFormData((prev) => ({
      ...prev,
      generalLedgerAccountId: newIds,
    }));
  };

  const handleApply = () => {
    onApply(formData);
  };

  return (
    <div className="relative rounded-md shadow-md h-[252px] p-4 bg-white max-w-5xl">
      <div className="grid grid-cols-2 gap-4">
        {/* First Column, Row 1: Date Fields */}
        <div className="flex space-x-4">
          {/* Start Date */}
          <div className="flex-1">
            <Input
              label="Data Inicial"
              type="date"
              name="startDate"
              value={formData.startDate || ""}
              onChange={handleChange}
            />
          </div>

          {/* End Date */}
          <div className="flex-1">
            <Input
              label="Data Final"
              type="date"
              name="endDate"
              value={formData.startDate || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Second Column, Row 1: Ledger Accounts Dropdown */}
        <div>
          <MultiSelectDropdown<GeneralLedgerAccount>
            label="Conta Contábil"
            items={ledgerAccounts}
            selected={selectedLedgerAccounts}
            onChange={handleLedgerAccountChange}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.general_ledger_account}
            buttonLabel="Contas Contábeis"
          />
        </div>

        {/* First Column, Row 2: Description Field */}
        <div>
          <Input
            label="Descrição"
            type="text"
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
          />
        </div>

        {/* Second Column, Row 2: Observation Field */}
        <div>
          <Input
            label="Observação"
            type="text"
            name="observation"
            value={formData.observation || ""}
            onChange={handleChange}
          />
        </div>
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
  );
};

export default Filter;
