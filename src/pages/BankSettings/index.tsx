/* -------------------------------------------------------------------------- */
/* File: src/pages/BankSettings.tsx                                            */
/* Design: chips + anchored portal popovers (like DepartmentSettings)          */
/* Filters: institution, account_type, branch, account_number, iban, is_active */
/* Pagination: cursor via useCursorPager + PaginationArrows                    */
/* i18n: namespace "bankSettings"                                              */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";

import BankModal from "./BankModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { BankAccount, GetBanksParams } from "@/models/settings/banking";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ Helpers ---------------------------------- */
function getInitials() {
  return "BK";
}

function safeCurrency(raw: unknown) {
  const v = String(raw ?? "").trim().toUpperCase();
  return v || "USD";
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function truncate(s: string, max = 24) {
  const v = (s || "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ------------------------------ Filter types ----------------------------- */
type FilterKey = "institution" | "accountType" | "branch" | "accountNumber" | "iban" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

const ACCOUNT_TYPE_VALUES = ["checking", "savings", "investment", "cash", "petty_cash", "card"] as const;
type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];
type AccountTypeOption = { key: AccountType; label: string };

function isAccountType(v: unknown): v is AccountType {
  return ACCOUNT_TYPE_VALUES.includes(v as AccountType);
}

function computeStatusMode(keys: StatusKey[]): "all" | "active" | "inactive" {
  const hasA = keys.includes("active");
  const hasI = keys.includes("inactive");
  if (hasA && !hasI) return "active";
  if (!hasA && hasI) return "inactive";
  return "all";
}

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetBanksParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

function selectedAccountTypeParamFromKeys(keys: AccountType[]): GetBanksParams["account_type"] | undefined {
  // Backend supports single account_type; keep UI multi-select.
  const uniqKeys = uniq(keys.filter((x) => isAccountType(x)));
  return uniqKeys.length === 1 ? uniqKeys[0] : undefined;
}

/* ------------------------------- Chip UI ---------------------------------- */

const Chip = ({
  label,
  value,
  active,
  onClick,
  onClear,
  disabled,
}: {
  label: string;
  value?: string;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition",
      disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50",
      active ? "border-gray-300 bg-white" : "border-gray-200 bg-white",
    ].join(" ")}
  >
    {!active ? (
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-700 text-[12px] leading-none">
        +
      </span>
    ) : (
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-700 text-[12px] leading-none">
        ✓
      </span>
    )}

    <span className="text-gray-800 font-medium">{label}</span>
    {active && value ? <span className="text-gray-700 font-normal">{value}</span> : null}

    {active && onClear ? (
      <span
        role="button"
        aria-label="Clear"
        className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
      >
        ×
      </span>
    ) : null}
  </button>
);

const ClearFiltersChip = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={[
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
      "border-red-200 text-red-600 bg-white",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50",
    ].join(" ")}
  >
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-red-200 text-red-600 text-[12px] leading-none">
      ×
    </span>
    <span>{label}</span>
  </button>
);

/* -------------------------- Portal anchored popover ------------------------ */

