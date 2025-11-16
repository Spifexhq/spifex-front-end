/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings.tsx
 * Standards: flags + pager + ConfirmToast (matches Dept/Inventory/Employee)
 * Domain: GLAccount (id string), fields: account, code?, category(1..4), subcategory, is_active
 * Backend receives ONLY numbers (1..4); front uses localized labels
 * Pagination: cursor + arrow-only (useCursorPager)
 * Overlay: local add/delete + refresh pager
 * -------------------------------------------------------------------------- */

import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import { generateLedgerAccountsPDF } from "@/lib/pdf/ledgerAccountPdfGenerator";
import ConfirmToast from "src/components/ui/ConfirmToast";
import Checkbox from "src/components/ui/Checkbox";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";
import { useTranslation } from "react-i18next";

import type { GLAccount } from "src/models/enterprise_structure/domain/GLAccount";
import type {
  GetLedgerAccountsResponse,
  AddGLAccountRequest,
  EditGLAccountRequest,
} from "src/models/enterprise_structure/dto";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";

/* ----------------------------- Snackbar type ------------------------------ */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ----------------------------- Const & Types ------------------------------ */

type TxType = "debit" | "credit";

/**
 * Internal category keys (stable IDs, used for mapping and i18n).
 * These are mapped to backend numeric values (1..4).
 */
type CategoryKey =
  | "operationalRevenue"
  | "nonOperationalRevenue"
  | "operationalExpense"
  | "nonOperationalExpense";

/** Backend values (1..4) */
type CategoryValue = 1 | 2 | 3 | 4;

const CATEGORY_KEYS: CategoryKey[] = [
  "operationalRevenue",
  "nonOperationalRevenue",
  "operationalExpense",
  "nonOperationalExpense",
];

const CATEGORY_KEY_TO_VALUE: Record<CategoryKey, CategoryValue> = {
  operationalRevenue: 1,
  nonOperationalRevenue: 2,
  operationalExpense: 3,
  nonOperationalExpense: 4,
};

const CATEGORY_VALUE_TO_KEY: Record<CategoryValue, CategoryKey> = {
  1: "operationalRevenue",
  2: "nonOperationalRevenue",
  3: "operationalExpense",
  4: "nonOperationalExpense",
};

const CATEGORY_DEFAULT_TX: Record<CategoryValue, TxType> = {
  1: "credit",
  2: "credit",
  3: "debit",
  4: "debit",
};

/** Form uses category keys; API uses numbers */
type FormState = {
  account: string;
  category: CategoryKey | "";
  subcategory: string;
  code?: string;
  is_active?: boolean;
};

const EMPTY_FORM: FormState = {
  account: "",
  category: "",
  subcategory: "",
  code: "",
  is_active: true,
};

type PaginationMeta = { pagination?: { next?: string | null } };

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "CC";
}

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] px-2 py-[2px] rounded-full border border-gray-200 bg-gray-50 text-gray-700">
    {children}
  </span>
);

/** GLAccount tolerant for reading */
type GLX = GLAccount & {
  category?: number | string | null;
  default_tx?: TxType | string | null;
  external_id?: string;
};

function getCategoryValue(acc: GLX): CategoryValue | undefined {
  const c = acc.category;
  if (typeof c === "number" && [1, 2, 3, 4].includes(c)) return c as CategoryValue;
  if (typeof c === "string" && c) {
    const n = Number(c);
    if ([1, 2, 3, 4].includes(n)) return n as CategoryValue;
  }
  return undefined;
}

function getCategoryKeyFromAccount(acc: GLX): CategoryKey | undefined {
  const v = getCategoryValue(acc);
  return v ? CATEGORY_VALUE_TO_KEY[v] : undefined;
}

function getDefaultTx(acc: GLX): TxType | "" {
  const dt = acc.default_tx;
  if (dt === "credit" || dt === "debit") return dt;
  const v = getCategoryValue(acc);
  return v ? CATEGORY_DEFAULT_TX[v] : "";
}

function getGlaId(acc: GLAccount): string {
  const a = acc as GLAccount & { id?: string; external_id?: string };
  return a.id ?? a.external_id ?? "";
}

