/* -------------------------------------------------------------------------- */
/*  File: src/pages/BankSettings.tsx                                         */
/*  Style: Navbar fixa + SidebarSettings, light borders, compact labels       */
/*  Notes: no backdrop-close; honors fixed heights; no horizontal overflow    */
/*  Dinâmica: overlay local p/ add/delete + refresh do fetch                  */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback, useMemo } from "react";

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
import { BankAccount } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

// 🔢 Helpers para lidar com moeda (mantendo a lógica antiga)
import { formatCurrency, decimalToCentsDigits } from "src/lib/currency";
import { handleUtilitaryAmountKeyDown } from "src/lib/form/amountKeyHandlers";

const ACCOUNT_TYPES = [
  { label: "Conta Corrente", value: "checking" },
  { label: "Poupança", value: "savings" },
  { label: "Investimento", value: "investment" },
  { label: "Caixa", value: "cash" },
];

/** Converte dígitos de centavos ("123456") -> string decimal "1234.56" para a API */
const digitsToDecimalString = (digits: string) => {
  const onlyDigits = String(digits ?? "0").replace(/\D/g, "");
  const num = Number(onlyDigits || "0") / 100;
  return num.toFixed(2);
};

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
  bank: BankAccount;
  onEdit: (b: BankAccount) => void;
  onDelete: (b: BankAccount) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {bank.institution}
      </p>
      <p className="text-[12px] text-gray-600 truncate">
        {bank.branch} / {bank.account_number}
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
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  // Mantemos "initial_balance" como dígitos de centavos (ex.: "123456")
  const [formData, setFormData] = useState({
    institution: "",
    account_type: "checking",
    currency: "BRL",
    branch: "",
    account_number: "",
    iban: "",
    initial_balance: "0", // dígitos de centavos para edição/máscara
    is_active: true,
  });

  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  /* --------- Overlay dinâmico: adicionados e ids excluídos (UI imediata) --- */
  const [added, setAdded] = useState<BankAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------ Carrega dados ----------------------------- */
  const fetchBanks = useCallback(async () => {
    try {
      const { data } = await api.getAllBanks(); // ApiSuccess<Paginated<BankAccount>>
      const list: BankAccount[] = data?.results ?? [];
      const sorted = [...list].sort((a, b) =>
        (a.institution || "").localeCompare(b.institution || "")
      );
      setBanks(sorted);
    } catch (err) {
      console.error("Erro ao buscar bancos", err);
      setSnackBarMessage("Erro ao buscar bancos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  /* ---------------------------- Lista visível ------------------------------- */
  const visibleBanks = useMemo(() => {
    const addedIds = new Set(added.map((b) => b.id));
    const base = banks.filter((b) => !deletedIds.has(b.id) && !addedIds.has(b.id));
    return [...added, ...base];
  }, [banks, added, deletedIds]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingBank(null);
    setFormData({
      institution: "",
      account_type: "checking",
      currency: "BRL",
      branch: "",
      account_number: "",
      iban: "",
      initial_balance: "0",
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (bank: BankAccount) => {
    setMode("edit");
    setEditingBank(bank);
    setFormData({
      institution: bank.institution,
      account_type: bank.account_type,
      currency: bank.currency || "BRL",
      branch: bank.branch,
      account_number: bank.account_number,
      iban: bank.iban || "",
      // backend devolve decimal ("1234.56") -> armazenamos como dígitos ("123456")
      initial_balance: decimalToCentsDigits(bank.initial_balance as unknown as string),
      is_active: bank.is_active,
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

  // Mesma UX antiga: formatamos na render; controlamos os dígitos via onKeyDown helper
  const handleMoneyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleUtilitaryAmountKeyDown(
      e,
      formData.initial_balance,
      (newVal: string) => setFormData((p) => ({ ...p, initial_balance: newVal }))
    );
  };

  const submitBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const initial_balance = digitsToDecimalString(formData.initial_balance);

    try {
      if (mode === "create") {
        // request<T> => ApiSuccess<T>
        const { data: created } = await api.addBank({
          institution: formData.institution,
          account_type: formData.account_type,
          currency: formData.currency,
          branch: formData.branch,
          account_number: formData.account_number,
          iban: formData.iban || "",
          initial_balance, // decimal string
          is_active: formData.is_active,
        });
        // UI imediata
        setAdded((prev) => [created, ...prev]);
    } else if (editingBank) {
      await api.editBank(editingBank.id, {
        institution: formData.institution,
        account_type: formData.account_type,
        currency: formData.currency,
        branch: formData.branch,
        account_number: formData.account_number,
        iban: formData.iban || "",
        initial_balance,
        is_active: formData.is_active,
      });

      // update otimista (mantém tipos corretos)
      const updatedLocal: BankAccount = {
        ...editingBank,
        institution: formData.institution,
        account_type: formData.account_type as BankAccount["account_type"],
        currency: formData.currency,
        branch: formData.branch,
        account_number: formData.account_number,
        iban: formData.iban || "",
        initial_balance,
        is_active: formData.is_active,
      };

      setBanks(prev => prev.map(b => b.id === updatedLocal.id ? updatedLocal : b));
      setAdded(prev => prev.map(b => b.id === updatedLocal.id ? updatedLocal : b));
    }

      await fetchBanks(); // mantém consistente
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao salvar banco."
      );
    }
  };

  const deleteBank = async (bank: BankAccount) => {
    if (!window.confirm(`Excluir conta "${bank.institution}"?`)) return;
    try {
      // UI imediata
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(bank.id);
        return next;
      });

      await api.deleteBank(bank.id);

      // Revalida servidor
      await fetchBanks();

      // Se estava em "added", remove para evitar fantasma
      setAdded((prev) => prev.filter((b) => b.id !== bank.id));
    } catch (err) {
      // rollback overlay
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(bank.id);
        return next;
      });
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir banco."
      );
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
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  Configurações
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  Bancos
                </h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    Contas bancárias
                  </span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar banco
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {visibleBanks.map((b) => (
                  <Row
                    key={b.id}
                    bank={b}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteBank}
                  />
                ))}
                {visibleBanks.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    Nenhum banco cadastrado.
                  </p>
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
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  required
                />

                <SelectDropdown
                  label="Tipo de conta"
                  items={ACCOUNT_TYPES}
                  selected={ACCOUNT_TYPES.filter(
                    (a) => a.value === formData.account_type
                  )}
                  onChange={(items) =>
                    items[0] &&
                    setFormData((p) => ({
                      ...p,
                      account_type: items[0].value,
                    }))
                  }
                  getItemKey={(item) => item.value}
                  getItemLabel={(item) => item.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Selecione o tipo de conta"
                />

                <Input
                  label="Agência"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                />
                <Input
                  label="Conta"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                />
                <Input
                  label="IBAN"
                  name="iban"
                  value={formData.iban}
                  onChange={handleChange}
                />

                <Input
                  label="Saldo inicial"
                  name="initial_balance"
                  type="text"
                  placeholder="0,00"
                  value={formatCurrency(formData.initial_balance)}  // mantém formatação antiga
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, initial_balance: e.target.value }))
                  }
                  onKeyDown={handleMoneyKeyDown}
                />

                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        is_active: e.target.checked,
                      }))
                    }
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
        severity="error"
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default BankSettings;
