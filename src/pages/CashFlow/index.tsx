import { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import {Modal, TransferenceModal} from "@/components/Modal";
import CashFlowTable from "@/components/Table/CashFlowTable";
import Filter, { FilterData } from "@/components/Filter";
import BanksTable from "src/components/Table/BanksTable";
import { ModalType } from "@/components/Modal/Modal.types";
import { Entry } from '@/models/Entries';
import Button from "src/components/Button";
import { useRequests } from '@/api/requests';

const CashFlow = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [banksKey, setBanksKey] = useState(0);
  const [cashflowKey, setCashflowKey] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { deleteEntry } = useRequests();

  const [filters, setFilters] = useState<FilterData>({});

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (type: ModalType) => {
    console.log("Abrindo modal do tipo:", type);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);                              // guarda a linha
    setModalType(entry.transaction_type as ModalType);   // cast garante o tipo
    setIsModalOpen(true);
  };

  const handleApplyFilters = (newFilters: FilterData) => {
    setFilters(newFilters);
  };

  return (
    <div className="flex">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => setIsTransferenceModalOpen(true)}
        mode="default"
      />

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        {/* Fixed Navbar */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>

        {/* Push main content below the fixed Navbar */}
        <div className="mt-[80px] px-10">
          {/* Filter + BanksTable side by side */}
          <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
            {/* Filter on the left */}
            <div className="flex-1 min-w-[250px]">
              <Filter onApply={handleApplyFilters} />
            </div>
            {/* BanksTable on the right */}
            <div className="flex-1 min-w-[250px]">
              <BanksTable key={banksKey} selectedBankIds={filters.banksId} />
            </div>
          </div>

          {/* CashFlow Table */}
          <CashFlowTable
            key={cashflowKey}
            filters={filters}
            onEdit={handleEditEntry}
            onSelectionChange={setSelectedIds}
          />
          {selectedIds.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-white border border-gray-300 shadow-lg p-4 rounded-xl z-50 flex items-center gap-4">
            <span className="text-sm text-gray-700">{selectedIds.length} selecionado(s)</span>
            <Button
              variant="danger"
              style={{ padding: '8px', fontSize: '14px'}}
              onClick={async () => {
                try {
                  await deleteEntry(selectedIds);
                  setCashflowKey((prev) => prev + 1); // Recarrega tabela
                  setSelectedIds([]); // Limpa seleção
                } catch (err) {
                  alert("Erro ao deletar lançamentos.");
                  console.error(err);
                }
              }}
            >
              Deletar selecionados
            </Button>
          </div>
        )}
        </div>

        {modalType && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingEntry(null);
            }}
            type={modalType}
            initialEntry={editingEntry}
            onSave={() => {
              setIsModalOpen(false);
              setEditingEntry(null);
              setCashflowKey((prev) => prev + 1);
            }}
          />
        )}
        
        {isTransferenceModalOpen && (
          <TransferenceModal
            isOpen={isTransferenceModalOpen}
            onClose={() => setIsTransferenceModalOpen(false)}
            onSave={() => {
              setIsTransferenceModalOpen(false);
              setBanksKey((prev) => prev + 1);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CashFlow;
