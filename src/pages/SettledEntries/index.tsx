// src/pages/Settled/index.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Sidebar } from "@/components/layout/Sidebar";
import { EntriesModal, TransferenceModal } from "@/components/Modal";
import SettledEntriesTable, { type SettledEntriesTableHandle } from "@/components/Table/SettledEntriesTable";
import FilterBar from "@/components/FilterBar";
import KpiCards from "@/components/KpiCards";
import SelectionActionsBar, { type MinimalEntry } from "@/components/SelectionActionsBar";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import { api } from "@/api/requests";
import { PermissionMiddleware } from "@/middlewares";
import { useBanks } from "@/hooks/useBanks";

import type { SettledEntry } from "@/models/entries/settlements";
import type { EntryFilters } from "@/models/components/filterBar";
import { type ModalType } from "@/components/Modal/Modal.types";

const Settled = () => {
  const { t } = useTranslation(["settled"]);

  useEffect(() => {
    document.title = t("settled:documentTitle");
  }, [t]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);

  const [filters, setFilters] = useState<EntryFilters | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SettledEntry[]>([]);
  const [kpiRefresh, setKpiRefresh] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [banksKey, setBanksKey] = useState(0);
  const [isReturning, setIsReturning] = useState(false);

  const tableRef = useRef<SettledEntriesTableHandle>(null);

  const {
    banks,
    totalConsolidatedBalance,
    loading: banksLoading,
    error: banksError,
  } = useBanks(undefined, banksKey);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const handleOpenModal = (type: ModalType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleApplyFilters = useCallback(({ filters: newFilters }: { filters: EntryFilters }) => {
    setFilters(newFilters);
    setTableKey((k) => k + 1);
    setBanksKey((k) => k + 1);
    setKpiRefresh((k) => k + 1);
  }, []);

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
      <TopProgress active={banksLoading} variant="top" topOffset={64} />
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => setIsTransferenceModalOpen(true)}
        mode="default"
      />

      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        <div className="mt-[15px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          <PermissionMiddleware codeName={["view_filters"]} requireAll>
            <FilterBar
              onApply={handleApplyFilters}
              contextSettlement={true} />
          </PermissionMiddleware>

          {filters && (
            <>
              <KpiCards
                context="settled"
                filters={filters}
                selectedBankIds={filters.bank_id}
                refreshToken={kpiRefresh}
                banksRefreshKey={banksKey}
                banksData={{
                  banks,
                  totalConsolidatedBalance,
                  loading: banksLoading,
                  error: banksError,
                }}
              />

              <div className="min-h-0 h-full">
                <PermissionMiddleware codeName={["view_settled_entries"]} requireAll>
                  <SettledEntriesTable
                    ref={tableRef}
                    key={tableKey}
                    filters={filters}
                    onSelectionChange={handleSelectionChange}
                  />
                </PermissionMiddleware>
              </div>
            </>
          )}

          {selectedIds.length > 0 && (
            <SelectionActionsBar
              context="settled"
              selectedIds={selectedIds}
              selectedEntries={selectedAsMinimal}
              isProcessing={isReturning}
              onCancel={() => tableRef.current?.clearSelection()}
              onReturn={async () => {
                if (!selectedIds.length) return;

                setIsReturning(true);
                try {
                  if (selectedIds.length > 1) {
                    await api.deleteSettledEntriesBulk(selectedIds as string[]);
                  } else {
                    await api.deleteSettledEntry(selectedIds[0] as string);
                  }

                  tableRef.current?.clearSelection();
                  setSelectedIds([]);
                  setSelectedEntries([]);

                  setBanksKey((k) => k + 1);
                  setTableKey((k) => k + 1);
                  setKpiRefresh((k) => k + 1);
                } catch (err) {
                  console.error(err);
                  alert(t("settled:errors.returnSettlements"));
                } finally {
                  setIsReturning(false);
                }
              }}
            />
          )}
        </div>

        {modalType && (
          <PermissionMiddleware
            codeName={["add_cash_flow_entries", "view_credit_modal_button", "view_debit_modal_button"]}
            requireAll
          >
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
          </PermissionMiddleware>
        )}

        {isTransferenceModalOpen && (
          <PermissionMiddleware codeName={["add_transference", "view_transference_modal_button"]} requireAll>
            <TransferenceModal
              isOpen={isTransferenceModalOpen}
              onClose={() => setIsTransferenceModalOpen(false)}
              onSave={() => {
                setIsTransferenceModalOpen(false);
                setBanksKey((k) => k + 1);
              }}
            />
          </PermissionMiddleware>
        )}
      </div>
    </div>
  );
};

export default Settled;
