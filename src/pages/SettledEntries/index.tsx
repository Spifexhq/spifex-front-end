import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Sidebar } from "@/shared/layout/Sidebar";
import { SettledEntriesTable, type SettledEntriesTableHandle } from "@/components/Table/SettledEntriesTable";
import FilterBar from "@/components/FilterBar";
import KpiCards from "@/components/KpiCards";
import { SelectionActionsBar, type MinimalEntry } from "@/components/SelectionActionsBar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import { api } from "@/api/requests";
import { PermissionMiddleware } from "@/middlewares";

import type { SettledEntry } from "@/models/entries/settlements";
import type { EntryFilters } from "@/models/components/filterBar";

const DEFAULT_FILTERS: EntryFilters = {
  bank_id: [],
  cashflow_category_id: [],
  tx_type: undefined,
  start_date: undefined,
  end_date: undefined,
  description: "",
  observation: "",
  amount_min: "",
  amount_max: "",
} as EntryFilters;

const Settled = () => {
  const { t } = useTranslation(["settled"]);

  useEffect(() => {
    document.title = t("settled:documentTitle");
  }, [t]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const filterBarHotkeysEnabled = useMemo(() => true, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleApplyFilters = useCallback(
    ({ filters: newFilters }: { filters: EntryFilters }) => {
      setFilters(newFilters);
      bumpAll();
    },
    [bumpAll]
  );

  const handleSelectionChange = useCallback((ids: string[], rows: SettledEntry[]) => {
    setSelectedIds(ids);
    setSelectedEntries(rows);
  }, []);

  const hasSelection = selectedIds.length > 0;

  const selectedAsMinimal: MinimalEntry[] = useMemo(
    () =>
      selectedEntries.map((entry) => ({
        amount: entry.amount,
        transaction_type: entry.tx_type?.toLowerCase().includes("credit") ? "credit" : "debit",
        due_date: entry.value_date,
        settlement_due_date: entry.value_date,
      })),
    [selectedEntries]
  );

  return (
    <div className="flex">
      <TopProgress active={isReturning} variant="top" topOffset={64} />

      <div className="shrink-0">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          mode="default"
          onEntriesSaved={() => {
            bumpTable();
            bumpKpis();
          }}
          onTransferenceSaved={() => {
            bumpBanks();
          }}
          onStatementImportSaved={() => {
            bumpTable();
            bumpKpis();
          }}
        />
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
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
              initial={filters}
            />
          </PermissionMiddleware>

          <KpiCards
            selectedBankIds={filters.bank_id}
            filters={filters}
            contextSettlement={true}
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
              contextSettlement={true}
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
      </div>
    </div>
  );
};

export default Settled;