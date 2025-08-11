
import { useEffect, useCallback, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Modal, TransferenceModal } from "@/components/Modal";
import CashFlowTable from "@/components/Table/CashFlowTable";
import FilterBar from "src/components/Filter/FilterBar";
import { Entry, EntryFilters } from "src/models/entries";
import { ModalType } from "@/components/Modal/Modal.types";
import Button from "src/components/Button";
import SettlementModal from "src/components/Modal/SettlementModal";
import Navbar from "src/components/Navbar";
import { api } from "src/api/requests";
import KpiRow from "src/components/KPI/KpiRow";

const CashFlow = () => {
  useEffect(() => { document.title = "Fluxo de Caixa"; }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [banksKey, setBanksKey] = useState(0);
  const [cashflowKey, setCashflowKey] = useState(0);
  const [kpiRefresh, setKpiRefresh] = useState(0);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([]);

  const [filters, setFilters] = useState<EntryFilters>({});

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };
  const handleEditEntry = (entry: Entry) => { setEditingEntry(entry); setModalType(entry.transaction_type as ModalType); setIsModalOpen(true); };
  const handleApplyFilters = (newFilters: EntryFilters) => setFilters(newFilters);

  const handleSelectionChange = useCallback((ids: number[], rows: Entry[]) => {
    setSelectedIds(ids);
    setSelectedEntries(rows);
  }, []);

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

          {/* KPI row: Banks card expands to the right; others fill left */}
          <KpiRow
            selectedBankIds={filters.bank_id}
            filters={filters}
            context="cashflow"
            refreshToken={kpiRefresh}
            banksRefreshKey={banksKey}
          />

          {/* CashFlow Table */}
          <CashFlowTable
            key={cashflowKey}
            filters={filters}
            onEdit={handleEditEntry}
            onSelectionChange={handleSelectionChange}
          />

          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 right-6 bg-white border border-gray-300 shadow-lg p-4 rounded-xl z-50 flex items-center gap-4">
              <span className="text-sm text-gray-700">{selectedIds.length} selecionado(s)</span>
              <Button variant="primary" style={{ padding: 8, fontSize: 14 }} onClick={() => setIsSettlementModalOpen(true)}>
                Liquidar selecionados
              </Button>
              <Button
                variant="danger"
                style={{ padding: "8px", fontSize: "14px" }}
                onClick={async () => {
                  try {
                    await api.deleteEntry(selectedIds);
                    setCashflowKey((prev) => prev + 1);
                    setSelectedIds([]);
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
              setKpiRefresh((k) => k + 1);
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

      {isSettlementModalOpen && (
        <SettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          selectedEntries={selectedEntries}
          onSave={() => {
            setIsSettlementModalOpen(false);
            setCashflowKey((k) => k + 1);
            setBanksKey((k) => k + 1);
            setKpiRefresh((k) => k + 1);
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
};

export default CashFlow;
