/* -----------------------------------------------------------------------------
 * File: src/pages/BankSettings.tsx
 * Style: Navbar fixa + SidebarSettings, light borders, compact labels
 * Notes: no backdrop-close; honors fixed heights; no horizontal overflow
 * Dinâmica: overlay local p/ add/delete + refresh do fetch
 * i18n: group "bank" inside namespace "settings"
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback, useMemo } from "react";

import Navbar from "src/components/layout/Navbar";
import SidebarSettings from "src/components/layout/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import Checkbox from "src/components/ui/Checkbox";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import ConfirmToast from "src/components/ui/ConfirmToast";

import { api } from "src/api/requests";
import { BankAccount } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

import { formatCurrency, decimalToCentsDigits } from "src/lib/currency";
import { handleUtilitaryAmountKeyDown } from "src/lib/form/amountKeyHandlers";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

const ACCOUNT_TYPE_VALUES = ["checking", "savings", "investment", "cash"] as const;
type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

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
  t,
}: {
  bank: BankAccount;
  onEdit: (b: BankAccount) => void;
  onDelete: (b: BankAccount) => void;
  canEdit: boolean;
  t: TFunction;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">{bank.institution}</p>
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
          {t("settings:bank.btn.edit")}
        </Button>
        <Button variant="common" onClick={() => onDelete(bank)}>
          {t("settings:bank.btn.delete")}
        </Button>
      </div>
    )}
  </div>
);

const BankSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  useEffect(() => {
    document.title = t("settings:bank.title");
  }, [t]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

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
    account_type: "checking" as AccountType,
    currency: "BRL",
    branch: "",
    account_number: "",
    iban: "",
    initial_balance: "0",
    is_active: true,
  });

  const [snack, setSnack] = useState<Snack>(null);

  /* --------- Overlay dinâmico: adicionados e ids excluídos (UI imediata) --- */
  const [added, setAdded] = useState<BankAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set<string>());

  /* ---------------- Confirm Toast (reusable) ---------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ------------------------------ Carrega dados ----------------------------- */
  const fetchBanks = useCallback(async () => {
    try {
      const { data } = await api.getAllBanks(); // ApiSuccess<Paginated<BankAccount>>
      const list: BankAccount[] = data?.results ?? [];
      const sorted = [...list].sort((a, b) => (a.institution || "").localeCompare(b.institution || ""));
      setBanks(sorted);
    } catch {
      setSnack({ message: t("settings:bank.toast.fetchError"), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchBanks();
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
      account_type: (bank.account_type as AccountType) || "checking",
      currency: bank.currency || "BRL",
      branch: bank.branch,
      account_number: bank.account_number,
      iban: bank.iban || "",
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
    handleUtilitaryAmountKeyDown(e, formData.initial_balance, (newVal: string) =>
      setFormData((p) => ({ ...p, initial_balance: newVal }))
    );
  };

  const submitBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const initial_balance = digitsToDecimalString(formData.initial_balance);

    try {
      if (mode === "create") {
        const { data: created } = await api.addBank({
          institution: formData.institution,
          account_type: formData.account_type,
          currency: formData.currency,
          branch: formData.branch,
          account_number: formData.account_number,
          iban: formData.iban || "",
          initial_balance,
          is_active: formData.is_active,
        });
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

        setBanks((prev) => prev.map((b) => (b.id === updatedLocal.id ? updatedLocal : b)));
        setAdded((prev) => prev.map((b) => (b.id === updatedLocal.id ? updatedLocal : b)));
      }

      await fetchBanks();
      closeModal();
      // opcional: sucesso
      // setSnack({ message: t("settings:bank.toast.saveOk"), severity: "success" });
    } catch {
      setSnack({ message: t("settings:bank.toast.saveError"), severity: "error" });
    }
  };

  /** Abre o ConfirmToast e executa exclusão com UI otimista */
  const requestDeleteBank = (bank: BankAccount) => {
    setConfirmText(t("settings:bank.confirm.delete", { name: bank.institution }));
    setConfirmAction(() => async () => {
      try {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(bank.id);
          return next;
        });

        await api.deleteBank(bank.id);
        await fetchBanks();
        setAdded((prev) => prev.filter((b) => b.id !== bank.id));
        // opcional: sucesso
        // setSnack({ message: t("settings:bank.toast.deleteOk"), severity: "success" });
      } catch {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(bank.id);
          return next;
        });
        setSnack({ message: t("settings:bank.toast.deleteError"), severity: "error" });
      } finally {
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
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
  const accountTypeOptions = ACCOUNT_TYPE_VALUES.map((value) => ({
    value,
    label: t(`settings:bank.accountType.${value}`),
  }));

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
                  {t("settings:bank.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:bank.header.title")}
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
                    {t("settings:bank.section.list")}
                  </span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      {t("settings:bank.btn.addBank")}
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
                    onDelete={requestDeleteBank}
                    t={t}
                  />
                ))}
                {visibleBanks.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">{t("settings:bank.empty")}</p>
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
                  {mode === "create" ? t("settings:bank.modal.createTitle") : t("settings:bank.modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:bank.modal.close")}
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitBank}>
                <Input
                  label={t("settings:bank.field.institution")}
                  name="institution"
                  value={formData.institution}
                  onChange={handleChange}
                  required
                />

                <SelectDropdown<{ value: AccountType; label: string }>
                  label={t("settings:bank.field.accountType")}
                  items={accountTypeOptions}
                  selected={accountTypeOptions.filter((a) => a.value === formData.account_type)}
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
                  buttonLabel={t("settings:bank.btn.selectAccountType")}
                />

                <Input label={t("settings:bank.field.branch")} name="branch" value={formData.branch} onChange={handleChange} />
                <Input
                  label={t("settings:bank.field.accountNumber")}
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                />
                <Input label={t("settings:bank.field.iban")} name="iban" value={formData.iban} onChange={handleChange} />

                <Input
                  label={t("settings:bank.field.initialBalance")}
                  name="initial_balance"
                  type="text"
                  placeholder="0,00"
                  value={formatCurrency(formData.initial_balance)}
                  onChange={(e) => setFormData((p) => ({ ...p, initial_balance: e.target.value }))}
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
                  <span className="text-[12px] text-gray-700">{t("settings:bank.field.isActive")}</span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:bank.btn.cancel")}
                  </Button>
                  <Button type="submit">{t("settings:bank.btn.save")}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* -------------------------- Confirm Toast ---------------------------- */}
      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("settings:bank.confirm.confirmLabel")}
        cancelLabel={t("settings:bank.confirm.cancelLabel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction
            ?.()
            .catch(() => {
              setSnack({ message: t("settings:bank.toast.confirmFail"), severity: "error" });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      {/* ----------------------------- Snackbar ------------------------------ */}
      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default BankSettings;
