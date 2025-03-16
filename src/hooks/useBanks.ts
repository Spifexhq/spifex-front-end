// useBanks.ts

import { useEffect, useState } from 'react';
import { useRequests } from '@/api/requests';
import type { Bank } from '@/models/Bank';

/**
 * @param ids (optional) Pass an array of bank IDs to fetch only those banks.
 *            If omitted or empty, fetches ALL banks.
 */
export const useBanks = (ids?: number[]) => {
  const { getBanks, getBank } = useRequests();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;

        if (ids && ids.length > 0) {
          // Fetch only these IDs
          response = await getBank(ids);
          if (response.status === 'error') {
            throw new Error(response.message || 'Erro ao buscar bancos por ID.');
          }
          // "banks" is the array from ApiGetBank
          const fetchedBanks = response.data?.banks || [];
          const activeBanks = fetchedBanks.filter(b => b.bank_status);
          setBanks(activeBanks);
        } else {
          // Fetch ALL
          response = await getBanks();
          if (response.status === 'error') {
            throw new Error(response.message || 'Erro ao buscar bancos.');
          }
          const allBanks = response.data?.banks || [];
          const activeBanks = allBanks.filter(b => b.bank_status);
          setBanks(activeBanks);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao buscar bancos.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, [getBanks, getBank, ids]);

  // 🔹 Calculate total consolidated balance
  const totalConsolidatedBalance = banks.reduce((sum, bank) => {
    const val = bank.consolidated_balance ?? 0;
    return sum + Number(val);
  }, 0);

  return { banks, totalConsolidatedBalance, loading, error };
};
