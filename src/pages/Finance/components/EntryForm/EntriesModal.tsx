import { useEntryOptions } from "./useEntryOptions";
import { getEntryChanges, entryFinancialLocked, touchesFinancialFields } from "./entryChanges";
import RecurrenceEntries from "./RecurrenceEntries";
import { useRecurrenceEntries } from "./useRecurrenceEntries";
import type { Entry } from "@/models/entries/entries";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { apiErrorMessage, isPreconditionFailure } from "@/lib/apiErrorMessage";
import { useTranslation } from "react-i18next";
import FloatingDialog, { DialogSkeleton } from "@/components/Modal/FloatingDialog";

import Button from "@/shared/ui/Button";


import { api } from "@/api/requests";
import { ApiError } from "@/models/Api";
import { formatCurrency, formatDateFromISO } from "@/lib";

import type {
  FormData,
  EntriesModalProps,
  PeriodOption,
  Tab,
  IntervalMonths,
} from "./types";

import type { AddEntryRequest } from "@/models/entries/entries";
import type { EntityTypeValue } from "@/models/settings/entities";
import type { DocumentType } from "@/models/entries/documentTypes";

import DetailsTab from "./Tab.details";
import CostCentersTab from "./Tab.costCenters";
import InventoryTab from "./Tab.inventory";
import EntitiesTab from "./Tab.entities";
import RecurrenceTab from "./Tab.recurrence";

/* ---------------------------------- Types --------------------------------- */

type DocumentTypeItem = { id: DocumentType["code"]; label: string };

/* ------------------------------ Stable constants ------------------------------ */

const IDS = {
  form: "EntriesModalForm",
  modalTitle: "entries-modal-title",
  categoryWrap: "cashflow-category-select-wrap",
  installmentsInput: "installments-input",
  inventoryQty: "inventory-qty-input",
  entityTypeWrap: "entity-type-wrap",
  entityWrap: "entity-wrap",
  deptPercPrefix: "dept-perc-",
} as const;

const TAB_LIST_BASE: { id: Tab; label: string }[] = [
  { id: "details", label: "entriesModal:tabs.details" },
  { id: "costCenters", label: "entriesModal:tabs.costCenters" },
  { id: "inventory", label: "entriesModal:tabs.inventory" },
  { id: "entities", label: "entriesModal:tabs.entities" },
  { id: "recurrence", label: "entriesModal:tabs.recurrence" },
];

const PERIOD_OPTIONS_BASE: PeriodOption[] = [
  { id: 0, label: "entriesModal:period.weekly", value: 0 },
  { id: 1, label: "entriesModal:period.monthly", value: 1 },
  { id: 2, label: "entriesModal:period.bimonthly", value: 2 },
  { id: 3, label: "entriesModal:period.quarterly", value: 3 },
  { id: 6, label: "entriesModal:period.semiannual", value: 6 },
  { id: 12, label: "entriesModal:period.annual", value: 12 },
];

const ENTITY_TYPE_OPTIONS_BASE: Array<{ id: number; label: string; value: EntityTypeValue }> = [
  { id: 1, label: "entriesModal:entities.types.client", value: "client" },
  { id: 2, label: "entriesModal:entities.types.supplier", value: "supplier" },
  { id: 3, label: "entriesModal:entities.types.employee", value: "employee" },
  { id: 4, label: "entriesModal:entities.types.contractor", value: "contractor" },
  { id: 5, label: "entriesModal:entities.types.partner", value: "partner" },
  { id: 6, label: "entriesModal:entities.types.prospect", value: "prospect" },
  { id: 7, label: "entriesModal:entities.types.affiliate", value: "affiliate" },
  { id: 8, label: "entriesModal:entities.types.advisor", value: "advisor" },
  { id: 9, label: "entriesModal:entities.types.investor", value: "investor" },
  { id: 10, label: "entriesModal:entities.types.other", value: "other" },
];

