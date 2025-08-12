/* -------------------------------------------------------------------------- */
/*  File: src/pages/BankSettings.tsx                                         */
/*  Style: Navbar fixa + SidebarSettings, light borders, compact labels       */
/*  Notes: no backdrop-close; honors fixed heights; no horizontal overflow    */
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

// 🔢 Helpers para lidar com moeda
import { formatCurrency, decimalToCentsString } from "src/lib/currency";
import { handleUtilitaryAmountKeyDown } from "src/lib/form/amountKeyHandlers";

const ACCOUNT_TYPES = [
  { label: "Conta Corrente", value: "checking" },
  { label: "Poupança", value: "savings" },
  { label: "Caixa", value: "cash" },
];

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "BK";
}

const Row = ({
  bank,
  onEdit,
  onDelete,
  canEdit,
}: {
  bank: Bank;
  onEdit: (b: Bank) => void;
  onDelete: (b: Bank) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {bank.bank_institution}
      </p>
      <p className="text-[12px] text-gray-600 truncate">
        {bank.bank_branch} / {bank.bank_account}
      </p>
    </div>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
          onClick={() => onEdit(bank)}
        >
          Editar
        </Button>
        <Button variant="common" onClick={() => onDelete(bank)}>
          Excluir
        </Button>
      </div>
    )}
  </div>
);

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
    initial_balance: "0", // string em centavos
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
    setFormData((p) => ({ ...p, [name]: value }));
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
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao salvar banco.");
    }
  };

  const deleteBank = async (bank: Bank) => {
    if (!window.confirm(`Excluir banco "${bank.bank_institution}"?`)) return;

    try {
      await api.deleteBank([bank.id]);
      await fetchBanks();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao excluir banco.");
    }
  };

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (loading) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="banks" />

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar; sem overflow lateral */}
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Bancos</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Contas bancárias</span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar banco
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {banks.map((b) => (
                  <Row
                    key={b.id}
                    bank={b}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteBank}
                  />
                ))}
                {banks.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">Nenhum banco cadastrado.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            {/* Sem onClick no backdrop → não fecha ao clicar fora */}
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg overflow-y-auto max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar banco" : "Editar banco"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitBank}>
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
                  selected={ACCOUNT_TYPES.filter((a) => a.value === formData.bank_account_type)}
                  onChange={(items) =>
                    items[0] && setFormData((p) => ({ ...p, bank_account_type: items[0].value }))
                  }
                  getItemKey={(item) => item.value}
                  getItemLabel={(item) => item.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Selecione o tipo de conta"
                />

                <Input label="Agência" name="bank_branch" value={formData.bank_branch} onChange={handleChange} />

                <Input label="Conta" name="bank_account" value={formData.bank_account} onChange={handleChange} />

                <Input
                  label="Saldo inicial"
                  name="initial_balance"
                  type="text"
                  placeholder="0,00"
                  value={formatCurrency(formData.initial_balance)}
                  onChange={(e) => setFormData((p) => ({ ...p, initial_balance: e.target.value }))}
                  onKeyDown={(e) =>
                    handleUtilitaryAmountKeyDown(e, formData.initial_balance, (newVal: string) =>
                      setFormData((p) => ({ ...p, initial_balance: newVal }))
                    )
                  }
                />

                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.bank_status}
                    onChange={(e) => setFormData((p) => ({ ...p, bank_status: e.target.checked }))}
                    size="sm"
                    colorClass="defaultColor"
                  />
                  <span className="text-[12px] text-gray-700">Conta ativa</span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

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
