import { useState } from 'react';

const useEditInstallments = (onSave: (installment: any) => void, onClose: () => void) => {
  const [installments, setInstallments] = useState<any[]>([]);

  const handleEditInstallment = (installment: any) => {
    onClose(); 
    setTimeout(() => {
      onSave(installment);
    }, 300);
  };

  const loadInstallments = async (correlationId: string, getEntries: () => Promise<any>) => {
    try {
      const response = await getEntries();
      const relatedInstallments = response.data.entries.filter(
        (installment: any) => installment.installments_correlation_id === correlationId
      );
      setInstallments(relatedInstallments);
    } catch (error) {
      console.error('Error loading installments:', error);
    }
  };

  const isInstallmentBeingEdited = (installment: any, formData: any) => {
    return (
      formData.due_date === installment.due_date &&
      formData.description === installment.description &&
      formData.current_installment === installment.current_installment &&
      formData.total_installments === installment.total_installments
    );
  };

  return {
    installments,
    handleEditInstallment,
    loadInstallments,
    isInstallmentBeingEdited,
  };
};

export default useEditInstallments;
