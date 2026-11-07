import FinancePageFrame from "../components/FinancePageFrame";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Sidebar } from "@/products/business/components/Sidebar";
import { SettledEntriesTable } from "./SettledEntriesTable";
import FinancialActivityPanel from "@/components/FinancialActivityPanel";

import { PermissionMiddleware } from "@/middlewares";

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

  const filterBarHotkeysEnabled = useMemo(() => true, []);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleApplyFilters = useCallback(
    ({ filters: newFilters }: { filters: EntryFilters }) => {
      setFilters(newFilters);
      bumpAll();
    },
    [bumpAll]
  );

  return (
    <div className="flex min-h-0">


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
        />
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div
          className={[
            "mt-[15px] pb-6 h-[calc(100dvh-80px)]",
            "min-h-0 overflow-hidden",
            "px-4 sm:px-10",
          ].join(" ")}
        >
          <FinancePageFrame settled={true}>
          <FinancialActivityPanel filters={filters} onApply={handleApplyFilters}
            contextSettlement={true} refreshToken={kpiRefresh}
            banksRefreshKey={banksKey} shortcutsEnabled={filterBarHotkeysEnabled}>
            <PermissionMiddleware codeName={["view_settled_entries"]} requireAll>
              <SettledEntriesTable
                key={tableKey}
                filters={filters}
                onChanged={()=>{bumpBanks();bumpKpis();}}
              />
            </PermissionMiddleware>
          </FinancialActivityPanel>
          </FinancePageFrame>


        </div>
      </div>
    </div>
  );
};

export default Settled;