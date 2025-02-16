import { useState } from 'react';
import { unformatAmount } from '@/utils/utils';

const useEntryFormValidation = (formData) => {
  const [alertMessage, setAlertMessage] = useState('');

  const validateForm = () => {
    const {
      due_date,
      description,
      amount,
      general_ledger_account_id,
      department_id,
      department_percentage,
      recurrence,
      total_installments,
      inventory_item_id,
      inventory_item_quantity,
      entity_type,
      entity_id,
    } = formData;

    if (!due_date || !description || !general_ledger_account_id) {
      setAlertMessage('Por favor, preencha todos os campos obrigatórios.');
      return 0;
    }
  
    if (!amount || parseFloat(unformatAmount(amount)) <= 0) {
      setAlertMessage('O valor deve ser maior que zero.');
      return 0;
    }
  
    const percentageSum = department_percentage.reduce((acc, curr) => acc + parseFloat(curr), 0);
    if (department_id.length > 0 && percentageSum !== 100) {
      setAlertMessage('A soma das porcentagens dos departamentos deve ser igual a 100%.');
      return 1;
    }

    if (entity_type && !entity_id) {
      setAlertMessage('Por favor, selecione uma entidade.');
      return 2;
    }
    
    if (inventory_item_id && (!inventory_item_quantity || parseInt(inventory_item_quantity, 10) <= 0)) {
      setAlertMessage('Por favor, preencha a quantidade para o item de inventário selecionado.');
      return 3;
    }
  
    if (recurrence === 'yes' && (total_installments <= 1 || !total_installments)) {
      setAlertMessage('Para recorrência, o número total de parcelas deve ser maior que 1.');
      return 4;
    }
  
    setAlertMessage('');
    return -1;
  };
  
  return { validateForm, alertMessage, setAlertMessage };
};

export default useEntryFormValidation;
