/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings.tsx
 * -------------------------------------------------------------------------- */

import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useTranslation } from "react-i18next";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";
import { generateLedgerAccountsPDF } from "@/lib/pdf/ledgerAccountPdfGenerator";

import LedgerAccountModal from "./LedgerAccountModal";

import type {
  AddLedgerAccountRequest,
  EditLedgerAccountRequest,
  GetLedgerAccountsResponse,
  LedgerAccount,
} from "@/models/settings/ledgerAccounts";

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

/** LedgerAccount tolerant for reading */
type GLX = LedgerAccount & {
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

function getLedgerAccountId(acc: LedgerAccount): string {
  const a = acc as LedgerAccount & { id?: string; external_id?: string };
  return a.id ?? a.external_id ?? "";
}

/* ----------------------- In-memory guard for fetches ---------------------- */
let INFLIGHT_FETCH = false;

/* ============================ Component =================================== */
const LedgerAccountSettings: React.FC = () => {
  const { t, i18n } = useTranslation("ledgerAccountsSettings");
  const navigate = useNavigate();
  const { isOwner, permissions } = useAuthContext();

  const canViewLedgerAccounts = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_ledger_account");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("title");
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

  /* ----------------------------- Modal state ------------------------------ */
  type ModalState =
    | { isOpen: false; mode: "create" | "edit"; editing: LedgerAccount | null; initial: FormState }
    | { isOpen: true; mode: "create" | "edit"; editing: LedgerAccount | null; initial: FormState };

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: "create",
    editing: null,
    initial: EMPTY_FORM,
  });

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
  const [added, setAdded] = useState<LedgerAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- Pager (cursor) --------------------------- */
  const [appliedQuery, setAppliedQuery] = useState<{ q: string; group: CategoryKey | null }>({
    q: "",
    group: null,
  });
  const qKey = useMemo(() => `${appliedQuery.q}::${appliedQuery.group ?? ""}`, [appliedQuery]);

  const fetchAccountsPage = useCallback(
    async (cursor?: string) => {
      // ✅ Permission gate: no network call if user cannot view ledger accounts
      if (!canViewLedgerAccounts) {
        return { items: [] as LedgerAccount[], nextCursor: undefined as string | undefined };
      }

      if (INFLIGHT_FETCH) {
        return { items: [] as LedgerAccount[], nextCursor: undefined as string | undefined };
      }

      INFLIGHT_FETCH = true;
      try {
        const { data, meta } = (await api.getLedgerAccounts({
          cursor,
        })) as { data: GetLedgerAccountsResponse; meta?: PaginationMeta };

        const items = ((data?.results ?? []) as LedgerAccount[]).slice().sort((a, b) => {
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
    [canViewLedgerAccounts]
  );

  const pager = useCursorPager<LedgerAccount>(fetchAccountsPage, {
    autoLoadFirst: canViewLedgerAccounts,
    deps: [canViewLedgerAccounts, qKey],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewLedgerAccounts) return;
    refresh();
  }, [canViewLedgerAccounts, refresh]);

  /* ----------------------------- Category helpers ------------------------- */
  const resolveCategoryLabel = useCallback(
    (acc: GLX): string => {
      const key = getCategoryKeyFromAccount(acc);
      return key ? t(`categories.${key}`) : t("tags.noGroup");
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
          label: t(`categories.${key}`),
          inferredTx,
        };
      }),
    [t]
  );

  /* ----------------------------- Client-side filters ---------------------- */
  const accountsFiltered = useMemo(() => {
    const searchNormalized = search.trim().toLowerCase();

    const matchesSearchAndGroup = (a: LedgerAccount): boolean => {
      const key = getCategoryKeyFromAccount(a as GLX);
      const matchesGroup = !filterGroup || key === filterGroup;

      const label = key ? t(`categories.${key}`) : "";
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

    const addedIdsSet = new Set(addedFiltered.map((a) => getLedgerAccountId(a)));
    const base = pager.items.filter(
      (a) =>
        !deletedIds.has(getLedgerAccountId(a)) &&
        !addedIdsSet.has(getLedgerAccountId(a)) &&
        matchesSearchAndGroup(a)
    );

    return [...addedFiltered, ...base];
  }, [added, pager.items, deletedIds, search, filterGroup, t]);

  const groups = useMemo(() => {
    const keys = accountsFiltered
      .map((a) => getCategoryKeyFromAccount(a as GLX))
      .filter((k): k is CategoryKey => !!k);
    return Array.from(new Set(keys));
  }, [accountsFiltered]);

  /* ----------------------------- All accounts for subgroup options -------- */
  const accountsForSubgroupOptions = useMemo(() => {
    const union = [...added, ...pager.items];
    const seen = new Set<string>();
    const out: LedgerAccount[] = [];

    for (const a of union) {
      const id = getLedgerAccountId(a);
      if (!id) continue;
      if (deletedIds.has(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(a);
    }
    return out;
  }, [added, pager.items, deletedIds]);

  const getSubgroupOptionsForCategory = useCallback(
    (category: CategoryKey) => {
      const list = accountsForSubgroupOptions
        .filter((a) => getCategoryKeyFromAccount(a as GLX) === category)
        .map((a) => a.subcategory || "")
        .filter(Boolean);

      const unique = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
      return unique.map((sg) => ({ label: sg, value: sg }));
    },
    [accountsForSubgroupOptions]
  );

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
    setModal({ isOpen: true, mode: "create", editing: null, initial: EMPTY_FORM });
  };

  const openEditModal = (acc: LedgerAccount) => {
    const key = getCategoryKeyFromAccount(acc as GLX);

    setModal({
      isOpen: true,
      mode: "edit",
      editing: acc,
      initial: {
        account: acc.account || "",
        category: key ?? "",
        subcategory: acc.subcategory || "",
        code: acc.code || "",
        is_active: acc.is_active ?? true,
      },
    });
  };

  const closeModal = useCallback(() => {
    if (isSubmitting) return;
    setModal((p) => ({ ...p, isOpen: false }));
  }, [isSubmitting]);

  const handleFilterGroupChange = (items: { label: string; value: CategoryKey }[]) => {
    const sel = items[0];
    setFilterGroup(sel ? sel.value : null);
  };

  const submitAccount = async (data: FormState) => {
    setIsSubmitting(true);
    try {
      if (!data.category) throw new Error("required");

      const categoryValue: CategoryValue = CATEGORY_KEY_TO_VALUE[data.category as CategoryKey];

      const basePayload = {
        account: data.account.trim(),
        category: categoryValue, // 1..4
        subcategory: data.subcategory.trim() || undefined,
        code: data.code?.trim() ? data.code.trim() : undefined,
        is_active: typeof data.is_active === "boolean" ? data.is_active : undefined,
      };

      if (modal.mode === "create") {
        const payload: AddLedgerAccountRequest = basePayload;
        const { data: created } = await api.addLedgerAccount(payload);
        setAdded((prev) => [created as LedgerAccount, ...prev]);
      } else if (modal.mode === "edit" && modal.editing) {
        const ledger_account_id = getLedgerAccountId(modal.editing);
        const payload: EditLedgerAccountRequest = basePayload;
        await api.editLedgerAccount(ledger_account_id, payload);
      }

      await pager.refresh();
      closeModal();
      setSnack({ message: t("toast.saved"), severity: "success" });
    } catch (err) {
      console.error(err);
      setSnack({ message: t("toast.saveError"), severity: "error" });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteAccount = (acc: LedgerAccount) => {
    setConfirmText(t("confirm.deleteOne", { account: acc.account ?? "" }));

    setConfirmAction(() => async () => {
      const id = getLedgerAccountId(acc);
      setDeleteTargetId(id);

      try {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });

        await api.deleteLedgerAccount(id);

        const { data: existsRes } = await api.getLedgerAccountsExists();
        const anyLeft = !!existsRes?.exists;

        if (!anyLeft) {
          setAdded([]);
          setDeletedIds(new Set());
          setSnack({ message: t("toast.deleteSuccess"), severity: "info" });
          navigate("/settings/register/ledger-accounts", { replace: true });
          return;
        }

        await pager.refresh();
        setAdded((prev) => prev.filter((a) => getLedgerAccountId(a) !== id));

        setSnack({ message: t("toast.deleteSuccess"), severity: "info" });
      } catch {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setSnack({ message: t("toast.deleteError"), severity: "error" });
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
    setConfirmText(t("confirm.deleteAll"));
    setConfirmAction(() => async () => {
      try {
        setDeletingAll(true);
        await api.deleteAllLedgerAccounts();
        setSnack({ message: t("toast.deleteAllSuccess"), severity: "info" });
        navigate("/settings/register/ledger-accounts", { replace: true });
      } catch {
        setSnack({ message: t("toast.deleteAllError"), severity: "error" });
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
        companyName: t("pdf.company"),
        title: t("pdf.title"),
      });
      setSnack({ message: result.message || t("toast.pdfOk"), severity: "success" });
    } catch (error) {
      console.error("Error generating ledger accounts PDF:", error);
      setSnack({ message: t("toast.pdfError"), severity: "error" });
    } finally {
      setMenuOpen(false);
    }
  };

  /* ----------------------------- Loading UI ------------------------------- */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const globalBusy = isSubmitting || isBackgroundSync || confirmBusy || deletingAll;

  const shouldBlockOnInitial = isInitialLoading && canViewLedgerAccounts;

  if (shouldBlockOnInitial) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* ----------------------------- View utils ------------------------------- */
  const RowAccountList = ({ a }: { a: LedgerAccount }) => {
    const id = getLedgerAccountId(a);
    const label = resolveCategoryLabel(a as GLX);
    const tx = getDefaultTx(a as GLX);
    const rowBusy = globalBusy || deleteTargetId === id || deletedIds.has(id);

    return (
      <div className={`flex items-center justify-between px-4 py-2.5 ${rowBusy ? "opacity-70 pointer-events-none" : ""}`}>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate">{a.account || t("tags.noAccount")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {a.code ? <Badge>{t("tags.code")}: {a.code}</Badge> : null}
            <Badge>{label}</Badge>
            {a.subcategory ? <Badge>{a.subcategory}</Badge> : null}
            {tx ? <Badge>{tx === "credit" ? t("tags.credit") : t("tags.debit")}</Badge> : null}
            {a.is_active === false ? <Badge>{t("tags.inactive")}</Badge> : null}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <PermissionMiddleware codeName={"change_ledger_account"}>
            <Button variant="outline" onClick={() => openEditModal(a)} disabled={rowBusy}>
              {t("buttons.edit")}
            </Button>
          </PermissionMiddleware>

          <PermissionMiddleware codeName={"delete_ledger_account"}>
            <Button
              variant="outline"
              onClick={() => requestDeleteAccount(a)}
              disabled={rowBusy}
              aria-busy={rowBusy || undefined}
            >
              {t("buttons.delete")}
            </Button>
          </PermissionMiddleware>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const sorted = [...accountsFiltered].sort((a, b) => {
      const keyA = getCategoryKeyFromAccount(a as GLX);
      const keyB = getCategoryKeyFromAccount(b as GLX);

      const labelA = keyA ? t(`categories.${keyA}`) : "";
      const labelB = keyB ? t(`categories.${keyB}`) : "";
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
          <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("list.all")}</span>
        </div>
        <div className="divide-y divide-gray-200">
          {sorted.map((a) => (
            <RowAccountList key={getLedgerAccountId(a)} a={a} />
          ))}
          {sorted.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-500">{t("list.empty")}</p>
          )}
        </div>
      </div>
    );
  };

  /* ----------------------------- Render ----------------------------------- */
  return (
    <>
      <TopProgress active={isBackgroundSync} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.section")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.title")}</h1>
              </div>

              <div className="flex items-end gap-2">
                <PermissionMiddleware codeName={"add_ledger_account"}>
                  <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                    {t("buttons.add")}
                  </Button>
                </PermissionMiddleware>

                <div className="relative" ref={menuRef}>
                  <Button
                    variant="outline"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    title={t("buttons.options")}
                    disabled={globalBusy}
                  >
                    ⋯
                  </Button>

                  {menuOpen && (
                    <PermissionMiddleware codeName={["view_ledger_account", "delete_ledger_account"]}>
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden"
                      >
                        <PermissionMiddleware codeName={"view_ledger_account"}>
                          <button
                            role="menuitem"
                            className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 border-b border-gray-100 transition-colors"
                            onClick={handleDownloadPDF}
                            disabled={globalBusy || pager.items.length + added.length === 0}
                            title={
                              pager.items.length + added.length === 0
                                ? t("buttons.downloadPdfDisabled")
                                : t("buttons.downloadPdf")
                            }
                          >
                            {t("buttons.downloadPdf")}
                          </button>
                        </PermissionMiddleware>

                        <PermissionMiddleware codeName={"delete_ledger_account"}>
                          <button
                            role="menuitem"
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:text-red-300 transition-colors"
                            onClick={requestDeleteAll}
                            disabled={globalBusy || pager.items.length + added.length === 0}
                            title={deletingAll ? t("buttons.deletingAll") : t("buttons.resetAll")}
                          >
                            {deletingAll ? t("buttons.deletingAll") : t("buttons.resetAll")}
                          </button>
                        </PermissionMiddleware>
                      </div>
                    </PermissionMiddleware>
                  )}
                </div>
              </div>
            </div>
          </header>

          <PermissionMiddleware codeName={"view_ledger_account"} behavior="lock">
            <section className="mt-6">
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="flex items-end gap-2">
                      <div className="w-72">
                        <Input
                          kind="text"
                          label={t("buttons.search")}
                          placeholder={t("filters.placeholder")}
                          name="search"
                          size="sm"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          disabled={globalBusy}
                        />
                      </div>

                      <SelectDropdown<{ label: string; value: CategoryKey }>
                        label={t("filters.category")}
                        size="sm"
                        items={groupOptions.map((g) => ({ label: g.label, value: g.key }))}
                        selected={
                          filterGroup
                            ? [{ label: t(`categories.${filterGroup}`), value: filterGroup }]
                            : []
                        }
                        onChange={handleFilterGroupChange}
                        getItemKey={(i) => i.value}
                        getItemLabel={(i) => i.label}
                        singleSelect
                        hideCheckboxes
                        buttonLabel={t("buttons.filterCategory")}
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
                          {t("buttons.clear")}
                        </Button>
                      )}

                      <Button onClick={applySearch} variant="outline" className="self-end" disabled={globalBusy}>
                        {t("buttons.runSearchAria")}
                      </Button>
                    </div>

                    <div className="flex items-end gap-2">
                      {viewMode === "accordion" && groups.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            openAccordions.size === groups.length ? collapseAll() : expandAll(groups)
                          }
                          disabled={globalBusy}
                        >
                          {openAccordions.size === groups.length ? t("buttons.collapseAll") : t("buttons.expandAll")}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => setViewMode((v) => (v === "accordion" ? "list" : "accordion"))}
                        disabled={globalBusy}
                      >
                        {viewMode === "accordion" ? t("buttons.viewList") : t("buttons.viewAccordion")}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {viewMode === "list" ? (
                    renderListView()
                  ) : (
                    <div className="space-y-4">
                      {groups.map((g) => {
                        const accInGroup = accountsFiltered.filter((a) => getCategoryKeyFromAccount(a as GLX) === g);
                        if (accInGroup.length === 0) return null;

                        const subsInGroup = Array.from(
                          new Set(accInGroup.map((a) => a.subcategory || t("tags.noSubgroup")))
                        );
                        const isOpen = openAccordions.has(g);

                        return (
                          <div key={g} className="rounded-lg border border-gray-200 overflow-hidden">
                            <button
                              onClick={() => toggleAccordion(g)}
                              className="w-full flex items-center justify-between cursor-pointer select-none px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <span className="text-[13px] font-semibold text-gray-900">{t(`categories.${g}`)}</span>
                              <svg
                                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                                    <p className="text-[12px] font-semibold text-gray-800 mb-2">{sg}</p>
                                    <div className="divide-y divide-gray-200">
                                      {accInGroup
                                        .filter((a) => (a.subcategory || t("tags.noSubgroup")) === sg)
                                        .map((a) => {
                                          const id = getLedgerAccountId(a);
                                          const rowBusy = globalBusy || deleteTargetId === id || deletedIds.has(id);
                                          const tx = getDefaultTx(a as GLX);

                                          return (
                                            <div
                                              key={id}
                                              className={`flex items-center justify-between px-2 py-2 ${
                                                rowBusy ? "opacity-70 pointer-events-none" : ""
                                              }`}
                                            >
                                              <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-gray-900 truncate">
                                                  {a.account || t("tags.noAccount")}
                                                </p>
                                                <div className="mt-1 flex gap-2 flex-wrap">
                                                  {a.code ? <Badge>{t("tags.code")}: {a.code}</Badge> : null}
                                                  {tx ? (
                                                    <Badge>
                                                      {tx === "credit" ? t("tags.credit") : t("tags.debit")}
                                                    </Badge>
                                                  ) : null}
                                                  {a.is_active === false ? <Badge>{t("tags.inactive")}</Badge> : null}
                                                </div>
                                              </div>

                                              <div className="flex gap-2 shrink-0">
                                                <PermissionMiddleware codeName={"change_ledger_account"}>
                                                  <Button variant="outline" onClick={() => openEditModal(a)} disabled={rowBusy}>
                                                    {t("buttons.edit")}
                                                  </Button>
                                                </PermissionMiddleware>

                                                <PermissionMiddleware codeName={"delete_ledger_account"}>
                                                  <Button
                                                    variant="outline"
                                                    onClick={() => requestDeleteAccount(a)}
                                                    disabled={rowBusy}
                                                    aria-busy={rowBusy || undefined}
                                                    >
                                                    {t("buttons.delete")}
                                                  </Button>
                                                  </PermissionMiddleware>
                                              </div>
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
                        <p className="p-4 text-center text-sm text-gray-500">{t("list.groupEmpty")}</p>
                      )}
                    </div>
                  )}
                </div>

                <PaginationArrows
                  onPrev={pager.prev}
                  onNext={pager.next}
                  disabledPrev={!pager.canPrev || isBackgroundSync}
                  disabledNext={!pager.canNext || isBackgroundSync}
                />
              </div>
            </section>
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_ledger_account", "change_ledger_account"]}>
          <LedgerAccountModal
            isOpen={modal.isOpen}
            mode={modal.mode}
            initial={modal.initial}
            busy={globalBusy}
            categoryOptions={groupOptions}
            getSubgroupOptions={getSubgroupOptionsForCategory}
            onClose={closeModal}
            onSubmit={submitAccount}
          />
        </PermissionMiddleware>
      </main>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("buttons.delete")}
        cancelLabel={t("buttons.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction()
            .catch(() => {
              setSnack({ message: t("toast.confirmFailed"), severity: "error" });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

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
