/* --------------------------------------------------------------------------
 * File: src/pages/Settled/index.tsx
 * Update: Handles new SelectionActionsBar (desktop + mobile)
 * - Mobile: no left margin; centered content; extra bottom padding when selection is active
 * - Sidebar mobile bar should hide when SelectionActionsBarMobile is active
 * -------------------------------------------------------------------------- */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Sidebar } from "@/shared/layout/Sidebar";
import { EntriesModal, TransferenceModal } from "@/components/Modal";
import SettledEntriesTable, { type SettledEntriesTableHandle } from "@/components/Table/SettledEntriesTable";
import FilterBar from "@/components/FilterBar";
import KpiCards from "@/components/KpiCards";
import { SelectionActionsBar, type MinimalEntry } from "@/components/SelectionActionsBar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import { api } from "@/api/requests";
import { PermissionMiddleware } from "@/middlewares";

import type { SettledEntry } from "@/models/entries/settlements";
import type { EntryFilters } from "@/models/components/filterBar";
import { type ModalType } from "@/components/Modal/Modal.types";

const DEFAULT_FILTERS: EntryFilters = {
  bank_id: [],
  ledger_account_id: [],
  tx_type: undefined,
  start_date: undefined,
  end_date: undefined,
  description: "",
  observation: "",
  amount_min: "",
  amount_max: "",
} as unknown as EntryFilters;

const Settled = () => {
  const { t } = useTranslation(["settled"]);

  useEffect(() => {
    document.title = t("settled:documentTitle");
  }, [t]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType | null>(null);

  const [banksKey, setBanksKey] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [kpiRefresh, setKpiRefresh] = useState(0);

  const bumpTable = useCallback(() => setTableKey((k) => k + 1), []);
  const bumpBanks = useCallback(() => setBanksKey((k) => k + 1), []);
  const bumpKpis = useCallback(() => setKpiRefresh((k) => k + 1), []);
  const bumpAll = useCallback(() => {
    bumpTable();
    bumpBanks();
    bumpKpis();
  }, [bumpTable, bumpBanks, bumpKpis]);

  const [filters, setFilters] = useState<EntryFilters>(() => DEFAULT_FILTERS);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<SettledEntry[]>([]);
  const [isReturning, setIsReturning] = useState(false);

  const tableRef = useRef<SettledEntriesTableHandle>(null);

  const filterBarHotkeysEnabled = useMemo(
    () => !isModalOpen && !isTransferenceModalOpen,
    [isModalOpen, isTransferenceModalOpen],
  );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleOpenModal = (type: ModalType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleApplyFilters = useCallback(
    ({ filters: newFilters }: { filters: EntryFilters }) => {
      setFilters(newFilters);
      bumpAll();
    },
    [bumpAll],
  );

  const handleSelectionChange = useCallback((ids: string[], rows: SettledEntry[]) => {
    setSelectedIds(ids);
    setSelectedEntries(rows);
  }, []);

  const hasSelection = selectedIds.length > 0;

  // Map SettledEntry -> MinimalEntry for SelectionActionsBar stats display
  const selectedAsMinimal: MinimalEntry[] = useMemo(
    () =>
      selectedEntries.map((e) => ({
        amount: e.amount,
        transaction_type: e.tx_type?.toLowerCase().includes("credit") ? "credit" : "debit",
        due_date: e.value_date,
        settlement_due_date: e.value_date,
      })),
    [selectedEntries],
  );

  return (
    <div className="flex">
      <TopProgress active={isReturning} variant="top" topOffset={64} />

      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={handleOpenModal}
        handleOpenTransferenceModal={() => setIsTransferenceModalOpen(true)}
        // Critical: hide SidebarMobile floating bar when SelectionActionsBarMobile is active
        mode={hasSelection ? "settled" : "default"}
      />

      <div
        className={[
          "flex-1 min-h-0 flex flex-col transition-all duration-300",
          "ml-0",
          isSidebarOpen ? "sm:ml-60" : "sm:ml-16",
        ].join(" ")}
      >
        <div
          className={[
            "mt-[15px] pb-6 h-[calc(100vh-80px)]",
            "grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden",
            "px-4 sm:px-10",
          ].join(" ")}
        >
          <PermissionMiddleware codeName={["view_filters"]} requireAll>
            <FilterBar
              onApply={handleApplyFilters}
              bankActive={true}
              contextSettlement={true}
              shortcutsEnabled={filterBarHotkeysEnabled}
            />
          </PermissionMiddleware>

          <KpiCards
            selectedBankIds={filters.bank_id}
            filters={filters}
            context="settled"
            refreshToken={kpiRefresh}
            banksRefreshKey={banksKey}
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

          {hasSelection && (
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

                  bumpAll();

                  setSelectedIds([]);
                  setSelectedEntries([]);
                  tableRef.current?.clearSelection();
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
                bumpTable();
                bumpKpis();
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
                bumpBanks();
              }}
            />
          </PermissionMiddleware>
        )}
      </div>
    </div>
  );
};

export default Settled;
