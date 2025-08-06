/* -------------------------------------------------------------------------- */
/*  File: src/pages/BankSettings.tsx                                         */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import Checkbox from "@/components/Checkbox";
import { SelectDropdown } from "@/components/SelectDropdown";

import { api } from "src/api/requests";
import { Bank } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

// 🔢 Helpers para lidar com moeda (mesmo padrão do Modal de Lançamentos)
import {
  formatCurrency,
  decimalToCentsString,
} from "src/lib/currency";
import {
  handleUtilitaryAmountKeyDown,
} from "src/lib/form/amountKeyHandlers";

const ACCOUNT_TYPES = [
  { label: "Conta Corrente", value: "checking" },
  { label: "Poupança", value: "savings" },
  { label: "Caixa", value: "cash" },
];

const BankSettings: React.FC = () => {
  useEffect(() => {
    document.title = "Bancos";
  }, []);

  const { isOwner } = useAuthContext();

  /* --------------------------- Estados principais --------------------------- */
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const [formData, setFormData] = useState({
    bank_institution: "",
    bank_account_type: "checking",
    bank_branch: "",
    bank_account: "",
    initial_balance: "0", // string cents ("0" = R$0,00)
    bank_status: true,
  });

  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  /* ------------------------------ Carrega dados ----------------------------- */
  const fetchBanks = async () => {
    try {
      const res = await api.getAllBanks();
      const sorted = res.data.banks.sort((a, b) => a.id - b.id);
      setBanks(sorted);
    } catch (err) {
      console.error("Erro ao buscar bancos", err);
      setSnackBarMessage("Erro ao buscar bancos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingBank(null);
    setFormData({
      bank_institution: "",
      bank_account_type: "checking",
      bank_branch: "",
      bank_account: "",
      initial_balance: "0",
      bank_status: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (bank: Bank) => {
    setMode("edit");
    setEditingBank(bank);
    setFormData({
      bank_institution: bank.bank_institution,
      bank_account_type: bank.bank_account_type,
      bank_branch: bank.bank_branch,
      bank_account: bank.bank_account,
      initial_balance: decimalToCentsString(bank.initial_balance),
      bank_status: bank.bank_status,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingBank(null);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const cleanCurrency = (raw: string) =>
    (parseFloat(raw.replace(/\D/g, "")) / 100).toFixed(2);

  const submitBank = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedBalance = parseFloat(cleanCurrency(formData.initial_balance));

    try {
      if (mode === "create") {
        await api.addBank({
          bank_institution: formData.bank_institution,
          bank_account_type: formData.bank_account_type,
          bank_branch: formData.bank_branch,
          bank_account: formData.bank_account,
          initial_balance: parsedBalance,
          current_balance: parsedBalance,
          consolidated_balance: parsedBalance,
          bank_status: formData.bank_status,
          id: 0,
        });
      } else if (editingBank) {
        await api.editBank([editingBank.id], {
          ...formData,
          initial_balance: parsedBalance,
        });
      }
      await fetchBanks();
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao salvar banco."
      );
    }
  };

  const deleteBank = async (bank: Bank) => {
    if (!window.confirm(`Excluir banco "${bank.bank_institution}"?`)) return;

    try {
      await api.deleteBank([bank.id]);
      await fetchBanks();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir banco."
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ------------------------------ UI helpers ------------------------------- */
  const Row = ({ bank }: { bank: Bank }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-sm text-gray-500">{bank.bank_institution}</p>
        <p className="text-base font-medium text-gray-900">
          {bank.bank_branch} / {bank.bank_account}
        </p>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(bank)}>
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteBank(bank)}>
            Excluir
          </Button>
        </div>
      )}
    </div>
  );

  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="banks" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Bancos</h3>
            {isOwner && <Button onClick={openCreateModal}>Adicionar banco</Button>}
          </div>

          <div className="border rounded-lg divide-y">
            {banks.map(b => (
              <Row key={b.id} bank={b} />
            ))}
            {banks.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">
                Nenhum banco cadastrado.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar banco" : "Editar banco"}
              </h3>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={closeModal}
              >
                &times;
              </button>
            </header>

            <form className="space-y-4" onSubmit={submitBank}>
              <Input
                label="Instituição bancária"
                name="bank_institution"
                value={formData.bank_institution}
                onChange={handleChange}
                required
              />

              <SelectDropdown
                label="Tipo de conta"
                items={ACCOUNT_TYPES}
                selected={ACCOUNT_TYPES.filter(a => a.value === formData.bank_account_type)}
                onChange={items =>
                  items[0] &&
                  setFormData(p => ({ ...p, bank_account_type: items[0].value }))
                }
                getItemKey={item => item.value}
                getItemLabel={item => item.label}
                singleSelect
                hideCheckboxes
                buttonLabel="Selecione o tipo de conta"
              />

              <Input
                label="Agência"
                name="bank_branch"
                value={formData.bank_branch}
                onChange={handleChange}
              />

              <Input
                label="Conta"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleChange}
              />

              <Input
                label="Saldo inicial"
                name="initial_balance"
                type="text"
                placeholder="0,00"
                value={formatCurrency(formData.initial_balance)}
                onChange={e =>
                  setFormData(p => ({ ...p, initial_balance: e.target.value }))
                }
                onKeyDown={e =>
                  handleUtilitaryAmountKeyDown(
                    e,
                    formData.initial_balance,
                    (newVal: string) =>
                      setFormData(p => ({ ...p, initial_balance: newVal }))
                  )
                }
              />

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.bank_status}
                  onChange={e =>
                    setFormData(p => ({ ...p, bank_status: e.target.checked }))
                  }
                  size="sm"
                  colorClass="defaultColor"
                />
                <span className="text-sm text-gray-700">Conta ativa</span>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="cancel" type="button" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------- Snackbar ------------------------------ */}
      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage("")}
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default BankSettings;