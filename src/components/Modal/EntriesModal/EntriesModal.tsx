// src/components/Modal/EntriesModal.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Spinner from "@/shared/ui/Loaders/Spinner";

import { api } from "@/api/requests";
import { ApiError } from "@/models/Api";
import { fetchAllCursor } from "@/lib/list";
import { formatCurrency, formatDateFromISO } from "@/lib";

import type {
  FormData,
  EntriesModalProps,
  PeriodOption,
  Tab,
  IntervalMonths,
} from "../Modal.types";

import type { AddEntryRequest, EditEntryRequest } from "@/models/entries/entries";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { Department } from "@/models/settings/departments";
import type { Project } from "@/models/settings/projects";
import type { InventoryItem } from "@/models/settings/inventory";
import type { Entity, EntityTypeValue } from "@/models/settings/entities";
import type { DocumentType } from "src/models/entries/documentTypes";

import DetailsTab from "./Tab.details";
import CostCentersTab from "./Tab.costCenters";
import InventoryTab from "./Tab.inventory";
import EntitiesTab from "./Tab.entities";
import RecurrenceTab from "./Tab.recurrence";

/* ---------------------------------- Types --------------------------------- */
type DocumentTypeItem = { id: DocumentType["code"]; label: string };

type EntryDiffable = {
  id: string;
  due_date: string;
  description?: string | null;
  observation?: string | null;
  notes?: string | null;
  amount: string;
  tx_type: "credit" | "debit";
  ledger_account?: string | null;
  document_type?: string | null;
  project?: string | null;
  entity?: string | null;
  installment_count?: number | null;
  interval_months?: number | null;
  weekend_action?: number | null;
  last_settled_on?: string | null;
  departments?: Array<{ department_id: string; percent: string | number }>;
};

