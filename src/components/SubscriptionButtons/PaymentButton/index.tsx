import React, { useState } from 'react';

import { useRequests } from 'src/api';
import { useAuthContext } from "@/contexts/useAuthContext";

import { InlineLoader } from 'src/components/Loaders';
import './styles.css';

interface PaymentButtonProps {
  priceId: string;
  label: string;
  onClickCallback?: () => void;
  onProcessingChange?: (processing: boolean) => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ priceId, label, onClickCallback, onProcessingChange }) => {
  const { isOwner } = useAuthContext();
  const { createCheckoutSession } = useRequests();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOwner) return null;

  const handlePayment = async () => {
    if (onClickCallback) {
      await onClickCallback();
    }
    setIsProcessing(true);
    if (onProcessingChange) onProcessingChange(true);
    try {
      const response = await createCheckoutSession(priceId);
      const { url } = response.data || {};

      if (url) {
        window.location.href = url;
      } else {
        alert('Não foi possível redirecionar para a página de pagamento.');
      }
    } catch (error: any) {
      console.error('Erro ao iniciar o processo de pagamento:', error.response?.data || error.message);
      alert('Ocorreu um erro ao iniciar o processo de pagamento. Por favor, tente novamente mais tarde.');
    } finally {
      setIsProcessing(false);
      if (onProcessingChange) onProcessingChange(false);
    }
  };

  return (
    <button
      className="payment-button"
      onClick={handlePayment}
      disabled={isProcessing}
      color="primary"
    >
      {isProcessing ? <InlineLoader /> : label}
    </button>
  );
};

export default PaymentButton;
