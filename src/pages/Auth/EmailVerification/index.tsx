import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { VerifyEmailResponse, VerifyNewEmailResponse } from '@/models/auth/dto/EmailVerification';
import { ApiResponse } from '@/models/Api';
import { api } from "src/api/requests";
import Button from '@/components/Button';
import { isApiError } from '@/utils/apiError';
import { InlineLoader } from '@/components/Loaders';

const EmailVerification = () => {
  const { uidb64, token } = useParams<{ uidb64?: string; token?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationMessage, setMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Verificação de Email';

    const verify = async () => {
      if (!uidb64 || !token) {
        setMsg('Parâmetros inválidos para verificação.');
        setIsVerifying(false);
        return;
      }

      try {
        const call = location.pathname.includes('verify-pending-email')
          ? api.verifyNewEmail
          : api.verifyEmail;

        const res: ApiResponse<VerifyEmailResponse | VerifyNewEmailResponse> =
          await call(uidb64, token);

        if (isApiError(res)) {
          setMsg(res.error.message || 'Erro ao verificar email.');
          setSuccess(false);
        } else {
          // Mensagem estática, já que o backend não retorna `message`
          setMsg('Email verificado com sucesso!');
          setSuccess(true);
        }
      } catch (err) {
        setMsg(
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro ao verificar seu email.'
        );
        setSuccess(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [uidb64, token, location.pathname]);

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
              {success
                ? 'Seu email foi verificado com sucesso!'
                : 'Erro na verificação do email'}
            </h1>
            <p className="text-gray-600 mb-6">
              {verificationMessage}
            </p>
            {success && (
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
