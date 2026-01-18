// src/components/Modal/Tab.entities.tsx

import React from "react";
import type { TFunction } from "i18next";

import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData } from "../Modal.types";
import type { Entity, EntityTypeValue } from "@/models/settings/entities";

type EntityTypeOption = { id: number; label: string; value: EntityTypeValue };

type Props = {
  t: TFunction;

  formData: FormData;

  entityTypeOptions: EntityTypeOption[];
  selectedEntityType: EntityTypeOption[];
  onEntityTypeChange: (updated: EntityTypeOption[]) => void;
  entityTypeWrapId: string;

  entities: Entity[];
  selectedEntity: Entity[];
  onEntityChange: (updated: Entity[]) => void;
  entityWrapId: string;

  isFinancialLocked: boolean;
};

const EntitiesTab: React.FC<Props> = ({
  t,
  formData,
  entityTypeOptions,
  selectedEntityType,
  onEntityTypeChange,
  entityTypeWrapId,
  entities,
  selectedEntity,
  onEntityChange,
  entityWrapId,
  isFinancialLocked,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div id={entityTypeWrapId}>
        <SelectDropdown<EntityTypeOption>
          label={t("entriesModal:entities.type")}
          items={entityTypeOptions}
          selected={selectedEntityType}
          onChange={onEntityTypeChange}
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
          items={entities}
          selected={selectedEntity}
          onChange={onEntityChange}
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

      {/* this keeps the same validation rule behavior:
          if entityType is set but entity isn't, submit will warn.
          (formData.entities.entityType is still set in the orchestrator handler). */}
      <input type="hidden" value={formData.entities.entityType || ""} readOnly />
    </div>
  );
};

export default EntitiesTab;
