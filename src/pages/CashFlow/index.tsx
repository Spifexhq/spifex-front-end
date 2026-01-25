/* --------------------------------------------------------------------------
 * File: src/pages/CashFlow/index.tsx
 * -------------------------------------------------------------------------- */

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Sidebar } from "@/shared/layout/Sidebar";
import { EntriesModal, TransferenceModal, SettlementModal } from "@/components/Modal";
import { CashFlowTable, type CashFlowTableHandle } from "@/components/Table/CashFlowTable";
import FilterBar from "@/components/FilterBar";
import KpiCards from "@/components/KpiCards";
import { SelectionActionsBar } from "@/components/SelectionActionsBar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import { api } from "@/api/requests";
import { PermissionMiddleware } from "@/middlewares";
import { fetchAllCursor } from "@/lib/list";

import { Entry } from "@/models/entries/entries";
import type { EntryFilters } from "@/models/components/filterBar";
import { type ModalType } from "@/components/Modal/Modal.types";
import type { BankAccount } from "@/models/settings/banking";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && typeof err.message === "string") return err.message;
  if (isRecord(err)) {
    const msg = err["message"];
    if (typeof msg === "string") return msg;
    const detail = err["detail"];
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

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

const CashFlow = () => {
  const { t } = useTranslation(["cashFlow"]);

  useEffect(() => {
    document.title = t("cashFlow:documentTitle");
  }, [t]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferenceModalOpen, setIsTransferenceModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  const [modalType, setModalType] = useState<ModalType | null>(null);

  const [banksKey, setBanksKey] = useState(0);
  const [cashflowKey, setCashflowKey] = useState(0);
  const [kpiRefresh, setKpiRefresh] = useState(0);

  const bumpCashflow = useCallback(() => setCashflowKey((k) => k + 1), []);
  const bumpBanks = useCallback(() => setBanksKey((k) => k + 1), []);
  const bumpKpis = useCallback(() => setKpiRefresh((k) => k + 1), []);
  const bumpAll = useCallback(() => {
    bumpCashflow();
    bumpBanks();
    bumpKpis();
  }, [bumpCashflow, bumpBanks, bumpKpis]);

  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isEditingEntryLoading, setIsEditingEntryLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const tableRef = useRef<CashFlowTableHandle>(null);

  const [filters, setFilters] = useState<EntryFilters>(() => DEFAULT_FILTERS);

  const filterBarHotkeysEnabled = useMemo(
    () => !isModalOpen && !isTransferenceModalOpen && !isSettlementModalOpen,
    [isModalOpen, isTransferenceModalOpen, isSettlementModalOpen],
  );

  /* ---------------------------------------------------------------------- */
  /* Full banks list for SettlementModal (uses getBanks, not getBanksTable)  */
  /* ---------------------------------------------------------------------- */
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setBanksLoading(true);
      setBanksError(null);

      try {
        const all = await fetchAllCursor<BankAccount>((p?: { cursor?: string }) =>
          api.getBanks({ cursor: p?.cursor, active: "true" })
        );
        if (!alive) return;
        setBanks(all);
      } catch (err) {
        if (!alive) return;
        setBanks([]);
        setBanksError(getErrorMessage(err, t("cashFlow:errors.loadBanksUnexpected")));
      } finally {
        if (alive) setBanksLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [banksKey, t]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleOpenModal = (type: ModalType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleEditEntry = useCallback(
    async (entry: Entry) => {
      setModalType(entry.tx_type as ModalType);
      setEditingEntry(null);
      setIsModalOpen(true);
      setIsEditingEntryLoading(true);

      try {
        const res = await api.getEntry(entry.id);
        const fullEntry = res.data as Entry;

        setEditingEntry(fullEntry);
        setModalType(fullEntry.tx_type as ModalType);
      } catch (err) {
        console.error("Error fetching entry:", err);
        alert(getErrorMessage(err, t("cashFlow:errors.loadEntryDetailsUnexpected")));
        setIsModalOpen(false);
        setEditingEntry(null);
      } finally {
        setIsEditingEntryLoading(false);
      }
    },
    [t],
  );

  const handleApplyFilters = useCallback(({ filters: newFilters }: { filters: EntryFilters }) => {
    setFilters(newFilters);
    bumpAll();
  }, [bumpAll]);

  const handleSelectionChange = useCallback((ids: string[], rows: Entry[]) => {
    setSelectedIds(ids);
    setSelectedEntries(rows);
  }, []);

  const hasSelection = selectedIds.length > 0;

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
              contextSettlement={false}
              shortcutsEnabled={filterBarHotkeysEnabled}
            />
          </PermissionMiddleware>

          <KpiCards
            selectedBankIds={filters.bank_id}
            filters={filters}
            context="cashflow"
            refreshToken={kpiRefresh}
            banksRefreshKey={banksKey}
          />

          <div className="min-h-0 h-full">
            <PermissionMiddleware codeName={["view_cash_flow_entries"]} requireAll>
              <CashFlowTable
                ref={tableRef}
                key={cashflowKey}
                filters={filters}
                onEdit={handleEditEntry}
                onSelectionChange={handleSelectionChange}
              />
            </PermissionMiddleware>
          </div>

          {hasSelection && (
            <SelectionActionsBar
              context="cashflow"
              selectedIds={selectedIds}
              selectedEntries={selectedEntries}
              isProcessing={isDeleting}
              onCancel={() => tableRef.current?.clearSelection()}
              onLiquidate={() => setIsSettlementModalOpen(true)}
              onDelete={async () => {
                if (!selectedIds.length) return;

                setIsDeleting(true);
                try {
                  if (selectedIds.length > 1) await api.deleteEntriesBulk(selectedIds as string[]);
                  else await api.deleteEntry(selectedIds[0] as string);

                  bumpCashflow();
                  bumpKpis();

                  setSelectedIds([]);
                  setSelectedEntries([]);
                  tableRef.current?.clearSelection();
                } catch (err) {
                  console.error(err);
                  alert(t("cashFlow:errors.deleteEntries"));
                } finally {
                  setIsDeleting(false);
                }
              }}
            />
          )}
        </div>

        {modalType && (
          <PermissionMiddleware codeName={["add_cash_flow_entries", "add_cash_flow_entries", "add_cash_flow_entries"]} requireAll>
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
                bumpCashflow();
                bumpKpis();
              }}
            />
          </PermissionMiddleware>
        )}

        {isTransferenceModalOpen && (
          <PermissionMiddleware codeName={["add_transference", "add_transference"]} requireAll>
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

      {isSettlementModalOpen && (
        <SettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          selectedEntries={selectedEntries}
          onSave={() => {
            setIsSettlementModalOpen(false);
            bumpAll();
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
