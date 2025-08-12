/* -------------------------------------------------------------------------- */
/*  File: src/pages/LedgerAccountSettings.tsx                                 */
/*  Style: Navbar fixa + SidebarSettings, light borders, compact labels       */
/*  UX: busca, filtro por grupo, Lista/Acordeão, expandir todos               */
/*  Notes: no backdrop-close; honors fixed heights; no horizontal overflow    */
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
import { generateLedgerAccountsPDF } from "@/lib/pdf/ledgerAccountPdfGenerator";

import { api } from "src/api/requests";
import { LedgerAccount } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

/* ----------------------------- Const & Types ----------------------------- */

type TxType = "debit" | "credit";

const GROUP_OPTIONS: { label: string; value: string; tx: TxType }[] = [
  { label: "Receitas Operacionais", value: "Receitas Operacionais", tx: "credit" },
  { label: "Receitas Não Operacionais", value: "Receitas Não Operacionais", tx: "credit" },
  { label: "Despesas Operacionais", value: "Despesas Operacionais", tx: "debit" },
  { label: "Despesas Não Operacionais", value: "Despesas Não Operacionais", tx: "debit" },
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

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "CC"; // Contas Contábeis
}
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] px-2 py-[2px] rounded-full border border-gray-200 bg-gray-50 text-gray-700">
    {children}
  </span>
);

