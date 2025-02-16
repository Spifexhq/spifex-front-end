import { useCallback, useState } from 'react';
import { Bank } from '@/models/Bank';
import { useRequests } from 'src/api/requests';

export const useFetchBanks = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const { getBanks } = useRequests();

  const fetchBanks = useCallback(async () => {
    try {
      const response = await getBanks();
      
      const filteredBanks = response?.data?.banks
        ? response.data.banks
            .filter((bank: Bank) => bank.bank_status)
            .sort((a: Bank, b: Bank) => a.id - b.id)
        : [];

      setBanks(filteredBanks);
    } catch (error) {
      console.error('Failed to fetch banks:', error);
      setBanks([]);
    }
  }, [getBanks]);

  return { banks, fetchBanks };
};
