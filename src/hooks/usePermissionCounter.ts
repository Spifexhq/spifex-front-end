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
      const usage = await incrementCounter(permissionCode);

      // Verifica se é um objeto de erro (contendo 'detail')
      if ('detail' in usage) {
        // Se vier "Acesso negado" no detail, você força a mensagem de limite
        if (usage.detail.toLowerCase().includes('acesso negado')) {
          setAlertMessage(`Você atingiu o limite de uso para a permissão: ${permissionCode}`);
        } else {
          setAlertMessage(`Erro na permissão ${permissionCode}: ${usage.detail}`);
        }
      } else {
        // Caso de sucesso
        setAlertMessage(`Operação realizada com sucesso para "${permissionCode}"!`);
      }
    } catch (error) {
      // Lógica para tratar problemas de rede ou outros imprevistos
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