/* ------------------------------ Stable constants ------------------------------ */
const IDS = {
  ledgerWrap: "ledger-select-wrap",
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
      dueDate: "",
      description: "",
      observation: "",
      amount: "",
      ledgerAccount: "",
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

/* -------------------------------- Component -------------------------------- */

const EntriesModal: React.FC<EntriesModalProps> = ({
  isOpen,
  onClose,
  type,
  onSave,
  initialEntry,
  isLoadingEntry,
}) => {
  const { t } = useTranslation(["entriesModal"]);

  /* ----------------------------- Translated lists ---------------------------- */
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

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const DOCUMENT_TYPES = useMemo<DocumentTypeItem[]>(() => {
    return docTypes
      .filter((dt) => dt.is_active !== false)
      .map((dt) => ({
        id: dt.code,
        label: t(`entriesModal:documentTypes.${dt.code}`, { defaultValue: dt.code }),
      }));
  }, [docTypes, t]);

  /* -------------------------------- State -------------------------------- */
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [formData, setFormData] = useState<FormData>(getEmptyFormData);

  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [warning, setWarning] = useState<{ title: string; message: string; focusId?: string } | null>(null);

  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  /* ------------------------------ Locks & derived ------------------------------ */
  const lastSettledOnStr = useMemo(() => {
    if (!initialEntry) return null;
    const ie = initialEntry as unknown as { last_settled_on?: string | null };
    return ie.last_settled_on ?? null;
  }, [initialEntry]);

  const isFinancialLocked = !!lastSettledOnStr;

  const formattedLastSettledOn = useMemo(() => {
    if (!lastSettledOnStr) return "";
    return formatDateFromISO(lastSettledOnStr);
  }, [lastSettledOnStr]);

  const isRecurrenceLocked = useMemo(() => {
    if (!initialEntry) return false;
    const count = (initialEntry as unknown as { installment_count?: number }).installment_count ?? 1;
    return count > 1 || !!lastSettledOnStr;
  }, [initialEntry, lastSettledOnStr]);

  const percentageSum = useMemo(() => {
    const nums = formData.costCenters.department_percentage
      .map((p) => Number(String(p).replace(",", ".")))
      .filter((n) => Number.isFinite(n));
    const total = nums.reduce((acc, n) => acc + n, 0);
    return Math.round(total * 100) / 100;
  }, [formData.costCenters.department_percentage]);

  /* ------------------------- Flag: meaningful data ------------------------- */
  const hasMeaningfulData = useMemo(() => {
    if (formData.details.amount > "") return true;

    const d = formData.details;
    if (
      d.description.trim() ||
      d.observation.trim() ||
      d.notes.trim() ||
      d.ledgerAccount ||
      d.documentType
    )
      return true;

    const cc = formData.costCenters;
    if (cc.departments.length > 0 || cc.projects) return true;

    const inv = formData.inventory;
    if (inv.product || (!!inv.quantity && Number(inv.quantity) > 0)) return true;

    const ent = formData.entities;
    if (ent.entityType || ent.entity) return true;

    const rec = formData.recurrence;
    if (rec.recurrence === 1 || !!rec.installments || !!rec.weekend || Number(rec.periods) !== 1) return true;

    return false;
  }, [formData]);

  /* ------------------------- Reset / close helpers ------------------------- */
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

    if (hasMeaningfulData) {
      setShowCloseConfirm(true);
      return;
    }

    handleClose();
  }, [hasMeaningfulData, handleClose]);

  /* --------------------------- Fetch helpers --------------------------- */
  const fetchAllLedgerAccounts = useCallback(async () => {
    const all = await fetchAllCursor<LedgerAccount>(api.getLedgerAccounts);
    const wanted = type === "credit" ? "credit" : "debit";
    return all.filter((a) => (a?.default_tx || "").toLowerCase() === wanted);
  }, [type]);

  const fetchAllDepartments = useCallback(() => fetchAllCursor<Department>(api.getDepartmentsOptions), []);
  const fetchAllProjects = useCallback(() => fetchAllCursor<Project>(api.getProjectsOptions), []);
  const fetchAllInventoryItems = useCallback(() => fetchAllCursor<InventoryItem>(api.getInventoryOptions), []);
  const fetchAllEntities = useCallback(() => fetchAllCursor<Entity>(api.getEntitiesOptions), []);
  const fetchAllDocumentTypes = useCallback(() => fetchAllCursor<DocumentType>(api.getDocumentTypes), []);

  /* --------------------------- Load sources on open --------------------------- */
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      try {
        const [la, deps, prjs, invs, ents, dts] = await Promise.all([
          fetchAllLedgerAccounts(),
          fetchAllDepartments(),
          fetchAllProjects(),
          fetchAllInventoryItems(),
          fetchAllEntities(),
          fetchAllDocumentTypes(),
        ]);

        if (!alive) return;
        setLedgerAccounts(la);
        setDepartments(deps);
        setProjects(prjs);
        setInventoryItems(invs);
        setEntities(ents);
        setDocTypes(dts);
      } catch (e) {
        console.error("Error loading modal sources:", e);
      }

      if (!alive) return;
      if (!initialEntry) {
        setFormData((prev) => ({
          ...prev,
          details: { ...prev.details, dueDate: toLocalISODate(new Date()) },
        }));
      }

      setTimeout(() => amountRef.current?.focus(), 50);
    })();

    return () => {
      alive = false;
    };
  }, [
    isOpen,
    initialEntry,
    fetchAllLedgerAccounts,
    fetchAllDepartments,
    fetchAllProjects,
    fetchAllInventoryItems,
    fetchAllEntities,
    fetchAllDocumentTypes,
  ]);

  /* ------------------------ Fill form when editing ------------------------- */
  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const ie = initialEntry as unknown as EntryDiffable;

    const recCount = ie.installment_count ?? 1;
    const interval = ie.interval_months ?? 1;
    const weekendNum = ie.weekend_action ?? 0;

    const rawDeps = (ie.departments ?? []) as Array<{ department_id: string; percent: string | number }>;
    const depIds = rawDeps.map((d) => String(d.department_id));
    const depPercs = rawDeps.map((d) => (typeof d.percent === "number" ? d.percent.toFixed(2) : String(d.percent)));

    setFormData({
      details: {
        dueDate: ie.due_date,
        description: ie.description ?? "",
        observation: ie.observation ?? "",
        amount: ie.amount ?? "",
        ledgerAccount: ie.ledger_account || "",
        documentType: ie.document_type || "",
        notes: ie.notes ?? "",
      },
      costCenters: {
        departments: depIds,
        department_percentage: depPercs,
        projects: ie.project || "",
      },
      inventory: { product: "", quantity: "" },
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

  /* ---------------------------- Validations ---------------------------- */
  type ValidationResult = { ok: boolean; tab?: Tab; focusId?: string; title?: string; message?: string };

  const validateAll = useCallback((): ValidationResult => {
    if (formData.details.amount <= "") {
      return {
        ok: false,
        tab: "details",
        focusId: "amount-input",
        title: t("entriesModal:errors.amount.title"),
        message: t("entriesModal:errors.amount.message"),
      };
    }

    if (!formData.details.ledgerAccount) {
      return {
        ok: false,
        tab: "details",
        focusId: IDS.ledgerWrap,
        title: t("entriesModal:errors.ledger_account.title"),
        message: t("entriesModal:errors.ledger_account.message"),
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

      for (let i = 0; i < percs.length; i++) {
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

  /* ----------------------- Keyboard: ESC, Ctrl/⌘+S, Ctrl+Alt+←/→ ----------------------- */
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
        if (warning) {
          e.stopPropagation();
          setWarning(null);
          return;
        }
        if (showCloseConfirm) {
          e.stopPropagation();
          setShowCloseConfirm(false);
          return;
        }
        if (isDropdownOpen()) return;
        attemptClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("modalForm") as HTMLFormElement | null)?.requestSubmit();
        return;
      }

      if (e.ctrlKey && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (warning || showCloseConfirm) return;
        if (isDropdownOpen()) return;
        e.preventDefault();
        goTabRelative(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose, showCloseConfirm, goTabRelative, warning]);

  /* ------------------------------ Submit helpers ------------------------------ */
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

  /* ------------------------ Submit --------------------------- */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

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

            ledger_account: formData.details.ledgerAccount,

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
          const ie = initialEntry as unknown as EntryDiffable;
          const changes: Partial<EditEntryRequest> = {};

          if (formData.details.dueDate !== ie.due_date) changes.due_date = formData.details.dueDate;
          if ((formData.details.description || "") !== (ie.description || ""))
            changes.description = formData.details.description || "";
          if ((formData.details.observation || "") !== (ie.observation || ""))
            changes.observation = formData.details.observation || "";
          if ((formData.details.notes || "") !== (ie.notes || "")) changes.notes = formData.details.notes || "";

          if (!isFinancialLocked && formData.details.amount !== ie.amount) {
            changes.amount = formData.details.amount;
          }

          const initialGl = ie.ledger_account || "";
          if (!isFinancialLocked && formData.details.ledgerAccount && formData.details.ledgerAccount !== initialGl) {
            changes.ledger_account = formData.details.ledgerAccount;
          }

          const initialDocType = ie.document_type || "";
          const newDocType = formData.details.documentType || "";
          if (newDocType !== initialDocType) {
            changes.document_type = newDocType || null;
          }

          const initialProject = ie.project || "";
          const newProject = formData.costCenters.projects || "";
          if (!isFinancialLocked && newProject !== initialProject) {
            changes.project = newProject || null;
          }

          const initialEntity = ie.entity || "";
          const newEntity = formData.entities.entity || "";
          if (!isFinancialLocked && newEntity !== initialEntity) {
            changes.entity = newEntity || null;
          }

          if (!isFinancialLocked && deps) changes.departments = deps;
          if (!isFinancialLocked && items) changes.items = items;

          const initialRecCount = ie.installment_count ?? 1;
          if (initialRecCount <= 1) {
            const wantRecurring = formData.recurrence.recurrence === 1;
            const count = wantRecurring ? Number(formData.recurrence.installments || 1) : 1;

            if (wantRecurring && count > 1) {
              changes.installment_count = count;
              changes.interval_months = formData.recurrence.periods as IntervalMonths;
              if (formData.recurrence.weekend) {
                changes.weekend_action = formData.recurrence.weekend;
              }
            }
          }

          if (Object.keys(changes).length === 0) {
            handleClose();
            onSave();
            return;
          }

          res = await api.editEntry(ie.id, changes);
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
        const message =
          axios.isAxiosError(err) && err.response?.data?.error?.message
            ? err.response.data.error.message
            : t("entriesModal:saveError.unexpected");

        setWarning({ title: t("entriesModal:saveError.title"), message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validateAll,
      t,
      buildDepartmentsPayload,
      buildItemsPayload,
      initialEntry,
      formData,
      type,
      isFinancialLocked,
      handleClose,
      onSave,
    ]
  );

  /* ---------------------------- UI derivations ------------------------- */
  const isAmountValid = formData.details.amount > "";
  const isLedgerValid = !!formData.details.ledgerAccount;

  const isRecurrenceValid =
    isRecurrenceLocked ||
    formData.recurrence.recurrence !== 1 ||
    (Number.isInteger(Number(formData.recurrence.installments)) && Number(formData.recurrence.installments) > 0);

  const isInventoryValid =
    !formData.inventory.product ||
    (!!formData.inventory.quantity && Number(formData.inventory.quantity) > 0);

  const areDepartmentsValid =
    formData.costCenters.departments.length === 0 ||
    (formData.costCenters.department_percentage.every((raw) => {
      const n = Number(String(raw).replace(",", "."));
      return !!String(raw).trim() && Number.isFinite(n) && n > 0;
    }) && Math.abs(percentageSum - 100) <= 0.001);

  const isSaveDisabled =
    isSubmitting ||
    !isAmountValid ||
    !isLedgerValid ||
    !isRecurrenceValid ||
    !isInventoryValid ||
    !areDepartmentsValid;

  /* -------------------------------- Tabs -------------------------------- */
  const Tabs = () => (
    <nav className="flex gap-3 overflow-x-auto">
      {TAB_LIST.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[13px] border-b-2 ${
              isActive
                ? "border-[color:var(--accentPrimary)] text-[color:var(--accentPrimary)]"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );

  /* ---------------------------- Render tab content ------------------------- */
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
            ledgerAccounts={ledgerAccounts}
            ledgerWrapId={IDS.ledgerWrap}
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
          <RecurrenceTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            periodOptions={PERIOD_OPTIONS}
            installmentsInputId={IDS.installmentsInput}
            isRecurrenceLocked={isRecurrenceLocked}
          />
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[1100px] max-w-[95vw] h-[580px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {type === "credit" ? t("entriesModal:header.badgeIn") : t("entriesModal:header.badgeOut")}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("entriesModal:header.entry")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {type === "credit" ? t("entriesModal:header.receipts") : t("entriesModal:header.payments")}
                </h1>
                {isFinancialLocked && formattedLastSettledOn && (
                  <p className="mt-0.5 text-[11px] text-amber-700">
                    {t("entriesModal:settledInfo", { date: formattedLastSettledOn })}
                  </p>
                )}
              </div>
            </div>

            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={attemptClose}
              aria-label={t("entriesModal:aria.close")}
            >
              &times;
            </button>
          </div>

          <div className="px-5 pb-2">
            <Tabs />
          </div>
        </header>

        {/* Body */}
        <form id="modalForm" className="flex-1 flex flex-col" onSubmit={handleSubmit}>
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">
            {isLoadingEntry ? (
              <div className="w-full h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {formData.details.amount > "" ? (
                <>
                  {t("entriesModal:footer.value")} <b>{formatCurrency(formData.details.amount)}</b>
                </>
              ) : (
                <>{t("entriesModal:footer.enterValue")}</>
              )}
              <span className="ml-3 text-gray-400">{t("entriesModal:footer.shortcuts")}</span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose}>
                {t("entriesModal:actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {isSubmitting ? t("entriesModal:actions.saving") : t("entriesModal:actions.save")}
              </Button>
            </div>
          </footer>
        </form>

        {/* Close confirm overlay */}
        {showCloseConfirm && (
          <div
            className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="close-confirm-title"
            aria-describedby="close-confirm-desc"
          >
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 id="close-confirm-title" className="text-[15px] font-semibold text-gray-900">
                  {t("entriesModal:confirmDiscard.title")}
                </h2>
                <p id="close-confirm-desc" className="mt-1 text-[12px] text-gray-600">
                  {t("entriesModal:confirmDiscard.message")}
                </p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  {t("entriesModal:actions.back")}
                </Button>
                <Button variant="danger" className="!bg-red-500 hover:!bg-red-600" onClick={handleClose}>
                  {t("entriesModal:actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Warning overlay */}
        {warning && (
          <div
            className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="warn-title"
            aria-describedby="warn-desc"
          >
            <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 id="warn-title" className="text-[15px] font-semibold text-amber-800">
                  {warning.title}
                </h2>
                <p id="warn-desc" className="mt-1 text-[12px] text-amber-700">
                  {warning.message}
                </p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="primary"
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
      </div>
    </div>
  );
};

export default EntriesModal;
