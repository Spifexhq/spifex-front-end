import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormData, ModalFormProps, Tab } from "./Modal.types";
import { formatCurrency, distributePercentages, handleAmountKeyDown } from "@/utils/formUtils";
import { useRequests } from "@/api/requests";
import { GeneralLedgerAccount, DocumentType, Department, Project, Inventory, Entity } from "src/models/ForeignKeys";
import { SelectDropdown } from "@/components/SelectDropdown";
import Input from '../Input';

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
    recurrence: "não",
    installments: "",
    periods: "",
    weekend: ""
  }
};

const ModalForm: React.FC<ModalFormProps> = ({ isOpen, onClose, type }) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const descriptionRef = useRef<HTMLInputElement>(null);

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
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        details: { ...prev.details, dueDate: today },
      }));

      setTimeout(() => {
        descriptionRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  }, [
    getGeneralLedgerAccounts,
    getDocumentTypes,
    getDepartments,
    getProjects,
    getInventoryItems,
    getEntities,
    isOpen,
    type
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
                // Displays the formatted value (for example: "R$ 0.00")
                value={formatCurrency(formData.details.amount)}
                // Handles digit input and backspace
                onKeyDown={(e) => handleAmountKeyDown(e, formData.details.amount, setFormData)}
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
                    maxHeight: "150px",
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
            <div className="mb-4">
              <label htmlFor="entityType" className="block text-sm font-medium">
                Tipo de entidade
              </label>
              <select
                id="entityType"
                value={formData.entities.entityType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    entities: { ...formData.entities, entityType: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              >
                <option value="">Selecione um tipo</option>
                <option value="cliente">Cliente</option>
                <option value="fornecedor">Fornecedor</option>
                <option value="funcionario">Funcionário</option>
              </select>
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
                clearOnClickOutside={false}
                singleSelect
                customStyles={{ maxHeight: "150px" }}
              />
            </div>
            )}
          </div>
        );
      case 'recurrence':
        return (
          <div>
            {/* Recorrência */}
            <div className="mb-4">
              <label htmlFor="recurrence" className="block text-sm font-medium">
                Recorrência
              </label>
              <select
                id="recurrence"
                value={formData.recurrence.recurrence}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurrence: { ...formData.recurrence, recurrence: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              >
                <option value="sim">Sim</option>
                <option value="não">Não</option>
              </select>
            </div>
            {formData.recurrence.recurrence === 'sim' && (
              <>
                {/* Parcelas */}
                <div className="mb-4">
                  <label htmlFor="installments" className="block text-sm font-medium">
                    Parcelas
                  </label>
                  <input
                    id="installments"
                    type="number"
                    placeholder="Digite o número de parcelas"
                    value={formData.recurrence.installments}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, installments: e.target.value },
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                  />
                </div>
                {/* Períodos */}
                <div className="mb-4">
                  <label htmlFor="periods" className="block text-sm font-medium">
                    Períodos
                  </label>
                  <select
                    id="periods"
                    value={formData.recurrence.periods}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, periods: e.target.value },
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                  >
                    <option value="">Selecione um período</option>
                    <option value="mensal">Mensal</option>
                    <option value="semanal">Semanal</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                {/* Fim de semana */}
                <div className="mb-4">
                  <label htmlFor="weekend" className="block text-sm font-medium">
                    Fim de semana
                  </label>
                  <select
                    id="weekend"
                    value={formData.recurrence.weekend}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, weekend: e.target.value },
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                  >
                    <option value="">Nenhum</option>
                    <option value="postergar">Postergar</option>
                    <option value="antecipar">Antecipar</option>
                  </select>
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
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)] z-50">
      <div className="relative bg-white text-[#202020] rounded-lg shadow-xl w-[85%] h-[80%] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Modal - Formulário</h2>
        </div>

        <form id="modalForm" className="flex flex-col flex-grow">
          {/* Modal Content (Adjust height and scrolling behavior) */}
          <div className="p-4 flex-grow overflow-auto min-h-0">
            {/* Tabs Navigation */}
            <div className="mb-4 border-b">
              <nav className="flex space-x-4 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'details'
                      ? 'border-b-2 border-blue-500 text-blue-500'
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
                      ? 'border-b-2 border-blue-500 text-blue-500'
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
                      ? 'border-b-2 border-blue-500 text-blue-500'
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
                      ? 'border-b-2 border-blue-500 text-blue-500'
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
                      ? 'border-b-2 border-blue-500 text-blue-500'
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
          <div className="p-4 bg-white border-t flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="bg-red-500 text-white py-2 px-4 rounded focus:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded focus:outline-none"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm;
