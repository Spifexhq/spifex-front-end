/* src/hooks/useBanks.ts */
import { useEffect, useState } from 'react';
import { api } from '@/api/requests2';
import type { Bank } from '@/models/enterprise_structure/domain';

type BanksResponse = { banks?: Bank[]; results?: Bank[] };

export const useBanks = (ids?: number[]) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = ids && ids.length
          ? await api.getBank(ids)
          : await api.getAllBanks();

        const payload = res.data as BanksResponse;
        const fetched = payload.banks ?? payload.results ?? [];

        setBanks(fetched.filter(b => b.bank_status));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar bancos.');
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, [ids]);

  const totalConsolidatedBalance = banks.reduce(
    (sum, b) => sum + Number(b.consolidated_balance ?? 0),
    0,
  );

  return { banks, totalConsolidatedBalance, loading, error };
};
