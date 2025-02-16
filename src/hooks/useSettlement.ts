// hooks/useSettlement.ts
import { useState } from 'react';
import { Entry } from 'src/models/Entries/Entry';

const useSettlement = (
  fetchEntries: () => Promise<void>,
  fetchBanks: () => void,
  selectedIds: number[],
  entries: Entry[],
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>,
  setSelectedSum: React.Dispatch<React.SetStateAction<number>>,
  setShowActionButtons: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  const handleSettleEntries = () => {
    setIsSettlementModalOpen(true);
  };

  const handleCloseSettlementModal = () => {
    setIsSettlementModalOpen(false);
    setSelectedBankId(null);
  };

  const handleBankSelect = (id: number) => {
    setSelectedBankId(id);
  };

  const handleSettle = async () => {
    try {
      await fetchEntries();
      await fetchBanks();

      setSelectedIds([]);
      setSelectedSum(0);
      setShowActionButtons(false);
      handleCloseSettlementModal();
    } catch (error) {
      console.error('Falha ao atualizar dados após liquidação:', error);
    }
  };

  return {
    isSettlementModalOpen,
    selectedBankId,
    handleSettleEntries,
    handleCloseSettlementModal,
    handleBankSelect,
    handleSettle,
  };
};

export default useSettlement;
