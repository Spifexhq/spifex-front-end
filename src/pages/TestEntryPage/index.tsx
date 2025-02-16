// @/pages/TestEntryPage/index.tsx
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import EntriesTable from 'src/components/CashFlowTable/CashFlowTable';
import { useRequests } from 'src/api/requests';
import { ApiGetEntries } from 'src/models/Entries/Entry';

const TestEntryPage: React.FC = () => {
  const { getEntries } = useRequests();
  const [entries, setEntries] = useState<ApiGetEntries['entries']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await getEntries();
        if (response.data && response.data.entries) {
          setEntries(response.data.entries);
        } else {
          setError('Nenhuma entrada encontrada.');
        }
      } catch (err) {
        console.error('Erro ao buscar entradas:', err);
        setError('Erro ao buscar entradas.');
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [getEntries]);

  if (loading) {
    return (
      <div className="p-4">
        <Navbar />
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Navbar />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <h1 className="text-2xl font-bold my-4 text-center">
        Lista de Entradas de Cashflow
      </h1>
      <div className="max-w-6xl mx-auto p-4">
        <EntriesTable entries={entries} mode="cashflow" />
      </div>
    </div>
  );
};

export default TestEntryPage;
