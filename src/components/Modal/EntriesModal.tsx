// Modal.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";

import Button from "../Button";
import Input from "../Input";
import { SelectDropdown } from "@/components/SelectDropdown";

import {
  FormData,
  EntriesModalFormProps,
  PeriodOption,
  RecurrenceOption,
  Tab,
  WeekendOption,
} from "./Modal.types";

import {
  decimalToCentsString,
  distributePercentages,
  formatCurrency,
  handleAmountKeyDown,
} from "src/lib";

import { api } from "src/api/requests";
import { ApiError } from "@/models/Api";
import { AddEntryRequest } from "@/models/entries/dto";
import {
  Department,
  DepartmentAllocation,
  DocumentType,
  Entity,
  EntityType,
  InventoryItem,
  LedgerAccount,
  Project,
} from "@/models/enterprise_structure/domain";

/* --------------------------- Estado inicial --------------------------- */
const initialFormData: FormData = {
  details: {
    dueDate: "",
    description: "",
    observation: "",
    amount: "0",
    accountingAccount: "",
    documentType: "",
    notes: "",
  },
  costCenters: {
    departments: [],
    department_percentage: [],
    projects: "",
  },
  inventory: {
    product: "",
    quantity: "",
  },
  entities: {
    entityType: "",
    entity: "",
  },
  recurrence: {
    recurrence: 0,
    installments: "",
    periods: 1,
    weekend: "",
  },
};

