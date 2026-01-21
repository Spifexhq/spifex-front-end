/* --------------------------------------------------------------------------
 * File: src/pages/DepartmentSettings/index.tsx
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

import DepartmentModal from "./DepartmentModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { TFunction } from "i18next";
import type { Department, GetDepartmentsParams } from "@/models/settings/departments";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "DP";
}

function sortOverlayByCodeThenName(a: Department, b: Department) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

type FilterKey = "code" | "name" | "status" | null;

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

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetDepartmentsParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
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

const Row = ({
  dept,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  dept: Department;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {dept.code ? `${t("tags.code")}: ${dept.code}` : "—"}
        {dept.is_active === false ? ` • ${t("tags.inactive")}` : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{dept.name || t("tags.noName")}</p>
    </div>

    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" onClick={() => onEdit(dept)} disabled={busy}>
          {t("buttons.edit")}
        </Button>
        <Button variant="outline" onClick={() => onDelete(dept)} disabled={busy} aria-busy={busy || undefined}>
          {t("buttons.delete")}
        </Button>
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */

const DepartmentSettings: React.FC = () => {
  const { t, i18n } = useTranslation("departmentSettings");
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
  const [editingDept, setEditingDept] = useState<Department | null>(null);

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
  const [added, setAdded] = useState<Department[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]); // multi-select

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);

  const hasAppliedFilters = useMemo(() => {
    return appliedCode.trim() !== "" || appliedName.trim() !== "" || appliedStatuses.length > 0;
  }, [appliedCode, appliedName, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);
  const [draftCode, setDraftCode] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const codeAnchorRef = useRef<HTMLDivElement | null>(null);
  const nameAnchorRef = useRef<HTMLDivElement | null>(null);
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

  const fetchDepartmentsPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as Department[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const params: GetDepartmentsParams = {
          cursor,
          code: appliedCode.trim() || undefined,
          name: appliedName.trim() || undefined,
          active: toActiveParamFromStatusKeys(appliedStatuses),
        };

        const { data, meta } = await api.getDepartments(params);

        const items = (data.results ?? []) as Department[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
      }
    },
    [appliedCode, appliedName, appliedStatuses]
  );

  const pager = useCursorPager<Department>(fetchDepartmentsPage, {
    autoLoadFirst: true,
    deps: [appliedCode, appliedName, appliedStatuses],
  });

  const { refresh } = pager;

  /* ------------------------------ Filter apply/clear ------------------------ */
  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "code") {
        const next = draftCode.trim();
        if (next === appliedCode.trim()) refresh();
        else setAppliedCode(next);
      }

      if (key === "name") {
        const next = draftName.trim();
        if (next === appliedName.trim()) refresh();
        else setAppliedName(next);
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
    [draftCode, draftName, draftStatuses, appliedCode, appliedName, appliedStatuses, refresh]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "code") setAppliedCode("");
    if (key === "name") setAppliedName("");
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!hasAppliedFilters) {
      refresh();
      return;
    }
    setAppliedCode("");
    setAppliedName("");
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, [hasAppliedFilters, refresh]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "code") setDraftCode(appliedCode);
    if (openFilter === "name") setDraftName(appliedName);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [openFilter, appliedCode, appliedName, appliedStatuses]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    if (openFilter === "code") {
      requestAnimationFrame(() => {
        const el = document.getElementById("dept-filter-code-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
    if (openFilter === "name") {
      requestAnimationFrame(() => {
        const el = document.getElementById("dept-filter-name-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
  }, [openFilter]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesFilters = useCallback(
    (d: Department) => {
      const mode = appliedStatusMode;
      if (mode === "active" && d.is_active === false) return false;
      if (mode === "inactive" && d.is_active !== false) return false;

      if (appliedCode.trim()) {
        if (!(d.code || "").toLowerCase().includes(appliedCode.trim().toLowerCase())) return false;
      }

      if (appliedName.trim()) {
        if (!(d.name || "").toLowerCase().includes(appliedName.trim().toLowerCase())) return false;
      }

      return true;
    },
    [appliedCode, appliedName, appliedStatusMode]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((d) => matchesFilters(d)));
  }, [matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added
      .filter((d) => matchesFilters(d))
      .slice()
      .sort(sortOverlayByCodeThenName);

    const addedIds = new Set(addedFiltered.map((d) => d.id));

    const base = pager.items
      .filter((d) => !deletedIds.has(d.id) && !addedIds.has(d.id))
      .filter((d) => matchesFilters(d));

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingDept(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setModalMode("edit");
    setEditingDept(dept);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDept(null);
  };

  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  /* ---------- ConfirmToast delete ----------------------------------------- */
  const requestDeleteDepartment = (dept: Department) => {
    const name = dept.name ?? "";

    setConfirmText(t("confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(dept.id);

      try {
        setDeletedIds((prev) => new Set(prev).add(dept.id));
        await api.deleteDepartment(dept.id);

        await pager.refresh();
        setAdded((prev) => prev.filter((d) => d.id !== dept.id));

        setSnack({ message: t("toast.deleteOk"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(dept.id);
          return next;
        });

        setSnack({
          message: err instanceof Error ? err.message : t("errors.deleteFailed"),
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

  /* -------------------------------- Derived UI ---------------------------- */
  const canEdit = !!isOwner;
  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

  const codeChipValue = appliedCode.trim() ? truncate(appliedCode.trim(), 22) : "";
  const nameChipValue = appliedName.trim() ? truncate(appliedName.trim(), 22) : "";
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
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("card.settings")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("card.departments")}</h1>
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  {/* LEFT: chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div ref={codeAnchorRef}>
                      <Chip
                        label={t("filters.codeLabel", { defaultValue: "Code" })}
                        value={codeChipValue ? `• ${codeChipValue}` : undefined}
                        active={!!appliedCode.trim()}
                        onClick={() => togglePopover("code")}
                        onClear={appliedCode.trim() ? () => clearOne("code") : undefined}
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
                        {t("buttons.add")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">{t("errors.fetchError")}</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh} disabled={globalBusy}>
                    {t("buttons.tryAgain")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">{t("alerts.noData")}</p>
                    ) : (
                      visibleItems.map((d) => {
                        const rowBusy = globalBusy || deleteTargetId === d.id || deletedIds.has(d.id);

                        return (
                          <Row
                            key={d.id}
                            dept={d}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={requestDeleteDepartment}
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

        <DepartmentModal
          isOpen={modalOpen}
          mode={modalMode}
          department={editingDept}
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

      {/* CODE POPOVER (PORTAL) */}
      <Popover
        open={openFilter === "code"}
        anchorRef={codeAnchorRef}
        onClose={() => setOpenFilter(null)}
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byCodeTitle", { defaultValue: "Filter by code" })}
          </div>

          <div className="mt-3">
            <Input
              kind="text"
              id="dept-filter-code-input"
              type="text"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("code");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.codePlaceholder", { defaultValue: "Type a code…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftCode("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("code")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </Popover>

      {/* NAME POPOVER (PORTAL) */}
      <Popover
        open={openFilter === "name"}
        anchorRef={nameAnchorRef}
        onClose={() => setOpenFilter(null)}
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byNameTitle", { defaultValue: "Filter by name" })}
          </div>

          <div className="mt-3">
            <Input
              kind="text"
              id="dept-filter-name-input"
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
      </Popover>

      {/* STATUS POPOVER (PORTAL) */}
      <Popover
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
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
      </Popover>

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

export default DepartmentSettings;
