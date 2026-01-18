// src/components/Modal/Tab.entities.tsx

import React, { useCallback, useMemo } from "react";
import type { TFunction } from "i18next";

import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData } from "../Modal.types";
import type { Entity, EntityTypeValue } from "@/models/settings/entities";

type EntityTypeOption = { id: number; label: string; value: EntityTypeValue };

type Props = {
  t: TFunction;

  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  entityTypeOptions: EntityTypeOption[];
  entityTypeWrapId: string;

  entities: Entity[];
  entityWrapId: string;

  isFinancialLocked: boolean;
};

const EntitiesTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  entityTypeOptions,
  entityTypeWrapId,
  entities,
  entityWrapId,
  isFinancialLocked,
}) => {
  const activeEntityType = useMemo(
    () => (formData.entities.entityType as EntityTypeValue | "") || "",
    [formData.entities.entityType]
  );

  const filteredEntities = useMemo(() => {
    if (!activeEntityType) return entities;
    return entities.filter((e) => e.entity_type === activeEntityType);
  }, [entities, activeEntityType]);

  const selectedEntityType = useMemo<EntityTypeOption[]>(() => {
    if (!activeEntityType) return [];
    const found = entityTypeOptions.find((o) => o.value === activeEntityType);
    return found ? [found] : [];
  }, [entityTypeOptions, activeEntityType]);

  const handleEntityTypeChange = useCallback(
    (updated: EntityTypeOption[]) => {
      if (isFinancialLocked) return;

      const nextType = (updated[0]?.value || "") as EntityTypeValue | "";

      // If type changes, clear entity selection (same behavior as your prior orchestrator handler)
      setFormData((p) => ({
        ...p,
        entities: { ...p.entities, entityType: nextType, entity: "" },
      }));
    },
    [isFinancialLocked, setFormData]
  );

  const selectedEntity = useMemo<Entity[]>(() => {
    const id = String(formData.entities.entity || "");
    if (!id) return [];
    const found = filteredEntities.find((e) => String(e.id) === id);
    return found ? [found] : [];
  }, [filteredEntities, formData.entities.entity]);

  const handleEntityChange = useCallback(
    (updated: Entity[]) => {
      if (isFinancialLocked) return;
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, entities: { ...p.entities, entity: id } }));
    },
    [isFinancialLocked, setFormData]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div id={entityTypeWrapId}>
        <SelectDropdown<EntityTypeOption>
          label={t("entriesModal:entities.type")}
          items={entityTypeOptions}
          selected={selectedEntityType}
          onChange={handleEntityTypeChange}
          getItemKey={(i) => i.id}
          getItemLabel={(i) => i.label}
          buttonLabel={t("entriesModal:entities.typeBtn")}
          singleSelect
          customStyles={{ maxHeight: "200px" }}
          hideFilter
          disabled={isFinancialLocked}
        />
      </div>

      <div id={entityWrapId}>
        <SelectDropdown<Entity>
          label={t("entriesModal:entities.entity")}
          items={filteredEntities}
          selected={selectedEntity}
          onChange={handleEntityChange}
          getItemKey={(i) => i.id}
          getItemLabel={(i) => i.full_name || t("entriesModal:entities.unnamed")}
          buttonLabel={t("entriesModal:entities.entityBtn")}
          singleSelect
          customStyles={{ maxHeight: "200px" }}
          virtualize
          virtualRowHeight={32}
          virtualThreshold={300}
          disabled={isFinancialLocked}
        />
      </div>

      <input type="hidden" value={formData.entities.entityType || ""} readOnly />
    </div>
  );
};

export default EntitiesTab;
