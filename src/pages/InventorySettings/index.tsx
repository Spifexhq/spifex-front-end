/* -------------------------------------------------------------------------- */
/* File: src/pages/InventorySettings.tsx                                       */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import SelectDropdown from "@/components/ui/SelectDropdown/SelectDropdown";

import InventoryModal from "./InventoryModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { TFunction } from "i18next";
import type { InventoryItem, GetInventoryItemsParams } from "@/models/settings/inventory";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "IV";
}

function sortOverlayBySkuThenName(a: InventoryItem, b: InventoryItem) {
  const sa = (a.sku || "").toString();
  const sb = (b.sku || "").toString();
  if (sa && sb && sa !== sb) return sa.localeCompare(sb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

type FilterKey = "sku" | "name" | "description" | "uom" | "qty" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

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

function computeStatusMode(keys: StatusKey[]): "all" | "active" | "inactive" {
  const hasA = keys.includes("active");
  const hasI = keys.includes("inactive");
  if (hasA && !hasI) return "active";
  if (!hasA && hasI) return "inactive";
  return "all";
}

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetInventoryItemsParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

function asNonNegIntString(raw: string) {
  const s = (raw || "").trim();
  if (!s) return "";
  if (!/^\d+$/.test(s)) return "";
  return String(Math.max(0, parseInt(s, 10)));
}

function parseQoh(v: string | null | undefined): number {
  const n = Number(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function qtyChipValue(minRaw: string, maxRaw: string): string {
  const min = asNonNegIntString(minRaw);
  const max = asNonNegIntString(maxRaw);
  if (!min && !max) return "";
  if (min && max) return `${min}–${max}`;
  if (min) return `≥ ${min}`;
  return `≤ ${max}`;
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
}) => {
  return (
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
};

const ClearFiltersChip = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  return (
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
};

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
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 99, // over everything
      }}
    >
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
  item,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  item: InventoryItem;
  onEdit: (i: InventoryItem) => void;
  onDelete: (i: InventoryItem) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {t("row.skuPrefix")} {item.sku || "—"} {item.uom ? `• ${item.uom}` : ""}
        {item.is_active === false ? ` • ${t("filters.status.inactive", { defaultValue: "Inactive" })}` : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {item.name || t("row.untitled")} {item.description ? `— ${item.description}` : ""}
      </p>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      <span className="text-[12px] text-gray-700">
        {t("row.qtyPrefix")} {item.quantity_on_hand ?? "0"}
      </span>

      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => onEdit(item)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(item)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </div>
      )}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */

const InventorySettings: React.FC = () => {
  const { t, i18n } = useTranslation("inventorySettings");
  const { isOwner } = useAuthContext();

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------- Modal state ----------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* ConfirmToast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* Standard flags */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* Overlay */
  const [added, setAdded] = useState<InventoryItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedSku, setAppliedSku] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedDescription, setAppliedDescription] = useState("");
  const [appliedUom, setAppliedUom] = useState("");
  const [appliedMinQoh, setAppliedMinQoh] = useState("");
  const [appliedMaxQoh, setAppliedMaxQoh] = useState("");
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]);

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedSku.trim() !== "" ||
      appliedName.trim() !== "" ||
      appliedDescription.trim() !== "" ||
      appliedUom.trim() !== "" ||
      asNonNegIntString(appliedMinQoh) !== "" ||
      asNonNegIntString(appliedMaxQoh) !== "" ||
      appliedStatuses.length > 0
    );
  }, [appliedSku, appliedName, appliedDescription, appliedUom, appliedMinQoh, appliedMaxQoh, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const [draftSku, setDraftSku] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftUom, setDraftUom] = useState("");
  const [draftMinQoh, setDraftMinQoh] = useState("");
  const [draftMaxQoh, setDraftMaxQoh] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const skuAnchorRef = useRef<HTMLDivElement | null>(null);
  const nameAnchorRef = useRef<HTMLDivElement | null>(null);
  const descAnchorRef = useRef<HTMLDivElement | null>(null);
  const uomAnchorRef = useRef<HTMLDivElement | null>(null);
  const qtyAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------- Status options -------------------------- */
  const activeLabel = t("filters.status.active", { defaultValue: "Active" });
  const inactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });
  const allLabel = t("filters.status.all", { defaultValue: "All" });

  const statusOptions: StatusOption[] = useMemo(
    () => [
      { key: "active", label: activeLabel },
      { key: "inactive", label: inactiveLabel },
    ],
    [activeLabel, inactiveLabel]
  );

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return activeLabel;
    if (appliedStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [appliedStatusMode, activeLabel, inactiveLabel, allLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return activeLabel;
    if (draftStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [draftStatusMode, activeLabel, inactiveLabel, allLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  /* --------------------------- Pagination (reusable) ----------------------- */
  const inflightRef = useRef(false);

  const fetchItemsPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as InventoryItem[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const params: GetInventoryItemsParams = {
          cursor,
          active: toActiveParamFromStatusKeys(appliedStatuses),

          sku: appliedSku.trim() || undefined,
          name: appliedName.trim() || undefined,
          description: appliedDescription.trim() || undefined,
          uom: appliedUom.trim() || undefined,

          min_qoh: asNonNegIntString(appliedMinQoh) || undefined,
          max_qoh: asNonNegIntString(appliedMaxQoh) || undefined,
        };

        const { data, meta } = await api.getInventoryItems(params);
        const items = (data?.results ?? []) as InventoryItem[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
      }
    },
    [appliedStatuses, appliedSku, appliedName, appliedDescription, appliedUom, appliedMinQoh, appliedMaxQoh]
  );

  const pager = useCursorPager<InventoryItem>(fetchItemsPage, {
    autoLoadFirst: true,
    deps: [appliedStatuses, appliedSku, appliedName, appliedDescription, appliedUom, appliedMinQoh, appliedMaxQoh],
  });

  const { refresh } = pager;

  /* ------------------------------ Filter apply/clear ------------------------ */
  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "sku") {
        const next = draftSku.trim();
        if (next === appliedSku.trim()) refresh();
        else setAppliedSku(next);
      }
      if (key === "name") {
        const next = draftName.trim();
        if (next === appliedName.trim()) refresh();
        else setAppliedName(next);
      }
      if (key === "description") {
        const next = draftDescription.trim();
        if (next === appliedDescription.trim()) refresh();
        else setAppliedDescription(next);
      }
      if (key === "uom") {
        const next = draftUom.trim();
        if (next === appliedUom.trim()) refresh();
        else setAppliedUom(next);
      }
      if (key === "qty") {
        const nextMin = asNonNegIntString(draftMinQoh);
        const nextMax = asNonNegIntString(draftMaxQoh);
        const same = nextMin === asNonNegIntString(appliedMinQoh) && nextMax === asNonNegIntString(appliedMaxQoh);
        if (same) refresh();
        else {
          setAppliedMinQoh(nextMin);
          setAppliedMaxQoh(nextMax);
        }
      }
      if (key === "status") {
        const next = uniq(draftStatuses);
        const same =
          next.length === appliedStatuses.length &&
          next.every((x) => appliedStatuses.includes(x)) &&
          appliedStatuses.every((x) => next.includes(x));
        if (same) refresh();
        else setAppliedStatuses(next);
      }

      setOpenFilter(null);
    },
    [
      draftSku,
      draftName,
      draftDescription,
      draftUom,
      draftMinQoh,
      draftMaxQoh,
      draftStatuses,
      appliedSku,
      appliedName,
      appliedDescription,
      appliedUom,
      appliedMinQoh,
      appliedMaxQoh,
      appliedStatuses,
      refresh,
    ]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "sku") setAppliedSku("");
    if (key === "name") setAppliedName("");
    if (key === "description") setAppliedDescription("");
    if (key === "uom") setAppliedUom("");
    if (key === "qty") {
      setAppliedMinQoh("");
      setAppliedMaxQoh("");
    }
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!hasAppliedFilters) {
      refresh();
      return;
    }
    setAppliedSku("");
    setAppliedName("");
    setAppliedDescription("");
    setAppliedUom("");
    setAppliedMinQoh("");
    setAppliedMaxQoh("");
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, [hasAppliedFilters, refresh]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "sku") setDraftSku(appliedSku);
    if (openFilter === "name") setDraftName(appliedName);
    if (openFilter === "description") setDraftDescription(appliedDescription);
    if (openFilter === "uom") setDraftUom(appliedUom);
    if (openFilter === "qty") {
      setDraftMinQoh(appliedMinQoh);
      setDraftMaxQoh(appliedMaxQoh);
    }
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [openFilter, appliedSku, appliedName, appliedDescription, appliedUom, appliedMinQoh, appliedMaxQoh, appliedStatuses]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    const focus = (id: string) => {
      requestAnimationFrame(() => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    };

    if (openFilter === "sku") focus("inv-filter-sku-input");
    if (openFilter === "name") focus("inv-filter-name-input");
    if (openFilter === "description") focus("inv-filter-desc-input");
    if (openFilter === "uom") focus("inv-filter-uom-input");
    if (openFilter === "qty") focus("inv-filter-minqoh-input");
  }, [openFilter]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesFilters = useCallback(
    (i: InventoryItem) => {
      const mode = appliedStatusMode;
      if (mode === "active" && i.is_active === false) return false;
      if (mode === "inactive" && i.is_active !== false) return false;

      const sku = appliedSku.trim().toLowerCase();
      if (sku && !(i.sku || "").toLowerCase().includes(sku)) return false;

      const name = appliedName.trim().toLowerCase();
      if (name && !(i.name || "").toLowerCase().includes(name)) return false;

      const desc = appliedDescription.trim().toLowerCase();
      if (desc && !(i.description || "").toLowerCase().includes(desc)) return false;

      const uom = appliedUom.trim().toLowerCase();
      if (uom && !(i.uom || "").toLowerCase().includes(uom)) return false;

      const min = asNonNegIntString(appliedMinQoh);
      const max = asNonNegIntString(appliedMaxQoh);
      const qoh = parseQoh(i.quantity_on_hand);
      if (min && qoh < Number(min)) return false;
      if (max && qoh > Number(max)) return false;

      return true;
    },
    [
      appliedStatusMode,
      appliedSku,
      appliedName,
      appliedDescription,
      appliedUom,
      appliedMinQoh,
      appliedMaxQoh,
    ]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((x) => matchesFilters(x)));
  }, [matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added
      .filter((x) => matchesFilters(x))
      .slice()
      .sort(sortOverlayBySkuThenName);

    const addedIds = new Set(addedFiltered.map((x) => x.id));

    const base = pager.items
      .filter((x) => !deletedIds.has(x.id) && !addedIds.has(x.id))
      .filter((x) => matchesFilters(x));

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const requestDeleteItem = (item: InventoryItem) => {
    const name = item.name ?? item.sku ?? "";

    setConfirmText(t("confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(item.id);

      try {
        setDeletedIds((prev) => new Set(prev).add(item.id));
        await api.deleteInventoryItem(item.id);

        await pager.refresh();
        setAdded((prev) => prev.filter((x) => x.id !== item.id));

        setSnack({ message: t("toast.deleteOk"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
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

  /* ------------------------------- Loading UI ------------------------------ */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const canEdit = !!isOwner;
  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

  const skuChipValue = appliedSku.trim() ? truncate(appliedSku.trim(), 18) : "";
  const nameChipValue = appliedName.trim() ? truncate(appliedName.trim(), 18) : "";
  const descChipValue = appliedDescription.trim() ? truncate(appliedDescription.trim(), 18) : "";
  const uomChipValue = appliedUom.trim() ? truncate(appliedUom.trim(), 14) : "";
  const qtyValue = qtyChipValue(appliedMinQoh, appliedMaxQoh);
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

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

              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.inventory")}</h1>
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
                    <div ref={skuAnchorRef}>
                      <Chip
                        label={t("filters.skuLabel", { defaultValue: "SKU" })}
                        value={skuChipValue ? `• ${skuChipValue}` : undefined}
                        active={!!appliedSku.trim()}
                        onClick={() => togglePopover("sku")}
                        onClear={appliedSku.trim() ? () => clearOne("sku") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={nameAnchorRef}>
                      <Chip
                        label={t("filters.nameLabel", { defaultValue: "Name" })}
                        value={nameChipValue ? `• ${nameChipValue}` : undefined}
                        active={!!appliedName.trim()}
                        onClick={() => togglePopover("name")}
                        onClear={appliedName.trim() ? () => clearOne("name") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={descAnchorRef}>
                      <Chip
                        label={t("filters.descriptionLabel", { defaultValue: "Description" })}
                        value={descChipValue ? `• ${descChipValue}` : undefined}
                        active={!!appliedDescription.trim()}
                        onClick={() => togglePopover("description")}
                        onClear={appliedDescription.trim() ? () => clearOne("description") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={uomAnchorRef}>
                      <Chip
                        label={t("filters.uomLabel", { defaultValue: "UoM" })}
                        value={uomChipValue ? `• ${uomChipValue}` : undefined}
                        active={!!appliedUom.trim()}
                        onClick={() => togglePopover("uom")}
                        onClear={appliedUom.trim() ? () => clearOne("uom") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={qtyAnchorRef}>
                      <Chip
                        label={t("filters.qtyLabel", { defaultValue: "Qty" })}
                        value={qtyValue ? `• ${qtyValue}` : undefined}
                        active={!!qtyValue}
                        onClick={() => togglePopover("qty")}
                        onClear={qtyValue ? () => clearOne("qty") : undefined}
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
                        {t("btn.addItem")}
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
                      visibleItems.map((i) => {
                        const rowBusy = globalBusy || deleteTargetId === i.id || deletedIds.has(i.id);
                        return (
                          <Row
                            key={i.id}
                            item={i}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={requestDeleteItem}
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

        <InventoryModal
          isOpen={modalOpen}
          mode={modalMode}
          item={editingItem}
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
              setSnack({ message: t("errors.loadFailedTitle"), severity: "error" });
            }
          }}
        />
      </main>

      {/* SKU POPOVER */}
      <AnchoredPopover open={openFilter === "sku"} anchorRef={skuAnchorRef} onClose={() => setOpenFilter(null)} scroll>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.bySkuTitle", { defaultValue: "Filter by SKU" })}
          </div>

          <div className="mt-3">
            <Input
              id="inv-filter-sku-input"
              type="text"
              value={draftSku}
              onChange={(e) => setDraftSku(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("sku");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.skuPlaceholder", { defaultValue: "Type a SKU…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftSku("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("sku")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* NAME POPOVER */}
      <AnchoredPopover open={openFilter === "name"} anchorRef={nameAnchorRef} onClose={() => setOpenFilter(null)} scroll>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byNameTitle", { defaultValue: "Filter by name" })}
          </div>

          <div className="mt-3">
            <Input
              id="inv-filter-name-input"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("name");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.namePlaceholder", { defaultValue: "Type a name…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftName("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("name")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* DESCRIPTION POPOVER */}
      <AnchoredPopover
        open={openFilter === "description"}
        anchorRef={descAnchorRef}
        onClose={() => setOpenFilter(null)}
        scroll
        width={420}
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byDescriptionTitle", { defaultValue: "Filter by description" })}
          </div>

          <div className="mt-3">
            <Input
              id="inv-filter-desc-input"
              type="text"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("description");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.descriptionPlaceholder", { defaultValue: "Type a description…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftDescription("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("description")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* UOM POPOVER */}
      <AnchoredPopover open={openFilter === "uom"} anchorRef={uomAnchorRef} onClose={() => setOpenFilter(null)} scroll>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byUomTitle", { defaultValue: "Filter by unit (UoM)" })}
          </div>

          <div className="mt-3">
            <Input
              id="inv-filter-uom-input"
              type="text"
              value={draftUom}
              onChange={(e) => setDraftUom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("uom");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.uomPlaceholder", { defaultValue: "e.g.: ea, box, kg…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftUom("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("uom")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      {/* QTY POPOVER */}
      <AnchoredPopover
        open={openFilter === "qty"}
        anchorRef={qtyAnchorRef}
        onClose={() => setOpenFilter(null)}
        scroll
        width={420}
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byQtyTitle", { defaultValue: "Filter by quantity on hand" })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[12px] text-gray-700">
              {t("filters.qtyMin", { defaultValue: "Min" })}
              <div className="mt-1">
                <Input
                  id="inv-filter-minqoh-input"
                  type="number"
                  inputMode="numeric"
                  value={draftMinQoh}
                  onChange={(e) => setDraftMinQoh(e.target.value)}
                  disabled={globalBusy}
                />
              </div>
            </label>

            <label className="text-[12px] text-gray-700">
              {t("filters.qtyMax", { defaultValue: "Max" })}
              <div className="mt-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draftMaxQoh}
                  onChange={(e) => setDraftMaxQoh(e.target.value)}
                  disabled={globalBusy}
                />
              </div>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => {
                setDraftMinQoh("");
                setDraftMaxQoh("");
              }}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("qty")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
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
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byStatusTitle", { defaultValue: "Filter by status" })}
          </div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<StatusOption>
                label={t("filters.statusLabel", { defaultValue: "Status" })}
                items={statusOptions}
                selected={selectedDraftStatusOptions}
                onChange={(list) => setDraftStatuses(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftButtonLabel}
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
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("status")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </AnchoredPopover>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("btn.delete")}
        cancelLabel={t("btn.cancel")}
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

export default InventorySettings;
