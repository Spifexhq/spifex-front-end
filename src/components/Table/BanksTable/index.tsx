import React from 'react';
import { useBanks } from '@/hooks/useBanks';
import { InlineLoader } from '@/components/Loaders';

interface BanksTableProps {
  selectedBankIds?: number[];
}

const BanksTable: React.FC<BanksTableProps> = ({ selectedBankIds }) => {
  const { banks, totalConsolidatedBalance, loading, error } = useBanks(selectedBankIds);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <InlineLoader color="orange" className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="relative rounded border border-gray-300 max-h-[262px] overflow-y-auto">
      <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-gray-100 z-10">
          <tr>
            <th className="px-4 py-2 w-1/4 text-center text-xs text-gray-600">Instituição</th>
            <th className="px-4 py-2 w-1/4 text-center text-xs text-gray-600">Agência</th>
            <th className="px-4 py-2 w-1/4 text-center text-xs text-gray-600">Conta</th>
            <th className="px-4 py-2 w-1/4 text-center text-xs text-gray-600">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {banks.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-3 text-center text-gray-600">Nenhum banco disponível</td>
            </tr>
          ) : (
            banks
              .slice()
              .sort((a, b) => a.id - b.id)
              .map((bank) => (
                <tr key={bank.id} className="text-[12px] hover:bg-gray-50">
                  <td className="px-4 py-2">{bank.bank_institution}</td>
                  <td className="px-4 py-2">{bank.bank_branch}</td>
                  <td className="px-4 py-2">{bank.bank_account}</td>
                  <td className="px-4 py-2 text-center">
                    {Number(bank.consolidated_balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))
          )}
        </tbody>
        <tfoot className="sticky text-[14px] text-gray-600 bottom-0 bg-gray-100 z-10">
          <tr>
            <td className="px-4 py-2 font-bold" colSpan={3}>Total</td>
            <td className="px-4 py-2 font-bold text-center">
              {totalConsolidatedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default BanksTable;
