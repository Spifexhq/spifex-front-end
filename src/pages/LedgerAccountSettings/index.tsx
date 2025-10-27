/* -------------------------------------------------------------------------- */
/*  File: src/pages/LedgerAccountSettings.tsx                                 */
/*  Refactor: GLAccount (id string) + paginação                               */
/*           Campos: name, code?, category(1..4), subcategory, default_tx,    */
/*           is_active                                                        */
/*           - Backend recebe APENAS números (1..4)                           */
/*           - Front exibe labels em PT                                       */
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
import ConfirmToast from "@/components/ConfirmToast/ConfirmToast";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { useTranslation } from "react-i18next";

/** Tipos do domínio/DTO */
import type { GLAccount } from "src/models/enterprise_structure/domain/GLAccount";
import type {
  GetLedgerAccountsResponse,
  AddGLAccountRequest,
  EditGLAccountRequest,
} from "src/models/enterprise_structure/dto";
import Checkbox from "src/components/Checkbox";

/* ----------------------------- Const & Types ----------------------------- */

type TxType = "debit" | "credit";

/** Labels exibidos (UI) — permanecem em PT para manter o mapeamento estável */
type CategoryLabel =
  | "Receitas Operacionais"
  | "Receitas Não Operacionais"
  | "Despesas Operacionais"
  | "Despesas Não Operacionais";

/** Valores aceitos pelo backend (1..4) */
type CategoryValue = 1 | 2 | 3 | 4;

/** Mapeamentos label <-> value */
const CATEGORY_LABEL_TO_VALUE: Record<CategoryLabel, CategoryValue> = {
  "Receitas Operacionais": 1,
  "Receitas Não Operacionais": 2,
  "Despesas Operacionais": 3,
  "Despesas Não Operacionais": 4,
};
const CATEGORY_VALUE_TO_LABEL: Record<CategoryValue, CategoryLabel> = {
  1: "Receitas Operacionais",
  2: "Receitas Não Operacionais",
  3: "Despesas Operacionais",
  4: "Despesas Não Operacionais",
};
const CATEGORY_DEFAULT_TX: Record<CategoryValue, TxType> = {
  1: "credit",
  2: "credit",
  3: "debit",
  4: "debit",
};

/** Opções para o Select – labels em PT, conforme requisito */
const GROUP_OPTIONS: { label: CategoryLabel; value: CategoryLabel; inferredTx: TxType }[] = [
  { label: "Receitas Operacionais", value: "Receitas Operacionais", inferredTx: "credit" },
  { label: "Receitas Não Operacionais", value: "Receitas Não Operacionais", inferredTx: "credit" },
  { label: "Despesas Operacionais", value: "Despesas Operacionais", inferredTx: "debit" },
  { label: "Despesas Não Operacionais", value: "Despesas Não Operacionais", inferredTx: "debit" },
];

/** Form usa labels (UI), API usa números */
type FormState = {
  name: string;
  category: CategoryLabel | "";
  subcategory: string;
  code?: string;
  is_active?: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  subcategory: "",
  code: "",
  is_active: true,
};

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "CC";
}
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] px-2 py-[2px] rounded-full border border-gray-200 bg-gray-50 text-gray-700">
    {children}
  </span>
);

/** GLAccount “tolerante” para leitura */
type GLX = GLAccount & {
  category?: number | string | null;
  default_tx?: TxType | string | null;
  external_id?: string;
};

/** Extrai CategoryValue (1..4) de um account */
function getCategoryValue(acc: GLX): CategoryValue | undefined {
  const c = acc.category;
  if (typeof c === "number") {
    if (c === 1 || c === 2 || c === 3 || c === 4) return c as CategoryValue;
  } else if (typeof c === "string" && c) {
    const n = Number(c);
    if (n === 1 || n === 2 || n === 3 || n === 4) return n as CategoryValue;
  }
  return undefined;
}

/** Converte para label UI */
function getCategoryLabel(acc: GLX): CategoryLabel | string {
  const v = getCategoryValue(acc);
  return v ? CATEGORY_VALUE_TO_LABEL[v] : "settings:ledgerAccounts.tags.noGroup";
}

