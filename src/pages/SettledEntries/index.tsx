import { useEffect, useState, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { EntriesModal, TransferenceModal } from "@/components/Modal";
import SettledEntriesTable, { SettledEntriesTableHandle } from "@/components/Table/SettledEntriesTable";
import { EntryFilters, SettledEntry } from "src/models/entries/domain";
import { ModalType } from "@/components/Modal/Modal.types";
import Navbar from "src/components/Navbar";
import { api } from "src/api/requests";
import FilterBar from "src/components/Filter/FilterBar";
import KpiRow from "src/components/KPI/KpiRow";
import SelectionActionsBar from "src/components/SelectionActionsBar";
import { useBanks } from "@/hooks/useBanks";

const Settled = () => {
  useEffect(() => { document.title = "Realizado"; }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);

  const [filters, setFilters] = useState<EntryFilters>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SettledEntry[]>([]);
  const [kpiRefresh, setKpiRefresh] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [banksKey, setBanksKey] = useState(0); // to re-render banks panel after transfers if needed

  const tableRef = useRef<SettledEntriesTableHandle>(null);

  // Fetch ALL banks here and pass down; KpiRow will filter locally by selectedBankIds
  const {
    banks,
    totalConsolidatedBalance,
    loading: banksLoading,
    error: banksError,
  } = useBanks();

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };
  const handleApplyFilters = (newFilters: EntryFilters) => setFilters(newFilters);

  const handleSelectionChange = useCallback((ids: number[], rows: SettledEntry[]) => {
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
      <div className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        {/* Push main content below the fixed Navbar */}
        <div className="mt-[80px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          <FilterBar onApply={handleApplyFilters} />

          <KpiRow
            context="settled"
            filters={filters}
            // banks panel filters locally by these ids
            selectedBankIds={filters.bank_id}
            refreshToken={kpiRefresh}
            banksRefreshKey={banksKey}
            // inject banks data (unfiltered)
            banksData={{
              banks,
              totalConsolidatedBalance,
              loading: banksLoading,
              error: banksError,
            }}
          />

          {/* Table area with inner scroll inside the table component */}
          <div className="min-h-0 h-full">
            <SettledEntriesTable
              ref={tableRef}
              key={tableKey}
              filters={filters}
              bankIds={filters.bank_id}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          {selectedIds.length > 0 && (
            <SelectionActionsBar
              context="settled"
              selectedIds={selectedIds}
              selectedEntries={selectedEntries}
              onCancel={() => tableRef.current?.clearSelection()}
              onReturn={async () => {
                try {
                  await api.deleteSettledEntry(selectedIds); // “Retornar selecionados”
                  tableRef.current?.clearSelection();
                  setTableKey((k) => k + 1);
                  setKpiRefresh((k) => k + 1);
                } catch (err) {
                  console.error(err);
                  alert("Erro ao retornar liquidações.");
                }
              }}
            />
          )}
        </div>

        {modalType && (
          <EntriesModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            type={modalType}
            onSave={() => {
              setIsModalOpen(false);
              setKpiRefresh((k) => k + 1);
              setTableKey((k) => k + 1);
            }}
          />
        )}

        {isTransferenceModalOpen && (
          <TransferenceModal
            isOpen={isTransferenceModalOpen}
            onClose={() => setIsTransferenceModalOpen(false)}
            onSave={() => {
              setIsTransferenceModalOpen(false);
              setBanksKey((k) => k + 1); // nudge banks panel to re-render if you key anything by this
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Settled;
