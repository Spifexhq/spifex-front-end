import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Sidebar } from '@/shared/layout/Sidebar';
import type { SidebarEntryModalState } from '@/shared/layout/Sidebar/Sidebar';
import { SettlementModal } from '@/components/Modal';
import { CashFlowTable, type CashFlowTableHandle } from './CashFlowTable';
import FinancialActivityPanel from '@/components/FinancialActivityPanel';
import TopProgress from '@/shared/ui/Loaders/TopProgress';


import { api } from '@/api/requests';
import { PermissionMiddleware } from '@/middlewares';
import { fetchAllCursor } from '@/lib/list';

import type { Entry } from '@/models/entries/entries';
import type { EntryFilters } from '@/models/components/filterBar';
import { type ModalType } from '@/pages/Finance/components/EntryForm/types';
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

  const [selectedEntries, setSelectedEntries] = useState<Entry[]>([]);

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

  return (
    <div className="flex min-h-0">
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
        <div className="mt-[15px] pb-6 h-[calc(100dvh-80px)] min-h-0 overflow-hidden px-4 sm:px-10">
          <FinancialActivityPanel filters={filters} onApply={handleApplyFilters}
            contextSettlement={false} refreshToken={kpiRefresh}
            banksRefreshKey={banksKey} shortcutsEnabled={filterBarHotkeysEnabled}>
            <PermissionMiddleware codeName={['view_cash_flow_entries']} requireAll>
              <CashFlowTable
                ref={tableRef}
                key={cashflowKey}
                filters={filters}
                onEdit={handleEditEntry}
                onSettle={entries=>{setSelectedEntries(entries);setIsSettlementModalOpen(true);}}
                onChanged={bumpKpis}
              />
            </PermissionMiddleware>
          </FinancialActivityPanel>


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
              setSelectedEntries([]);
              tableRef.current?.clearSelection();
            }}
            banksData={{ banks, loading: banksLoading, error: banksError }}
          />
        </PermissionMiddleware>
      ) : null}


    </div>
  );
};

export default CashFlow;