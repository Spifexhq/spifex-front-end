import { useState, useMemo } from 'react';

import { formatDate, formatCurrency } from '@/utils/utils';
import { TableEntry } from 'src/models/TableEntry';
import { Bank } from 'src/models/Bank';

const EntriesTable: React.FC<{ banks: Bank[]; fetchBanks: () => void; entries: TableEntry[]; fetchEntries: () => void; keyword: string; tags: string[]; selectedMonths: string[]; mode: 'cashflow' | 'settled'; }> = ({ entries,  keyword, tags, selectedMonths, mode }) => {
  const [entriesToLoad] = useState(50);
  

  

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesKeyword =
        entry.description.toLowerCase().includes(keyword.toLowerCase()) ||
        (entry.observation && entry.observation.toLowerCase().includes(keyword.toLowerCase()));
      
      const entryTags = entry.tags ? entry.tags.split(',').map((tag) => tag.trim()) : [];
      const matchesTags = tags.length === 0 || tags.every((tag) => entryTags.includes(tag));
      
      const date = new Date(entry.display_date);
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      const entryMonth = `${month}/${year}`;
      
      const matchesMonths = selectedMonths.length === 0 || selectedMonths.includes(entryMonth);
      
      return matchesKeyword && matchesTags && matchesMonths;
    });
  }, [entries, keyword, tags, selectedMonths]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">{mode === 'cashflow' ? 'Vencimento' : 'Liquidação'}</th>
            <th className="border p-2 text-left">Descrição</th>
            <th className="border p-2 text-left">Observação</th>
            <th className="border p-2 text-left">Parcela</th>
            {mode === 'settled' && <th className="border p-2 text-left">Banco</th>}
            <th className="border p-2 text-left">Débito</th>
            <th className="border p-2 text-left">Crédito</th>
            <th className="border p-2 text-left">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {filteredEntries.length > 0 ? (
            filteredEntries.slice(0, entriesToLoad).map((entry) => (
              <tr key={entry.id} className="border">
                <td className="border p-2">{formatDate(entry.display_date)}</td>
                <td className="border p-2">{entry.description}</td>
                <td className="border p-2">{entry.observation}</td>
                <td className="border p-2 text-center">
                  {entry.current_installment !== undefined && entry.total_installments !== undefined ? `${entry.current_installment}/${entry.total_installments}` : ''}
                </td>
                {mode === 'settled' && (
                  <td className="border p-2">{entry.bank?.bank_institution || ''}</td>
                )}
                <td className="border p-2 text-right">
                  {entry.transaction_type === 'debit' ? formatCurrency(parseFloat(entry.amount)) : '-'}
                </td>
                <td className="border p-2 text-right">
                  {entry.transaction_type === 'credit' ? formatCurrency(parseFloat(entry.amount)) : '-'}
                </td>
                <td className="border p-2 text-right">{formatCurrency(entry.balance ?? 0)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={mode === 'cashflow' ? 7 : 8} className="border p-2 text-center">
                Nenhum dado disponível
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EntriesTable;
