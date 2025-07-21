import React, { useEffect, useState } from "react";
import { useBanks } from "@/hooks/useBanks";
import { Entry } from "@/models/Entries";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";

interface SettlementModalProps {
    isOpen: boolean;
    onClose(): void;
    selectedEntries: Entry[];
    onSave(): void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({ isOpen, onClose, selectedEntries, onSave }) => {
    const { banks, loading: loadingBanks, error } = useBanks();
    const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);

    const [entriesState, setEntriesState] = useState<{
    id: number;
    due_date: string;
    description: string;
    amount: string;
    }[]>([]);

    useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const today = new Date().toISOString().slice(0, 10);
    const mappedEntries = selectedEntries.map((e) => ({
        id: e.id,
        due_date: new Date(e.due_date) > new Date() ? today : e.due_date,
        description: e.description,
        amount: e.amount,
    }));
    setEntriesState(mappedEntries);

    return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, selectedEntries]);

    const toggleBank = (id: number) => {
        setSelectedBankIds((prev) => (prev.includes(id) ? [] : [id]));
    };

    const updateEntryDate = (id: number, newDate: string) => {
        setEntriesState((prev) =>
            prev.map((e) => (e.id === id ? { ...e, due_date: newDate } : e))
        );
    };

    const handleLiquidate = async () => {
        try {
            onSave();
            onClose();
        } catch (err) {
            alert("Erro ao liquidar lançamentos.");
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)] z-50">
            <div className="relative bg-white rounded-lg shadow-xl w-[85%] h-[80%] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
                <h1 className="text-xl font-semibold select-none">Liquidar Lançamentos</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
                {/* Bancos */}
                <div className="border border-gray-300 rounded-lg overflow-y-auto max-h-[200px]">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-xs text-gray-600 sticky top-0 z-10">
                    <tr>
                        <th className="w-[5%] px-2 py-1 text-center">
                        <span></span>
                        </th>
                        <th className="px-2 py-1 text-left">Instituição</th>
                        <th className="px-2 py-1 text-left">Agência</th>
                        <th className="px-2 py-1 text-left">Conta</th>
                        <th className="px-2 py-1 text-center">Saldo</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loadingBanks ? (
                        <tr>
                        <td colSpan={5} className="text-center py-4">Carregando...</td>
                        </tr>
                    ) : error ? (
                        <tr>
                        <td colSpan={5} className="text-center text-red-500 py-4">{error}</td>
                        </tr>
                    ) : banks.length === 0 ? (
                        <tr>
                        <td colSpan={5} className="text-center py-4">Nenhum banco disponível</td>
                        </tr>
                    ) : (
                        banks.map((bank) => (
                        <tr key={bank.id} className="hover:bg-gray-50 text-[12px]">
                            <td className="px-2 py-1 text-center">
                            <Checkbox
                                size="sm"
                                checked={selectedBankIds.includes(bank.id)}
                                onChange={() => toggleBank(bank.id)}
                            />
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">{bank.bank_institution}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{bank.bank_branch}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{bank.bank_account}</td>
                            <td className="px-2 py-1 text-center whitespace-nowrap">
                            {Number(bank.consolidated_balance).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>

                {/* Lançamentos selecionados */}
                <div className="border border-gray-300 rounded-lg overflow-y-auto max-h-[200px] min-h-[200px]">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-xs text-gray-600 sticky top-0 z-10">
                    <tr>
                        <th className="px-2 py-1 text-center w-[20%]">Vencimento</th>
                        <th className="px-2 py-1 text-left w-[60%]">Descrição</th>
                        <th className="px-2 py-1 text-center w-[20%]">Valor</th>
                    </tr>
                    </thead>
                    <tbody>
                    {entriesState.length === 0 ? (
                        <tr>
                        <td colSpan={3} className="text-center py-4">Nenhum lançamento selecionado</td>
                        </tr>
                    ) : (
                        entriesState.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50 text-[12px]">
                            <td className="px-2 py-1 text-center">
                            <input
                                type="date"
                                className="border border-gray-300 rounded px-1 text-xs"
                                value={e.due_date}
                                onChange={(evt) => updateEntryDate(e.id, evt.target.value)}
                            />
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">{e.description}</td>
                            <td className="px-2 py-1 text-center whitespace-nowrap">
                            {Number(e.amount).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                            })}
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white flex justify-end gap-4">
                <Button variant="cancel" className="px-4 py-2" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" className="px-4 py-2" onClick={handleLiquidate} disabled={selectedBankIds.length === 0 || entriesState.length === 0}>
                Liquidar
                </Button>
            </div>
            </div>
        </div>
    );
};

export default SettlementModal;
