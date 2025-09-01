import { useEffect, useCallback, useState, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { EntriesModal, TransferenceModal, SettlementModal } from "@/components/Modal";
import CashFlowTable, { CashFlowTableHandle } from "src/components/Table/CashFlowTable";
import FilterBar from "src/components/Filter/FilterBar";
import { Entry, EntryFilters } from "src/models/entries";
import { ModalType } from "@/components/Modal/Modal.types";
import Navbar from "src/components/Navbar";
import { api } from "src/api/requests";
import KpiRow from "src/components/KPI/KpiRow";
import SelectionActionsBar from "src/components/SelectionActionsBar";
import { useBanks } from "@/hooks/useBanks";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([]);
  const tableRef = useRef<CashFlowTableHandle>(null);

  const [filters, setFilters] = useState<EntryFilters>({});

  const {
    banks,
    totalConsolidatedBalance,
    loading: banksLoading,
    error: banksError,
  } = useBanks(undefined, banksKey);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };
  const handleEditEntry = (entry: Entry) => { setEditingEntry(entry); setModalType(entry.tx_type as ModalType); setIsModalOpen(true); };
  const handleApplyFilters = (newFilters: EntryFilters) => setFilters(newFilters);

  const handleSelectionChange = useCallback((ids: string[], rows: Entry[]) => {
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
      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        {/* Push main content below the fixed Navbar */}
        <div
          className="mt-[80px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          <FilterBar onApply={handleApplyFilters} />

          <KpiRow
            selectedBankIds={filters.bank_id}
            filters={filters}
            context="cashflow"
            refreshToken={kpiRefresh}
            banksRefreshKey={banksKey}
            banksData={{
              banks,
              totalConsolidatedBalance,
              loading: banksLoading,
              error: banksError,
            }}
          />

          {/* Table row fills the rest — enables inner scrolling */}
          <div className="min-h-0 h-full">
            <CashFlowTable
              ref={tableRef}
              key={cashflowKey}
              filters={filters}
              onEdit={handleEditEntry}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          {selectedIds.length > 0 && (
            <SelectionActionsBar
              context="cashflow"
              selectedIds={selectedIds}
              selectedEntries={selectedEntries}
              onCancel={() => {
                tableRef.current?.clearSelection();
              }}
              onLiquidate={() => setIsSettlementModalOpen(true)}
              onDelete={async () => {
                try {
                  // api.deleteEntry espera string (um id), não array
                  await Promise.all(selectedIds.map((id) => api.deleteEntry(id)));
                  setCashflowKey((prev) => prev + 1);
                  setKpiRefresh((k) => k + 1);
                  setSelectedIds([]);
                  setSelectedEntries([]);
                } catch (err) {
                  console.error(err);
                  alert("Erro ao deletar lançamentos.");
                }
              }}
            />
          )}
        </div>

        {modalType && (
          <EntriesModal
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
              setBanksKey((k) => k + 1);
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
          // 🔸 pass banks data to modal too
          banksData={{
            banks,
            loading: banksLoading,
            error: banksError,
          }}
        />
      )}
    </div>
  );
};

export default CashFlow;
