import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '@/components/Button';

interface SignUpRedirectState {
  email?: string;
}

const emailProviders: Record<string, string> = {
  'gmail.com': 'https://mail.google.com/',
  'outlook.com': 'https://outlook.office.com/mail/',
  'hotmail.com': 'https://outlook.office.com/mail/',
  'live.com': 'https://outlook.office.com/mail/',
  'icloud.com': 'https://www.icloud.com/',
  'yahoo.com': 'https://mail.yahoo.com/',
};

const SignUpRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [emailServiceUrl, setEmailServiceUrl] = useState<string>('');

  useEffect(() => {
    document.title = 'Cadastro realizado';

    const state = location.state as SignUpRedirectState | null;

    if (!state?.email) {
      navigate('/signup');
      return;
    }

    const domain = state.email.split('@')[1]?.toLowerCase() || '';
    const url = emailProviders[domain] || `mailto:${state.email}`;
    setEmailServiceUrl(url);
  }, [location.state, navigate]);

  const handleClick = () => {
    if (emailServiceUrl) {
      window.open(emailServiceUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white shadow-md rounded-md p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Cadastro realizado com sucesso!
        </h1>
        <p className="text-gray-600 mb-6">
          Verifique seu email para ativar sua conta.
        </p>

        {emailServiceUrl && (
          <Button
            variant="primary"
            onClick={handleClick}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            Acessar meu email
          </Button>
        )}
      </div>
    </div>
  );
};

export default SignUpRedirect;
