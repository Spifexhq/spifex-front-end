// hooks/useCashFlowFilters.ts
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filtros que podem ser passados pela URL, ex:
 * ?startDate=2024-10-01&endDate=2025-03-20&generalLedgerAccountId=1&generalLedgerAccountId=7
 */
interface CashFlowFilters {
  startDate?: string;
  endDate?: string;
  generalLedgerAccountId?: string[]; 
}

/**
 * Retorna:
 * - `filters`: objeto com os filtros atuais extraídos da URL
 * - `setFilter`: função para atualizar um filtro específico
 * - `setMultipleFilters`: função para atualizar vários filtros ao mesmo tempo
 */
export function useCashFlowFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lê os filtros "atuais" diretamente dos searchParams
  const filters: CashFlowFilters = useMemo(() => {
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    // "getAll" pois pode haver várias occurrences, ex. ?generalLedgerAccountId=1&generalLedgerAccountId=7
    const generalLedgerAccountId = searchParams.getAll('generalLedgerAccountId');
    
    // Se não tiver nada, preferimos devolver undefined
    return {
      startDate,
      endDate,
      generalLedgerAccountId: generalLedgerAccountId.length ? generalLedgerAccountId : undefined
    };
  }, [searchParams]);

  /**
   * Atualiza um campo específico do filtro e reflete na URL.
   * - Se o value for `undefined`, removemos esse parâmetro da URL.
   * - Se for array, adicionamos múltiplas ocorrências do parâmetro (generalLedgerAccountId=1&generalLedgerAccountId=7, etc).
   */
  const setFilter = useCallback(
    (key: keyof CashFlowFilters, value: string | string[] | undefined) => {
      const newParams = new URLSearchParams(searchParams);

      // Remove todas as ocorrências existentes daquele parâmetro
      newParams.delete(key as string);

      if (Array.isArray(value)) {
        // Para cada item do array, adicionamos novamente
        value.forEach((v) => {
          newParams.append(key as string, v);
        });
      } else if (value) {
        newParams.set(key as string, value);
      }

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  /**
   * Atualiza múltiplos campos ao mesmo tempo (importante quando queremos "aplicar filtro")
   */
  const setMultipleFilters = useCallback(
    (newFilters: Partial<CashFlowFilters>) => {
      const newParams = new URLSearchParams(searchParams);

      // Para cada chave, removemos e adicionamos novamente
      Object.entries(newFilters).forEach(([key, value]) => {
        newParams.delete(key);
        if (Array.isArray(value)) {
          value.forEach((v) => {
            newParams.append(key, v);
          });
        } else if (value) {
          newParams.set(key, value as string);
        }
      });

      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return {
    filters,
    setFilter,
    setMultipleFilters
  };
}