/** Pega default_tx (se não vier do back, infere pela categoria) */
function getDefaultTx(acc: GLX): TxType | "" {
  const dt = acc.default_tx;
  if (dt === "credit" || dt === "debit") return dt;
  const v = getCategoryValue(acc);
  return v ? CATEGORY_DEFAULT_TX[v] : "";
}

/** ID (external_id) */
function getGlaId(acc: GLAccount): string {
  const a = acc as GLAccount & { id?: string; external_id?: string };
  return a.id ?? a.external_id ?? "";
}

/* ---------------------------- Main component ----------------------------- */
const LedgerAccountSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);

  useEffect(() => {
    document.title = t("settings:ledgerAccounts.title");
  }, [t]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const navigate = useNavigate();
  const { isOwner } = useAuthContext();

  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  // Modal & form
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<GLAccount | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [addingNewSubgroup, setAddingNewSubgroup] = useState(false);

  // View mode / filtros
  const [viewMode, setViewMode] = useState<"accordion" | "list">("accordion");
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<CategoryLabel | null>(null);

  // Menu ⋯
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Acordeões abertos
  const [openAccordions, setOpenAccordions] = useState<Set<CategoryLabel>>(new Set());
  const toggleAccordion = (groupName: CategoryLabel) => {
    setOpenAccordions((prev) => {
      const s = new Set(prev);
      if (s.has(groupName)) s.delete(groupName);
      else s.add(groupName);
      return s;
    });
  };
  const expandAll = (allGroups: CategoryLabel[]) => setOpenAccordions(new Set(allGroups));
  const collapseAll = () => setOpenAccordions(new Set());

  const handleDownloadPDF = async () => {
    try {
      const result = await generateLedgerAccountsPDF({
        companyName: t("settings:ledgerAccounts.pdf.company"),
        title: t("settings:ledgerAccounts.pdf.title"),
      });
      setSnackBarMessage(result.message || t("settings:ledgerAccounts.toast.pdfOk"));
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setSnackBarMessage(t("settings:ledgerAccounts.toast.pdfError"));
    } finally {
      setMenuOpen(false);
    }
  };

  /* ---------------- Confirm Toast state ---------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ------------------------ Load & gate logic ----------------------------- */
  const fetchAllAccounts = useCallback(async (): Promise<GLAccount[]> => {
    const all: GLAccount[] = [];
    let cursor: string | undefined;
    do {
      const { data } = (await api.getLedgerAccounts({
        page_size: 200,
        cursor,
      })) as { data: GetLedgerAccountsResponse };

      const page = (data?.results ?? []) as GLAccount[];
      all.push(...page);
      cursor = data?.next ?? undefined;
    } while (cursor);

    return all.sort((a, b) => {
      const ca = (a.code || "").toString();
      const cb = (b.code || "").toString();
      if (ca && cb && ca !== cb) return ca.localeCompare(cb, "pt-BR", { numeric: true });
      return (a.name || "").localeCompare(b.name || "", "pt-BR");
    });
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const sorted = await fetchAllAccounts();
      setAccounts(sorted);

      if (sorted.length === 0) {
        navigate("/settings/register/ledger-accounts", { replace: true });
        return;
      }
    } catch {
      navigate("/settings/register/ledger-accounts", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [fetchAllAccounts, navigate]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /* ----------------------- Derived collections ---------------------------- */
  const accountsFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const labelOrKey = getCategoryLabel(a as GLX);
      const label =
        labelOrKey.startsWith("settings:ledgerAccounts")
          ? t(labelOrKey)
          : (labelOrKey as string);

      const byGroup = !filterGroup || label === filterGroup;
      const bySearch =
        !s ||
        (a.name || "").toLowerCase().includes(s) ||
        (label || "").toLowerCase().includes(s) ||
        (a.subcategory || "").toLowerCase().includes(s) ||
        (a.code || "").toLowerCase().includes(s);
      return byGroup && bySearch;
    });
  }, [accounts, search, filterGroup, t]);

  const groups = useMemo(() => {
    const labels = accountsFiltered
      .map((a) => getCategoryLabel(a as GLX))
      .map((lab) => (lab.startsWith("settings:ledgerAccounts") ? t(lab) : lab))
      .filter((l): l is CategoryLabel => !!l && !l.startsWith("settings:ledgerAccounts"));
    return Array.from(new Set(labels)) as CategoryLabel[];
  }, [accountsFiltered, t]);

  const subgroupOptions = useMemo(() => {
    if (!formData.category) return [] as { label: string; value: string }[];
    const list = accounts
      .filter((a) => {
        const lab = getCategoryLabel(a as GLX);
        const resolved = lab.startsWith("settings:ledgerAccounts") ? t(lab) : lab;
        return resolved === formData.category;
      })
      .map((a) => a.subcategory || "")
      .filter(Boolean);
    const unique = Array.from(new Set(list));
    return unique.map((sg) => ({ label: sg, value: sg }));
  }, [accounts, formData.category, t]);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditing(null);
    setFormData(EMPTY_FORM);
    setAddingNewSubgroup(false);
    setModalOpen(true);
  };

  const openEditModal = (acc: GLAccount) => {
    setMode("edit");
    setEditing(acc);
    setAddingNewSubgroup(false);
    const labelOrKey = getCategoryLabel(acc as GLX);
    const label = labelOrKey.startsWith("settings:ledgerAccounts") ? t(labelOrKey) : (labelOrKey as CategoryLabel | "");
    setFormData({
      name: acc.name || "",
      category: label as CategoryLabel | "",
      subcategory: acc.subcategory || "",
      code: acc.code || "",
      is_active: acc.is_active ?? true,
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
    setFormData((p) => ({ ...p, name: value }));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((p) => ({ ...p, code: value }));
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, is_active: e.target.checked }));
  };

  const handleGroupChange = (items: { label: CategoryLabel; value: CategoryLabel }[]) => {
    const sel = items[0];
    if (!sel) {
      setFormData((p) => ({ ...p, category: "", subcategory: "" }));
      return;
    }
    setFormData((p) => ({ ...p, category: sel.value, subcategory: "" }));
    setAddingNewSubgroup(false);
  };

  const handleSubgroupChange = (items: { label: string; value: string }[]) => {
    const sel = items[0];
    setFormData((p) => ({ ...p, subcategory: sel ? sel.value : "" }));
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.category) throw new Error("required");
      const categoryValue: CategoryValue = CATEGORY_LABEL_TO_VALUE[formData.category as CategoryLabel];

      const basePayload = {
        name: formData.name,
        category: categoryValue, // envia 1..4
        subcategory: formData.subcategory || undefined,
        code: formData.code?.trim() ? formData.code : undefined,
        is_active: typeof formData.is_active === "boolean" ? formData.is_active : undefined,
      };

      if (mode === "create") {
        const payload: AddGLAccountRequest = basePayload;
        await api.addLedgerAccount(payload);
      } else if (editing) {
        const glaId = getGlaId(editing);
        const payload: EditGLAccountRequest = basePayload;
        await api.editLedgerAccount(glaId, payload);
      }

      const refreshed = await fetchAllAccounts();
      setAccounts(refreshed);
      closeModal();
      setSnackBarMessage(t("settings:ledgerAccounts.toast.saved"));
    } catch (err) {
      console.error(err);
      setSnackBarMessage(t("settings:ledgerAccounts.toast.saveError"));
    }
  };

  /** Abre o ConfirmToast para EXCLUIR UMA conta */
  const requestDeleteAccount = (acc: GLAccount) => {
    setConfirmText(t("settings:ledgerAccounts.confirm.deleteOne", { name: acc.name ?? "" }));
    setConfirmAction(() => async () => {
      try {
        const glaId = getGlaId(acc);
        await api.deleteLedgerAccount(glaId);
        const refreshed = await fetchAllAccounts();
        setAccounts(refreshed);
      } catch {
        setSnackBarMessage(t("settings:ledgerAccounts.toast.deleteError"));
      } finally {
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  /** Abre o ConfirmToast para EXCLUIR TODAS as contas */
  const requestDeleteAll = () => {
    if (deletingAll) return;
    setConfirmText(t("settings:ledgerAccounts.confirm.deleteAll"));
    setConfirmAction(() => async () => {
      try {
        setDeletingAll(true);
        await api.deleteAllLedgerAccounts();
        navigate("/settings/register/ledger-accounts", { replace: true });
      } catch {
        setSnackBarMessage(t("settings:ledgerAccounts.toast.deleteAllError"));
      } finally {
        setDeletingAll(false);
        setMenuOpen(false);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  // Fecha menu ⋯ ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // trava scroll do body com modal
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ----------------------- View render helpers --------------------------- */
  const RowAccountList = ({ a }: { a: GLAccount }) => {
    const labelOrKey = getCategoryLabel(a as GLX);
    const label = labelOrKey.startsWith("settings:ledgerAccounts") ? t(labelOrKey) : labelOrKey;
    const tx = getDefaultTx(a as GLX);
    return (
      <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate">
            {a.name || t("settings:ledgerAccounts.tags.noName")}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {a.code ? <Badge>{t("settings:ledgerAccounts.tags.code")}: {a.code}</Badge> : null}
            <Badge>{label}</Badge>
            {a.subcategory ? <Badge>{a.subcategory}</Badge> : null}
            {tx ? <Badge>{tx === "credit" ? t("settings:ledgerAccounts.tags.credit") : t("settings:ledgerAccounts.tags.debit")}</Badge> : null}
            {a.is_active === false ? <Badge>{t("settings:ledgerAccounts.tags.inactive")}</Badge> : null}
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
              onClick={() => openEditModal(a)}
            >
              {t("settings:ledgerAccounts.buttons.edit")}
            </Button>
            <Button variant="common" onClick={() => requestDeleteAccount(a)}>
              {t("settings:ledgerAccounts.buttons.delete")}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    const sorted = [...accountsFiltered].sort((a, b) => {
      const ga = (getCategoryLabel(a as GLX) as string);
      const gb = (getCategoryLabel(b as GLX) as string);
      const gaR = ga.startsWith("settings:ledgerAccounts") ? t(ga) : ga;
      const gbR = gb.startsWith("settings:ledgerAccounts") ? t(gb) : gb;
      const g = (gaR || "").localeCompare(gbR || "");
      if (g !== 0) return g;
      const sg = (a.subcategory || "").localeCompare(b.subcategory || "");
      if (sg !== 0) return sg;
      const ca = (a.code || "").localeCompare(b.code || "", "pt-BR", { numeric: true });
      if (ca !== 0) return ca;
      return (a.name || "").localeCompare(b.name || "");
    });
    return (
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <span className="text-[11px] uppercase tracking-wide text-gray-700">
            {t("settings:ledgerAccounts.list.all")}
          </span>
        </div>
        <div className="divide-y divide-gray-200">
          {sorted.map((a) => (
            <RowAccountList key={getGlaId(a)} a={a} />
          ))}
          {sorted.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-500">{t("settings:ledgerAccounts.list.empty")}</p>
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

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:ledgerAccounts.header.section")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:ledgerAccounts.header.title")}
                </h1>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <Button onClick={openCreateModal} className="!py-1.5">
                    {t("settings:ledgerAccounts.buttons.add")}
                  </Button>
                  <div className="relative" ref={menuRef}>
                    <Button
                      variant="outline"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      title={t("settings:ledgerAccounts.buttons.options")}
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
                            accounts.length === 0
                              ? t("settings:ledgerAccounts.buttons.downloadPdfDisabled")
                              : t("settings:ledgerAccounts.buttons.downloadPdf")
                          }
                        >
                          {t("settings:ledgerAccounts.buttons.downloadPdf")}
                        </button>
                        <button
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:text-red-300 transition-colors"
                          onClick={requestDeleteAll}
                          disabled={deletingAll || accounts.length === 0}
                          title={deletingAll ? t("settings:ledgerAccounts.buttons.deletingAll") : t("settings:ledgerAccounts.buttons.resetAll")}
                        >
                          {deletingAll ? t("settings:ledgerAccounts.buttons.deletingAll") : t("settings:ledgerAccounts.buttons.resetAll")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Filtros */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-72">
                      <Input
                        label={t("settings:ledgerAccounts.buttons.search")}
                        placeholder={t("settings:ledgerAccounts.filters.placeholder")}
                        name="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <SelectDropdown<{ label: CategoryLabel; value: CategoryLabel }>
                      label={t("settings:ledgerAccounts.filters.category")}
                      items={GROUP_OPTIONS.map((g) => ({ label: g.label, value: g.value }))}
                      selected={filterGroup ? [{ label: filterGroup, value: filterGroup }] : []}
                      onChange={(items) => setFilterGroup(items[0]?.value ?? null)}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel={t("settings:ledgerAccounts.buttons.filterCategory")}
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
                        {t("settings:ledgerAccounts.buttons.clear")}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === "accordion" && groups.length > 0 && (
                      <Button
                        variant="outline"
                        className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => (openAccordions.size === groups.length ? collapseAll() : expandAll(groups))}
                      >
                        {openAccordions.size === groups.length
                          ? t("settings:ledgerAccounts.buttons.collapseAll")
                          : t("settings:ledgerAccounts.buttons.expandAll")}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={() => setViewMode((v) => (v === "accordion" ? "list" : "accordion"))}
                    >
                      {viewMode === "accordion"
                        ? t("settings:ledgerAccounts.buttons.viewList")
                        : t("settings:ledgerAccounts.buttons.viewAccordion")}
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
                      const accInGroup = accountsFiltered.filter((a) => {
                        const lab = getCategoryLabel(a as GLX);
                        const resolved = lab.startsWith("settings:ledgerAccounts") ? t(lab) : lab;
                        return resolved === g;
                      });
                      if (accInGroup.length === 0) return null;

                      const subsInGroup = Array.from(
                        new Set(accInGroup.map((a) => a.subcategory || t("settings:ledgerAccounts.tags.noSubgroup")))
                      );
                      const isOpen = openAccordions.has(g);

                      return (
                        <div key={g} className="rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => toggleAccordion(g)}
                            className="w-full flex items-center justify-between cursor-pointer select-none px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-[13px] font-semibold text-gray-900">{g}</span>
                            <svg
                              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                                  <p className="text-[12px] font-semibold text-gray-800 mb-2">{sg}</p>
                                  <div className="divide-y divide-gray-200">
                                    {accInGroup
                                      .filter((a) => (a.subcategory || t("settings:ledgerAccounts.tags.noSubgroup")) === sg)
                                      .map((a) => (
                                        <div
                                          key={getGlaId(a)}
                                          className="flex items-center justify-between px-2 py-2 hover:bg-gray-50"
                                        >
                                          <div className="min-w-0">
                                            <p className="text-[13px] font-medium text-gray-900 truncate">
                                              {a.name || t("settings:ledgerAccounts.tags.noName")}
                                            </p>
                                            <div className="mt-1 flex gap-2 flex-wrap">
                                              {a.code ? (
                                                <Badge>
                                                  {t("settings:ledgerAccounts.tags.code")}: {a.code}
                                                </Badge>
                                              ) : null}
                                              {(() => {
                                                const txx = getDefaultTx(a as GLX);
                                                return txx ? (
                                                  <Badge>
                                                    {txx === "credit"
                                                      ? t("settings:ledgerAccounts.tags.credit")
                                                      : t("settings:ledgerAccounts.tags.debit")}
                                                  </Badge>
                                                ) : null;
                                              })()}
                                              {a.is_active === false ? (
                                                <Badge>{t("settings:ledgerAccounts.tags.inactive")}</Badge>
                                              ) : null}
                                            </div>
                                          </div>
                                          {isOwner && (
                                            <div className="flex gap-2 shrink-0">
                                              <Button
                                                variant="outline"
                                                className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                                                onClick={() => openEditModal(a)}
                                              >
                                                {t("settings:ledgerAccounts.buttons.edit")}
                                              </Button>
                                              <Button variant="common" onClick={() => requestDeleteAccount(a)}>
                                                {t("settings:ledgerAccounts.buttons.delete")}
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
                        {t("settings:ledgerAccounts.list.groupEmpty")}
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
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? t("settings:ledgerAccounts.modal.createTitle") : t("settings:ledgerAccounts.modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:ledgerAccounts.buttons.cancel")}
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitAccount}>
                <Input
                  label={t("settings:ledgerAccounts.modal.name")}
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                />

                <Input
                  label={t("settings:ledgerAccounts.modal.code")}
                  name="code"
                  value={formData.code || ""}
                  onChange={handleCodeChange}
                  placeholder={t("settings:ledgerAccounts.modal.codePlaceholder")}
                />

                <SelectDropdown<{ label: CategoryLabel; value: CategoryLabel }>
                  label={t("settings:ledgerAccounts.filters.category")}
                  items={GROUP_OPTIONS.map((g) => ({ label: g.label, value: g.value }))}
                  selected={formData.category ? [{ label: formData.category, value: formData.category }] : []}
                  onChange={handleGroupChange}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("settings:ledgerAccounts.buttons.selectCategory")}
                  disabled={!formData.name}
                />

                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  {addingNewSubgroup ? (
                    <Input
                      label={t("settings:ledgerAccounts.modal.subcategoryNew")}
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={(e) => setFormData((p) => ({ ...p, subcategory: e.target.value }))}
                      disabled={!formData.category}
                      required
                    />
                  ) : (
                    <SelectDropdown<{ label: string; value: string }>
                      label={t("settings:ledgerAccounts.modal.subcategory")}
                      items={subgroupOptions}
                      selected={
                        formData.subcategory
                          ? [{ label: formData.subcategory, value: formData.subcategory }]
                          : []
                      }
                      onChange={handleSubgroupChange}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel={t("settings:ledgerAccounts.buttons.selectSubcategory")}
                      disabled={!formData.category}
                    />
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddingNewSubgroup((v) => !v);
                      setFormData((p) => ({ ...p, subcategory: "" }));
                    }}
                    disabled={!formData.category}
                    className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  >
                    {addingNewSubgroup ? t("settings:ledgerAccounts.buttons.toggleNewSubCancel") : t("settings:ledgerAccounts.buttons.toggleNewSub")}
                  </Button>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.is_active ?? true} onChange={handleActiveChange} />
                  {t("settings:ledgerAccounts.modal.active")}
                </label>

                <p className="text-[12px] text-gray-600">
                  {formData.category ? (
                    <>
                      {t("settings:ledgerAccounts.modal.defaultTxLabel")}{" "}
                      <b>
                        {CATEGORY_DEFAULT_TX[CATEGORY_LABEL_TO_VALUE[formData.category as CategoryLabel]] === "credit"
                          ? t("settings:ledgerAccounts.tags.credit")
                          : t("settings:ledgerAccounts.tags.debit")}
                      </b>
                    </>
                  ) : (
                    t("settings:ledgerAccounts.modal.defaultTxHint")
                  )}
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:ledgerAccounts.buttons.cancel")}
                  </Button>
                  <Button type="submit" disabled={!formData.name || !formData.category || !formData.subcategory}>
                    {t("settings:ledgerAccounts.buttons.save")}
                  </Button>
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
        confirmLabel={t("settings:ledgerAccounts.buttons.delete")}
        cancelLabel={t("settings:ledgerAccounts.buttons.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction?.()
            .catch(() => {
              setSnackBarMessage(t("settings:ledgerAccounts.toast.confirmFailed"));
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      <Snackbar open={!!snackBarMessage} autoHideDuration={6000} onClose={() => setSnackBarMessage("")}>
        <Alert
          severity={
            typeof snackBarMessage === "string" && /sucesso|gerado|conclu|success|generated/i.test(snackBarMessage)
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
