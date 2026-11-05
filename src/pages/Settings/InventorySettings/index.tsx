import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import { recordName } from "@/shared/ui/DataTable/recordName";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsFilter as Chip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";
/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/InventorySettings/index.tsx                                       */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Select from "src/shared/ui/Select/Select";
import Popover from "src/shared/ui/Popover";

import InventoryModal from "./InventoryModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { InventoryItem, GetInventoryItemsParams } from "@/models/settings/inventory";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */


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





/* --------------------------------- Row ------------------------------------ */



/* -------------------------------------------------------------------------- */

const InventorySettings: React.FC = () => {
  const { t, i18n } = useTranslation("inventorySettings");
  const { isOwner, isSuperUser, permissions } = useAuthContext();

  const canViewInventory = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_inventory");
  }, [isOwner, permissions]);

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







  /* Standard flags */


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


  const fetchItemsPage = useCallback(
    async (cursor?: string, pageSize = 20) => {
      if (!canViewInventory) {
        return { items: [] as InventoryItem[], nextCursor: undefined as string | undefined };
      }




      {
        const params: GetInventoryItemsParams = {
          cursor,
          ...{ page_size: pageSize, include_count: "true" },
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

        return { items, nextCursor, totalCount: (data as unknown as { count?: number }).count };
      }
    },
    [
      canViewInventory,
      appliedStatuses,
      appliedSku,
      appliedName,
      appliedDescription,
      appliedUom,
      appliedMinQoh,
      appliedMaxQoh,
    ]
  );

  const pager = useCursorPager<InventoryItem>(fetchItemsPage, {
    autoLoadFirst: canViewInventory,
    deps: [
      canViewInventory,
      appliedStatuses,
      appliedSku,
      appliedName,
      appliedDescription,
      appliedUom,
      appliedMinQoh,
      appliedMaxQoh,
    ],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewInventory) return;
    refresh();
  }, [canViewInventory, refresh]);

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



  /* ------------------------------- Loading UI ------------------------------ */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const globalBusy = isBackgroundSync  || modalOpen;

  const skuChipValue = appliedSku.trim() ? truncate(appliedSku.trim(), 18) : "";
  const nameChipValue = appliedName.trim() ? truncate(appliedName.trim(), 18) : "";
  const descChipValue = appliedDescription.trim() ? truncate(appliedDescription.trim(), 18) : "";
  const uomChipValue = appliedUom.trim() ? truncate(appliedUom.trim(), 14) : "";
  const qtyValue = qtyChipValue(appliedMinQoh, appliedMaxQoh);
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";

  const shouldBlockOnInitial = isInitialLoading && canViewInventory;

  if (shouldBlockOnInitial) {
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

      <main className="settings-page">
        <div className="settings-content ">
          <div className="settings-intro"><div className="px-5 py-4 flex items-center gap-3">


              <div className="flex items-center gap-3">


                {isBackgroundSync && (<span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm">
                    {t("badge.syncing")}
                  </span>)}
              </div>
            </div></div>

          <PermissionMiddleware codeName={"view_inventory"} behavior="lock">
            <section className="mt-6">
              <div className="mb-4">
                  <div className="flex items-center justify-between gap-3 settings-toolbar">
                    {/* LEFT: chips */}
                    <SettingsFilters active={hasAppliedFilters}>
                      <div ref={skuAnchorRef}>
                        <Chip
                          label={t("filters.skuLabel", { defaultValue: "SKU" })}
                          value={skuChipValue ? `• ${skuChipValue}` : undefined}
                          active={!!appliedSku.trim()}
                          onClick={() => togglePopover("sku")}
                          expanded={openFilter === "sku"}
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
                          expanded={openFilter === "name"}
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
                          expanded={openFilter === "description"}
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
                          expanded={openFilter === "uom"}
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
                          expanded={openFilter === "qty"}
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
                          expanded={openFilter === "status"}
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
                    </SettingsFilters>

                    {/* RIGHT: add button */}
                    <div className="shrink-0">
                      <PermissionMiddleware codeName={"add_inventory"}>
                        <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                          {t("btn.addItem")}
                        </Button>
                      </PermissionMiddleware>
                    </div>
                  </div>
                </div>
<DataTable loadPreview={async item => (await api.getInventoryItem(item.id)).data} previewColumns={[{key:"name",label:t("preview.fields.name"),render:item=>item.name ?? "�"},{key:"sku",label:t("preview.fields.sku"),render:item=>item.sku ?? "�"},{key:"description",label:t("preview.fields.description"),render:item=>item.description ?? "�"},{key:"uom",label:t("preview.fields.uom"),render:item=>item.uom ?? "�"},{key:"quantity_on_hand",label:t("preview.fields.quantity_on_hand"),render:item=>item.quantity_on_hand ?? "�"},{key:"is_active",label:t("preview.fields.is_active"),render:item=>t(item.is_active ? "preview.active" : "preview.inactive")}]} onDeleted={ids => {
                if (!ids.length) return;
                const removed = new Set(ids);
                setDeletedIds(current => new Set([...current, ...removed]));
                setAdded(current => current.filter(item => !removed.has(String(item.id))));
                return pager.refresh();
              }} pager={pager} busy={globalBusy} items={visibleItems} columns={[{key:"name",label:t("common:records.name"),render:item=>recordName(item)},{key:"sku",label:t("common:records.fields.sku"),render:item=>String(item.sku??"—")},{key:"description",label:t("common:records.fields.description"),render:item=>String(item.description??"—")}]} emptyLabel={t("empty")} selectable canEdit={isOwner||isSuperUser||permissions.includes("change_inventory")} canDelete={isOwner||isSuperUser||permissions.includes("delete_inventory")} onEdit={openEditModal} onDelete={item=>api.deleteInventoryItem(item.id)} error={pager.error}/>
            </section>
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_inventory", "change_inventory"]}>
          <InventoryModal
            isOpen={modalOpen}
            mode={modalMode}
            item={editingItem}
            onClose={closeModal}
            onNotify={(s) => setSnack(s)}
            onSaved={async (res) => {
              try {
                if (res.mode === "create" && res.created) {
                  setAdded((prev) => [res.created!, ...prev]);
                }
                await pager.refresh();
              } catch (notificationCause) {
                setSnack({ message: apiErrorMessage(notificationCause, t("errors.loadFailedTitle")), severity: "error" });
              }
            }}
          />
        </PermissionMiddleware>
      </main>

      {/* SKU POPOVER */}
      <Popover appearance="settings" open={openFilter === "sku"} anchorRef={skuAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.bySkuTitle", { defaultValue: "Filter by SKU" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="inv-filter-sku-input"
              type="text"
              value={draftSku}
              onChange={(e) => setDraftSku(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("sku");
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
      </Popover>

      {/* NAME POPOVER */}
      <Popover appearance="settings" open={openFilter === "name"} anchorRef={nameAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byNameTitle", { defaultValue: "Filter by name" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="inv-filter-name-input"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("name");
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
      </Popover>

      {/* DESCRIPTION POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "description"}
        anchorRef={descAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byDescriptionTitle", { defaultValue: "Filter by description" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="inv-filter-desc-input"
              type="text"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("description");
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
      </Popover>

      {/* UOM POPOVER */}
      <Popover appearance="settings" open={openFilter === "uom"} anchorRef={uomAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byUomTitle", { defaultValue: "Filter by unit (UoM)" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="inv-filter-uom-input"
              type="text"
              value={draftUom}
              onChange={(e) => setDraftUom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("uom");
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
      </Popover>

      {/* QTY POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "qty"}
        anchorRef={qtyAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byQtyTitle", { defaultValue: "Filter by quantity on hand" })}>
        <div className="p-4">


          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[12px] text-gray-700">
              {t("filters.qtyMin", { defaultValue: "Min" })}
              <div className="mt-1">
                <Input
                  kind="text"
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
                  kind="text"
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
      </Popover>

      {/* STATUS POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byStatusTitle", { defaultValue: "Filter by status" })}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<StatusOption>
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
      </Popover>



      <Snackbar notificationKey={snack}
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
