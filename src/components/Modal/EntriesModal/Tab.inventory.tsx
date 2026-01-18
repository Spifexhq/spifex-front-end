// src/components/Modal/Tab.inventory.tsx

import React, { useCallback, useMemo } from "react";
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

  inventoryQtyId: string;
  isFinancialLocked: boolean;
};

const InventoryTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  inventoryItems,
  inventoryQtyId,
  isFinancialLocked,
}) => {
  const selectedInventoryItem = useMemo<InventoryItem[]>(() => {
    const id = String(formData.inventory.product || "");
    if (!id) return [];
    const found = inventoryItems.find((i) => String(i.id) === id);
    return found ? [found] : [];
  }, [inventoryItems, formData.inventory.product]);

  const handleInventoryChange = useCallback(
    (updated: InventoryItem[]) => {
      if (isFinancialLocked) return;
      const id = updated.length ? String(updated[0].id) : "";

      setFormData((p) => {
        // If product is cleared, also clear quantity to avoid stale values
        if (!id) {
          return { ...p, inventory: { ...p.inventory, product: "", quantity: "" } };
        }
        return { ...p, inventory: { ...p.inventory, product: id } };
      });
    },
    [isFinancialLocked, setFormData]
  );

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isFinancialLocked) return;

      const raw = e.target.value;

      // allow empty so user can clear the field
      if (raw === "") {
        setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: "" } }));
        return;
      }

      // block negatives & keep integer quantity
      const n = Number(raw);
      const next = Number.isFinite(n) ? String(Math.max(0, Math.trunc(n))) : "0";

      setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: next } }));
    },
    [isFinancialLocked, setFormData]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectDropdown<InventoryItem>
        label={t("entriesModal:inventory.product")}
        items={inventoryItems}
        selected={selectedInventoryItem}
        onChange={handleInventoryChange}
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
          step={1}
          value={formData.inventory.quantity}
          onChange={handleQuantityChange}
          disabled={isFinancialLocked}
        />
      )}
    </div>
  );
};

export default InventoryTab;
