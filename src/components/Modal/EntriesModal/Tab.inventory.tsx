// src/components/Modal/Tab.inventory.tsx

import React from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData } from "../Modal.types";
import type { InventoryItem } from "@/models/settings/inventory";

type Props = {
  t: TFunction;

  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  inventoryItems: InventoryItem[];
  selectedInventoryItem: InventoryItem[];
  onInventoryChange: (updated: InventoryItem[]) => void;

  inventoryQtyId: string;
  isFinancialLocked: boolean;
};

const InventoryTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  inventoryItems,
  selectedInventoryItem,
  onInventoryChange,
  inventoryQtyId,
  isFinancialLocked,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectDropdown<InventoryItem>
        label={t("entriesModal:inventory.product")}
        items={inventoryItems}
        selected={selectedInventoryItem}
        onChange={onInventoryChange}
        getItemKey={(i) => i.id}
        getItemLabel={(i) => (i.sku ? `${i.sku} — ${i.name}` : i.name)}
        buttonLabel={t("entriesModal:inventory.productBtn")}
        clearOnClickOutside={false}
        singleSelect
        customStyles={{ maxHeight: "180px" }}
        virtualize
        virtualRowHeight={32}
        virtualThreshold={300}
        disabled={isFinancialLocked}
      />

      {selectedInventoryItem.length > 0 && (
        <Input
          id={inventoryQtyId}
          label={t("entriesModal:inventory.quantity")}
          type="number"
          placeholder="0"
          min={0}
          value={formData.inventory.quantity}
          onChange={(e) =>
            setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: e.target.value } }))
          }
          disabled={isFinancialLocked}
        />
      )}
    </div>
  );
};

export default InventoryTab;