/* ---------------------------- Main component ----------------------------- */
const LedgerAccountSettings: React.FC = () => {
  useEffect(() => {
    document.title = "Contas Contábeis";
  }, []);
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

  // View mode / filtros
  const [viewMode, setViewMode] = useState<"accordion" | "list">("accordion");
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Menu ⋯
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Acordeões abertos
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const toggleAccordion = (groupName: string) => {
    setOpenAccordions((prev) => {
      const s = new Set(prev);
      if (s.has(groupName)) s.delete(groupName);
      else s.add(groupName);
      return s;
    });
  };
  const expandAll = (allGroups: string[]) => setOpenAccordions(new Set(allGroups));
  const collapseAll = () => setOpenAccordions(new Set());

  const handleDownloadPDF = async () => {
    try {
      const result = await generateLedgerAccountsPDF({
        companyName: "Spifex",
        title: "Lista de Contas Contábeis",
      });
      setSnackBarMessage(result.message || "PDF gerado.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setSnackBarMessage("Erro inesperado ao gerar o PDF.");
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
  const accountsFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const byGroup = !filterGroup || a.group === filterGroup;
      const bySearch =
        !s ||
        a.general_ledger_account.toLowerCase().includes(s) ||
        a.group.toLowerCase().includes(s) ||
        a.subgroup.toLowerCase().includes(s);
      return byGroup && bySearch;
    });
  }, [accounts, search, filterGroup]);

  const groups = useMemo(
    () => Array.from(new Set(accountsFiltered.map((a) => a.group))).filter(Boolean),
    [accountsFiltered]
  );

  const subgroupOptions = useMemo(() => {
    if (!formData.group) return [] as { label: string; value: string }[];
    const list = accounts
      .filter((a) => a.group === formData.group)
      .map((a) => a.subgroup)
      .filter(Boolean);
    const unique = Array.from(new Set(list));
    return unique.map((sg) => ({ label: sg, value: sg }));
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
    setFormData((p) => ({ ...p, general_ledger_account: value }));
  };

  const handleGroupChange = (items: { label: string; value: string }[]) => {
    const sel = items[0];
    if (!sel) {
      setFormData((p) => ({ ...p, group: "", subgroup: "", transaction_type: "debit" }));
      return;
    }
    const found = GROUP_OPTIONS.find((g) => g.value === sel.value);
    const tx = found?.tx ?? "debit";
    setFormData((p) => ({ ...p, group: sel.value, transaction_type: tx, subgroup: "" }));
    setAddingNewSubgroup(false);
  };

  const handleSubgroupChange = (items: { label: string; value: string }[]) => {
    const sel = items[0];
    setFormData((p) => ({ ...p, subgroup: sel ? sel.value : "" }));
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
      if (mode === "create") await api.addLedgerAccount(payload);
      else if (editing) await api.editLedgerAccount([editing.id], payload);
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
    if (
      !window.confirm(
        "Tem certeza que deseja excluir TODAS as contas contábeis? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }
    try {
      setDeletingAll(true);
      await api.deleteAllLedgerAccounts();
      navigate("/settings/register/ledger-accounts", { replace: true });
    } catch {
      setSnackBarMessage("Erro ao excluir todas as contas.");
    } finally {
      setDeletingAll(false);
      setMenuOpen(false);
    }
  };

  // Fecha menu ⋯ ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // ESC fecha modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  // trava scroll do body com modal
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ----------------------- View render helpers --------------------------- */
  const RowAccountList = ({ a }: { a: LedgerAccount }) => (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate">
          {a.general_ledger_account}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Badge>{a.group}</Badge>
          <Badge>{a.subgroup}</Badge>
          <Badge>{a.transaction_type === "credit" ? "Crédito" : "Débito"}</Badge>
        </div>
      </div>
      {isOwner && (
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
            onClick={() => openEditModal(a)}
          >
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteAccount(a)}>
            Excluir
          </Button>
        </div>
      )}
    </div>
  );

  const renderListView = () => {
    const sorted = [...accountsFiltered].sort((a, b) => {
      const g = a.group.localeCompare(b.group);
      if (g !== 0) return g;
      const sg = a.subgroup.localeCompare(b.subgroup);
      if (sg !== 0) return sg;
      return a.general_ledger_account.localeCompare(b.general_ledger_account);
    });
    return (
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <span className="text-[11px] uppercase tracking-wide text-gray-700">Todas as contas</span>
        </div>
        <div className="divide-y divide-gray-200">
          {sorted.map((a) => (
            <RowAccountList key={a.id} a={a} />
          ))}
          {sorted.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-500">Nenhuma conta encontrada.</p>
          )}
        </div>
      </div>
    );
  };

  /* ----------------------------- Render ---------------------------------- */
  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="ledger-accounts" />

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar; sem overflow lateral */}
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  Configurações
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  Contas contábeis
                </h1>
              </div>

              {/* Toolbar direita */}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button onClick={openCreateModal} className="!py-1.5">
                    Adicionar conta
                  </Button>
                  <div className="relative" ref={menuRef}>
                    <Button
                      variant="outline"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      title="Opções"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                    >
                      ⋯
                    </Button>
                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden"
                      >
                        <button
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 border-b border-gray-100 transition-colors"
                          onClick={handleDownloadPDF}
                          disabled={accounts.length === 0}
                          title={
                            accounts.length === 0 ? "Nenhuma conta disponível" : "Baixar lista em PDF"
                          }
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
          </header>

          {/* Filtros + toggle de visualização */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-72">
                      <Input
                        label="Busca"
                        placeholder="Buscar por conta, grupo ou subgrupo..."
                        name="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <SelectDropdown
                      label="Grupo"
                      items={GROUP_OPTIONS.map((g) => ({ label: g.label, value: g.value }))}
                      selected={
                        filterGroup ? [{ label: filterGroup, value: filterGroup }] : []
                      }
                      onChange={(items) => setFilterGroup(items[0]?.value ?? null)}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel="Filtrar por grupo"
                      clearOnClickOutside={false}
                      customStyles={{ maxHeight: "240px" }}
                    />

                    {(search || filterGroup) && (
                      <Button
                        variant="outline"
                        className="self-end !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => {
                          setSearch("");
                          setFilterGroup(null);
                        }}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === "accordion" && groups.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                          onClick={() =>
                            openAccordions.size === groups.length
                              ? collapseAll()
                              : expandAll(groups)
                          }
                        >
                          {openAccordions.size === groups.length
                            ? "Recolher todos"
                            : "Expandir todos"}
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={() => setViewMode((v) => (v === "accordion" ? "list" : "accordion"))}
                    >
                      {viewMode === "accordion" ? "Ver como Lista" : "Ver como Acordeão"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4">
                {viewMode === "list" ? (
                  renderListView()
                ) : (
                  <div className="space-y-4">
                    {groups.map((g) => {
                      const accInGroup = accountsFiltered.filter((a) => a.group === g);
                      if (accInGroup.length === 0) return null;
                      const subsInGroup = Array.from(new Set(accInGroup.map((a) => a.subgroup)));
                      const isOpen = openAccordions.has(g);

                      return (
                        <div key={g} className="rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => toggleAccordion(g)}
                            className="w-full flex items-center justify-between cursor-pointer select-none px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-[13px] font-semibold text-gray-900">{g}</span>
                            <svg
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
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
                              {subsInGroup.map((sg) => (
                                <div key={sg}>
                                  <p className="text-[12px] font-semibold text-gray-800 mb-2">
                                    {sg}
                                  </p>
                                  <div className="divide-y divide-gray-200">
                                    {accInGroup
                                      .filter((a) => a.subgroup === sg)
                                      .map((a) => (
                                        <div
                                          key={a.id}
                                          className="flex items-center justify-between px-2 py-2 hover:bg-gray-50"
                                        >
                                          <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-gray-900 truncate">
                                              {a.general_ledger_account}
                                            </p>
                                            <div className="mt-1 flex gap-2">
                                              <Badge>
                                                {a.transaction_type === "credit"
                                                  ? "Crédito"
                                                  : "Débito"}
                                              </Badge>
                                            </div>
                                          </div>
                                          {isOwner && (
                                            <div className="flex gap-2 shrink-0">
                                              <Button
                                                variant="outline"
                                                className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                                                onClick={() => openEditModal(a)}
                                              >
                                                Editar
                                              </Button>
                                              <Button
                                                variant="common"
                                                onClick={() => deleteAccount(a)}
                                              >
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

                    {groups.length === 0 && (
                      <p className="p-4 text-center text-sm text-gray-500">
                        Nenhuma conta encontrada.
                      </p>
                    )}
                  </div>
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
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar conta" : "Editar conta"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitAccount}>
                {/* 1) Conta contábil */}
                <Input
                  label="Conta contábil"
                  name="general_ledger_account"
                  value={formData.general_ledger_account}
                  onChange={handleNameChange}
                  required
                />

                {/* 2) Grupo */}
                <SelectDropdown
                  label="Grupo"
                  items={GROUP_OPTIONS.map((g) => ({ label: g.label, value: g.value }))}
                  selected={formData.group ? [{ label: formData.group, value: formData.group }] : []}
                  onChange={handleGroupChange}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Selecione um grupo"
                  disabled={!formData.general_ledger_account}
                />

                {/* 3) Subgrupo */}
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  {addingNewSubgroup ? (
                    <Input
                      label="Subgrupo (novo)"
                      name="subgroup"
                      value={formData.subgroup}
                      onChange={(e) => setFormData((p) => ({ ...p, subgroup: e.target.value }))}
                      disabled={!formData.group}
                      required
                    />
                  ) : (
                    <SelectDropdown
                      label="Subgrupo"
                      items={subgroupOptions}
                      selected={
                        formData.subgroup
                          ? [{ label: formData.subgroup, value: formData.subgroup }]
                          : []
                      }
                      onChange={handleSubgroupChange}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
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
                      setAddingNewSubgroup((v) => !v);
                      setFormData((p) => ({ ...p, subgroup: "" }));
                    }}
                    disabled={!formData.group}
                    className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  >
                    {addingNewSubgroup ? "Cancelar" : "+"}
                  </Button>
                </div>

                {/* Tipo inferido */}
                <p className="text-[12px] text-gray-600">
                  {!formData.general_ledger_account
                    ? "Preencha o campo de Conta Contábil"
                    : !formData.group
                    ? "Selecione um grupo"
                    : (
                      <>
                        Tipo de transação:{" "}
                        <b>{formData.transaction_type === "credit" ? "Crédito" : "Débito"}</b>
                      </>
                    )}
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !formData.general_ledger_account || !formData.group || !formData.subgroup
                    }
                  >
                    Salvar
                  </Button>
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
        <Alert
          severity={
            typeof snackBarMessage === "string" &&
            /sucesso|gerado|conclu/i.test(snackBarMessage)
              ? "success"
              : "error"
          }
        >
          {snackBarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LedgerAccountSettings;
