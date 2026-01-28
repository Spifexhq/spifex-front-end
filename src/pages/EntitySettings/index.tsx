/* -------------------------------------------------------------------------- */
/* File: src/pages/EntitySettings/index.tsx                                   */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";
import Popover from "src/shared/ui/Popover";

import EntityModal from "./EntityModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { TFunction } from "i18next";
import type { Entity, EntityTypeValue, GetEntitiesParams } from "@/models/settings/entities";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type FilterKey = "name" | "alias" | "type" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

type EntityTypeOption = { key: EntityTypeValue; label: string };

/* --------------------------------- Helpers -------------------------------- */

function getInitials() {
  return "EN";
}

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

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetEntitiesParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

/**
 * Keep this lightweight and predictable:
 * - backend might send null/""; we default to "other"
 * - we do not attempt any extra parsing beyond trim+lowercase
 */
function normalizeEntityType(v: Entity["entity_type"]) {
  return String(v || "").trim().toLowerCase();
}

/** Since the backend is now constrained, a small cast is acceptable. */
function asEntityTypeValue(v: string): EntityTypeValue {
  return v as EntityTypeValue;
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

/* ------------------------------ Row component ------------------------------ */

const Row: React.FC<{
  entity: Entity;
  onEdit: (e: Entity) => void;
  onDelete: (e: Entity) => void;
  t: TFunction;
  busy?: boolean;
}> = ({ entity, onEdit, onDelete, t, busy }) => {
  const normalized = normalizeEntityType(entity.entity_type);
  const type: EntityTypeValue = normalized ? asEntityTypeValue(normalized) : "other";
  const typeLabel = t(`types.${type}`);

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          {typeLabel}
          {entity.is_active === false ? ` ${t("row.inactive")}` : ""}
        </p>
        <p className="text-[13px] font-medium text-gray-900 truncate">{entity.full_name || t("row.untitled")}</p>
      </div>

      <div className="flex gap-2 shrink-0">
        <PermissionMiddleware codeName={"change_entity"}>
          <Button variant="outline" onClick={() => onEdit(entity)} disabled={busy}>
            {t("btn.edit")}
          </Button>
        </PermissionMiddleware>

        <PermissionMiddleware codeName={"delete_entity"}>
          <Button variant="outline" onClick={() => onDelete(entity)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </PermissionMiddleware>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

const EntitySettings: React.FC = () => {
  const { t, i18n } = useTranslation("entitySettings");
  const { isOwner, permissions } = useAuthContext();

  const canViewEntities = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_entity");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Snackbar ------------------------------ */
  const [snack, setSnack] = useState<Snack>(null);

  /* ------------------------------ Confirm delete ------------------------------ */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ------------------------------ Deletion optimistic UI ------------------------------ */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------ Added overlay ------------------------------ */
  const [added, setAdded] = useState<Entity[]>([]);

  /* ------------------------------ Modal state ------------------------------ */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setEditingEntity(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((entity: Entity) => {
    setModalMode("edit");
    setEditingEntity(entity);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEntity(null);
  }, []);

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedName, setAppliedName] = useState("");
  const [appliedAlias, setAppliedAlias] = useState("");
  const [appliedTypes, setAppliedTypes] = useState<EntityTypeValue[]>([]);
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]);

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedName.trim() !== "" ||
      appliedAlias.trim() !== "" ||
      appliedTypes.length > 0 ||
      appliedStatuses.length > 0
    );
  }, [appliedName, appliedAlias, appliedTypes, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  // Draft values
  const [draftName, setDraftName] = useState("");
  const [draftAlias, setDraftAlias] = useState("");
  const [draftTypes, setDraftTypes] = useState<EntityTypeValue[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const nameAnchorRef = useRef<HTMLDivElement | null>(null);
  const aliasAnchorRef = useRef<HTMLDivElement | null>(null);
  const typeAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  /* ------------------------------- Options --------------------------------- */
  const statusAllLabel = t("filters.status.all", { defaultValue: "All" });
  const statusActiveLabel = t("filters.status.active", { defaultValue: "Active" });
  const statusInactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });

  const statusOptions: StatusOption[] = useMemo(
    () => [
      { key: "active", label: statusActiveLabel },
      { key: "inactive", label: statusInactiveLabel },
    ],
    [statusActiveLabel, statusInactiveLabel]
  );

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return statusActiveLabel;
    if (appliedStatusMode === "inactive") return statusInactiveLabel;
    return statusAllLabel;
  }, [appliedStatusMode, statusActiveLabel, statusInactiveLabel, statusAllLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftStatusButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return statusActiveLabel;
    if (draftStatusMode === "inactive") return statusInactiveLabel;
    return statusAllLabel;
  }, [draftStatusMode, statusActiveLabel, statusInactiveLabel, statusAllLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  const typeOptions: EntityTypeOption[] = useMemo(
    () => [
      { key: "client", label: t("types.client") },
      { key: "supplier", label: t("types.supplier") },
      { key: "employee", label: t("types.employee") },
      { key: "contractor", label: t("types.contractor") },
      { key: "partner", label: t("types.partner") },
      { key: "prospect", label: t("types.prospect") },
      { key: "affiliate", label: t("types.affiliate") },
      { key: "advisor", label: t("types.advisor") },
      { key: "investor", label: t("types.investor") },
      { key: "other", label: t("types.other") },
    ],
    [t]
  );

  const selectedDraftTypeOptions = useMemo(() => {
    const selected = new Set(draftTypes);
    return typeOptions.filter((o) => selected.has(o.key));
  }, [draftTypes, typeOptions]);

  const appliedTypeLabel = useMemo(() => {
    if (!appliedTypes.length) return "";
    const labels = appliedTypes.map((k) => typeOptions.find((x) => x.key === k)?.label || k);
    const head = labels.slice(0, 2).join(", ");
    return labels.length > 2 ? `${head} +${labels.length - 2}` : head;
  }, [appliedTypes, typeOptions]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "name") setDraftName(appliedName);
    if (openFilter === "alias") setDraftAlias(appliedAlias);
    if (openFilter === "type") setDraftTypes(appliedTypes);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [openFilter, appliedName, appliedAlias, appliedTypes, appliedStatuses]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    if (openFilter === "name") {
      requestAnimationFrame(() => {
        const el = document.getElementById("entity-filter-name-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
    if (openFilter === "alias") {
      requestAnimationFrame(() => {
        const el = document.getElementById("entity-filter-alias-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
  }, [openFilter]);

  /* ------------------------------ Apply/Clear ------------------------------- */
  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "name") setAppliedName(draftName.trim());
      if (key === "alias") setAppliedAlias(draftAlias.trim());
      if (key === "type") setAppliedTypes(uniq(draftTypes));
      if (key === "status") setAppliedStatuses(uniq(draftStatuses));
      setOpenFilter(null);
    },
    [draftName, draftAlias, draftTypes, draftStatuses]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "name") setAppliedName("");
    if (key === "alias") setAppliedAlias("");
    if (key === "type") setAppliedTypes([]);
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    setAppliedName("");
    setAppliedAlias("");
    setAppliedTypes([]);
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  /* ------------------------------ Pager ------------------------------------ */
  const inflightRef = useRef(false);

  const fetchEntitiesPage = useCallback(
    async (cursor?: string) => {
      if (!canViewEntities) {
        return { items: [] as Entity[], nextCursor: undefined as string | undefined };
      }

      if (inflightRef.current) return { items: [] as Entity[], nextCursor: undefined as string | undefined };
      inflightRef.current = true;

      try {
        const typeParam = appliedTypes.length === 0 ? undefined : uniq(appliedTypes).slice().sort().join(",");

        const params: GetEntitiesParams = {
          cursor,
          name: appliedName.trim() || undefined,
          alias: appliedAlias.trim() || undefined,
          type: typeParam,
          active: toActiveParamFromStatusKeys(appliedStatuses),
        };

        const { data, meta } = await api.getEntitiesTable(params);

        const items = (data?.results ?? []) as Entity[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
      }
    },
    [canViewEntities, appliedName, appliedAlias, appliedTypes, appliedStatuses]
  );

  const pager = useCursorPager<Entity>(fetchEntitiesPage, {
    autoLoadFirst: canViewEntities,
    deps: [canViewEntities, appliedName, appliedAlias, appliedTypes, appliedStatuses],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewEntities) return;
    refresh();
  }, [canViewEntities, refresh]);

  /* ------------------------------ Overlay filtering ------------------------- */
  const matchesFilters = useCallback(
    (e: Entity) => {
      // status
      if (appliedStatusMode === "active" && e.is_active === false) return false;
      if (appliedStatusMode === "inactive" && e.is_active !== false) return false;

      // type
      if (appliedTypes.length) {
        const v = normalizeEntityType(e.entity_type);
        const wanted = new Set(appliedTypes.map((x) => x.toLowerCase()));
        if (!wanted.has(v)) return false;
      }

      // name
      if (appliedName.trim()) {
        const s = appliedName.trim().toLowerCase();
        if (!(e.full_name || "").toLowerCase().includes(s)) return false;
      }

      // alias
      if (appliedAlias.trim()) {
        const s = appliedAlias.trim().toLowerCase();
        if (!(e.alias_name || "").toLowerCase().includes(s)) return false;
      }

      return true;
    },
    [appliedName, appliedAlias, appliedTypes, appliedStatusMode]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((x) => !deletedIds.has(x.id) && matchesFilters(x)));
  }, [deletedIds, matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((e) => !deletedIds.has(e.id) && matchesFilters(e));
    const addedIds = new Set(addedFiltered.map((e) => e.id));
    const base = pager.items.filter((e) => !deletedIds.has(e.id) && !addedIds.has(e.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Delete flow ------------------------------ */
  const requestDeleteEntity = useCallback(
    (entity: Entity) => {
      const name = entity.full_name ?? "";

      setConfirmText(t("confirm.deleteTitle", { name }));
      setConfirmAction(() => async () => {
        setDeleteTargetId(entity.id);

        try {
          setDeletedIds((prev) => new Set(prev).add(entity.id));

          await api.deleteEntity(entity.id);
          await pager.refresh();

          setAdded((prev) => prev.filter((e) => e.id !== entity.id));
          setSnack({ message: t("toast.deleteOk"), severity: "info" });
        } catch (err) {
          setDeletedIds((prev) => {
            const next = new Set(prev);
            next.delete(entity.id);
            return next;
          });

          setSnack({
            message: err instanceof Error ? err.message : t("errors.deleteError"),
            severity: "error",
          });
        } finally {
          setConfirmOpen(false);
          setConfirmBusy(false);
          setDeleteTargetId(null);
        }
      });

      setConfirmOpen(true);
    },
    [pager, t]
  );

  /* ------------------------------ Loading UI ------------------------------ */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

  const nameChipValue = appliedName.trim() ? `• ${truncate(appliedName.trim(), 22)}` : "";
  const aliasChipValue = appliedAlias.trim() ? `• ${truncate(appliedAlias.trim(), 22)}` : "";
  const typeChipValue = appliedTypes.length ? `• ${truncate(appliedTypeLabel, 26)}` : "";
  const statusChipValue = appliedStatuses.length ? `• ${appliedStatusValue}` : "";

  const shouldBlockOnInitial = isInitialLoading && canViewEntities;

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

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.entities")}</h1>
              </div>
            </div>
          </header>

          <PermissionMiddleware codeName={"view_entity"} behavior="lock">
            <section className="mt-6">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    {/* LEFT: chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div ref={nameAnchorRef}>
                        <Chip
                          label={t("filters.nameLabel", { defaultValue: "Name" })}
                          value={nameChipValue || undefined}
                          active={!!appliedName.trim()}
                          onClick={() => togglePopover("name")}
                          onClear={appliedName.trim() ? () => clearOne("name") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={aliasAnchorRef}>
                        <Chip
                          label={t("filters.aliasLabel", { defaultValue: "Alias" })}
                          value={aliasChipValue || undefined}
                          active={!!appliedAlias.trim()}
                          onClick={() => togglePopover("alias")}
                          onClear={appliedAlias.trim() ? () => clearOne("alias") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={typeAnchorRef}>
                        <Chip
                          label={t("filters.typeLabel", { defaultValue: "Type" })}
                          value={typeChipValue || undefined}
                          active={appliedTypes.length > 0}
                          onClick={() => togglePopover("type")}
                          onClear={appliedTypes.length ? () => clearOne("type") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={statusAnchorRef}>
                        <Chip
                          label={t("filters.statusLabel", { defaultValue: "Status" })}
                          value={statusChipValue || undefined}
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
                      <PermissionMiddleware codeName={"add_entity"}>
                        <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                          {t("btn.add")}
                        </Button>
                      </PermissionMiddleware>
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
                        visibleItems.map((e) => (
                          <Row
                            key={e.id}
                            entity={e}
                            onEdit={openEditModal}
                            onDelete={requestDeleteEntity}
                            t={t}
                            busy={globalBusy || deleteTargetId === e.id || deletedIds.has(e.id)}
                          />
                        ))
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
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_entity", "change_entity"]}>
          <EntityModal
            isOpen={modalOpen}
            mode={modalMode}
            entity={editingEntity}
            onClose={closeModal}
            onNotify={setSnack}
            onSaved={async ({ mode, created }) => {
              try {
                if (mode === "create" && created) setAdded((prev) => [created, ...prev]);
                await pager.refresh();
              } catch {
                setSnack({ message: t("errors.loadFailedTitle"), severity: "error" });
              }
            }}
          />
        </PermissionMiddleware>
      </main>

      {/* NAME POPOVER */}
      <Popover open={openFilter === "name"} anchorRef={nameAnchorRef} onClose={() => setOpenFilter(null)}>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byNameTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="entity-filter-name-input"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("name");
                }
              }}
              placeholder={t("filters.namePlaceholder")}
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
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("name")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* ALIAS POPOVER */}
      <Popover open={openFilter === "alias"} anchorRef={aliasAnchorRef} onClose={() => setOpenFilter(null)}>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byAliasTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="entity-filter-alias-input"
              type="text"
              value={draftAlias}
              onChange={(e) => setDraftAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("alias");
                }
              }}
              placeholder={t("filters.aliasPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftAlias("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("alias")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* TYPE POPOVER (SelectDropdown; allow overflow) */}
      <Popover
        open={openFilter === "type"}
        anchorRef={typeAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
      >
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byTypeTitle")}</div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<EntityTypeOption>
                label={t("filters.typeLabel")}
                items={typeOptions}
                selected={selectedDraftTypeOptions}
                onChange={(list) => setDraftTypes(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={
                  draftTypes.length
                    ? selectedDraftTypeOptions
                        .map((x) => x.label)
                        .slice(0, 2)
                        .join(", ") + (draftTypes.length > 2 ? ` +${draftTypes.length - 2}` : "")
                    : t("filters.typeAny")
                }
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftTypes([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("type")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* STATUS POPOVER (SelectDropdown; allow overflow) */}
      <Popover
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
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
      </Popover>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("btn.confirmDelete")}
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

export default EntitySettings;
