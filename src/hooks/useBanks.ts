import { useEffect, useState } from 'react';
import { useRequests } from '@/api/requests';
import type { Bank } from '@/models/Bank';

export const useBanks = () => {
  const { getBanks } = useRequests();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getBanks();
        if (response.status === 'error') {
          throw new Error(response.message || 'Erro ao buscar bancos.');
        }
        const allBanks = response.data?.banks || [];
        const activeBanks = allBanks.filter((bank) => bank.bank_status === true);
        setBanks(activeBanks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar bancos.');
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, [getBanks]);

  // 🔹 Calculate total consolidated balance
  const totalConsolidatedBalance = banks.reduce((sum, bank) => {
    const value =
      typeof bank.consolidated_balance === 'number'
        ? bank.consolidated_balance
        : parseFloat(String(bank.consolidated_balance ?? '0'));
    return sum + value;
  }, 0);

  return { banks, totalConsolidatedBalance, loading, error };
};
