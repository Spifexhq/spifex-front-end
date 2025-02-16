import React, { useEffect, useState } from 'react';
import { Entry } from 'src/models/Entries/Entry';
import { useRequests } from '@/api/requests';
import { parseListResponse } from '@/utils/parseListResponse';

const CashFlowTable: React.FC = () => {
  const { getEntries } = useRequests();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await getEntries();
        console.log('Resposta da API (entries):', response);

        // Aqui passamos: T = Entry, e arrayKey = "entries"
        const parsed = parseListResponse<Entry>(response, 'entries');
        setEntries(parsed);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao buscar dados.';
        console.error('Erro ao buscar entries:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [getEntries]);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data de Vencimento
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descrição
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Observação
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Parcela
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo de Transação
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-6 py-4 whitespace-nowrap">{entry.due_date}</td>
              <td className="px-6 py-4 whitespace-nowrap">{entry.description}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {entry.observation || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{`${entry.current_installment}/${entry.total_installments}`}</td>
              <td className="px-6 py-4 whitespace-nowrap">{entry.amount}</td>
              <td className="px-6 py-4 whitespace-nowrap">{entry.transaction_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CashFlowTable;
