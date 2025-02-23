import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormData, ModalFormProps, Tab } from "./Modal.types";
import { formatCurrency, distributePercentages, handleAmountKeyDown } from "@/utils/formUtils";

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
  participants: {
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

const ModalForm: React.FC<ModalFormProps> = ({ isOpen, onClose }) => {
  // State for active tab and form data (fields persist between tabs)
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const descriptionRef = useRef<HTMLInputElement>(null);

  // When closing the modal, reset the form data and active tab
  const handleClose = useCallback(() => {
    setFormData(initialFormData);
    setActiveTab('details');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

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

  // -------------------------------
  // COST CENTERS TAB LOGIC
  // -------------------------------

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

  // Called when the departments dropdown value changes
  const handleDepartmentChange = (updatedDepartments: string[]) => {
    const updatedPercentages = distributePercentages(updatedDepartments);

    setFormData({
      ...formData,
      costCenters: {
        ...formData.costCenters,
        departments: updatedDepartments,
        department_percentage: updatedPercentages,
      },
    });
  };

  // -------------------------------
  // RENDER TAB CONTENT
  // -------------------------------
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="grid grid-cols-3 gap-4">
            {/* Vencimento */}
            <div className="mb-4">
              <label htmlFor="dueDate" className="block text-sm font-medium">
                Vencimento
              </label>
              <input
                id="dueDate"
                type="date"
                value={formData.details.dueDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, dueDate: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              />
            </div>
            {/* Descrição */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium">
                Descrição
              </label>
              <input
                ref={descriptionRef}
                id="description"
                type="text"
                placeholder="Digite a descrição"
                value={formData.details.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, description: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              />
            </div>
            {/* Observação */}
            <div className="mb-4">
              <label htmlFor="observation" className="block text-sm font-medium">
                Observação
              </label>
              <input
                id="observation"
                type="text"
                placeholder="Digite a observação"
                value={formData.details.observation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, observation: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              />
            </div>
            {/* Valor */}
            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium">
                Valor
              </label>
              <input
                id="amount"
                type="text"
                placeholder="Digite o valor"
                // Displays the formatted value (for example: "R$ 0.00")
                value={formatCurrency(formData.details.amount)}
                // Handles digit input and backspace
                onKeyDown={(e) => handleAmountKeyDown(e, formData.details.amount, setFormData)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              />
            </div>
            {/* Conta Contábil */}
            <div className="mb-4">
              <label htmlFor="accountingAccount" className="block text-sm font-medium">
                Conta Contábil
              </label>
              <select
                id="accountingAccount"
                value={formData.details.accountingAccount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, accountingAccount: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              >
                <option value="">Selecione uma opção</option>
                <option value="conta1">Conta 1</option>
                <option value="conta2">Conta 2</option>
                <option value="conta3">Conta 3</option>
              </select>
            </div>
            {/* Tipo de Documento */}
            <div className="mb-4">
              <label htmlFor="documentType" className="block text-sm font-medium">
                Tipo de Documento
              </label>
              <select
                id="documentType"
                value={formData.details.documentType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, documentType: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              >
                <option value="">Selecione uma opção</option>
                <option value="tipo1">Tipo 1</option>
                <option value="tipo2">Tipo 2</option>
                <option value="tipo3">Tipo 3</option>
              </select>
            </div>
            {/* Notas */}
            <div className="mb-4 col-span-3">
              <label htmlFor="notes" className="block text-sm font-medium">
                Notas
              </label>
              <input
                id="notes"
                placeholder="Digite as notas"
                value={formData.details.notes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: { ...formData.details, notes: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              />
            </div>
          </div>
        );
      case 'costCenters':
        return (
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column: Departments and Percentages */}
            <div>
              <div className="mb-4">
                <label htmlFor="departments" className="block text-sm font-medium">
                  Departamentos
                </label>
                <select
                  id="departments"
                  multiple
                  value={formData.costCenters.departments}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Impede o comportamento padrão do navegador
                    const selectElement = e.currentTarget as HTMLSelectElement;
                    const clickedElement = e.target as HTMLOptionElement;

                    // Certifique-se de que o elemento clicado é uma <option>
                    if (clickedElement.tagName.toLowerCase() === "option") {
                      // Altera o estado selecionado da opção clicada
                      clickedElement.selected = !clickedElement.selected;

                      // Obtém todos os valores selecionados
                      const selectedOptions = Array.from(selectElement.selectedOptions).map(
                        (option) => option.value
                      );
                      handleDepartmentChange(selectedOptions);
                    }
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                >
                  <option value="dep1">Departamento A</option>
                  <option value="dep2">Departamento B</option>
                  <option value="dep3">Departamento C</option>
                  <option value="dep4">Departamento D</option>
                  <option value="dep5">Departamento E</option>
                </select>
              </div>
              <div className="mb-4 max-h-[180px] overflow-y-auto">
                {formData.costCenters.departments.map((deptId, index) => {
                  const departmentName =
                    deptId === "dep1"
                      ? "Departamento A"
                      : deptId === "dep2"
                      ? "Departamento B"
                      : deptId === "dep3"
                      ? "Departamento C"
                      : deptId === "dep4"
                      ? "Departamento D"
                      : deptId === "dep5"
                      ? "Departamento E"
                      : deptId;
                  return (
                    <div key={deptId} className="mb-4">
                      <label className="block text-sm font-medium">
                        {`Porcentagem - ${departmentName}`}
                      </label>
                      <input
                        type="number"
                        name={`department_percentage_${deptId}`}
                        value={formData.costCenters.department_percentage[index] || ""}
                        onChange={(e) => handlePercentageChange(index, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                        style={{ width: '98%', padding: '8px', boxSizing: 'border-box' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Right Column: Projects */}
            <div>
              <div className="mb-4">
                <label htmlFor="projects" className="block text-sm font-medium">
                  Projetos
                </label>
                <select
                  id="projects"
                  value={formData.costCenters.projects}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costCenters: { ...formData.costCenters, projects: e.target.value },
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                >
                  <option value="">Selecione um projeto</option>
                  <option value="proj1">Projeto X</option>
                  <option value="proj2">Projeto Y</option>
                  <option value="proj3">Projeto Z</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'inventory':
        return (
          <div>
            {/* Produto */}
            <div className="mb-4">
              <label htmlFor="product" className="block text-sm font-medium">
                Produto
              </label>
              <select
                id="product"
                value={formData.inventory.product}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    inventory: { ...formData.inventory, product: e.target.value },
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
              >
                <option value="">Selecione um produto</option>
                <option value="prod1">Produto A</option>
                <option value="prod2">Produto B</option>
                <option value="prod3">Produto C</option>
              </select>
            </div>
            {/* Render Quantidade only if a product is selected */}
            {formData.inventory.product !== "" && (
              <div className="mb-4">
                <label htmlFor="quantity" className="block text-sm font-medium">
                  Quantidade
                </label>
                <input
                  id="quantity"
                  type="number"
                  placeholder="Digite a quantidade"
                  value={formData.inventory.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inventory: { ...formData.inventory, quantity: e.target.value },
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                />
              </div>
            )}
          </div>
        );
      case 'participants':
        return (
          <div>
            {/* Tipo de entidade */}
            <div className="mb-4">
              <label htmlFor="entityType" className="block text-sm font-medium">
                Tipo de entidade
              </label>
              <select
                id="entityType"
                value={formData.participants.entityType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    participants: { ...formData.participants, entityType: e.target.value },
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
            {formData.participants.entityType !== "" && (
              <div className="mb-4">
                <label htmlFor="entity" className="block text-sm font-medium">
                  Entidade
                </label>
                <select
                  id="entity"
                  value={formData.participants.entity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      participants: { ...formData.participants, entity: e.target.value },
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none"
                >
                  <option value="">Selecione uma entidade</option>
                  <option value="ent1">Entidade 1</option>
                  <option value="ent2">Entidade 2</option>
                  <option value="ent3">Entidade 3</option>
                </select>
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
      <div className="relative bg-white text-[#202020] rounded-lg shadow-xl w-[85%] h-[80%]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Modal - Formulário</h2>
        </div>
        <form id="modalForm">
          {/* Modal Content (with bottom padding to make room for fixed footer) */}
          <div className="p-4 pb-24 h-full overflow-auto">
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
                  onClick={() => setActiveTab('participants')}
                  className={`py-2 px-4 focus:outline-none ${
                    activeTab === 'participants'
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
          {/* Fixed Footer with Cancel and Save Buttons */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end space-x-4">
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
