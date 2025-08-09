/* -------------------------------------------------------------------------- */
/*  File: src/pages/LedgerAccountSettings.tsx                                 */
/* -------------------------------------------------------------------------- */

import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import { SelectDropdown } from "@/components/SelectDropdown";
import { generateLedgerAccountsPDF } from '@/lib/pdf/ledgerAccountPdfGenerator';

import { api } from "src/api/requests";
import { LedgerAccount } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

/* ----------------------------- Const & Types ----------------------------- */

type TxType = "debit" | "credit";

const GROUP_OPTIONS: { label: string; value: string; tx: TxType }[] = [
  { label: "Receitas Operacionais",      value: "Receitas Operacionais",      tx: "credit" },
  { label: "Receitas Não Operacionais",  value: "Receitas Não Operacionais",  tx: "credit" },
  { label: "Despesas Operacionais",      value: "Despesas Operacionais",      tx: "debit"  },
  { label: "Despesas Não Operacionais",  value: "Despesas Não Operacionais",  tx: "debit"  },
];

type FormState = {
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: TxType;
};

const EMPTY_FORM: FormState = {
  general_ledger_account: "",
  group: "",
  subgroup: "",
  transaction_type: "debit",
};

/* ---------------------------- Main component ----------------------------- */
const LedgerAccountSettings: React.FC = () => {
  useEffect(() => { document.title = "Contas Contábeis"; }, []);
  const navigate = useNavigate();
  const { isOwner } = useAuthContext();

  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  // Modal & form
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<LedgerAccount | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [addingNewSubgroup, setAddingNewSubgroup] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"accordion" | "list">("accordion");

  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const toggleAccordion = (groupName: string) => {
    setOpenAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };
  
  const handleDownloadPDF = async () => {
    try {
      const result = await generateLedgerAccountsPDF({
        companyName: 'Spifex',
        title: 'Lista de Contas Contábeis'
      });

      if (result.success) {
        setSnackBarMessage(result.message);
      } else {
        setSnackBarMessage(result.message);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setSnackBarMessage('Erro inesperado ao gerar o PDF.');
    } finally {
      setMenuOpen(false);
    }
  };

  /* ------------------------ Load & gate logic ----------------------------- */
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.getAllLedgerAccounts();
      const sorted = res.data.general_ledger_accounts.sort((a, b) => a.id - b.id);
      setAccounts(sorted);

      if (sorted.length === 0) {
        navigate("/settings/register/ledger-accounts", { replace: true });
        return;
      }
    } catch (e: unknown) {
      const error = e as { code?: string };
      const code = error?.code;
      if (code === "NOT_FOUND_GENERAL_LEDGER_ACCOUNT" || code === "NOT_FOUND") {
        navigate("/settings/register/ledger-accounts", { replace: true });
        return;
      }
      setSnackBarMessage("Erro ao buscar contas contábeis.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { 
    fetchAccounts(); 
  }, [fetchAccounts]);

  /* ----------------------- Derived collections ---------------------------- */
  const groups = useMemo(
    () => Array.from(new Set(accounts.map(a => a.group))),
    [accounts]
  );

  const subgroupOptions = useMemo(() => {
    if (!formData.group) return [] as { label: string; value: string }[];
    const list = accounts
      .filter(a => a.group === formData.group)
      .map(a => a.subgroup)
      .filter(Boolean);
    const unique = Array.from(new Set(list));
    return unique.map(sg => ({ label: sg, value: sg }));
  }, [accounts, formData.group]);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditing(null);
    setFormData(EMPTY_FORM);
    setAddingNewSubgroup(false);
    setModalOpen(true);
  };

  const openEditModal = (acc: LedgerAccount) => {
    setMode("edit");
    setEditing(acc);
    setAddingNewSubgroup(false);
    setFormData({
      general_ledger_account: acc.general_ledger_account,
      group: acc.group,
      subgroup: acc.subgroup,
      transaction_type: (acc.transaction_type as TxType) ?? "debit",
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setAddingNewSubgroup(false);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(p => ({ ...p, general_ledger_account: value }));
  };

  const handleGroupChange = (items: { label: string; value: string }[]) => {
    const sel = items[0];
    if (!sel) {
      setFormData(p => ({ ...p, group: "", subgroup: "", transaction_type: "debit" }));
      return;
    }
    const found = GROUP_OPTIONS.find(g => g.value === sel.value);
    const tx = found?.tx ?? "debit";
    setFormData(p => ({ ...p, group: sel.value, transaction_type: tx, subgroup: "" }));
    setAddingNewSubgroup(false);
  };

  const handleSubgroupChange = (items: { label: string; value: string }[]) => {
    const sel = items[0];
    setFormData(p => ({ ...p, subgroup: sel ? sel.value : "" }));
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        general_ledger_account: formData.general_ledger_account,
        group: formData.group,
        subgroup: formData.subgroup,
        transaction_type: formData.transaction_type,
      };
      if (mode === "create") {
        await api.addLedgerAccount(payload);
      } else if (editing) {
        await api.editLedgerAccount([editing.id], payload);
      }
      await fetchAccounts();
      closeModal();
    } catch {
      setSnackBarMessage("Erro ao salvar conta contábil.");
    }
  };

  const deleteAccount = async (acc: LedgerAccount) => {
    if (!window.confirm(`Excluir conta "${acc.general_ledger_account}"?`)) return;
    try {
      await api.deleteLedgerAccount([acc.id]);
      await fetchAccounts();
    } catch {
      setSnackBarMessage("Erro ao excluir conta.");
    }
  };

  const handleDeleteAll = async () => {
    if (deletingAll) return;
    if (!window.confirm("Tem certeza que deseja excluir TODAS as contas contábeis? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      setDeletingAll(true);
      await api.deleteAllLedgerAccounts();
      // Depois de deletar tudo, manda para o onboarding:
      navigate("/settings/register/ledger-accounts", { replace: true });
    } catch {
      setSnackBarMessage("Erro ao excluir todas as contas.");
    } finally {
      setDeletingAll(false);
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ----------------------- View render helpers --------------------------- */
  const renderListView = () => (
    <div className="space-y-6">
      {groups.map(g => {
        const accInGroup = accounts.filter(a => a.group === g);
        if (accInGroup.length === 0) return null;
        const subsInGroup = Array.from(new Set(accInGroup.map(a => a.subgroup)));
        return (
          <div key={g}>
            <h4 className="font-semibold text-lg">{g}</h4>
            {subsInGroup.map(sg => (
              <div key={sg} className="pl-4 mt-2 space-y-1">
                <p className="font-medium">{sg}</p>
                {accInGroup
                  .filter(a => a.subgroup === sg)
                  .map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between pl-4 pr-2 py-1 hover:bg-gray-100 rounded"
                    >
                      <span>{a.general_ledger_account}</span>
                      {isOwner && (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => openEditModal(a)}>
                            Editar
                          </Button>
                          <Button variant="common" onClick={() => deleteAccount(a)}>
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  /* ----------------------------- Render ---------------------------------- */
  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="ledger-accounts" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-6xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4 relative">
            <h3 className="text-lg font-semibold">Contas Contábeis</h3>

            {isOwner && (
              <div className="flex items-center gap-2">
                <Button onClick={openCreateModal}>Adicionar conta</Button>

                {/* Kebab menu */}
                <div className="relative" ref={menuRef}>
                  <Button
                    variant="outline"
                    onClick={() => setMenuOpen(v => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    title="Opções"
                  >
                    ⋯
                  </Button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                    >
                      <button
                        role="menuitem"
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 border-b border-gray-100 transition-colors"
                        onClick={handleDownloadPDF}
                        disabled={accounts.length === 0}
                        title={accounts.length === 0 ? "Nenhuma conta disponível" : "Baixar lista em PDF"}
                      >
                        Baixar contas contábeis em PDF
                      </button>
                      <button
                        role="menuitem"
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:text-red-300 transition-colors"
                        onClick={handleDeleteAll}
                        disabled={deletingAll || accounts.length === 0}
                        title={deletingAll ? "Processando..." : "Excluir todas as contas"}
                      >
                        {deletingAll ? "Excluindo…" : "Resetar contas contábeis"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(v => (v === "accordion" ? "list" : "accordion"))}
            >
              {viewMode === "accordion" ? "Ver como Lista" : "Ver como Acordeão"}
            </Button>

            {viewMode === "list" ? (
              renderListView()
            ) : (
<div className="space-y-4">
  {groups.map(g => {
    const accInGroup = accounts.filter(a => a.group === g);
    if (accInGroup.length === 0) return null;
    const subsInGroup = Array.from(new Set(accInGroup.map(a => a.subgroup)));
    const isOpen = openAccordions.has(g);
    
    return (
      <div key={g} className="rounded-lg border border-gray-200">
        <button
          onClick={() => toggleAccordion(g)}
          className="w-full flex items-center justify-between cursor-pointer select-none px-4 py-2 bg-gray-100 font-semibold hover:bg-gray-200 transition-colors"
        >
          <span>{g}</span>
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            role="none"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="m12 6.662 9.665 8.59-1.33 1.495L12 9.337l-8.335 7.41-1.33-1.495L12 6.662Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        
        {isOpen && (
          <div className="p-4 space-y-4">
            {subsInGroup.map(sg => (
              <div key={sg}>
                <p className="font-medium mb-2">{sg}</p>
                <div className="space-y-1 pl-4">
                  {accInGroup
                    .filter(a => a.subgroup === sg)
                    .map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between pr-2 py-1 hover:bg-gray-50 rounded"
                      >
                        <span>{a.general_ledger_account}</span>
                        {isOwner && (
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => openEditModal(a)}>
                              Editar
                            </Button>
                            <Button variant="common" onClick={() => deleteAccount(a)}>
                              Excluir
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  })}
</div>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh]"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar conta" : "Editar conta"}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-700" onClick={closeModal}>
                &times;
              </button>
            </header>

            <form className="space-y-4" onSubmit={submitAccount}>
              {/* 1) Conta contábil (libera Grupo quando tiver texto) */}
              <Input
                label="Conta contábil"
                name="general_ledger_account"
                value={formData.general_ledger_account}
                onChange={handleNameChange}
                required
              />

              {/* 2) Grupo (somente após ter conta) */}
              <SelectDropdown
                label="Grupo"
                items={GROUP_OPTIONS.map(g => ({ label: g.label, value: g.value }))}
                selected={
                  formData.group
                    ? [{ label: formData.group, value: formData.group }]
                    : []
                }
                onChange={handleGroupChange}
                getItemKey={i => i.value}
                getItemLabel={i => i.label}
                singleSelect
                hideCheckboxes
                buttonLabel="Selecione um grupo"
                disabled={!formData.general_ledger_account}
              />

              {/* 3) Subgrupo (somente após selecionar grupo) */}
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                {addingNewSubgroup ? (
                  <Input
                    label="Subgrupo (novo)"
                    name="subgroup"
                    value={formData.subgroup}
                    onChange={e => setFormData(p => ({ ...p, subgroup: e.target.value }))}
                    disabled={!formData.group}
                    required
                  />
                ) : (
                  <SelectDropdown
                    label="Subgrupo"
                    items={subgroupOptions}
                    selected={
                      formData.subgroup ? [{ label: formData.subgroup, value: formData.subgroup }] : []
                    }
                    onChange={handleSubgroupChange}
                    getItemKey={i => i.value}
                    getItemLabel={i => i.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel="Selecione um subgrupo"
                    disabled={!formData.group}
                  />
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Alterna entre Select e Input
                    setAddingNewSubgroup(v => !v);
                    // se vai entrar no modo “novo subgrupo”, limpa o valor
                    setFormData(p => ({ ...p, subgroup: "" }));
                  }}
                  disabled={!formData.group}
                >
                  {addingNewSubgroup ? "Cancelar" : "+"}
                </Button>
              </div>

              {/* transaction_type é inferido – sem campo visível. Se quiser, mostre como texto: */}
              <p className="text-xs text-gray-500">
                {!formData.general_ledger_account ? (
                  "Preencha o campo de Conta Contábil"
                ) : !formData.group ? (
                  "Selecione um grupo"
                ) : (
                  <>
                    Tipo de transação:{" "}
                    <b>{formData.transaction_type === "credit" ? "Crédito" : "Débito"}</b>
                    {" "}
                  </>
                )}
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="cancel" type="button" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !formData.general_ledger_account ||
                    !formData.group ||
                    !formData.subgroup
                  }
                >
                  Salvar
                </Button>
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

export default LedgerAccountSettings;