/* ----------------------- In-memory guard for fetches ---------------------- */
let INFLIGHT_FETCH = false;

/* ============================ Component =================================== */
const LedgerAccountSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  const navigate = useNavigate();
  const { isOwner } = useAuthContext();

  useEffect(() => {
    document.title = t("settings:ledgerAccounts.title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ----------------------------- Flags (standard) ------------------------- */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* ----------------------------- Snackbar --------------------------------- */
  const [snack, setSnack] = useState<Snack>(null);

  /* ----------------------------- ConfirmToast ----------------------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ----------------------------- Modal & form ----------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<GLAccount | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [addingNewSubgroup, setAddingNewSubgroup] = useState(false);

  /* ----------------------------- Filters / View --------------------------- */
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<CategoryKey | null>(null);
  const [viewMode, setViewMode] = useState<"accordion" | "list">("accordion");

  /* ----------------------------- Menu ⋯ ----------------------------------- */
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  /* ----------------------------- Overlay (optimistic) --------------------- */
  const [added, setAdded] = useState<GLAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- Pager (cursor) --------------------------- */
  const [appliedQuery, setAppliedQuery] = useState<{ q: string; group: CategoryKey | null }>({
    q: "",
    group: null,
  });
  const qKey = useMemo(() => `${appliedQuery.q}::${appliedQuery.group ?? ""}`, [appliedQuery]);

  const fetchAccountsPage = useCallback(
    async (cursor?: string) => {
      if (INFLIGHT_FETCH) {
        return { items: [] as GLAccount[], nextCursor: undefined as string | undefined };
      }
      INFLIGHT_FETCH = true;
      try {
        const { data, meta } = (await api.getLedgerAccounts({
          page_size: 120,
          cursor,
        })) as { data: GetLedgerAccountsResponse; meta?: PaginationMeta };

        const items = ((data?.results ?? []) as GLAccount[]).slice().sort((a, b) => {
          const ca = (a.code || "").toString();
          const cb = (b.code || "").toString();
          if (ca && cb && ca !== cb) return ca.localeCompare(cb, undefined, { numeric: true });
          return (a.account || "").localeCompare(b.account || "", undefined);
        });

        const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
        const nextCursor = nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined;
        return { items, nextCursor };
      } finally {
        INFLIGHT_FETCH = false;
      }
    },
    []
  );

  const pager = useCursorPager<GLAccount>(fetchAccountsPage, {
    autoLoadFirst: true,
    deps: [qKey],
  });

  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  /* ----------------------------- Category helpers ------------------------- */
  const resolveCategoryLabel = useCallback(
    (acc: GLX): string => {
      const key = getCategoryKeyFromAccount(acc);
      return key
        ? t(`settings:ledgerAccounts.categories.${key}`)
        : t("settings:ledgerAccounts.tags.noGroup");
    },
    [t]
  );

  const groupOptions = useMemo(
    () =>
      CATEGORY_KEYS.map((key) => {
        const value = CATEGORY_KEY_TO_VALUE[key];
        const inferredTx = CATEGORY_DEFAULT_TX[value];
        return {
          key,
          label: t(`settings:ledgerAccounts.categories.${key}`),
          inferredTx,
        };
      }),
    [t]
  );

  /* ----------------------------- Client-side filters ---------------------- */
  const accountsFiltered = useMemo(() => {
    const searchNormalized = search.trim().toLowerCase();

    const matchesSearchAndGroup = (a: GLAccount): boolean => {
      const key = getCategoryKeyFromAccount(a as GLX);
      const matchesGroup = !filterGroup || key === filterGroup;

      const label = key ? t(`settings:ledgerAccounts.categories.${key}`) : "";
      const account = (a.account || "").toLowerCase();
      const sub = (a.subcategory || "").toLowerCase();
      const code = (a.code || "").toLowerCase();
      const cat = (label || "").toLowerCase();

      const matchesSearch =
        !searchNormalized ||
        account.includes(searchNormalized) ||
        sub.includes(searchNormalized) ||
        code.includes(searchNormalized) ||
        cat.includes(searchNormalized);

      return matchesGroup && matchesSearch;
    };

    const addedFiltered = added.filter(matchesSearchAndGroup);

    const addedIdsSet = new Set(addedFiltered.map((a) => getGlaId(a)));
    const base = pager.items.filter(
      (a) => !deletedIds.has(getGlaId(a)) && !addedIdsSet.has(getGlaId(a)) && matchesSearchAndGroup(a)
    );

    return [...addedFiltered, ...base];
  }, [added, pager.items, deletedIds, search, filterGroup, t]);

  const groups = useMemo(() => {
    const keys = accountsFiltered
      .map((a) => getCategoryKeyFromAccount(a as GLX))
      .filter((k): k is CategoryKey => !!k);
    return Array.from(new Set(keys));
  }, [accountsFiltered]);

  /* ----------------------------- View helpers ----------------------------- */
  const [openAccordions, setOpenAccordions] = useState<Set<CategoryKey>>(new Set());
  const toggleAccordion = (groupKey: CategoryKey) => {
    setOpenAccordions((prev) => {
      const s = new Set(prev);
      if (s.has(groupKey)) s.delete(groupKey);
      else s.add(groupKey);
      return s;
    });
  };
  const expandAll = (all: CategoryKey[]) => setOpenAccordions(new Set(all));
  const collapseAll = () => setOpenAccordions(new Set());

  /* ----------------------------- Actions ---------------------------------- */
  const applySearch = useCallback(() => {
    setAppliedQuery({ q: search.trim(), group: filterGroup });
    pager.refresh();
  }, [search, filterGroup, pager]);

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

    const key = getCategoryKeyFromAccount(acc as GLX);

    setFormData({
      account: acc.account || "",
      category: key ?? "",
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
    setFormData(EMPTY_FORM);
  }, []);

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, is_active: e.target.checked }));

  // Modal category change
  const handleGroupChange = (items: { label: string; value: CategoryKey }[]) => {
    const sel = items[0];
    if (!sel) {
      setFormData((p) => ({ ...p, category: "", subcategory: "" }));
      return;
    }
    setFormData((p) => ({ ...p, category: sel.value, subcategory: "" }));
    setAddingNewSubgroup(false);
  };

  // Filter dropdown category change
  const handleFilterGroupChange = (items: { label: string; value: CategoryKey }[]) => {
    const sel = items[0];
    setFilterGroup(sel ? sel.value : null);
  };

  const handleSubgroupChange = (items: { label: string; value: string }[]) => {
    const sel = items[0];
    setFormData((p) => ({ ...p, subcategory: sel ? sel.value : "" }));
  };

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.category) throw new Error("required");
      const categoryValue: CategoryValue = CATEGORY_KEY_TO_VALUE[formData.category as CategoryKey];

      const basePayload = {
        account: formData.account.trim(),
        category: categoryValue, // 1..4
        subcategory: formData.subcategory || undefined,
        code: formData.code?.trim() ? formData.code.trim() : undefined,
        is_active: typeof formData.is_active === "boolean" ? formData.is_active : undefined,
      };

      if (mode === "create") {
        const payload: AddGLAccountRequest = basePayload;
        const { data: created } = await api.addLedgerAccount(payload);
        // optimistic overlay
        setAdded((prev) => [created as GLAccount, ...prev]);
      } else if (editing) {
        const glaId = getGlaId(editing);
        const payload: EditGLAccountRequest = basePayload;
        await api.editLedgerAccount(glaId, payload);
      }

      await pager.refresh();
      closeModal();
      setSnack({
        message: t("settings:ledgerAccounts.toast.saved"),
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnack({
        message: t("settings:ledgerAccounts.toast.saveError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteAccount = (acc: GLAccount) => {
    setConfirmText(
      t("settings:ledgerAccounts.confirm.deleteOne", { account: acc.account ?? "" })
    );

    setConfirmAction(() => async () => {
      const id = getGlaId(acc);
      setDeleteTargetId(id);

      try {
        // optimistic overlay: hide row locally
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });

        // delete in backend
        await api.deleteLedgerAccount(id);

        // check if there are any accounts left on the server
        let anyLeft = true;
        try {
          const { data } = (await api.getLedgerAccounts({
            page_size: 1,
          })) as { data: GetLedgerAccountsResponse };

          const list = data?.results ?? [];
          anyLeft = Array.isArray(list) && list.length > 0;
        } catch {
          // if the check fails, assume there *might* be accounts and fall back to refresh
          anyLeft = true;
        }

        // if no accounts left → go back to the gate
        if (!anyLeft) {
          setAdded([]);
          setDeletedIds(new Set());
          setSnack({
            message: t("settings:ledgerAccounts.toast.deleteSuccess", {
              defaultValue: "Account deleted.",
            }),
            severity: "info",
          });
          navigate("/settings/register/ledger-accounts", { replace: true });
          return;
        }

        // otherwise just refresh list and clean overlays for this id
        await pager.refresh();
        setAdded((prev) => prev.filter((a) => getGlaId(a) !== id));

        setSnack({
          message: t("settings:ledgerAccounts.toast.deleteSuccess", {
            defaultValue: "Account deleted.",
          }),
          severity: "info",
        });
      } catch {
        // rollback optimistic delete
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setSnack({
          message: t("settings:ledgerAccounts.toast.deleteError"),
          severity: "error",
        });
      } finally {
        setDeleteTargetId(null);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });

    setConfirmOpen(true);
  };

  const requestDeleteAll = () => {
    if (deletingAll) return;
    setConfirmText(t("settings:ledgerAccounts.confirm.deleteAll"));
    setConfirmAction(() => async () => {
      try {
        setDeletingAll(true);
        await api.deleteAllLedgerAccounts();
        setSnack({
          message: t("settings:ledgerAccounts.toast.deleteAllSuccess", {
            defaultValue: "Chart of accounts reset.",
          }),
          severity: "info",
        });
        navigate("/settings/register/ledger-accounts", { replace: true });
      } catch {
        setSnack({
          message: t("settings:ledgerAccounts.toast.deleteAllError"),
          severity: "error",
        });
      } finally {
        setDeletingAll(false);
        setMenuOpen(false);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleDownloadPDF = async () => {
    try {
      const result = await generateLedgerAccountsPDF({
        companyName: t("settings:ledgerAccounts.pdf.company"),
        title: t("settings:ledgerAccounts.pdf.title"),
      });
      setSnack({
        message: result.message || t("settings:ledgerAccounts.toast.pdfOk"),
        severity: "success",
      });
    } catch (error) {
      console.error("Error generating ledger accounts PDF:", error);
      setSnack({
        message: t("settings:ledgerAccounts.toast.pdfError"),
        severity: "error",
      });
    } finally {
      setMenuOpen(false);
    }
  };

  /* ----------------------------- Subgroup options ------------------------- */
  const subgroupOptions = useMemo(() => {
    if (!formData.category) return [] as { label: string; value: string }[];

    const list = accountsFiltered
      .filter((a) => {
        const key = getCategoryKeyFromAccount(a as GLX);
        return key === formData.category;
      })
      .map((a) => a.subcategory || "")
      .filter(Boolean);

    const unique = Array.from(new Set(list));
    return unique.map((sg) => ({ label: sg, value: sg }));
  }, [accountsFiltered, formData.category]);

  /* ----------------------------- Body scroll lock ------------------------- */
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ----------------------------- ESC closes modal ------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (!isSubmitting) {
          closeModal();
        }
      }
    };

    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, isSubmitting, closeModal]);

  /* ----------------------------- Loading UI ------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const canEdit = !!isOwner;
  const globalBusy = isSubmitting || isBackgroundSync || confirmBusy || deletingAll;

  /* ----------------------------- View utils ------------------------------- */
  const RowAccountList = ({ a }: { a: GLAccount }) => {
    const id = getGlaId(a);
    const label = resolveCategoryLabel(a as GLX);
    const tx = getDefaultTx(a as GLX);
    const rowBusy = globalBusy || deleteTargetId === id || deletedIds.has(id);

    return (
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${
          rowBusy ? "opacity-70 pointer-events-none" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate">
            {a.account || t("settings:ledgerAccounts.tags.noAccount")}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {a.code ? (
              <Badge>
                {t("settings:ledgerAccounts.tags.code")}: {a.code}
              </Badge>
            ) : null}
            <Badge>{label}</Badge>
            {a.subcategory ? <Badge>{a.subcategory}</Badge> : null}
            {tx ? (
              <Badge>
                {tx === "credit"
                  ? t("settings:ledgerAccounts.tags.credit")
                  : t("settings:ledgerAccounts.tags.debit")}
              </Badge>
            ) : null}
            {a.is_active === false ? (
              <Badge>{t("settings:ledgerAccounts.tags.inactive")}</Badge>
            ) : null}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => openEditModal(a)} disabled={rowBusy}>
              {t("settings:ledgerAccounts.buttons.edit")}
            </Button>
            <Button
              variant="outline"
              onClick={() => requestDeleteAccount(a)}
              disabled={rowBusy}
              aria-busy={rowBusy || undefined}
            >
              {t("settings:ledgerAccounts.buttons.delete")}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    const sorted = [...accountsFiltered].sort((a, b) => {
      const keyA = getCategoryKeyFromAccount(a as GLX);
      const keyB = getCategoryKeyFromAccount(b as GLX);

      const labelA = keyA ? t(`settings:ledgerAccounts.categories.${keyA}`) : "";
      const labelB = keyB ? t(`settings:ledgerAccounts.categories.${keyB}`) : "";
      const g = (labelA || "").localeCompare(labelB || "");
      if (g !== 0) return g;

      const sg = (a.subcategory || "").localeCompare(b.subcategory || "");
      if (sg !== 0) return sg;

      const ca = (a.code || "").localeCompare(b.code || "", undefined, { numeric: true });
      if (ca !== 0) return ca;

      return (a.account || "").localeCompare(b.account || "");
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
            <p className="p-4 text-center text-sm text-gray-500">
              {t("settings:ledgerAccounts.list.empty")}
            </p>
          )}
        </div>
      </div>
    );
  };

  /* ----------------------------- Render ----------------------------------- */
  return (
    <>
      {/* thin progress during background page sync */}
      <TopProgress active={isBackgroundSync} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
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
                  <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                    {t("settings:ledgerAccounts.buttons.add")}
                  </Button>
                  <div className="relative" ref={menuRef}>
                    <Button
                      variant="outline"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      title={t("settings:ledgerAccounts.buttons.options")}
                      disabled={globalBusy}
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
                          disabled={globalBusy || pager.items.length + added.length === 0}
                          title={
                            pager.items.length + added.length === 0
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
                          disabled={globalBusy || pager.items.length + added.length === 0}
                          title={
                            deletingAll
                              ? t("settings:ledgerAccounts.buttons.deletingAll")
                              : t("settings:ledgerAccounts.buttons.resetAll")
                          }
                        >
                          {deletingAll
                            ? t("settings:ledgerAccounts.buttons.deletingAll")
                            : t("settings:ledgerAccounts.buttons.resetAll")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Filters + actions */}
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
                        disabled={globalBusy}
                      />
                    </div>

                    <SelectDropdown<{ label: string; value: CategoryKey }>
                      label={t("settings:ledgerAccounts.filters.category")}
                      items={groupOptions.map((g) => ({ label: g.label, value: g.key }))}
                      selected={
                        filterGroup
                          ? [
                              {
                                label: t(`settings:ledgerAccounts.categories.${filterGroup}`),
                                value: filterGroup,
                              },
                            ]
                          : []
                      }
                      onChange={handleFilterGroupChange}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel={t("settings:ledgerAccounts.buttons.filterCategory")}
                      clearOnClickOutside={false}
                      customStyles={{ maxHeight: "240px" }}
                      disabled={globalBusy}
                    />

                    {(search || filterGroup) && (
                      <Button
                        variant="outline"
                        className="self-end !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                        onClick={() => {
                          setSearch("");
                          setFilterGroup(null);
                          setAppliedQuery({ q: "", group: null });
                          pager.refresh();
                        }}
                        disabled={globalBusy}
                      >
                        {t("settings:ledgerAccounts.buttons.clear")}
                      </Button>
                    )}

                    <Button
                      onClick={applySearch}
                      variant="outline"
                      className="self-end"
                      disabled={globalBusy}
                    >
                      {t("settings:ledgerAccounts.buttons.runSearchAria")}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === "accordion" && groups.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          openAccordions.size === groups.length
                            ? collapseAll()
                            : expandAll(groups)
                        }
                        disabled={globalBusy}
                      >
                        {openAccordions.size === groups.length
                          ? t("settings:ledgerAccounts.buttons.collapseAll")
                          : t("settings:ledgerAccounts.buttons.expandAll")}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setViewMode((v) => (v === "accordion" ? "list" : "accordion"))}
                      disabled={globalBusy}
                    >
                      {viewMode === "accordion"
                        ? t("settings:ledgerAccounts.buttons.viewList")
                        : t("settings:ledgerAccounts.buttons.viewAccordion")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {viewMode === "list" ? (
                  renderListView()
                ) : (
                  <div className="space-y-4">
                    {groups.map((g) => {
                      const accInGroup = accountsFiltered.filter((a) => {
                        const key = getCategoryKeyFromAccount(a as GLX);
                        return key === g;
                      });
                      if (accInGroup.length === 0) return null;

                      const subsInGroup = Array.from(
                        new Set(
                          accInGroup.map(
                            (a) =>
                              a.subcategory ||
                              t("settings:ledgerAccounts.tags.noSubgroup")
                          )
                        )
                      );
                      const isOpen = openAccordions.has(g);

                      return (
                        <div key={g} className="rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            onClick={() => toggleAccordion(g)}
                            className="w-full flex items-center justify-between cursor-pointer select-none px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <span className="text-[13px] font-semibold text-gray-900">
                              {t(`settings:ledgerAccounts.categories.${g}`)}
                            </span>
                            <svg
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
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
                                      .filter(
                                        (a) =>
                                          (a.subcategory ||
                                            t(
                                              "settings:ledgerAccounts.tags.noSubgroup"
                                            )) === sg
                                      )
                                      .map((a) => {
                                        const id = getGlaId(a);
                                        const rowBusy =
                                          globalBusy ||
                                          deleteTargetId === id ||
                                          deletedIds.has(id);
                                        const tx = getDefaultTx(a as GLX);

                                        return (
                                          <div
                                            key={id}
                                            className={`flex items-center justify-between px-2 py-2 ${
                                              rowBusy
                                                ? "opacity-70 pointer-events-none"
                                                : ""
                                            }`}
                                          >
                                            <div className="min-w-0">
                                              <p className="text-[13px] font-medium text-gray-900 truncate">
                                                {a.account ||
                                                  t(
                                                    "settings:ledgerAccounts.tags.noAccount"
                                                  )}
                                              </p>
                                              <div className="mt-1 flex gap-2 flex-wrap">
                                                {a.code ? (
                                                  <Badge>
                                                    {t(
                                                      "settings:ledgerAccounts.tags.code"
                                                    )}
                                                    : {a.code}
                                                  </Badge>
                                                ) : null}
                                                {tx ? (
                                                  <Badge>
                                                    {tx === "credit"
                                                      ? t(
                                                          "settings:ledgerAccounts.tags.credit"
                                                        )
                                                      : t(
                                                          "settings:ledgerAccounts.tags.debit"
                                                        )}
                                                  </Badge>
                                                ) : null}
                                                {a.is_active === false ? (
                                                  <Badge>
                                                    {t(
                                                      "settings:ledgerAccounts.tags.inactive"
                                                    )}
                                                  </Badge>
                                                ) : null}
                                              </div>
                                            </div>
                                            {canEdit && (
                                              <div className="flex gap-2 shrink-0">
                                                <Button
                                                  variant="outline"
                                                  onClick={() =>
                                                    openEditModal(a)
                                                  }
                                                  disabled={rowBusy}
                                                >
                                                  {t(
                                                    "settings:ledgerAccounts.buttons.edit"
                                                  )}
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  onClick={() =>
                                                    requestDeleteAccount(a)
                                                  }
                                                  disabled={rowBusy}
                                                  aria-busy={
                                                    rowBusy || undefined
                                                  }
                                                >
                                                  {t(
                                                    "settings:ledgerAccounts.buttons.delete"
                                                  )}
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
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

              {/* Arrow-only footer */}
              <PaginationArrows
                onPrev={pager.prev}
                onNext={pager.next}
                disabledPrev={!pager.canPrev || isBackgroundSync}
                disabledNext={!pager.canNext || isBackgroundSync}
              />
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create"
                    ? t("settings:ledgerAccounts.modal.createTitle")
                    : t("settings:ledgerAccounts.modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:ledgerAccounts.buttons.cancel")}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitAccount}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label={t("settings:ledgerAccounts.modal.account")}
                    name="account"
                    value={formData.account}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, account: e.target.value }))
                    }
                    required
                    disabled={isSubmitting}
                  />

                  <Input
                    label={t("settings:ledgerAccounts.modal.code")}
                    name="code"
                    value={formData.code || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, code: e.target.value }))
                    }
                    placeholder={t("settings:ledgerAccounts.modal.codePlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>

                <SelectDropdown<{ label: string; value: CategoryKey }>
                  label={t("settings:ledgerAccounts.filters.category")}
                  items={groupOptions.map((g) => ({
                    label: g.label,
                    value: g.key,
                  }))}
                  selected={
                    formData.category
                      ? [
                          {
                            label: t(
                              `settings:ledgerAccounts.categories.${formData.category}`
                            ),
                            value: formData.category,
                          },
                        ]
                      : []
                  }
                  onChange={handleGroupChange}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t(
                    "settings:ledgerAccounts.buttons.selectCategory"
                  )}
                  disabled={isSubmitting || !formData.account}
                />

                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  {addingNewSubgroup ? (
                    <Input
                      label={t(
                        "settings:ledgerAccounts.modal.subcategoryNew"
                      )}
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          subcategory: e.target.value,
                        }))
                      }
                      disabled={isSubmitting || !formData.category}
                      required
                    />
                  ) : (
                    <SelectDropdown<{ label: string; value: string }>
                      label={t("settings:ledgerAccounts.modal.subcategory")}
                      items={subgroupOptions}
                      selected={
                        formData.subcategory
                          ? [
                              {
                                label: formData.subcategory,
                                value: formData.subcategory,
                              },
                            ]
                          : []
                      }
                      onChange={handleSubgroupChange}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel={t(
                        "settings:ledgerAccounts.buttons.selectSubcategory"
                      )}
                      disabled={isSubmitting || !formData.category}
                    />
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAddingNewSubgroup((v) => !v);
                      setFormData((p) => ({ ...p, subcategory: "" }));
                    }}
                    disabled={isSubmitting || !formData.category}
                  >
                    {addingNewSubgroup
                      ? t(
                          "settings:ledgerAccounts.buttons.toggleNewSubCancel"
                        )
                      : t("settings:ledgerAccounts.buttons.toggleNewSub")}
                  </Button>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.is_active ?? true}
                    onChange={handleActiveChange}
                    disabled={isSubmitting}
                  />
                  {t("settings:ledgerAccounts.modal.active")}
                </label>

                <p className="text-[12px] text-gray-600">
                  {formData.category ? (
                    <>
                      {t("settings:ledgerAccounts.modal.defaultTxLabel")}{" "}
                      <b>
                        {CATEGORY_DEFAULT_TX[
                          CATEGORY_KEY_TO_VALUE[formData.category as CategoryKey]
                        ] === "credit"
                          ? t("settings:ledgerAccounts.tags.credit")
                          : t("settings:ledgerAccounts.tags.debit")}
                      </b>
                    </>
                  ) : (
                    t("settings:ledgerAccounts.modal.defaultTxHint")
                  )}
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    {t("settings:ledgerAccounts.buttons.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !formData.account ||
                      !formData.category ||
                      !formData.subcategory
                    }
                  >
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
          confirmAction
            ?.()
            .catch(() => {
              setSnack({
                message: t("settings:ledgerAccounts.toast.confirmFailed"),
                severity: "error",
              });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default LedgerAccountSettings;
