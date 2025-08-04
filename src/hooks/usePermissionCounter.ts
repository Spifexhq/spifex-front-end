import { useState } from 'react';
import { api } from 'src/api/requests2';

export const usePermissionCounter = () => {
  const [alertMessage, setAlertMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  /**
   * Função genérica para incrementar o contador de uma permissão.
   * @param permissionCode string - Nome (code_name) da permissão (ex: "add_cash_flow_entries").
   */
  const handlePermissionIncrement = async (permissionCode: string) => {
    setRequestLoading(true);
    setAlertMessage('');

    try {
      const response = await api.incrementCounter(permissionCode);
      const msg = response.data.message;
      setAlertMessage(`Permissão "${permissionCode}" atualizada com sucesso: ${msg}`);
    } catch (error: unknown) {
      console.error(`Erro na permissão ${permissionCode}:`, error);

      const errorMessage =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Erro desconhecido ao tentar atualizar permissão.';

      setAlertMessage(`Erro na permissão ${permissionCode}: ${errorMessage}`);
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
