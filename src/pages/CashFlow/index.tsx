import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Sidebar } from '@/shared/layout/Sidebar';
import type { SidebarEntryModalState } from '@/shared/layout/Sidebar/Sidebar';
import { SettlementModal } from '@/components/Modal';
import { CashFlowTable, type CashFlowTableHandle } from '@/components/Table/CashFlowTable';
import FilterBar from '@/components/FilterBar';
import KpiCards from '@/components/KpiCards';
import { SelectionActionsBar } from '@/components/SelectionActionsBar';
import TopProgress from '@/shared/ui/Loaders/TopProgress';

import AccountingReasonDrawer from '@/components/CashFlowAccounting/AccountingReasonDrawer';

import { api } from '@/api/requests';
import { PermissionMiddleware } from '@/middlewares';
import { fetchAllCursor } from '@/lib/list';

import type { Entry } from '@/models/entries/entries';
import type { AccountingReadiness } from '@/models/entries/accountingReadiness';
import type { EntryFilters } from '@/models/components/filterBar';
import { type ModalType } from '@/components/Modal/Modal.types';
import type { BankAccount } from '@/models/settings/banking';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && typeof err.message === 'string') return err.message;
  if (isRecord(err)) {
    const msg = err['message'];
    if (typeof msg === 'string') return msg;
    const detail = err['detail'];
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

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

const CashFlow = () => {
  const { t } = useTranslation(['cashFlow']);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t('cashFlow:documentTitle');
  }, [t]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
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
  const [editingModalType, setEditingModalType] = useState<ModalType | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [readinessByEntryId, setReadinessByEntryId] = useState<Record<string, AccountingReadiness>>({});
  const [reasonEntryId, setReasonEntryId] = useState<string | null>(null);

  const tableRef = useRef<CashFlowTableHandle>(null);
  const [filters, setFilters] = useState<EntryFilters>(() => DEFAULT_FILTERS);

  const filterBarHotkeysEnabled = useMemo(
    () => !isEditingModalOpen && !isSettlementModalOpen,
    [isEditingModalOpen, isSettlementModalOpen]
  );

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
          api.getBanks({ cursor: p?.cursor, active: 'true' })
        );
        if (!alive) return;
        setBanks(all);
      } catch (err) {
        if (!alive) return;
        setBanks([]);
        setBanksError(getErrorMessage(err, t('cashFlow:errors.loadBanksUnexpected')));
      } finally {
        if (alive) setBanksLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [banksKey, t]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleEditEntry = useCallback(
    async (entry: Entry) => {
      setEditingModalType(entry.tx_type as ModalType);
      setEditingEntry(null);
      setIsEditingModalOpen(true);
      setIsEditingEntryLoading(true);

      try {
        const res = await api.getEntry(entry.id);
        setEditingEntry(res.data as Entry);
        setEditingModalType((res.data as Entry).tx_type as ModalType);
      } catch (err) {
        alert(getErrorMessage(err, t('cashFlow:errors.loadEntryDetailsUnexpected')));
        setIsEditingModalOpen(false);
        setEditingEntry(null);
        setEditingModalType(null);
      } finally {
        setIsEditingEntryLoading(false);
      }
    },
    [t]
  );

  const handleCloseEditingModal = useCallback(() => {
    setIsEditingModalOpen(false);
    setEditingEntry(null);
    setEditingModalType(null);
    setIsEditingEntryLoading(false);
  }, []);

  const editingEntryModalState: SidebarEntryModalState = {
    isOpen: isEditingModalOpen,
    type: editingModalType,
    initialEntry: editingEntry,
    isLoadingEntry: isEditingEntryLoading,
  };

  const handleApplyFilters = useCallback(
    ({ filters: newFilters }: { filters: EntryFilters }) => {
      setFilters(newFilters);
      bumpAll();
    },
    [bumpAll]
  );

  const handleSelectionChange = useCallback((ids: string[], rows: Entry[]) => {
    setSelectedIds(ids);
    setSelectedEntries(rows);
  }, []);

  const handleReasonRequest = useCallback(
    async (entry: Entry) => {
      setReasonEntryId(entry.id);
      if (readinessByEntryId[entry.id]) return;

      try {
        const res = await api.getEntryAccountingReadiness(entry.id);
        setReadinessByEntryId((prev) => ({
          ...prev,
          [entry.id]: res.data.accounting,
        }));
      } catch {
        setReadinessByEntryId((prev) => ({
          ...prev,
          [entry.id]: {
            status: 'uncategorised',
            label: 'Unknown',
            message: 'Accounting readiness could not be loaded for this entry.',
          },
        }));
      }
    },
    [readinessByEntryId]
  );

  const hasSelection = selectedIds.length > 0;
  const selectedAccounting = reasonEntryId ? readinessByEntryId[reasonEntryId] : null;

  return (
    <div className="flex">
      <TopProgress active={banksLoading} variant="top" topOffset={64} />

      <div className="shrink-0">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          mode="default"
          onEntriesSaved={() => {
            handleCloseEditingModal();
            bumpCashflow();
            bumpKpis();
          }}
          onTransferenceSaved={() => bumpBanks()}
          onStatementImportSaved={() => {
            bumpCashflow();
            bumpKpis();
          }}
          entryModalState={editingEntryModalState}
          onEntryModalClose={handleCloseEditingModal}
        />
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="mt-[15px] pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden px-4 sm:px-10">
          <PermissionMiddleware codeName={['view_filters']} requireAll>
            <FilterBar
              onApply={handleApplyFilters}
              bankActive
              contextSettlement={false}
              shortcutsEnabled={filterBarHotkeysEnabled}
            />
          </PermissionMiddleware>

          <KpiCards
            selectedBankIds={filters.bank_id}
            filters={filters}
            contextSettlement={false}
            refreshToken={kpiRefresh}
            banksRefreshKey={banksKey}
          />

          <div className="min-h-0 h-full">
            <PermissionMiddleware codeName={['view_cash_flow_entries']} requireAll>
              <CashFlowTable
                ref={tableRef}
                key={cashflowKey}
                filters={filters}
                onEdit={handleEditEntry}
                onSelectionChange={handleSelectionChange}
                onOpenAccountingReason={handleReasonRequest}
                accountingStateById={readinessByEntryId}
              />
            </PermissionMiddleware>
          </div>

          {hasSelection ? (
            <SelectionActionsBar
              contextSettlement={false}
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
                } catch {
                  alert(t('cashFlow:errors.deleteEntries'));
                } finally {
                  setIsDeleting(false);
                }
              }}
              accountingReviewCount={selectedIds.length}
              onAccountingReview={() => navigate('/settings/accounting/reconciliation')}
            />
          ) : null}
        </div>
      </div>

      {isSettlementModalOpen ? (
        <PermissionMiddleware codeName={'add_settled_entries'}>
          <SettlementModal
            isOpen={isSettlementModalOpen}
            onClose={() => setIsSettlementModalOpen(false)}
            selectedEntries={selectedEntries}
            onSave={() => {
              setIsSettlementModalOpen(false);
              bumpAll();
              setSelectedIds([]);
              setSelectedEntries([]);
              tableRef.current?.clearSelection();
            }}
            banksData={{ banks, loading: banksLoading, error: banksError }}
          />
        </PermissionMiddleware>
      ) : null}

      <AccountingReasonDrawer
        open={!!reasonEntryId}
        accounting={selectedAccounting}
        onClose={() => setReasonEntryId(null)}
        onOpenAccountingSettings={() => navigate('/settings/accounting/reconciliation')}
      />
    </div>
  );
};

export default CashFlow;