const AnchoredPopover: React.FC<{
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  width?: number;
  scroll?: boolean;
  children: React.ReactNode;
}> = ({ open, anchorRef, onClose, width = 360, scroll = true, children }) => {
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  const updatePosition = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;

    const r = a.getBoundingClientRect();
    const padding = 12;
    const top = r.bottom + 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const desiredLeft = r.left;
    const maxLeft = vw - width - padding;
    const left = clamp(desiredLeft, padding, Math.max(padding, maxLeft));

    const maxHeight = Math.max(160, vh - top - padding);

    setPos({ top, left, maxHeight });
  }, [anchorRef, width]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const pop = popRef.current;
      const anc = anchorRef.current;
      const target = e.target as Node;

      if (pop && pop.contains(target)) return;
      if (anc && anc.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;
  if (!pos) return null;

  return createPortal(
    <div style={{ position: "fixed", top: pos.top, left: pos.left, width, zIndex: 99 }}>
      <div ref={popRef} className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-visible">
        {scroll ? (
          <div style={{ maxHeight: pos.maxHeight, overflowY: "auto" }}>{children}</div>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body
  );
};

/* --------------------------------- Row ------------------------------------ */

const Row = ({
  bank,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  bank: BankAccount;
  onEdit: (b: BankAccount) => void;
  onDelete: (b: BankAccount) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) => {
  const typeLabel = bank.account_type
    ? t(`accountType.${bank.account_type}`, { defaultValue: bank.account_type })
    : "—";

  const line2 = [bank.branch, bank.account_number].filter(Boolean).join(" / ") || bank.iban || "—";

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          {t("tags.type")}: {typeLabel}
          {bank.is_active === false ? ` • ${t("tags.inactive")}` : ""}
        </p>
        <p className="text-[13px] font-medium text-gray-900 truncate">{bank.institution || "—"}</p>
        <p className="text-[12px] text-gray-600 truncate">{line2}</p>
      </div>

      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => onEdit(bank)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(bank)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */

const BankSettings: React.FC = () => {
  const { t, i18n } = useTranslation("bankSettings");
  const { organization: authOrg, isOwner } = useAuthContext();

  const orgCurrency = useMemo(() => safeCurrency(authOrg?.organization?.currency), [authOrg]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  /* ConfirmToast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* Overlay */
  const [added, setAdded] = useState<BankAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedInstitution, setAppliedInstitution] = useState("");
  const [appliedAccountTypes, setAppliedAccountTypes] = useState<AccountType[]>([]);
  const [appliedBranch, setAppliedBranch] = useState("");
  const [appliedAccountNumber, setAppliedAccountNumber] = useState("");
  const [appliedIban, setAppliedIban] = useState("");
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]);

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);
  const appliedAccountTypeParam = useMemo(
    () => selectedAccountTypeParamFromKeys(appliedAccountTypes),
    [appliedAccountTypes]
  );

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedInstitution.trim() !== "" ||
      appliedAccountTypes.length > 0 ||
      appliedBranch.trim() !== "" ||
      appliedAccountNumber.trim() !== "" ||
      appliedIban.trim() !== "" ||
      appliedStatuses.length > 0
    );
  }, [appliedInstitution, appliedAccountTypes, appliedBranch, appliedAccountNumber, appliedIban, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const [draftInstitution, setDraftInstitution] = useState("");
  const [draftAccountTypes, setDraftAccountTypes] = useState<AccountType[]>([]);
  const [draftBranch, setDraftBranch] = useState("");
  const [draftAccountNumber, setDraftAccountNumber] = useState("");
  const [draftIban, setDraftIban] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const institutionAnchorRef = useRef<HTMLDivElement | null>(null);
  const accountTypeAnchorRef = useRef<HTMLDivElement | null>(null);
  const branchAnchorRef = useRef<HTMLDivElement | null>(null);
  const accountNumberAnchorRef = useRef<HTMLDivElement | null>(null);
  const ibanAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------- Options --------------------------------- */
  const accountTypeOptions: AccountTypeOption[] = useMemo(() => {
    return ACCOUNT_TYPE_VALUES.map((k) => ({
      key: k,
      label: t(`accountType.${k}`, { defaultValue: k }),
    }));
  }, [t]);

  const statusOptions: StatusOption[] = useMemo(() => {
    return [
      { key: "active", label: t("filters.status.active", { defaultValue: "Active" }) },
      { key: "inactive", label: t("filters.status.inactive", { defaultValue: "Inactive" }) },
    ];
  }, [t]);

  /* ------------------------------ Status labels ---------------------------- */
  const allLabel = t("filters.status.all", { defaultValue: "All" });
  const activeLabel = t("filters.status.active", { defaultValue: "Active" });
  const inactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return activeLabel;
    if (appliedStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [appliedStatusMode, activeLabel, inactiveLabel, allLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftStatusButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return activeLabel;
    if (draftStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [draftStatusMode, activeLabel, inactiveLabel, allLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  /* ------------------------------ Account type labels ---------------------- */
  const selectedDraftAccountTypeOptions = useMemo(() => {
    const selected = new Set(draftAccountTypes);
    return accountTypeOptions.filter((o) => selected.has(o.key));
  }, [draftAccountTypes, accountTypeOptions]);

  const draftAccountTypeButtonLabel = useMemo(() => {
    const one = selectedAccountTypeParamFromKeys(draftAccountTypes);
    if (one) return accountTypeOptions.find((x) => x.key === one)?.label ?? t("filters.typeAll", { defaultValue: "All" });
    if (draftAccountTypes.length > 1) return t("filters.multi", { defaultValue: "Multiple" });
    return t("filters.typeAll", { defaultValue: "All" });
  }, [draftAccountTypes, accountTypeOptions, t]);

  const appliedAccountTypeChipValue = useMemo(() => {
    if (!appliedAccountTypes.length) return "";
    const one = selectedAccountTypeParamFromKeys(appliedAccountTypes);
    if (one) return accountTypeOptions.find((x) => x.key === one)?.label ?? "";
    return t("filters.multi", { defaultValue: "Multiple" });
  }, [appliedAccountTypes, accountTypeOptions, t]);

  /* --------------------------- Pagination (reusable) ----------------------- */
  const inflightRef = useRef(false);

  const fetchBanksPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as BankAccount[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const params: GetBanksParams = {
          cursor,
          institution: appliedInstitution.trim() || undefined,
          account_type: appliedAccountTypeParam,
          branch: appliedBranch.trim() || undefined,
          account_number: appliedAccountNumber.trim() || undefined,
          iban: appliedIban.trim() || undefined,
          active: toActiveParamFromStatusKeys(appliedStatuses),
        };

        const { data, meta } = await api.getBanks(params);

        const items = (data?.results ?? []) as BankAccount[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } catch {
        throw new Error(t("errors.fetchError"));
      } finally {
        inflightRef.current = false;
      }
    },
    [appliedInstitution, appliedAccountTypeParam, appliedBranch, appliedAccountNumber, appliedIban, appliedStatuses, t]
  );

  const pager = useCursorPager<BankAccount>(fetchBanksPage, {
    autoLoadFirst: true,
    deps: [appliedInstitution, appliedAccountTypeParam, appliedBranch, appliedAccountNumber, appliedIban, appliedStatuses],
  });

  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const canEdit = !!isOwner;
  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

  /* ------------------------------ Filter apply/clear ------------------------ */
  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "institution") {
        const next = draftInstitution.trim();
        if (next === appliedInstitution.trim()) pager.refresh();
        else setAppliedInstitution(next);
      }

      if (key === "accountType") {
        const next = uniq(draftAccountTypes);
        const same =
          next.length === appliedAccountTypes.length &&
          next.every((x) => appliedAccountTypes.includes(x)) &&
          appliedAccountTypes.every((x) => next.includes(x));

        if (same) pager.refresh();
        else setAppliedAccountTypes(next);
      }

      if (key === "branch") {
        const next = draftBranch.trim();
        if (next === appliedBranch.trim()) pager.refresh();
        else setAppliedBranch(next);
      }

      if (key === "accountNumber") {
        const next = draftAccountNumber.trim();
        if (next === appliedAccountNumber.trim()) pager.refresh();
        else setAppliedAccountNumber(next);
      }

      if (key === "iban") {
        const next = draftIban.trim();
        if (next === appliedIban.trim()) pager.refresh();
        else setAppliedIban(next);
      }

      if (key === "status") {
        const next = uniq(draftStatuses);
        const same =
          next.length === appliedStatuses.length &&
          next.every((x) => appliedStatuses.includes(x)) &&
          appliedStatuses.every((x) => next.includes(x));

        if (same) pager.refresh();
        else setAppliedStatuses(next);
      }

      setOpenFilter(null);
    },
    [
      draftInstitution,
      draftAccountTypes,
      draftBranch,
      draftAccountNumber,
      draftIban,
      draftStatuses,
      appliedInstitution,
      appliedAccountTypes,
      appliedBranch,
      appliedAccountNumber,
      appliedIban,
      appliedStatuses,
      pager,
    ]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "institution") setAppliedInstitution("");
    if (key === "accountType") setAppliedAccountTypes([]);
    if (key === "branch") setAppliedBranch("");
    if (key === "accountNumber") setAppliedAccountNumber("");
    if (key === "iban") setAppliedIban("");
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!hasAppliedFilters) {
      pager.refresh();
      return;
    }
    setAppliedInstitution("");
    setAppliedAccountTypes([]);
    setAppliedBranch("");
    setAppliedAccountNumber("");
    setAppliedIban("");
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, [hasAppliedFilters, pager]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "institution") setDraftInstitution(appliedInstitution);
    if (openFilter === "accountType") setDraftAccountTypes(appliedAccountTypes);
    if (openFilter === "branch") setDraftBranch(appliedBranch);
    if (openFilter === "accountNumber") setDraftAccountNumber(appliedAccountNumber);
    if (openFilter === "iban") setDraftIban(appliedIban);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [
    openFilter,
    appliedInstitution,
    appliedAccountTypes,
    appliedBranch,
    appliedAccountNumber,
    appliedIban,
    appliedStatuses,
  ]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    const map: Partial<Record<Exclude<FilterKey, null>, string>> = {
      institution: "bank-filter-institution-input",
      branch: "bank-filter-branch-input",
      accountNumber: "bank-filter-account-number-input",
      iban: "bank-filter-iban-input",
    };
    const id = openFilter ? map[openFilter] : undefined;
    if (!id) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.focus();
      el?.select?.();
    });
  }, [openFilter]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesFilters = useCallback(
    (b: BankAccount) => {
      if (appliedStatusMode === "active" && b.is_active === false) return false;
      if (appliedStatusMode === "inactive" && b.is_active !== false) return false;

      if (appliedAccountTypeParam) {
        if ((b.account_type || "").toLowerCase() !== appliedAccountTypeParam.toLowerCase()) return false;
      }

      const inst = appliedInstitution.trim().toLowerCase();
      if (inst && !((b.institution || "").toLowerCase().includes(inst))) return false;

      const br = appliedBranch.trim().toLowerCase();
      if (br && !((b.branch || "").toLowerCase().includes(br))) return false;

      const an = appliedAccountNumber.trim().toLowerCase();
      if (an && !((b.account_number || "").toLowerCase().includes(an))) return false;

      const ib = appliedIban.trim().toLowerCase();
      if (ib && !((b.iban || "").toLowerCase().includes(ib))) return false;

      return true;
    },
    [appliedStatusMode, appliedAccountTypeParam, appliedInstitution, appliedBranch, appliedAccountNumber, appliedIban]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((b) => matchesFilters(b)));
  }, [matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter(matchesFilters).slice();
    const addedIds = new Set(addedFiltered.map((b) => b.id));
    const base = pager.items.filter((b) => !deletedIds.has(b.id) && !addedIds.has(b.id)).filter(matchesFilters);
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingBank(null);
    setModalOpen(true);
  };

  const openEditModal = (bank: BankAccount) => {
    setModalMode("edit");
    setEditingBank(bank);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBank(null);
  };

  /* ---------- ConfirmToast delete ----------------------------------------- */
  const requestDeleteBank = (bank: BankAccount) => {
    const name = bank.institution ?? "";
    setConfirmText(t("confirm.delete", { name }));

    setConfirmAction(() => async () => {
      setDeleteTargetId(bank.id);

      try {
        setDeletedIds((prev) => new Set(prev).add(bank.id));
        await api.deleteBank(bank.id);

        await pager.refresh();
        setAdded((prev) => prev.filter((x) => x.id !== bank.id));

        setSnack({ message: t("toast.deleteOk"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(bank.id);
          return next;
        });

        setSnack({
          message: err instanceof Error ? err.message : t("errors.deleteError"),
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

  /* ------------------------------ Loading --------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* -------------------------------- Derived UI ---------------------------- */
  const institutionChipValue = appliedInstitution.trim() ? truncate(appliedInstitution.trim(), 22) : "";
  const branchChipValue = appliedBranch.trim() ? truncate(appliedBranch.trim(), 22) : "";
  const accountNumberChipValue = appliedAccountNumber.trim() ? truncate(appliedAccountNumber.trim(), 22) : "";
  const ibanChipValue = appliedIban.trim() ? truncate(appliedIban.trim(), 22) : "";

  const accountTypeChipValue = appliedAccountTypes.length ? appliedAccountTypeChipValue : "";
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";

  return (
    <>
      <TopProgress active={isBackgroundSync || confirmBusy} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.title")}</h1>
                </div>

                {isBackgroundSync && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm">
                    {t("badge.syncing")}
                  </span>
                )}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  {/* LEFT: chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div ref={institutionAnchorRef}>
                      <Chip
                        label={t("filters.institutionLabel", { defaultValue: "Institution" })}
                        value={institutionChipValue ? `• ${institutionChipValue}` : undefined}
                        active={!!appliedInstitution.trim()}
                        onClick={() => togglePopover("institution")}
                        onClear={appliedInstitution.trim() ? () => clearOne("institution") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={accountTypeAnchorRef}>
                      <Chip
                        label={t("filters.accountTypeLabel", { defaultValue: "Account type" })}
                        value={accountTypeChipValue ? `• ${accountTypeChipValue}` : undefined}
                        active={appliedAccountTypes.length > 0}
                        onClick={() => togglePopover("accountType")}
                        onClear={appliedAccountTypes.length ? () => clearOne("accountType") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={branchAnchorRef}>
                      <Chip
                        label={t("filters.branchLabel", { defaultValue: "Branch" })}
                        value={branchChipValue ? `• ${branchChipValue}` : undefined}
                        active={!!appliedBranch.trim()}
                        onClick={() => togglePopover("branch")}
                        onClear={appliedBranch.trim() ? () => clearOne("branch") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={accountNumberAnchorRef}>
                      <Chip
                        label={t("filters.accountNumberLabel", { defaultValue: "Account number" })}
                        value={accountNumberChipValue ? `• ${accountNumberChipValue}` : undefined}
                        active={!!appliedAccountNumber.trim()}
                        onClick={() => togglePopover("accountNumber")}
                        onClear={appliedAccountNumber.trim() ? () => clearOne("accountNumber") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={ibanAnchorRef}>
                      <Chip
                        label={t("filters.ibanLabel", { defaultValue: "IBAN" })}
                        value={ibanChipValue ? `• ${ibanChipValue}` : undefined}
                        active={!!appliedIban.trim()}
                        onClick={() => togglePopover("iban")}
                        onClear={appliedIban.trim() ? () => clearOne("iban") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={statusAnchorRef}>
                      <Chip
                        label={t("filters.statusLabel", { defaultValue: "Status" })}
                        value={statusChipValue ? `• ${statusChipValue}` : undefined}
                        active={appliedStatuses.length > 0}
                        onClick={() => togglePopover("status")}
                        onClear={appliedStatuses.length ? () => clearOne("status") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    {hasAppliedFilters && (
                      <ClearFiltersChip
                        label={t("filters.clearAll", { defaultValue: "Clear filters" })}
                        onClick={clearAll}
                        disabled={globalBusy}
                      />
                    )}
                  </div>

                  {/* RIGHT: add button */}
                  <div className="shrink-0">
                    {canEdit && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("btn.addBank")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">{t("errors.loadFailedTitle")}</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh} disabled={globalBusy}>
                    {t("btn.retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">{t("empty")}</p>
                    ) : (
                      visibleItems.map((b) => {
                        const rowBusy = globalBusy || deleteTargetId === b.id || deletedIds.has(b.id);
                        return (
                          <Row
                            key={b.id}
                            bank={b}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={requestDeleteBank}
                            t={t}
                            busy={rowBusy}
                          />
                        );
                      })
                    )}
                  </div>

                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev || globalBusy}
                    disabledNext={!pager.canNext || globalBusy}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        <BankModal
          isOpen={modalOpen}
          mode={modalMode}
          bank={editingBank}
          orgCurrency={orgCurrency}
          canEdit={canEdit}
          onClose={closeModal}
          onNotify={(s) => setSnack(s)}
          onSaved={async (res) => {
            try {
              if (res.mode === "create" && res.created) {
                setAdded((prev) => [res.created!, ...prev]);
              }
              await pager.refresh();
            } catch {
              setSnack({ message: t("errors.fetchError"), severity: "error" });
            }
          }}
        />
      </main>

      {/* INSTITUTION POPOVER */}
      <AnchoredPopover
        open={openFilter === "institution"}
        anchorRef={institutionAnchorRef}
        onClose={() => setOpenFilter(null)}
        scroll
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byInstitutionTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-institution-input"
              type="text"
              value={draftInstitution}
              onChange={(e) => setDraftInstitution(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("institution");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.institutionPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftInstitution("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("institution")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* ACCOUNT TYPE POPOVER */}
      <AnchoredPopover
        open={openFilter === "accountType"}
        anchorRef={accountTypeAnchorRef}
        onClose={() => setOpenFilter(null)}
        scroll={false}
        width={420}
      >
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byAccountTypeTitle")}</div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<AccountTypeOption>
                label={t("filters.accountTypeLabel")}
                items={accountTypeOptions}
                selected={selectedDraftAccountTypeOptions}
                onChange={(list) => setDraftAccountTypes(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftAccountTypeButtonLabel}
                customStyles={{ maxHeight: "260px" }}
                hideFilter
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">{t("filters.typeHint")}</div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftAccountTypes([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("accountType")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* BRANCH POPOVER */}
      <AnchoredPopover open={openFilter === "branch"} anchorRef={branchAnchorRef} onClose={() => setOpenFilter(null)} scroll>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byBranchTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-branch-input"
              type="text"
              value={draftBranch}
              onChange={(e) => setDraftBranch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("branch");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.branchPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftBranch("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("branch")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* ACCOUNT NUMBER POPOVER */}
      <AnchoredPopover
        open={openFilter === "accountNumber"}
        anchorRef={accountNumberAnchorRef}
        onClose={() => setOpenFilter(null)}
        scroll
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byAccountNumberTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-account-number-input"
              type="text"
              value={draftAccountNumber}
              onChange={(e) => setDraftAccountNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("accountNumber");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.accountNumberPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftAccountNumber("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("accountNumber")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* IBAN POPOVER */}
      <AnchoredPopover open={openFilter === "iban"} anchorRef={ibanAnchorRef} onClose={() => setOpenFilter(null)} scroll>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byIbanTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="bank-filter-iban-input"
              type="text"
              value={draftIban}
              onChange={(e) => setDraftIban(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("iban");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.ibanPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftIban("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("iban")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* STATUS POPOVER */}
      <AnchoredPopover
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        scroll={false}
        width={420}
      >
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byStatusTitle")}</div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<StatusOption>
                label={t("filters.statusLabel")}
                items={statusOptions}
                selected={selectedDraftStatusOptions}
                onChange={(list) => setDraftStatuses(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftStatusButtonLabel}
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftStatuses([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("status")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("confirm.confirmLabel")}
        cancelLabel={t("confirm.cancelLabel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction()
            .catch(() => setSnack({ message: t("errors.confirmFailed"), severity: "error" }))
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

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
