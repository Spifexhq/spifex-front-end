/**
 * CashFlowTable.tsx
 * 
 * This component renders a table displaying cash flow entries.
 * It fetches data from an API, sorts entries by due date (ascending),
 * and calculates a running balance.
 * 
 * Features:
 * - Fetches and parses financial entries
 * - Orders entries by due date (earliest first)
 * - Allows multi-selection with Shift key support
 * - Calculates and displays a cumulative balance
 * - Displays positive amounts for "credit" transactions and negative for "debit"
 * 
 * Dependencies:
 * - useRequests: API hook for fetching data
 * - useShiftSelect: Custom hook for multi-selection logic
 * - parseListResponse: Utility function for API response parsing
 */

import React, { useEffect, useState } from 'react';
import { useRequests } from '@/api/requests';

import { Entry } from 'src/models/Entries/Entry';
import { parseListResponse } from '@/utils/parseListResponse';
import { useShiftSelect } from '@/hooks/useShiftSelect';

import InlineLoader from '../InlineLoader';
import Checkbox from '@/components/Checkbox';

const CashFlowTable: React.FC = () => {
  const { getEntries } = useRequests();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningBalance, setRunningBalance] = useState<number[]>([]);

  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await getEntries();
        const parsed = parseListResponse<Entry>(response, 'entries');

        const sortedEntries = parsed.sort((a, b) => {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        setEntries(sortedEntries);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching data.';
        console.error('Error when searching for entries:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [getEntries]);

  // Calculate the balance for the table
  useEffect(() => {
    let balance = 0;
    const updatedRunningBalance = entries.map((entry) => {
      const amount = parseFloat(entry.amount);
      const transactionValue = entry.transaction_type === 'credit' ? amount : -amount;
      balance += transactionValue;
      return balance;
    });

    setRunningBalance(updatedRunningBalance);
  }, [entries]);

  if (loading) return <InlineLoader color="orange" className="w-10 h-10" />;
  if (error) return <div>{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Select All Checkbox */}
            <th className="px-4 py-3 text-center">
              <div className="flex justify-center items-center h-full">
                <Checkbox
                  checked={selectedIds.length === entries.length && entries.length > 0}
                  onClick={() => handleSelectAll()}
                />
              </div>
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data de Vencimento
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descrição
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Observação
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Parcela
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry, index) => {
            const isSelected = selectedIds.includes(entry.id);
            const amount = parseFloat(entry.amount);
            const balance = runningBalance[index] || 0;

            return (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="flex justify-center items-center px-4 py-4">
                  {/* Checkbox for each line */}
                  <Checkbox
                    checked={isSelected}
                    onClick={(e) => handleSelectRow(entry.id, e)}
                  />
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">{entry.due_date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{entry.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">{entry.observation || '-'}</td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {`${entry.current_installment}/${entry.total_installments}`}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {(entry.transaction_type === 'debit' ? -amount : amount).toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap font-semibold">
                  <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {balance >= 0 ? '+' : ''}
                    {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CashFlowTable;
