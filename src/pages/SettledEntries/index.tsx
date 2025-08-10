
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { Sidebar } from "@/components/Sidebar";
import { Modal, TransferenceModal } from "@/components/Modal";
import SettledEntriesTable from "@/components/Table/SettledEntriesTable";
import { EntryFilters } from "src/models/entries/domain";
import { ModalType } from "@/components/Modal/Modal.types";
import { Entry } from "@/models/entries";
import Navbar from "src/components/Navbar";
import { api } from "src/api/requests";
import FilterBar from "src/components/Filter/FilterBar";
import KpiWithBanksRow, { KpiItem } from "@/components/KPI/KpiWithBanksRow";
import { useBanks } from "@/hooks/useBanks";

const Settled = () => {
  useEffect(() => {
    document.title = "Realizado";
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [filters, setFilters] = useState<EntryFilters>({});
  const { banks } = useBanks(filters.bank_id);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };
  const handleApplyFilters = (newFilters: EntryFilters) => setFilters(newFilters);

  const kpis: KpiItem[] = [
    { key: "bancos", label: "Bancos", value: banks.length, hint: "no filtro atual" },
    { key: "selecionados", label: "Bancos selecionados", value: (filters.bank_id?.length ?? 0) },
    { key: "retornos", label: "Selecionados na tabela", value: selectedIds.length },
  ];

  return (
    <div className="flex">
      <Navbar />
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => setIsTransferenceModalOpen(true)}
        mode="default"
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        {/* Push main content below the fixed Navbar */}
        <div className="mt-[80px] px-10 space-y-4">
          <FilterBar onApply={handleApplyFilters} />

          {/* KPI row with Banks card expanding into right-side panel */}
          <KpiWithBanksRow items={kpis} selectedBankIds={filters.bank_id} />

          {/* Settled Entries Table */}
          <SettledEntriesTable
            filters={filters}
            bankIds={filters.bank_id}
            onSelectionChange={setSelectedIds}
          />
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
            }}
          />
        )}
      </div>

      {isTransferenceModalOpen && (
        <TransferenceModal
          isOpen={isTransferenceModalOpen}
          onClose={() => setIsTransferenceModalOpen(false)}
          onSave={() => {
            setIsTransferenceModalOpen(false);
          }}
        />
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-300 shadow-lg p-4 rounded-xl z-50 flex items-center gap-4">
          <span className="text-sm text-gray-700">{selectedIds.length} selecionado(s)</span>
          <Button
            variant="danger"
            style={{ padding: "8px", fontSize: "14px" }}
            onClick={async () => {
              try {
                await api.deleteSettledEntry(selectedIds);
                setSelectedIds([]);
                window.location.reload();
              } catch (err) {
                alert("Erro ao deletar liquidações.");
                console.error(err);
              }
            }}
          >
            Retornar selecionados
          </Button>
        </div>
      )}
    </div>
  );
};

export default Settled;
