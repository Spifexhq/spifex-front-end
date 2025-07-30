import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { useRequests } from '@/api/requests';
import Button from '@/components/Button';
import { InlineLoader } from '@/components/Loaders';

const EmailVerification = () => {
  const { uidb64, token } = useParams<{ uidb64?: string; token?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, verifyNewEmail } = useRequests();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState('');

  useEffect(() => {
    document.title = 'Verificação de Email';

    const doVerification = async () => {
      if (!uidb64 || !token) {
        setVerificationMessage('Parâmetros inválidos para verificação.');
        setIsVerifying(false);
        return;
      }

      try {
        let response;
        if (location.pathname.includes('verify-pending-email')) {
          response = await verifyNewEmail(uidb64, token);
        } else {
          response = await verifyEmail(uidb64, token);
        }

        if (response?.status === 'error') {
          setVerificationMessage(response.message || 'Erro ao verificar email.');
        } else if (response?.status === 'success') {
          setVerificationMessage('Email verificado com sucesso!');
        } else {
          setVerificationMessage('Resposta inesperada da API.');
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao verificar seu email.';
        setVerificationMessage(message);
      } finally {
        setIsVerifying(false);
      }
    };

    doVerification();
  }, [uidb64, token, location.pathname, verifyEmail, verifyNewEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full">
        {isVerifying ? (
          <div className="flex justify-center items-center h-60">
            <InlineLoader />
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-md p-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-800 mb-4">
              {verificationMessage.includes('sucesso')
                ? 'Seu email foi verificado com sucesso!'
                : 'Erro na verificação do email'}
            </h1>
            <p className="text-gray-600 mb-6">
              {verificationMessage.includes('sucesso')
                ? 'Agora você pode entrar na sua conta.'
                : 'Verifique o link ou tente novamente mais tarde.'}
            </p>
            {verificationMessage.includes('sucesso') && (
              <Button
                variant="primary"
                onClick={() => navigate('/signin')}
                className="w-full h-12"
              >
                Ir para Login
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
