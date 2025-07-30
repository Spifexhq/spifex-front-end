import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth, apiRequest } from '@/api';
import Snackbar from '@/components/Snackbar';
import Alert from '@/components/Alert';
import { InlineLoader } from '@/components/Loaders';

import logo from '@/assets/Icons/Logo/logo-black.svg';
import bgImage from '@/assets/Images/background/purchase-success.svg';
import Button from 'src/components/Button';

interface PurchaseDetails {
  item: string;
  amount: string;
  date: string;
  transactionId: string;
}

const PurchaseConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [snackBarMessage, setSnackBarMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  const { handleInitUser } = useAuth();

  const query = new URLSearchParams(location.search);
  const sessionId = query.get('session_id');

  useEffect(() => {
    document.title = 'Compra Confirmada';

    const fetchPurchaseDetails = async () => {
      if (!sessionId) {
        setSnackBarMessage('Sessão inválida.');
        setIsFetching(false);
        return;
      }

      try {
        const response = await apiRequest<{ purchase_details: PurchaseDetails }>(
          'payments/get-purchase-details/',
          'GET',
          { session_id: sessionId },
          true
        );

        if (response.status === 'error') {
          setSnackBarMessage(response.message || 'Erro ao recuperar detalhes da compra.');
        } else if (response.data?.purchase_details) {
          setPurchaseDetails(response.data.purchase_details);
          await handleInitUser();
        } else {
          setSnackBarMessage('Não foi possível recuperar os detalhes da compra.');
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes da compra:', err);
        setSnackBarMessage('Erro ao recuperar detalhes da compra.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchPurchaseDetails();
  }, [sessionId, handleInitUser]);

  const handleRedirect = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate('/settings/subscription-management');
    } catch (err) {
      console.error('Erro ao redirecionar:', err);
      setSnackBarMessage('Ocorreu um erro ao redirecionar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <InlineLoader />
      </div>
    );
  }

  if (!purchaseDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Snackbar
          open={snackBarMessage !== ''}
          autoHideDuration={6000}
          onClose={() => setSnackBarMessage('')}
        >
          <Alert severity="error">{snackBarMessage}</Alert>
        </Snackbar>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left side */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <a href="https://spifex.com">
              <img src={logo} alt="Logo" className="h-10 mx-auto" />
            </a>
          </div>

          <div className="bg-white rounded-md shadow-md p-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Assinatura Confirmada!
            </h1>

            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">Item:</span>
                <span>{purchaseDetails.item}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">Valor:</span>
                <span>{purchaseDetails.amount}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">Data:</span>
                <span>
                  {new Date(Number(purchaseDetails.date) * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">ID da Transação:</span>
                <span>{purchaseDetails.transactionId}</span>
              </div>
            </div>

            <div className="mt-8">
              <Button
                onClick={handleRedirect}
                disabled={isLoading}
                className="w-full h-12"
              >
                {isLoading ? <InlineLoader /> : 'Voltar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side image */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center">
        <img
          src={bgImage}
          alt="Background"
          className="max-h-[650px] w-auto object-contain select-none pointer-events-none"
        />
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackBarMessage !== ''}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage('')}
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </div>
  );
};

export default PurchaseConfirmation;
