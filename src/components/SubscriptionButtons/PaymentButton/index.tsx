import React, { useState } from 'react';
import { useAuthContext } from "@/contexts/useAuthContext";

import Button from 'src/components/Button';
import { api } from 'src/api/requests';

interface PaymentButtonProps {
  priceId: string;
  label: string;
  onClickCallback?: () => void;
  onProcessingChange?: (processing: boolean) => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ priceId, label, onClickCallback, onProcessingChange }) => {
  const { isOwner } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOwner) return null;

  const handlePayment = async () => {
    if (onClickCallback) {
      await onClickCallback();
    }
    setIsProcessing(true);
    if (onProcessingChange) onProcessingChange(true);
    try {
      const response = await api.createCheckoutSession(priceId);
      const { url } = response.data || {};

      if (url) {
        window.location.href = url;
      } else {
        alert('Não foi possível redirecionar para a página de pagamento.');
      }
    } catch (error) {
      console.error('Erro ao iniciar o processo de pagamento:', error);
      alert('Ocorreu um erro ao iniciar o processo de pagamento. Por favor, tente novamente mais tarde.');
    } finally {
      setIsProcessing(false);
      if (onProcessingChange) onProcessingChange(false);
    }
  };

  return (
    <Button
      loaderColor="#FFFFFF"
      onClick={handlePayment}
      disabled={isProcessing}
      isLoading={isProcessing}
    >
      {label}
    </Button>
  );
};

export default PaymentButton;
