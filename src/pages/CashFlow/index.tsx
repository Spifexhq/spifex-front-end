import { useEffect, useCallback, useState, useRef } from "react";
import { Sidebar } from "src/components/layout/Sidebar";
import { EntriesModal, TransferenceModal, SettlementModal } from "@/components/Modal";
import CashFlowTable, { CashFlowTableHandle } from "src/components/Table/CashFlowTable";
import FilterBar from "src/components/FilterBar";
import { Entry, EntryFilters } from "src/models/entries";
import { ModalType } from "@/components/Modal/Modal.types";
import { api } from "src/api/requests";
import KpiCards from "src/components/KpiCards";
import SelectionActionsBar from "src/components/SelectionActionsBar";
import { useBanks } from "@/hooks/useBanks";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import { ApiError } from "@/models/Api";

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
  const [isEditingEntryLoading, setIsEditingEntryLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([]);
  const tableRef = useRef<CashFlowTableHandle>(null);

  const [filters, setFilters] = useState<EntryFilters | null>(null);

  const {
    banks,
    totalConsolidatedBalance,
    loading: banksLoading,
    error: banksError,
  } = useBanks(undefined, banksKey, true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => { setModalType(type); setIsModalOpen(true); };
  const handleEditEntry = useCallback(async (entry: Entry) => {
    setModalType(entry.tx_type as ModalType);
    setEditingEntry(null);
    setIsModalOpen(true);
    setIsEditingEntryLoading(true);

    try {
      const res = await api.getEntry(entry.id);

      if ("data" in res) {
        const fullEntry = res.data as Entry;
        setEditingEntry(fullEntry);
        setModalType(fullEntry.tx_type as ModalType);
      } else {
        const apiError = res as ApiError;
        console.error("Error fetching entry:", apiError.error);
        alert(apiError.error?.message ?? "Erro ao carregar detalhes do lançamento.");
        setIsModalOpen(false);
        setEditingEntry(null);
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes do lançamento:", err);
      alert("Erro inesperado ao carregar detalhes do lançamento.");
      setIsModalOpen(false);
      setEditingEntry(null);
    } finally {
      setIsEditingEntryLoading(false);
    }
  }, []);

  const handleApplyFilters = useCallback(
    ({ filters: newFilters }: { filters: EntryFilters; }) => {
      setFilters(newFilters);
      setCashflowKey((k) => k + 1);
      setBanksKey((k) => k + 1);
      setKpiRefresh((k) => k + 1);
    },
    []
  );

  const handleSelectionChange = useCallback((ids: string[], rows: Entry[]) => {
    setSelectedIds(ids);
    setSelectedEntries(rows);
  }, []);

  return (
    <div className="flex">
      <TopProgress active={banksLoading} variant="top" topOffset={64} />
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => setIsTransferenceModalOpen(true)}
        mode="default"
      />

      <div className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        <div className="mt-[15px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">

          <FilterBar onApply={handleApplyFilters} bankActive={true} contextSettlement={false} />

          {filters && (
            <>
              <KpiCards
                selectedBankIds={filters.bank_id}
                filters={filters}
                context="cashflow"
                refreshToken={kpiRefresh}
                banksRefreshKey={banksKey}
                banksData={{ banks, totalConsolidatedBalance, loading: banksLoading, error: banksError }}
              />

              <div className="min-h-0 h-full">
                <CashFlowTable
                  ref={tableRef}
                  key={cashflowKey}
                  filters={filters}
                  onEdit={handleEditEntry}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </>
          )}

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
            isLoadingEntry={isEditingEntryLoading}
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
