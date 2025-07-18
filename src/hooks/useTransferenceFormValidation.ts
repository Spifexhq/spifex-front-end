import { useState } from 'react';
import { unformatAmount } from '@/utils/utils';

interface TransferenceFormData {
  due_date: string;
  amount: string;
  bank_out_id: string;
  bank_in_id: string;
  observation?: string;
}

const useTransferenceFormValidation = (formData: TransferenceFormData) => {
  const [alertMessage, setAlertMessage] = useState('');

  const validateForm = () => {
    const { due_date, amount, bank_out_id, bank_in_id } = formData;

    if (!due_date || !amount || amount.trim() === '0,00' || !bank_out_id || !bank_in_id) {
      if (!bank_out_id && bank_in_id) {
        setAlertMessage('Por favor, escolha o banco de saída.');
        return false;
      }
      if (!bank_in_id && bank_out_id) {
        setAlertMessage('Por favor, escolha o banco de entrada.');
        return false;
      }
      setAlertMessage('Por favor, preencha todos os campos obrigatórios.');
      return false;
    }

    if (parseFloat(unformatAmount(amount)) <= 0) {
      setAlertMessage('O valor deve ser maior que zero.');
      return false;
    }

    if (bank_out_id === bank_in_id) {
      setAlertMessage('Os bancos de saída e entrada não podem ser iguais.');
      return false;
    }

    setAlertMessage('');
    return true;
  };

  return { validateForm, alertMessage, setAlertMessage };
};

export default useTransferenceFormValidation;
