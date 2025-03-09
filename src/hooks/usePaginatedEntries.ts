// hooks/usePaginatedEntries.ts
import { useState, useEffect, useCallback } from 'react';
import { parseApiList } from 'src/utils/parseApiList';
import { Entry } from '@/models/Entries/Entry';
import { useRequests } from '@/api/requests';

interface FilterParams {
  startDate?: string;
  endDate?: string;
  generalLedgerAccountId?: string[]; 
}

export function usePaginatedEntries(filters: FilterParams) {
  const PAGE_SIZE = 100;
  const { getEntries } = useRequests();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Responsável por buscar os entries do backend com base nos filtros e no offset.
   * `reset = true` indica que mudaram os filtros ou algo que exija resetar lista e offset.
   */
  const fetchEntries = useCallback(
    async (reset = false) => {
      // Se já chegamos no final e não é reset, não buscar de novo
      if (!hasMore && !reset) return;

      // Se for reset, recomeçamos do offset 0
      const newOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      try {
        // Monta parâmetros extras com base nos filtros
        // (Note que na sua API, é `start_date`, `end_date`, etc.)
        const extraParams = {
          start_date: filters.startDate,
          end_date: filters.endDate,
          // Caso sua API aceite array, pode ser general_ledger_account_id=1&general_ledger_account_id=7
          general_ledger_account_id: filters.generalLedgerAccountId
        };

        const response = await getEntries(PAGE_SIZE, newOffset, extraParams);
        const parsed = parseApiList<Entry>(response, 'entries');

        // Merge com o que já temos (ou recomeçar caso reset)
        setEntries((prev) => {
          const combined = reset ? parsed : [...prev, ...parsed];
          // Ordenar aqui se necessário
          return combined.sort((a, b) => {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          });
        });

        setHasMore(parsed.length === PAGE_SIZE);
        setOffset(newOffset + PAGE_SIZE);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao buscar dados.';
        console.error('Erro ao buscar lançamentos:', message);
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [hasMore, offset, filters, getEntries]
  );

  // Sempre que os filtros mudam, refazemos a busca do zero
  useEffect(() => {
    fetchEntries(true);
  }, [filters, fetchEntries]);

  return {
    entries,
    hasMore,
    loading,
    loadingMore,
    error,
    fetchEntries
  };
}
