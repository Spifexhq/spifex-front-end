import { useState } from 'react';
import { useRequests } from '@/api/requests';

export const usePermissionCounter = () => {
  const [alertMessage, setAlertMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const { incrementCounter } = useRequests();

  /**
   * Função genérica para incrementar o contador de uma permissão.
   * @param permissionCode string - Nome (code_name) da permissão (ex: "add_cash_flow_entries").
   */
  const handlePermissionIncrement = async (permissionCode: string) => {
    setRequestLoading(true);
    setAlertMessage(''); // Limpa qualquer mensagem anterior

    try {
      const response = await incrementCounter(permissionCode);

      if (!response || typeof response !== 'object') {
        throw new Error('Resposta inesperada da API.');
      }

      if (response.status === 'error') {
        // Se for um erro, verificamos a mensagem
        setAlertMessage(`Erro na permissão ${permissionCode}: ${response.message}`);
      } else if (response.status === 'success') {
        // Caso de sucesso, assumimos que a operação foi bem-sucedida
        setAlertMessage(`Operação realizada com sucesso para "${permissionCode}"!`);
      } else {
        setAlertMessage(`Resposta inesperada da API para "${permissionCode}".`);
      }
    } catch (error) {
      console.error(`Erro na permissão ${permissionCode}:`, error);
      setAlertMessage(`Erro na permissão ${permissionCode}. Verifique sua conexão ou tente novamente.`);
    } finally {
      setRequestLoading(false);
    }
  };

  return {
    alertMessage,
    setAlertMessage,
    requestLoading,
    handlePermissionIncrement,
  };
};
