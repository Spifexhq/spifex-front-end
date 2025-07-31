import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormData, ModalFormProps, Tab, RecurrenceOption, PeriodOption, WeekendOption } from "./Modal.types";
import { formatCurrency, distributePercentages, handleAmountKeyDown } from "@/utils/formUtils";
import { useRequests } from "@/api/requests";
import { GeneralLedgerAccount, DocumentType, Department, Project, Inventory, Entity, EntityType } from "src/models/ForeignKeys";
import { SelectDropdown } from "@/components/SelectDropdown";
import Input from '../Input';
import { AddEntryPayload } from '@/models/Entries';
import Button from '../Button';
import { decimalToCentsString } from 'src/utils/utils';

// Initial state for the form data
const initialFormData: FormData = {
  details: {
    dueDate: "",
    description: "",
    observation: "",
    amount: "0",
    accountingAccount: "",
    documentType: "",
    notes: ""
  },
  costCenters: {
    departments: [],
    department_percentage: [],
    projects: ""
  },
  inventory: {
    product: "",
    quantity: ""
  },
  entities: {
    entityType: "",
    entity: ""
  },
  recurrence: {
    recurrence: 0,
    installments: "",
    periods: 1,
    weekend: ""
  }
};

const ModalForm: React.FC<ModalFormProps> = ({ isOpen, onClose, type, onSave, initialEntry }) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const { addEntry, editEntry } = useRequests();

  const [ledgerAccounts, setLedgerAccounts] = useState<GeneralLedgerAccount[]>([]);
  const [selectedLedgerAccounts, setSelectedLedgerAccount] = useState<GeneralLedgerAccount[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentTypes, setSelectedDocumentType] = useState<DocumentType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<Inventory[]>([]);
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

  const { 
    getGeneralLedgerAccounts, 
    getDocumentTypes,
    getDepartments,
    getProjects,
    getInventoryItems,
    getEntities
  } = useRequests();

  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setActiveTab('details');
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isRecurring = formData.recurrence.recurrence === 1;
    const installments = isRecurring
      ? Number(formData.recurrence.installments || 1)
      : 1;

    const payload: AddEntryPayload = {
      due_date: formData.details.dueDate,
      description: formData.details.description || undefined,
      observation: formData.details.observation || undefined,
      amount: cleanCurrency(formData.details.amount),       // "100.00"
      current_installment: 1,
      total_installments: installments,
      transaction_type: type,                               // "credit" ou "debit"
      notes: formData.details.notes || undefined,

      // Recorrência
      periods: isRecurring ? String(formData.recurrence.periods) : null,
      weekend_action: isRecurring ? formData.recurrence.weekend : null,

      // FK simples
      general_ledger_account_id: formData.details.accountingAccount || null,
      document_type_id: formData.details.documentType || null,
      project_id: formData.costCenters.projects || null,
      entity_id: formData.entities.entity || null,

      // Inventário
      inventory_item_id: formData.inventory.product
        ? Number(formData.inventory.product)
        : null,
      inventory_item_quantity: formData.inventory.quantity
        ? Number(formData.inventory.quantity)
        : null,

      // Departamentos (listas)
      department_id: formData.costCenters.departments.length
        ? formData.costCenters.departments.join(',')
        : null,
      department_percentage: formData.costCenters.department_percentage.length
        ? formData.costCenters.department_percentage.join(',')
        : null,
    };

    console.log("Payload enviado:", payload);

    try {
      let res;

      if (initialEntry) {
        // 🔁 Modo edição
        res = await editEntry([initialEntry.id], payload);
      } else {
        // ➕ Modo criação
        res = await addEntry(payload);
      }

      if (!res.data) {
        console.error("Erro API:", res.message, res.errors);
        alert(res.message || "Erro ao salvar lançamento.");
        return;
      }

      handleClose();
      onSave();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      alert("Erro inesperado ao salvar lançamento.");
    }
  };

  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const isRecurring = (initialEntry.total_installments ?? 1) > 1;

    // porcentagens de departamentos vinda da API
    const deptIds   = initialEntry.departments?.map(d => String(d.department.id)) || [];
    const deptPercs = initialEntry.departments?.map(d => d.percentage) || [];

    setFormData({
      details: {
        dueDate: initialEntry.due_date,
        description: initialEntry.description ?? '',
        observation: initialEntry.observation ?? '',
        amount:        decimalToCentsString(initialEntry.amount),
        accountingAccount: String(initialEntry.general_ledger_account?.id ?? ''),
        documentType:      String(initialEntry.document_type?.id ?? ''),
        notes: initialEntry.notes ?? ''
      },
      costCenters: {
        departments: deptIds,
        department_percentage: deptPercs,
        projects: String(initialEntry.project?.id ?? '')
      },
      inventory: {
        product:  String(initialEntry.inventory_item?.[0]?.inventory_item.id ?? ''),
        quantity: initialEntry.inventory_item?.[0]?.inventory_item_quantity
                    ? String(initialEntry.inventory_item[0].inventory_item_quantity)
                    : ''
      },
      entities: {
        entityType: initialEntry.entity?.entity_type ?? '',
        entity:     String(initialEntry.entity?.id ?? '')
      },
      recurrence: {
        recurrence: isRecurring ? 1 : 0,
        installments: isRecurring
          ? String(initialEntry.total_installments)
          : '',
        periods: Number(initialEntry.periods ?? 1),
        weekend: initialEntry.weekend_action ?? ''
      }
    });
  }, [isOpen, initialEntry]);


  /** 2. Novo efeito para selecionar itens dos dropdowns */
  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    // -------------- Detalhes --------------
    const la = ledgerAccounts.find(a => a.id === initialEntry.general_ledger_account?.id);
    setSelectedLedgerAccount(la ? [la] : []);

    const dt = documentTypes.find(d => d.id === initialEntry.document_type?.id);
    setSelectedDocumentType(dt ? [dt] : []);

    // -------------- Cost Centers --------------
    const deptIds = initialEntry.departments?.map(d => d.department.id) || [];
    setSelectedDepartments(
      departments.filter(dep => deptIds.includes(dep.id))
    );

    const prj = projects.find(p => p.id === initialEntry.project?.id);
    setSelectedProject(prj ? [prj] : []);

    // -------------- Inventory --------------
    const invId = initialEntry.inventory_item?.[0]?.inventory_item.id;
    const inv = inventoryItems.find(i => i.id === invId);
    setSelectedInventoryItem(inv ? [inv] : []);

    // -------------- Entities --------------
    if (initialEntry.entity) {
      const ent = entities.find(e => e.id === initialEntry.entity!.id);
      setSelectedEntity(ent ? [ent] : []);

      setSelectedEntityType([
        { id: 0, entity_type: initialEntry.entity.entity_type ?? '' }
      ]);
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
    entities
  ]);

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
  

  // -------------------------------
  // DETAILS TAB LOGIC
  // -------------------------------

  // Fill in today's date and focus on the description field when opening
  useEffect(() => {
    if (!isOpen) return;

    getGeneralLedgerAccounts()
      .then((response) => {
        let allAccounts: GeneralLedgerAccount[] =
          response.data?.general_ledger_accounts || [];

        // Filter by credit/debit if needed
        if (type === 'credit') {
          allAccounts = allAccounts.filter((acc) => acc.transaction_type === 'credit');
        } else {
          allAccounts = allAccounts.filter((acc) => acc.transaction_type === 'debit');
        }

        setLedgerAccounts(allAccounts);
      })
      .catch((error) => {
        console.error("Erro ao buscar contas contábeis:", error);
      });

    getDocumentTypes()
      .then((response) => {
        setDocumentTypes(response.data?.document_types || []);
      })
      .catch((error) => console.error("Erro ao buscar tipos de documento:", error));

    getDepartments()
      .then((response) => {
        setDepartments(response.data?.departments || []);
      })
      .catch((error) => console.error("Erro ao buscar departamentos:", error));

    getProjects()
      .then((response) => {
        setProjects(response.data?.projects || []);
      })
      .catch((error) => console.error("Erro ao buscar projetos:", error));

    getInventoryItems()
      .then(response => {
        setInventoryItems(response.data?.inventory_items || []);
      })
      .catch(error => console.error("Erro ao buscar itens de inventário:", error));

    getEntities()
      .then(response => {
        setEntities(response.data?.entities || []);
      })
      .catch(error => console.error("Erro ao buscar entidades:", error));

    if (!initialEntry) {
      setFormData((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          dueDate: new Date().toISOString().slice(0, 10),
        },
      }));
    }
  }, [
    getGeneralLedgerAccounts,
    getDocumentTypes,
    getDepartments,
    getProjects,
    getInventoryItems,
    getEntities,
    isOpen,
    type,
    initialEntry,
  ]);

  const handleLedgerAccountChange = (updatedAccounts: GeneralLedgerAccount[]) => {
    setSelectedLedgerAccount(updatedAccounts);
  
    const itemId = updatedAccounts.length > 0
      ? String(updatedAccounts[0].id)
      : "";
  
    setFormData({
      ...formData,
      details: {
        ...formData.details,
        accountingAccount: itemId,
      },
    });
  };

  const handleDocumentTypeChange = (updatedDocumentTypes: DocumentType[]) => {
    setSelectedDocumentType(updatedDocumentTypes);

    const itemId = updatedDocumentTypes.length > 0
    ? String(updatedDocumentTypes[0].id)
    : "";
  
    setFormData({
      ...formData,
      details: {
        ...formData.details,
        documentType: itemId,
      },
    });
  };

  // -------------------------------
  // COST CENTERS TAB LOGIC
  // -------------------------------

  const handleDepartmentChange = (updatedDepartments: Department[]) => {
    // Update the selected departments (for the dropdown's controlled state)
    setSelectedDepartments(updatedDepartments);

    // Map Department[] to array of strings (their IDs)
    const updatedDepartmentIds = updatedDepartments.map((dept) => String(dept.id));
    const updatedPercentages = distributePercentages(updatedDepartmentIds);

    setFormData((prev) => ({
      ...prev,
      costCenters: {
        ...prev.costCenters,
        departments: updatedDepartmentIds,
        department_percentage: updatedPercentages,
      },
    }));
  };

  // Called when a percentage input is changed
  const handlePercentageChange = (index: number, value: string) => {
    const newPercentages = [...formData.costCenters.department_percentage];
    newPercentages[index] = value;
    setFormData({
      ...formData,
      costCenters: {
        ...formData.costCenters,
        department_percentage: newPercentages,
      },
    });
  };

  const handleProjectChange = (updatedProjects: Project[]) => {
    setSelectedProject(updatedProjects);
    const projectId = updatedProjects.length > 0 ? String(updatedProjects[0].id) : "";
    setFormData((prev) => ({
      ...prev,
      costCenters: {
        ...prev.costCenters,
        projects: projectId,
      },
    }));
  };

  // -------------------------------
  // INVENTORY TAB LOGIC
  // -------------------------------

  const handleInventoryChange = (updatedInventory: Inventory[]) => {
    setSelectedInventoryItem(updatedInventory);
    const itemId = updatedInventory.length > 0 ? String(updatedInventory[0].id) : "";
    setFormData(prev => ({ ...prev, inventory: { ...prev.inventory, product: itemId } }));
  };

  // -------------------------------
  // ENTITIES TAB LOGIC
  // -------------------------------

  const handleEntityChange = (updatedEntities: Entity[]) => {
    setSelectedEntity(updatedEntities);
    const entityId = updatedEntities.length > 0 ? String(updatedEntities[0].id) : "";
    setFormData(prev => ({ ...prev, entities: { ...prev.entities, entity: entityId } }));
  };

  // -------------------------------
  // RENDER TAB CONTENT
  // -------------------------------
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="grid grid-cols-3 gap-2">
            {/* Vencimento */}
            <div className="mb-1">
              <Input
                label='Vencimento'
                type="date"
                value={formData.details.dueDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, dueDate: e.target.value },
                  })
                }
              />
            </div>
            {/* Descrição */}
            <div className="mb-1">
              <Input
                label='Descrição'
                ref={descriptionRef}
                type="text"
                placeholder="Digite a descrição"
                value={formData.details.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, description: e.target.value },
                  })
                }
              />
            </div>
            {/* Observação */}
            <div className="mb-1">
              <Input
                label="Observação"
                type="text"
                placeholder="Digite a observação"
                value={formData.details.observation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, observation: e.target.value },
                  })
                }
              />
            </div>
            {/* Valor */}
            <div className="mb-1">
              <Input
                label="Valor"
                type="text"
                placeholder="Digite o valor"
                value={formatCurrency(formData.details.amount)}
                onKeyDown={(e) =>
                  handleAmountKeyDown(e, formData.details.amount, setFormData)
                }
              />
            </div>
            {/* Conta Contábil */}
            <div className="mb-1">
              <SelectDropdown<GeneralLedgerAccount>
                label="Conta Contábil"
                items={ledgerAccounts}
                selected={selectedLedgerAccounts}
                onChange={handleLedgerAccountChange}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.general_ledger_account}
                buttonLabel="Selecione Contas Contábeis"
                singleSelect
                customStyles={{
                  maxHeight: "150px",
                }}
                groupBy={(item) => item.subgroup}
              />
            </div>
            {/* Tipo de Documento */}
            <div className="mb-1">
              <SelectDropdown<DocumentType>
                label="Tipo de Documento"
                items={documentTypes}
                selected={selectedDocumentTypes}
                onChange={handleDocumentTypeChange}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.document_type}
                buttonLabel="Selecione Contas Contábeis"
                singleSelect
                customStyles={{
                  maxHeight: "150px",
                }}
              />
            </div>
            {/* Notas */}
            <div className="mb-4 col-span-3">
              <Input
                label="Notas"
                placeholder="Digite as notas"
                value={formData.details.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, notes: e.target.value },
                  })
                }
              />
            </div>
          </div>
        );
      case 'costCenters':
        return (
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column: Departments and Percentages */}
            <div>
              {/* Departments (with SelectDropdown) */}
              <div className="mb-4">
                <SelectDropdown<Department>
                  label="Departamentos"
                  items={departments}
                  selected={selectedDepartments}
                  onChange={handleDepartmentChange}
                  getItemKey={(dept) => dept.id}
                  getItemLabel={(dept) => dept.department || "Departamento sem nome"}
                  clearOnClickOutside={false}
                  buttonLabel="Selecione Departamentos"
                  customStyles={{
                    maxHeight: "250px",
                  }}
                />
              </div>

              {/* Percentages for selected departments */}
              <div className="mb-4 max-h-[180px] overflow-y-auto">
                {selectedDepartments.map((dept, index) => {
                  const departmentName = dept.department || `Departamento ${dept.id}`;
                  return (
                    <div key={dept.id} className="mb-4">
                      <Input
                        label={`Porcentagem - ${departmentName}`}
                        type="number"
                        name={`department_percentage_${dept.id}`}
                        value={formData.costCenters.department_percentage[index] || ""}
                        onChange={(e) => handlePercentageChange(index, e.target.value)}
                        style={{ width: '98%' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Right Column: Projects */}
            <SelectDropdown<Project>
              label="Projetos"
              items={projects}
              selected={selectedProject}
              onChange={handleProjectChange}
              getItemKey={(proj) => proj.id}
              getItemLabel={(proj) => proj.project || `Projeto ${proj.id}`}
              buttonLabel="Selecione Projeto"
              clearOnClickOutside={false}
              singleSelect
              customStyles={{
                maxHeight: "150px",
              }}
            />
          </div>
        );
      case 'inventory':
        return (
          <div>
            {/* Produto */}
            <div>
              <SelectDropdown<Inventory>
                label="Produto"
                items={inventoryItems}
                selected={selectedInventoryItem}
                onChange={handleInventoryChange}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.inventory_item || "Produto sem nome"}
                buttonLabel="Selecione um Produto"
                clearOnClickOutside={false}
                singleSelect
                customStyles={{ maxHeight: "150px" }}
              />
              {selectedInventoryItem.length > 0 && (
                <Input
                  label="Quantidade"
                  type="number"
                  placeholder="Digite a quantidade"
                  value={formData.inventory.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventory: { ...prev.inventory, quantity: e.target.value } }))}
                />
              )}
            </div>
          </div>
        );
      case 'entities':
        return (
          <div>
            {/* Tipo de entidade */}
            <div>
              <SelectDropdown<EntityType>
                label="Tipo de entidade"
                items={[
                  { id: 1, entity_type: 'Cliente' },
                  { id: 2, entity_type: 'Fornecedor' },
                  { id: 3, entity_type: 'Funcionário' },
                ]}
                selected={selectedEntityType}
                onChange={(newValue) => {
                  setSelectedEntityType(newValue);
                  setFormData({
                    ...formData,
                    entities: { ...formData.entities, entityType: newValue[0]?.entity_type || "" },
                  });
                }}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.entity_type}
                buttonLabel="Selecione um Tipo de Entidade"
                singleSelect
                customStyles={{ maxHeight: "150px" }}
                hideFilter={true}
              />
            </div>
            {/* Render Entidade only if a entity type is selected */}
            {formData.entities.entityType !== "" && (
            <div>
              <SelectDropdown<Entity>
                label="Entidade"
                items={entities}
                selected={selectedEntity}
                onChange={handleEntityChange}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.full_name || "Entidade sem nome"}
                buttonLabel="Selecione uma Entidade"
                singleSelect
                customStyles={{ maxHeight: "150px" }}
              />
            </div>
            )}
          </div>
        );
      case 'recurrence':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
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
                onChange={(newValue) => {
                  const selected = newValue[0]?.value ?? 0;
                  setFormData({
                    ...formData,
                    recurrence: { ...formData.recurrence, recurrence: selected },
                  });
                }}
                getItemKey={(item) => item.id}
                getItemLabel={(item) => item.label}
                buttonLabel="Selecione"
                singleSelect
                hideFilter
                customStyles={{ maxHeight: "120px" }}
                disabled={isRecurrenceLocked}
              />
            </div>

            {formData.recurrence.recurrence === 1 && (
              <>
                <div>
                  <Input
                    label='Parcelas'
                    type="number"
                    value={formData.recurrence.installments}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, installments: e.target.value },
                      })
                    }
                    disabled={isRecurrenceLocked}
                  />
                </div>

                <div>
                  <SelectDropdown<PeriodOption>
                    label="Períodos"
                    items={periodOptions}
                    selected={periodOptions.filter(opt => opt.value === formData.recurrence.periods)}
                    onChange={(newValue) =>
                      setFormData({
                        ...formData,
                        recurrence: {
                          ...formData.recurrence,
                          periods: newValue[0]?.value ?? 0,
                        },
                      })
                    }
                    getItemKey={(item) => item.id}
                    getItemLabel={(item) => item.label}
                    buttonLabel="Selecione um Período"
                    singleSelect
                    customStyles={{ maxHeight: "120px" }}
                    hideFilter
                    disabled={isRecurrenceLocked}
                  />
                </div>

                <div>
                  <SelectDropdown<WeekendOption>
                    label="Fim de Semana"
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
                                formData.recurrence.weekend === "postpone"
                                  ? "Postergar"
                                  : "Antecipar",
                              value: formData.recurrence.weekend as WeekendOption["value"],
                            },
                          ]
                        : []
                    }
                    onChange={(newValue) =>
                      setFormData({
                        ...formData,
                        recurrence: {
                          ...formData.recurrence,
                          weekend: newValue[0]?.value || "",
                        },
                      })
                    }
                    getItemKey={(item) => item.id}
                    getItemLabel={(item) => item.label}
                    buttonLabel="Selecione"
                    singleSelect
                    customStyles={{ maxHeight: "120px" }}
                    hideFilter
                    disabled={isRecurrenceLocked}
                  />
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Do not render the modal if it is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)] z-[9999]">
      <div className="relative bg-white text-[#202020] rounded-lg shadow-xl w-[85%] h-[75%] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-semibold select-none">
            {type === "credit" ? "Recebimentos" : "Pagamentos"}
          </h1>
        </div>

        <form id="modalForm" className="flex flex-col flex-grow" onSubmit={handleSubmit}>
          {/* Modal Content (Adjust height and scrolling behavior) */}
          <div className="p-4 flex-grow overflow-auto min-h-0">
            {/* Tabs Navigation */}
            <div className="mb-4">
              <nav className="flex space-x-4 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'details'
                      ? 'border-b-2 text-[color:var(--accentPrimary)] border-[color:var(--accentPrimary)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('costCenters')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'costCenters'
                      ? 'border-b-2 text-[color:var(--accentPrimary)] border-[color:var(--accentPrimary)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Centro de Custos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'inventory'
                      ? 'border-b-2 text-[color:var(--accentPrimary)] border-[color:var(--accentPrimary)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Inventário
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('entities')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'entities'
                      ? 'border-b-2 text-[color:var(--accentPrimary)] border-[color:var(--accentPrimary)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Envolvidos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('recurrence')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'recurrence'
                      ? 'border-b-2 text-[color:var(--accentPrimary)] border-[color:var(--accentPrimary)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recorrência
                </button>
              </nav>
            </div>

            {renderTabContent()}
          </div>

          {/* Fixed Footer */}
          <div className="p-4 bg-white flex justify-end space-x-4">
            <Button
              onClick={handleClose}
              variant='cancel'
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant='primary'
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm;
