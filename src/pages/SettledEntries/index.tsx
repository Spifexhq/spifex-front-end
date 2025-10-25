// src/pages/Settled/index.tsx
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
import SelectionActionsBar, { MinimalEntry } from "src/components/SelectionActionsBar";
import { useBanks } from "@/hooks/useBanks";

const Settled = () => {
  useEffect(() => { document.title = "Realizado"; }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);

  // 👇 gate until FilterBar decides (default view or empty)
  const [filters, setFilters] = useState<EntryFilters | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SettledEntry[]>([]);
  const [kpiRefresh, setKpiRefresh] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [banksKey, setBanksKey] = useState(0);

  const tableRef = useRef<SettledEntriesTableHandle>(null);

  const {
    banks,
    totalConsolidatedBalance,
    loading: banksLoading,
    error: banksError,
  } = useBanks(undefined, banksKey);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };

  const handleApplyFilters = useCallback(
    ({ filters: newFilters }: { filters: EntryFilters }) => {
      setFilters(newFilters);          // first time this becomes non-null → first and only initial fetch
      setTableKey((k) => k + 1);
      setBanksKey((k) => k + 1);
      setKpiRefresh((k) => k + 1);
    },
    []
  );

  const selectedAsMinimal: MinimalEntry[] = selectedEntries.map((e) => ({
    amount: e.amount,
    transaction_type: e.tx_type.toLowerCase().includes("credit") ? "credit" : "debit",
    due_date: e.value_date,
    settlement_due_date: e.value_date,
  }));

  const handleSelectionChange = useCallback((ids: string[], rows: SettledEntry[]) => {
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

      <div className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        <div className="mt-[80px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          {/* FilterBar decides defaults and calls onApply once */}
          <FilterBar onApply={handleApplyFilters} contextSettlement={true} />

          {/* Render KPI/Table only when filters are ready */}
          {filters && (
            <>
              <KpiRow
                context="settled"
                filters={filters}
                selectedBankIds={filters.bank_id}
                refreshToken={kpiRefresh}
                banksRefreshKey={banksKey}
                banksData={{ banks, totalConsolidatedBalance, loading: banksLoading, error: banksError }}
              />

              <div className="min-h-0 h-full">
                <SettledEntriesTable
                  ref={tableRef}
                  key={tableKey}
                  filters={filters}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </>
          )}

          {selectedIds.length > 0 && (
            <SelectionActionsBar
              context="settled"
              selectedIds={selectedIds}
              selectedEntries={selectedAsMinimal}
              onCancel={() => tableRef.current?.clearSelection()}
              onReturn={async () => {
                try {
                  await api.bulkDeleteSettledEntries(selectedIds);
                  tableRef.current?.clearSelection();
                  setBanksKey((k) => k + 1);
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
              setBanksKey((k) => k + 1);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Settled;