function getEmptyFormData(): FormData {
  return {
    details: {
      dueDate: toLocalISODate(new Date()),
      description: "",
      observation: "",
      amount: "",
      cashflowCategory: "",
      documentType: "",
      notes: "",
    },
    costCenters: {
      departments: [],
      department_percentage: [],
      projects: "",
    },
    inventory: {
      product: "",
      quantity: "",
    },
    entities: {
      entityType: "",
      entity: "",
    },
    recurrence: {
      recurrence: 0,
      installments: "",
      periods: 1,
      weekend: "",
    },
  };
}

function toLocalISODate(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function isDropdownOpen() {
  return !!document.querySelector('[data-select-open="true"]');
}

function focusFirstInteractive(wrapId?: string, amountRef?: React.RefObject<HTMLInputElement>) {
  if (!wrapId) return;

  if (wrapId === "amount-input") {
    amountRef?.current?.focus();
    return;
  }

  const scope = document.getElementById(wrapId) || document.querySelector<HTMLElement>(`#${wrapId}`);
  const el = scope?.querySelector<HTMLElement>("input,button,select,[tabindex]") || scope || null;
  el?.focus();
}

function hasTransientOverlayOpen() {
  return !!document.querySelector(
    '[data-select-open="true"],[data-menu-open="true"],[data-popover-open="true"]'
  );
}

function closeTransientOverlays() {
  if (typeof document === "undefined") return false;
  if (!hasTransientOverlayOpen()) return false;

  const target = document.body || document.documentElement;
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  return true;
}

/* -------------------------------- Component -------------------------------- */

const EntriesModal: React.FC<EntriesModalProps> = ({
  isOpen,
  onClose,
  type,
  onSave,
  initialEntry: providedEntry,
  isLoadingEntry,
}) => {
  const { t } = useTranslation(["entriesModal"]);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [overrideEntry, setOverrideEntry] = useState<Entry | null>(null);
  const initialEntry = overrideEntry ?? providedEntry;
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [scope, setScope] = useState<"single" | "selected">("single");
  const options = useEntryOptions(isOpen, type, sourceAttempt);
  const { categories: cashflowCategories, departments, projects, inventory: inventoryItems, entities, documents: docTypes, loading: sourcesLoading, issues: sourceIssues } = options;
  const series = useRecurrenceEntries(isOpen, initialEntry);
  useEffect(() => { setOverrideEntry(null); setScope("single"); setPendingEntryId(null); setRelatedLoading(false); }, [isOpen, providedEntry?.id]);

  const PERIOD_OPTIONS = useMemo(
    () => PERIOD_OPTIONS_BASE.map((p) => ({ ...p, label: t(p.label) })),
    [t]
  );

  const ENTITY_TYPE_OPTIONS = useMemo(
    () => ENTITY_TYPE_OPTIONS_BASE.map((o) => ({ ...o, label: t(o.label) })),
    [t]
  );

  const TAB_LIST = useMemo(
    () => TAB_LIST_BASE.map((tab) => ({ ...tab, label: t(tab.label) })),
    [t]
  );

  const DOCUMENT_TYPES = useMemo<DocumentTypeItem[]>(() => {
    return docTypes
      .filter((dt) => dt.is_active !== false)
      .map((dt) => ({
        id: dt.code,
        label: t(`entriesModal:documentTypes.${dt.code}`, { defaultValue: dt.code }),
      }));
  }, [docTypes, t]);

  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [formData, setFormData] = useState<FormData>(getEmptyFormData);

  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [warning, setWarning] = useState<{ title: string; message: string; focusId?: string } | null>(
    null
  );

  const lastSettledOnStr = useMemo(() => {
    if (!initialEntry) return null;
    const ie = initialEntry as unknown as { last_settled_on?: string | null };
    return ie.last_settled_on ?? null;
  }, [initialEntry]);

  const isFinancialLocked = Boolean(initialEntry && entryFinancialLocked(initialEntry));

  const formattedLastSettledOn = useMemo(() => {
    if (!lastSettledOnStr) return "";
    return formatDateFromISO(lastSettledOnStr);
  }, [lastSettledOnStr]);

  const isRecurrenceLocked = useMemo(() => {
    if (!initialEntry) return false;
    const count = (initialEntry as unknown as { installment_count?: number }).installment_count ?? 1;
    return count > 1 || isFinancialLocked;
  }, [initialEntry, isFinancialLocked]);

  const percentageSum = useMemo(() => {
    const nums = formData.costCenters.department_percentage
      .map((p) => Number(String(p).replace(",", ".")))
      .filter((n) => Number.isFinite(n));
    const total = nums.reduce((acc, n) => acc + n, 0);
    return Math.round(total * 100) / 100;
  }, [formData.costCenters.department_percentage]);

  const hasMeaningfulData = useMemo(() => {
    if (initialEntry) return Object.keys(getEntryChanges(initialEntry, formData)).length > 0;
    if (formData.details.amount > "") return true;

    const d = formData.details;
    if (
      d.description.trim() ||
      d.observation.trim() ||
      d.notes.trim() ||
      d.cashflowCategory ||
      d.documentType
    ) {
      return true;
    }

    const cc = formData.costCenters;
    if (cc.departments.length > 0 || cc.projects) return true;

    const inv = formData.inventory;
    if (inv.product || (!!inv.quantity && Number(inv.quantity) > 0)) return true;

    const ent = formData.entities;
    if (ent.entityType || ent.entity) return true;

    const rec = formData.recurrence;
    if (rec.recurrence === 1 || !!rec.installments || !!rec.weekend || Number(rec.periods) !== 1) {
      return true;
    }

    return false;
  }, [formData, initialEntry]);

  const resetInternalState = useCallback(() => {
    setFormData(getEmptyFormData());
    setActiveTab("details");
    setWarning(null);
    setShowCloseConfirm(false);
  }, []);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [onClose, resetInternalState]);

  const attemptClose = useCallback(() => {
    if (isDropdownOpen()) return;
    if (isSubmitting) return;

    setPendingEntryId(null);
    if (hasMeaningfulData) {
      setShowCloseConfirm(true);
      return;
    }

    handleClose();
  }, [hasMeaningfulData, handleClose, isSubmitting]);

  const onEsc = useCallback(() => {
    if (isSubmitting) return;

    if (warning) {
      setWarning(null);
      return;
    }
    if (showCloseConfirm) {
      setPendingEntryId(null);
      setShowCloseConfirm(false);
      return;
    }
    if (closeTransientOverlays()) return;
    attemptClose();
  }, [attemptClose, showCloseConfirm, warning, isSubmitting]);

  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const ie = initialEntry;

    const recCount = ie.installment_count ?? 1;
    const interval = ie.interval_months ?? 1;
    const weekendNum = ie.weekend_action ?? 0;

    const rawDeps = (ie.departments ?? []) as Array<{ department_id: string; percent: string | number }>;
    const depIds = rawDeps.map((d) => String(d.department_id));
    const depPercs = rawDeps.map((d) =>
      typeof d.percent === "number" ? d.percent.toFixed(2) : String(d.percent)
    );

    setFormData({
      details: {
        dueDate: ie.due_date,
        description: ie.description ?? "",
        observation: ie.observation ?? "",
        amount: ie.amount ?? "",
        cashflowCategory: ie.cashflow_category || "",
        documentType: ie.document_type || "",
        notes: ie.notes ?? "",
      },
      costCenters: {
        departments: depIds,
        department_percentage: depPercs,
        projects: ie.project || "",
      },
      inventory: { product: ie.items?.length === 1 ? ie.items[0].item_id || "" : "", quantity: ie.items?.length === 1 ? ie.items[0].quantity : "" },
      entities: {
        entityType: "",
        entity: ie.entity || "",
      },
      recurrence: {
        recurrence: recCount > 1 ? 1 : 0,
        installments: recCount > 1 ? String(recCount) : "",
        periods: Number(interval),
        weekend: weekendNum === 1 ? 1 : weekendNum === -1 ? -1 : "",
      },
    });
  }, [isOpen, initialEntry]);

  const validateAll = useCallback((): {
    ok: boolean;
    tab?: Tab;
    focusId?: string;
    title?: string;
    message?: string;
  } => {
    if (formData.details.amount <= "") {
      return {
        ok: false,
        tab: "details",
        focusId: "amount-input",
        title: t("entriesModal:errors.amount.title"),
        message: t("entriesModal:errors.amount.message"),
      };
    }

    if (!formData.details.cashflowCategory) {
      return {
        ok: false,
        tab: "details",
        focusId: IDS.categoryWrap,
        title: t("entriesModal:errors.cashflow_category.title", {
          defaultValue: t("entriesModal:errors.ledger_account.title"),
        }),
        message: t("entriesModal:errors.cashflow_category.message", {
          defaultValue: t("entriesModal:errors.ledger_account.message"),
        }),
      };
    }

    if (formData.recurrence.recurrence === 1 && !isRecurrenceLocked) {
      const n = Number(formData.recurrence.installments);
      if (!formData.recurrence.installments || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        return {
          ok: false,
          tab: "recurrence",
          focusId: IDS.installmentsInput,
          title: t("entriesModal:errors.installments.title"),
          message: t("entriesModal:errors.installments.message"),
        };
      }
    }

    if (formData.inventory.product) {
      const q = Number(formData.inventory.quantity);
      if (!formData.inventory.quantity || !Number.isFinite(q) || q <= 0) {
        return {
          ok: false,
          tab: "inventory",
          focusId: IDS.inventoryQty,
          title: t("entriesModal:errors.quantity.title"),
          message: t("entriesModal:errors.quantity.message"),
        };
      }
    }

    if (formData.entities.entityType && !formData.entities.entity) {
      return {
        ok: false,
        tab: "entities",
        focusId: IDS.entityWrap,
        title: t("entriesModal:errors.entity.title"),
        message: t("entriesModal:errors.entity.message"),
      };
    }

    if (formData.costCenters.departments.length > 0) {
      const percs = formData.costCenters.department_percentage;

      for (let i = 0; i < percs.length; i += 1) {
        const raw = String(percs[i] ?? "").trim();
        const n = Number(raw.replace(",", "."));
        if (!raw || !Number.isFinite(n) || n <= 0) {
          return {
            ok: false,
            tab: "costCenters",
            focusId: `${IDS.deptPercPrefix}${i}`,
            title: t("entriesModal:errors.departmentPercent.title"),
            message: t("entriesModal:errors.departmentPercent.message"),
          };
        }
      }

      if (Math.abs(percentageSum - 100) > 0.001) {
        return {
          ok: false,
          tab: "costCenters",
          focusId: `${IDS.deptPercPrefix}0`,
          title: t("entriesModal:errors.departmentSum.title"),
          message: t("entriesModal:errors.departmentSum.message"),
        };
      }
    }

    return { ok: true };
  }, [formData, isRecurrenceLocked, percentageSum, t]);

  const goTabRelative = useCallback(
    (delta: number) => {
      const idx = TAB_LIST.findIndex((x) => x.id === activeTab);
      if (idx === -1) return;
      const nextIdx = (idx + delta + TAB_LIST.length) % TAB_LIST.length;
      setActiveTab(TAB_LIST[nextIdx].id);
    },
    [activeTab, TAB_LIST]
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (warning || showCloseConfirm) return;
        if (hasTransientOverlayOpen()) return;

        e.preventDefault();

        const el = document.getElementById(IDS.form);
        if (el instanceof HTMLFormElement) el.requestSubmit();
        return;
      }

      if (e.ctrlKey && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (warning || showCloseConfirm) return;
        if (hasTransientOverlayOpen()) return;

        e.preventDefault();
        goTabRelative(e.key === "ArrowRight" ? 1 : -1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, goTabRelative, showCloseConfirm, warning, onEsc]);

  const buildDepartmentsPayload = useCallback(() => {
    if (!formData.costCenters.departments.length) return undefined;

    return formData.costCenters.departments.map((id, idx) => {
      const raw = String(formData.costCenters.department_percentage[idx] || "0").replace(",", ".");
      const n = Number(raw);
      const pct = Number.isFinite(n) ? n.toFixed(2) : "0.00";
      return { department_id: id, percent: pct };
    });
  }, [formData.costCenters.departments, formData.costCenters.department_percentage]);

  const buildItemsPayload = useCallback(() => {
    if (!formData.inventory.product || !formData.inventory.quantity) return undefined;
    const q = Number(formData.inventory.quantity);
    if (!Number.isFinite(q) || q <= 0) return undefined;

    return [{ item_id: formData.inventory.product, quantity: String(q) }];
  }, [formData.inventory.product, formData.inventory.quantity]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || sourcesLoading || isLoadingEntry || relatedLoading) return;

      if (scope === "selected" && (series.loading || series.error || series.selectedCount > 999 || (initialEntry && touchesFinancialFields(getEntryChanges(initialEntry, formData)) && series.entries.some(row => series.selectedIds.includes(row.id) && entryFinancialLocked(row))))) {
        setActiveTab("recurrence");
        setWarning({ title: t("entriesModal:series.applyTo"), message: t("entriesModal:series.blocked") });
        return;
      }
      const v = validateAll();
      if (!v.ok) {
        setActiveTab(v.tab || "details");
        setWarning({
          title: v.title || t("entriesModal:errors.generic.title"),
          message: v.message || t("entriesModal:errors.generic.message"),
          focusId: v.focusId,
        });
        return;
      }

      setIsSubmitting(true);

      try {
        type ApiOk<T> = { data: T };
        type ApiResult<T> = ApiOk<T> | ApiError;

        let res: ApiResult<unknown>;

        const deps = buildDepartmentsPayload();
        const items = buildItemsPayload();

        if (!initialEntry) {
          const isRecurring = formData.recurrence.recurrence === 1;
          const installmentCount = isRecurring ? Number(formData.recurrence.installments || 1) : 1;

          const payload: AddEntryRequest = {
            due_date: formData.details.dueDate,
            description: formData.details.description || "",
            observation: formData.details.observation || "",
            notes: formData.details.notes || "",
            amount: formData.details.amount || "",
            tx_type: type,

            cashflow_category: formData.details.cashflowCategory,

            ...(formData.details.documentType ? { document_type: formData.details.documentType } : {}),
            ...(formData.costCenters.projects ? { project: formData.costCenters.projects } : {}),
            ...(formData.entities.entity ? { entity: formData.entities.entity } : {}),
            ...(deps ? { departments: deps } : {}),
            ...(items ? { items } : {}),
            ...(isRecurring && installmentCount > 1
              ? {
                  installment_count: installmentCount,
                  interval_months: formData.recurrence.periods as IntervalMonths,
                  ...(formData.recurrence.weekend !== ""
                    ? { weekend_action: formData.recurrence.weekend }
                    : {}),
                }
              : {}),
          };

          res = await api.addEntry(payload);
        } else {
          const ie = initialEntry;
          const changes = getEntryChanges(ie, formData);
          if (Object.keys(changes).length === 0) {
            handleClose();
            onSave();
            return;
          }

          if (scope === "selected") {
            const ids = [ie.id, ...series.selectedIds];
            const versions = Object.fromEntries(series.entries.filter(row => ids.includes(row.id)).map(row => [row.id, row.id === ie.id ? ie.version || row.version : row.version]));
            res = await api.editEntryRecurrence(ie.id, ids, versions, changes, series.selectionPayload);
          } else res = await api.editEntry(ie.id, changes, ie.version);
        }

        if (!("data" in res)) {
          const apiError = res as ApiError;
          setWarning({
            title: t("entriesModal:saveError.title"),
            message: apiError?.error?.message || t("entriesModal:saveError.generic"),
          });
          return;
        }

        handleClose();
        onSave();
      } catch (err) {
        const message = isPreconditionFailure(err) ? t("entriesModal:series.conflict") : apiErrorMessage(err, t("entriesModal:saveError.unexpected"));

        setWarning({ title: t("entriesModal:saveError.title"), message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validateAll,
      scope, series.selectedIds, series.selectedCount, series.selectionPayload, series.entries, series.loading, series.error, relatedLoading,
      isSubmitting,
      sourcesLoading,
      isLoadingEntry,
      t,
      buildDepartmentsPayload,
      buildItemsPayload,
      initialEntry,
      formData,
      type,
      handleClose,
      onSave,
    ]
  );

  const changes = initialEntry ? getEntryChanges(initialEntry, formData) : {};
  const financialChange = touchesFinancialFields(changes);
  const selectedRows = series.entries.filter(row => series.selectedIds.includes(row.id));
  const blockedSelection = scope === "selected" && (series.selectedCount > 999 || (financialChange && selectedRows.some(entryFinancialLocked)));
  const relatedRequest = useRef(0);
  useEffect(() => () => { relatedRequest.current++; }, [isOpen]);
  const openRelated = useCallback(async (id: string) => {
    const request = ++relatedRequest.current;
    setShowCloseConfirm(false);
    setPendingEntryId(null);
    setRelatedLoading(true);
    try {
      const response = await api.getEntry(id);
      if (request === relatedRequest.current) { setOverrideEntry(response.data); setScope("single"); setPendingEntryId(null); setShowCloseConfirm(false); }
    } catch (error) {
      if (request === relatedRequest.current) setWarning({ title: t("entriesModal:saveError.title"), message: apiErrorMessage(error, t("entriesModal:series.loadError")) });
    } finally { if (request === relatedRequest.current) setRelatedLoading(false); }
  }, [t]);
  const requestRelated = (id: string) => {
    if (Object.keys(changes).length) { setPendingEntryId(id); setShowCloseConfirm(true); }
    else void openRelated(id);
  };

  const isAmountValid = formData.details.amount > "";
  const isCategoryValid = !!formData.details.cashflowCategory;

  const isRecurrenceValid =
    isRecurrenceLocked ||
    formData.recurrence.recurrence !== 1 ||
    (Number.isInteger(Number(formData.recurrence.installments)) &&
      Number(formData.recurrence.installments) > 0);

  const isInventoryValid =
    !formData.inventory.product ||
    (!!formData.inventory.quantity && Number(formData.inventory.quantity) > 0);

  const areDepartmentsValid =
    formData.costCenters.departments.length === 0 ||
    (formData.costCenters.department_percentage.every((raw) => {
      const n = Number(String(raw).replace(",", "."));
      return !!String(raw).trim() && Number.isFinite(n) && n > 0;
    }) &&
      Math.abs(percentageSum - 100) <= 0.001);

  const isSaveDisabled =
    isSubmitting ||
    !isAmountValid ||
    !isCategoryValid ||
    !isRecurrenceValid ||
    !isInventoryValid ||
    !areDepartmentsValid;

  const renderTabs = () => (
    <nav role="tablist" aria-label={t("entriesModal:header.entry")} className="flex gap-[3px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-lg border border-[#e8ebf0] bg-[#f5f7fa] p-[3px]">
      {TAB_LIST.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            id={`entry-tab-${tab.id}`}
            aria-controls="entry-form-panel"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className="min-h-11 flex-1 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 py-2 text-xs font-medium text-[#687385] transition-colors hover:bg-[#edf0f5] hover:text-[#26344a] aria-selected:border-[#e1e6ee] aria-selected:bg-white aria-selected:text-[#26344a] focus-visible:outline-2 focus-visible:outline-indigo-500 sm:min-h-8"
            onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const i = TAB_LIST.findIndex(item => item.id === tab.id);
              const next = event.key === "Home" ? 0 : event.key === "End" ? TAB_LIST.length - 1 : (i + (event.key === "ArrowRight" ? 1 : -1) + TAB_LIST.length) % TAB_LIST.length;
              setActiveTab(TAB_LIST[next].id);
              document.getElementById(`entry-tab-${TAB_LIST[next].id}`)?.focus();
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return (
          <DetailsTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            amountRef={amountRef}
            descriptionRef={descriptionRef}
            cashflowCategories={cashflowCategories}
            categoryWrapId={IDS.categoryWrap}
            documentTypes={DOCUMENT_TYPES}
            isFinancialLocked={isFinancialLocked}
          />
        );

      case "costCenters":
        return (
          <CostCentersTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            departments={departments}
            projects={projects}
            deptPercPrefix={IDS.deptPercPrefix}
            isFinancialLocked={isFinancialLocked}
          />
        );

      case "inventory":
        return (
          <InventoryTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            inventoryItems={inventoryItems}
            inventoryQtyId={IDS.inventoryQty}
            isFinancialLocked={isFinancialLocked}
          />
        );

      case "entities":
        return (
          <EntitiesTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            entityTypeOptions={ENTITY_TYPE_OPTIONS}
            entityTypeWrapId={IDS.entityTypeWrap}
            entityWrapId={IDS.entityWrap}
            entities={entities}
            isFinancialLocked={isFinancialLocked}
          />
        );

      case "recurrence":
        return (
          <div className="space-y-5">
            {initialEntry?.installment_group_id && <details className="mb-3 border-b border-slate-100 pb-2">
          <summary className="cursor-pointer py-1 text-[11px] font-medium text-slate-500">{t("entriesModal:series.applyTo")}</summary>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <label className="flex min-h-10 items-center gap-1.5 sm:min-h-7"><input type="radio" className="size-3 accent-[var(--accentPrimary)]" name="entry-edit-scope" checked={scope === "single"} onChange={() => setScope("single")} />{t("entriesModal:series.onlyThis")}</label>
            <label className="flex min-h-10 items-center gap-1.5 sm:min-h-7"><input type="radio" className="size-3 accent-[var(--accentPrimary)]" name="entry-edit-scope" checked={scope === "selected"} onChange={() => { setScope("selected"); setActiveTab("recurrence"); }} />{t("entriesModal:series.selected", { count: series.selectedCount + 1 })}</label>
          </div>
          {scope === "selected" && <details className="mt-1 text-[11px] leading-5 text-slate-500"><summary className="cursor-pointer">{t("entriesModal:series.scopeDetails")}</summary><p>{t("entriesModal:series.explain")}</p></details>}
          {blockedSelection && <p role="alert" className="mt-2 text-xs text-amber-800">{t("entriesModal:series.blocked")}</p>}
        </details>}
            <RecurrenceTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            periodOptions={PERIOD_OPTIONS}
            installmentsInputId={IDS.installmentsInput}
            isRecurrenceLocked={isRecurrenceLocked}
          />{initialEntry?.installment_group_id && <RecurrenceEntries currentId={initialEntry.id} series={series} selectable={scope === "selected"} onEdit={requestRelated} />}</div>
        );

      default:
        return null;
    }
  };

  return (
    <FloatingDialog isOpen={isOpen} width={880} height={670} title={type === "credit" ? t("entriesModal:header.receipts") : t("entriesModal:header.payments")}
      eyebrow={t("entriesModal:header.entry")} description={isFinancialLocked ? (formattedLastSettledOn ? t("entriesModal:settledInfo", { date: formattedLastSettledOn }) : t("entriesModal:guidance.financialLocked")) : t("entriesModal:guidance.intro")}
      closeLabel={t("entriesModal:aria.close")} onClose={attemptClose} busy={isSubmitting} loading={Boolean(isLoadingEntry) || sourcesLoading || relatedLoading} onSubmit={handleSubmit} formId={IDS.form} tabs={renderTabs()}
      footer={<>            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[12px] text-gray-600 hidden md:block">
                {formData.details.amount > "" ? (
                  <>
                    {t("entriesModal:footer.value")} <b>{formatCurrency(formData.details.amount)}</b>
                  </>
                ) : (
                  <>{t("entriesModal:footer.enterValue")}</>
                )}
                <span className="ml-3 text-gray-400">{t("entriesModal:footer.shortcuts")}</span>
              </p>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button
                  variant="cancel"
                  type="button"
                  onClick={attemptClose}
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                >
                  {t("entriesModal:actions.cancel")}
                </Button>
                <Button type="submit" disabled={isSaveDisabled || sourcesLoading || Boolean(isLoadingEntry) || relatedLoading || blockedSelection || (scope === "selected" && (series.loading || Boolean(series.error)))} className="w-full md:w-auto">
                  {isSubmitting ? t("entriesModal:actions.saving") : t("entriesModal:actions.save")}
                </Button>
              </div>
            </div>
</>}
      overlay={(showCloseConfirm || warning) ? <>
        {showCloseConfirm && (
          <div
            className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="close-confirm-title"
            aria-describedby="close-confirm-desc"
          >
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 id="close-confirm-title" className="text-[15px] font-semibold text-gray-900">
                  {t("entriesModal:confirmDiscard.title")}
                </h2>
                <p id="close-confirm-desc" className="mt-1 text-[12px] text-gray-600">
                  {t("entriesModal:confirmDiscard.message")}
                </p>
              </div>
              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="outline"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => { setShowCloseConfirm(false); setPendingEntryId(null); }}
                >
                  {t("entriesModal:actions.back")}
                </Button>
                <Button
                  variant="danger"
                  className="w-full md:w-auto !bg-red-500 hover:!bg-red-600"
                  onClick={() => { if (pendingEntryId) void openRelated(pendingEntryId); else handleClose(); }}
                >
                  {t("entriesModal:actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {warning && (
          <div
            className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="warn-title"
            aria-describedby="warn-desc"
          >
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 id="warn-title" className="text-[15px] font-semibold text-amber-800">
                  {warning.title}
                </h2>
                <p id="warn-desc" className="mt-1 text-[12px] text-amber-700">
                  {warning.message}
                </p>
              </div>
              <div
                className="px-5 py-4 flex justify-end"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="primary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    const fId = warning.focusId;
                    setWarning(null);
                    setTimeout(() => focusFirstInteractive(fId, amountRef), 0);
                  }}
                >
                  {t("entriesModal:actions.ok")}
                </Button>
              </div>
            </div>
          </div>
        )}
</> : undefined}
    >
      {isLoadingEntry || sourcesLoading || relatedLoading ? <DialogSkeleton label={t("entriesModal:guidance.loading")} /> : <>
        {sourceIssues.length > 0 && <div role="status" className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-medium">{t("entriesModal:options.title")}</p><ul className="mt-2 space-y-1">{sourceIssues.map(issue => <li key={issue.source}><b>{t(`entriesModal:options.${issue.source}`)}</b> — {issue.status === 403 ? t("entriesModal:options.forbidden") : issue.status ? t("entriesModal:options.failed", { status: issue.status }) : t(issue.invalidResponse ? "entriesModal:options.invalidResponse" : "entriesModal:options.connection")}{issue.requestId && <span className="block text-[10px]">{t("entriesModal:options.reference", { id: issue.requestId })}</span>}</li>)}</ul><Button type="button" variant="outline" className="mt-3" onClick={() => setSourceAttempt(value => value + 1)}>{t("entriesModal:guidance.retry")}</Button></div>}
        <div id="entry-form-panel" role="tabpanel" aria-labelledby={`entry-tab-${activeTab}`} className="space-y-5">{renderTabContent()}</div>
      </>}
    </FloatingDialog>
  );
};

export default EntriesModal;
