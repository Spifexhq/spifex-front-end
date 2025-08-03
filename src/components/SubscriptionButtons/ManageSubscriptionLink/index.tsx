import React, { useState } from 'react';
import { useAuthContext } from "@/contexts/useAuthContext";
import { api } from 'src/api/requests2';
import axios from 'axios';

import './styles.css';

const ManageSubscriptionLink: React.FC = () => {
  const { isSubscribed, isSuperUser, isOwner } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOwner || !isSubscribed || !isSuperUser) return null;

  const handleManageSubscription = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const response = await api.createCustomerPortalSession();
      const { url } = response.data || {};
      if (url) {
        window.location.href = url;
      } else {
        alert('Não foi possível redirecionar para o portal de gerenciamento de assinaturas.');
      }
    } catch (error: unknown) {
      console.error('Erro ao redirecionar para o Customer Portal:', error);

      let errorMessage = 'Ocorreu um erro ao redirecionar para o portal de gerenciamento de assinaturas.';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error ?? errorMessage;
      }

      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      type="button"
      className="manage-subscription-button"
      onClick={handleManageSubscription}
      disabled={isProcessing}
      aria-disabled={isProcessing}
    >
      Gerencie sua assinatura
    </button>
  );
};

export default ManageSubscriptionLink;