const EntriesModalForm: React.FC<EntriesModalFormProps> = ({
  isOpen,
  onClose,
  type,
  onSave,
  initialEntry,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [selectedLedgerAccounts, setSelectedLedgerAccount] = useState<LedgerAccount[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentTypes, setSelectedDocumentType] = useState<DocumentType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType[]>([]);
  const isRecurrenceLocked = !!initialEntry && (initialEntry.total_installments ?? 1) > 1;

  const periodOptions: PeriodOption[] = [
    { id: 1, label: "Mensal", value: 1 },
    { id: 2, label: "Semanal", value: 2 },
    { id: 3, label: "Bimestral", value: 3 },
    { id: 4, label: "Semestral", value: 4 },
    { id: 5, label: "Anual", value: 5 },
  ];

  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setActiveTab("details");
    setSelectedLedgerAccount([]);
    setSelectedDocumentType([]);
    setSelectedDepartments([]);
    setSelectedProject([]);
    setSelectedInventoryItem([]);
    setSelectedEntity([]);
    onClose();
  }, [onClose]);

  const cleanCurrency = (raw: string) =>
    (parseFloat(raw.replace(/[^\d]/g, "")) / 100).toFixed(2);

  const amountCents = useMemo(
    () => parseInt(formData.details.amount.replace(/\D/g, ""), 10) || 0,
    [formData.details.amount]
  );
  const isSaveDisabled = isSubmitting || amountCents <= 0;

  const percentageSum = useMemo(() => {
    const nums = formData.costCenters.department_percentage
      .map((p) => parseFloat(String(p).replace(",", ".")))
      .filter((n) => !Number.isNaN(n));
    const total = nums.reduce((acc, n) => acc + n, 0);
    return Math.round(total * 100) / 100;
  }, [formData.costCenters.department_percentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveDisabled) return;
    setIsSubmitting(true);

    const isRecurring = formData.recurrence.recurrence === 1;
    const installments = isRecurring ? Number(formData.recurrence.installments || 1) : 1;

    const payload: AddEntryRequest = {
      due_date: formData.details.dueDate,
      description: formData.details.description || undefined,
      observation: formData.details.observation || undefined,
      amount: cleanCurrency(formData.details.amount),
      current_installment: 1,
      total_installments: installments,
      transaction_type: type,
      notes: formData.details.notes || undefined,
      periods: isRecurring ? String(formData.recurrence.periods) : null,
      weekend_action: isRecurring ? formData.recurrence.weekend : null,
      general_ledger_account_id: formData.details.accountingAccount || null,
      document_type_id: formData.details.documentType || null,
      project_id: formData.costCenters.projects || null,
      entity_id: formData.entities.entity || null,
      inventory_item_id: formData.inventory.product ? Number(formData.inventory.product) : null,
      inventory_item_quantity: formData.inventory.quantity
        ? Number(formData.inventory.quantity)
        : null,
      department_id: formData.costCenters.departments.length
        ? formData.costCenters.departments.join(",")
        : undefined,
      department_percentage: formData.costCenters.department_percentage.length
        ? formData.costCenters.department_percentage.join(",")
        : undefined,
    };

    try {
      let res;
      if (initialEntry) res = await api.editEntry([initialEntry.id], payload);
      else res = await api.addEntry(payload);

      if (!("data" in res)) {
        const apiError = res as ApiError;
        console.error("Erro API:", apiError.error.message, apiError.error.details);
        alert(apiError.error.message || "Erro ao salvar lançamento.");
        return;
      }

      handleClose();
      onSave();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        alert(err.response.data.error.message);
      } else {
        alert("Erro inesperado ao salvar lançamento.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------- Carregar dados --------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    api
      .getAllLedgerAccounts()
      .then((response) => {
        let all: LedgerAccount[] = response.data?.general_ledger_accounts || [];
        all =
          type === "credit"
            ? all.filter((a) => a.transaction_type === "credit")
            : all.filter((a) => a.transaction_type === "debit");
        setLedgerAccounts(all);
      })
      .catch((e) => console.error("Erro ao buscar contas contábeis:", e));

    api.getAllDocumentTypes().then((r) => setDocumentTypes(r.data?.document_types || []));
    api.getAllDepartments().then((r) => setDepartments(r.data?.departments || []));
    api.getAllProjects().then((r) => setProjects(r.data?.projects || []));
    api.getAllInventoryItems().then((r) => setInventoryItems(r.data?.inventory_items || []));
    api.getAllEntities().then((r) => setEntities(r.data?.entities || []));

    if (!initialEntry) {
      setFormData((prev) => ({
        ...prev,
        details: { ...prev.details, dueDate: new Date().toISOString().slice(0, 10) },
      }));
    }
    setTimeout(() => amountRef.current?.focus(), 50);
  }, [isOpen, type, initialEntry]);

  /* ------------------------ Preencher em edição ------------------------- */
  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const isRecurring = (initialEntry.total_installments ?? 1) > 1;
    const deptIds =
      initialEntry.departments?.map((d: DepartmentAllocation) => String(d.department.id)) || [];
    const deptPercs = initialEntry.departments?.map((d: DepartmentAllocation) => d.percentage) || [];

    setFormData({
      details: {
        dueDate: initialEntry.due_date,
        description: initialEntry.description ?? "",
        observation: initialEntry.observation ?? "",
        amount: decimalToCentsString(initialEntry.amount),
        accountingAccount: String(initialEntry.general_ledger_account?.id ?? ""),
        documentType: String(initialEntry.document_type?.id ?? ""),
        notes: initialEntry.notes ?? "",
      },
      costCenters: {
        departments: deptIds,
        department_percentage: deptPercs,
        projects: String(initialEntry.project?.id ?? ""),
      },
      inventory: {
        product: String(initialEntry.inventory_item?.[0]?.inventory_item.id ?? ""),
        quantity: initialEntry.inventory_item?.[0]?.inventory_item_quantity
          ? String(initialEntry.inventory_item[0].inventory_item_quantity)
          : "",
      },
      entities: {
        entityType: initialEntry.entity?.entity_type ?? "",
        entity: String(initialEntry.entity?.id ?? ""),
      },
      recurrence: {
        recurrence: isRecurring ? 1 : 0,
        installments: isRecurring ? String(initialEntry.total_installments) : "",
        periods: Number(initialEntry.periods ?? 1),
        weekend: initialEntry.weekend_action ?? "",
      },
    });
  }, [isOpen, initialEntry]);

  // Selecionados (dropdowns) em edição
  useEffect(() => {
    if (!isOpen || !initialEntry) return;
    const la = ledgerAccounts.find((a) => a.id === initialEntry.general_ledger_account?.id);
    setSelectedLedgerAccount(la ? [la] : []);
    const dt = documentTypes.find((d) => d.id === initialEntry.document_type?.id);
    setSelectedDocumentType(dt ? [dt] : []);
    const deptIds =
      initialEntry.departments?.map((d: DepartmentAllocation) => d.department.id) || [];
    setSelectedDepartments(departments.filter((dep) => deptIds.includes(dep.id)));
    const prj = projects.find((p) => p.id === initialEntry.project?.id);
    setSelectedProject(prj ? [prj] : []);
    const invId = initialEntry.inventory_item?.[0]?.inventory_item.id;
    const inv = inventoryItems.find((i) => i.id === invId);
    setSelectedInventoryItem(inv ? [inv] : []);
    if (initialEntry.entity) {
      const ent = entities.find((e) => e.id === initialEntry.entity!.id);
      setSelectedEntity(ent ? [ent] : []);
      setSelectedEntityType([{ id: 0, entity_type: initialEntry.entity.entity_type ?? "" }]);
    } else {
      setSelectedEntity([]);
      setSelectedEntityType([]);
    }
  }, [
    isOpen,
    initialEntry,
    ledgerAccounts,
    documentTypes,
    departments,
    projects,
    inventoryItems,
    entities,
  ]);

  /* ------------------------------ Lifecycle ------------------------------ */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const formEl = document.getElementById("modalForm") as HTMLFormElement | null;
        formEl?.requestSubmit();
      }
      if (e.key === "Escape") handleClose();
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

  /* ------------------------------ Handlers ------------------------------ */
  const handleLedgerAccountChange = (updated: LedgerAccount[]) => {
    setSelectedLedgerAccount(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, details: { ...p.details, accountingAccount: id } }));
  };

  const handleDocumentTypeChange = (updated: DocumentType[]) => {
    setSelectedDocumentType(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, details: { ...p.details, documentType: id } }));
  };

  const handleDepartmentChange = (updated: Department[]) => {
    setSelectedDepartments(updated);
    const ids = updated.map((d) => String(d.id));
    const percs = distributePercentages(ids);
    setFormData((prev) => ({
      ...prev,
      costCenters: { ...prev.costCenters, departments: ids, department_percentage: percs },
    }));
  };

  const handlePercentageChange = (index: number, value: string) => {
    const percs = [...formData.costCenters.department_percentage];
    percs[index] = value;
    setFormData((p) => ({
      ...p,
      costCenters: { ...p.costCenters, department_percentage: percs },
    }));
  };

  const handleProjectChange = (updated: Project[]) => {
    setSelectedProject(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, costCenters: { ...p.costCenters, projects: id } }));
  };

  const handleInventoryChange = (updated: InventoryItem[]) => {
    setSelectedInventoryItem(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, inventory: { ...p.inventory, product: id } }));
  };

  const handleEntityChange = (updated: Entity[]) => {
    setSelectedEntity(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, entities: { ...p.entities, entity: id } }));
  };

  /* ---------------------------- Tabs compactas --------------------------- */
  const Tabs = () => (
    <nav className="flex gap-3 overflow-x-auto">
      {(
        [
          { id: "details", label: "Detalhes" },
          { id: "costCenters", label: "Centro de Custos" },
          { id: "inventory", label: "Inventário" },
          { id: "entities", label: "Envolvidos" },
          { id: "recurrence", label: "Recorrência" },
        ] as { id: Tab; label: string }[]
      ).map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-[13px] border-b-2 ${
              isActive
                ? "border-[color:var(--accentPrimary)] text-[color:var(--accentPrimary)]"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );

  /* ---------------------------- Conteúdo das abas ------------------------- */
  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        // >>> Agora com 3 colunas <<<
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Linha 1: Vencimento / Valor / Conta contábil */}
            <Input
              label="Vencimento"
              type="date"
              value={formData.details.dueDate}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: { ...p.details, dueDate: e.target.value } }))
              }
            />
            <Input
              label="Valor"
              type="text"
              ref={amountRef}
              placeholder="0,00"
              value={formatCurrency(formData.details.amount)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: { ...p.details, amount: e.target.value } }))
              }
              onKeyDown={(e) => handleAmountKeyDown(e, formData.details.amount, setFormData)}
            />
            <SelectDropdown<LedgerAccount>
              label="Conta contábil"
              items={ledgerAccounts}
              selected={selectedLedgerAccounts}
              onChange={handleLedgerAccountChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.general_ledger_account}
              buttonLabel="Selecione a conta"
              singleSelect
              customStyles={{ maxHeight: "160px" }}
              groupBy={(i) => i.subgroup}
            />

            {/* Linha 2: Descrição (full) */}
            <div className="md:col-span-3">
              <Input
                label="Descrição"
                ref={descriptionRef}
                type="text"
                placeholder="Descreva o lançamento"
                value={formData.details.description}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    details: { ...p.details, description: e.target.value },
                  }))
                }
              />
            </div>

            {/* Linha 3: Tipo de documento */}
            <SelectDropdown<DocumentType>
              label="Tipo de documento"
              items={documentTypes}
              selected={selectedDocumentTypes}
              onChange={handleDocumentTypeChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.document_type}
              buttonLabel="Selecione o tipo"
              singleSelect
              customStyles={{ maxHeight: "160px" }}
            />

            {/* Linha 4: Observação */}
            <div className="md:col-span-2">
              <Input
                label="Observação"
                type="text"
                placeholder="(opcional)"
                value={formData.details.observation}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    details: { ...p.details, observation: e.target.value },
                  }))
                }
              />
            </div>
            <div className="hidden md:block" /> {/* coluna vazia para fechar a linha */}

            {/* Linha 5: Notas (full) */}
            <div className="md:col-span-3">
              <Input
                label="Notas"
                placeholder="Notas internas (não aparecem em documentos)"
                value={formData.details.notes}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, details: { ...p.details, notes: e.target.value } }))
                }
              />
            </div>
          </div>
        );

      case "costCenters":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SelectDropdown<Department>
                label="Departamentos"
                items={departments}
                selected={selectedDepartments}
                onChange={handleDepartmentChange}
                getItemKey={(d) => d.id}
                getItemLabel={(d) => d.department || "Departamento sem nome"}
                clearOnClickOutside={false}
                buttonLabel="Selecione departamentos"
                customStyles={{ maxHeight: "220px" }}
              />

              {/* Box interno pode ter scroll próprio sem afetar o modal fixo */}
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-700">Distribuição (%)</span>
                  <span
                    className={`text-[11px] px-2 py-[2px] rounded-full border ${
                      percentageSum === 100
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    Total: {percentageSum || 0}%
                  </span>
                </div>
                <div className="mt-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedDepartments.map((dept, index) => (
                    <div key={dept.id} className="mb-3">
                      <Input
                        label={`% - ${dept.department || `Departamento ${dept.id}`}`}
                        type="number"
                        name={`department_percentage_${dept.id}`}
                        value={formData.costCenters.department_percentage[index] || ""}
                        onChange={(e) => handlePercentageChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                  {selectedDepartments.length === 0 && (
                    <p className="text-[12px] text-gray-500">Nenhum departamento selecionado.</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <SelectDropdown<Project>
                label="Projetos"
                items={projects}
                selected={selectedProject}
                onChange={handleProjectChange}
                getItemKey={(p) => p.id}
                getItemLabel={(p) => p.project || `Projeto ${p.id}`}
                buttonLabel="Selecione um projeto"
                clearOnClickOutside={false}
                singleSelect
                customStyles={{ maxHeight: "180px" }}
              />
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<InventoryItem>
              label="Produto"
              items={inventoryItems}
              selected={selectedInventoryItem}
              onChange={handleInventoryChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.inventory_item || "Produto sem nome"}
              buttonLabel="Selecione um produto"
              clearOnClickOutside={false}
              singleSelect
              customStyles={{ maxHeight: "160px" }}
            />
            {selectedInventoryItem.length > 0 && (
              <Input
                label="Quantidade"
                type="number"
                placeholder="0"
                value={formData.inventory.quantity}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    inventory: { ...p.inventory, quantity: e.target.value },
                  }))
                }
              />
            )}
          </div>
        );

      case "entities":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<EntityType>
              label="Tipo de entidade"
              items={[
                { id: 1, entity_type: "Cliente" },
                { id: 2, entity_type: "Fornecedor" },
                { id: 3, entity_type: "Funcionário" },
              ]}
              selected={selectedEntityType}
              onChange={(v) => {
                setSelectedEntityType(v);
                setFormData((p) => ({
                  ...p,
                  entities: { ...p.entities, entityType: v[0]?.entity_type || "" },
                }));
              }}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.entity_type}
              buttonLabel="Selecione o tipo"
              singleSelect
              customStyles={{ maxHeight: "140px" }}
              hideFilter
            />

            {formData.entities.entityType !== "" && (
              <SelectDropdown<Entity>
                label="Entidade"
                items={entities}
                selected={selectedEntity}
                onChange={handleEntityChange}
                getItemKey={(i) => i.id}
                getItemLabel={(i) => i.full_name || "Entidade sem nome"}
                buttonLabel="Selecione a entidade"
                singleSelect
                customStyles={{ maxHeight: "160px" }}
              />
            )}
          </div>
        );

      case "recurrence":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<RecurrenceOption>
              label="Recorrência"
              items={[
                { id: 1, label: "Sim", value: 1 },
                { id: 2, label: "Não", value: 0 },
              ]}
              selected={
                formData.recurrence.recurrence === 1
                  ? [{ id: 1, label: "Sim", value: 1 }]
                  : [{ id: 2, label: "Não", value: 0 }]
              }
              onChange={(v) =>
                setFormData((p) => ({
                  ...p,
                  recurrence: { ...p.recurrence, recurrence: v[0]?.value ?? 0 },
                }))
              }
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.label}
              buttonLabel="Selecione"
              singleSelect
              hideFilter
              customStyles={{ maxHeight: "140px" }}
              disabled={isRecurrenceLocked}
            />

            {formData.recurrence.recurrence === 1 && (
              <>
                <Input
                  label="Parcelas"
                  type="number"
                  value={formData.recurrence.installments}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      recurrence: { ...p.recurrence, installments: e.target.value },
                    }))
                  }
                  disabled={isRecurrenceLocked}
                />

                <SelectDropdown<PeriodOption>
                  label="Períodos"
                  items={periodOptions}
                  selected={periodOptions.filter((opt) => opt.value === formData.recurrence.periods)}
                  onChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      recurrence: { ...p.recurrence, periods: v[0]?.value ?? 0 },
                    }))
                  }
                  getItemKey={(i) => i.id}
                  getItemLabel={(i) => i.label}
                  buttonLabel="Selecione um período"
                  singleSelect
                  customStyles={{ maxHeight: "140px" }}
                  hideFilter
                  disabled={isRecurrenceLocked}
                />

                <SelectDropdown<WeekendOption>
                  label="Fim de semana"
                  items={[
                    { id: 1, label: "Postergar", value: "postpone" },
                    { id: 2, label: "Antecipar", value: "antedate" },
                  ]}
                  selected={
                    formData.recurrence.weekend
                      ? [
                          {
                            id: formData.recurrence.weekend === "postpone" ? 1 : 2,
                            label:
                              formData.recurrence.weekend === "postpone" ? "Postergar" : "Antecipar",
                            value: formData.recurrence.weekend as WeekendOption["value"],
                          },
                        ]
                      : []
                  }
                  onChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      recurrence: { ...p.recurrence, weekend: v[0]?.value || "" },
                    }))
                  }
                  getItemKey={(i) => i.id}
                  getItemLabel={(i) => i.label}
                  buttonLabel="Selecione"
                  singleSelect
                  customStyles={{ maxHeight: "140px" }}
                  hideFilter
                  disabled={isRecurrenceLocked}
                />
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Não renderiza se fechado
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      {/* Tamanho fixo: evita overflow do container (sem scroll principal do modal) */}
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-gray-200 rounded-lg shadow-xl w-[1100px] max-w-[95vw] h-[580px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header fixo */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {type === "credit" ? "RC" : "PG"}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Lançamento</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {type === "credit" ? "Recebimentos" : "Pagamentos"}
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

          {/* Abas compactas (sub-nav) */}
          <div className="px-5 pb-2">
            <Tabs />
          </div>
        </header>

        {/* Conteúdo: sem overflow do container; se precisar, caixas internas têm scroll próprio */}
        <form id="modalForm" className="flex-1 flex flex-col" onSubmit={handleSubmit}>
          {/* Conteúdo rolável */}
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">
            {renderTabContent()}
          </div>

          {/* Footer fixo */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {amountCents > 0 ? (
                <>Valor: <b>{formatCurrency(formData.details.amount)}</b></>
              ) : (
                <>Informe um valor para salvar.</>
              )}
              <span className="ml-3 text-gray-400">Atalhos: Esc (fechar), Ctrl/Cmd+S (salvar)</span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {isSubmitting ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EntriesModalForm;
