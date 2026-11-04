import type { ReactNode } from "react";
import FilterBar from "@/components/FilterBar";
import KpiCards from "@/components/KpiCards";
import { PermissionMiddleware } from "@/middlewares";
import type { EntryFilters } from "@/models/components/filterBar";

/** Shared Cash flow / Settled surface: overview, filters, and the working list. */
export default function FinancialActivityPanel({ children, filters, onApply, contextSettlement, refreshToken, banksRefreshKey, shortcutsEnabled = true }: {
  children: ReactNode;
  filters: EntryFilters;
  onApply(payload: { filters: EntryFilters }): void;
  contextSettlement: boolean;
  refreshToken?: number;
  banksRefreshKey?: number;
  shortcutsEnabled?: boolean;
}) {
  return <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
    <div className="max-h-[55%] shrink-0 overflow-y-auto overscroll-contain">
      <KpiCards filters={filters} selectedBankIds={filters.bank_id} contextSettlement={contextSettlement}
        refreshToken={refreshToken} banksRefreshKey={banksRefreshKey} />
    </div>
    <div className="shrink-0">
      <PermissionMiddleware codeName="view_filters">
        <FilterBar onApply={onApply} initial={filters} bankActive contextSettlement={contextSettlement} shortcutsEnabled={shortcutsEnabled} />
      </PermissionMiddleware>
    </div>
    <div className="min-h-0 flex-1 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&>section]:rounded-none [&>section]:border-0 [&>section]:shadow-none">
      {children}
    </div>
  </div>;
}
