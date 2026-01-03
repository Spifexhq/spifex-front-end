// src/components/Modal/EntriesModal.tsx
// Money rule: amount is ALWAYS a MAJOR decimal string ("1234.56"), never minor cents.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import Spinner from "@/shared/ui/Loaders/Spinner";

import { api } from "@/api/requests";
import { ApiError } from "@/models/Api";
import { fetchAllCursor } from "@/lib/list";
import { formatCurrency, formatDateFromISO } from "@/lib";
import documentTypesData from "@/data/documentTypes.json";

import type {
  FormData,
  EntriesModalProps,
  PeriodOption,
  RecurrenceOption,
  Tab,
  IntervalMonths,
} from "./Modal.types";
import type { AddEntryRequest, EditEntryRequest } from "@/models/entries/entries";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { Department } from "@/models/settings/departments";
import type { Project } from "@/models/settings/projects";
import type { InventoryItem } from "@/models/settings/inventory";
import type { Entity } from "@/models/settings/entities";

/* ---------------------------------- Types --------------------------------- */
type DocTypeItem = { id: string; label: string };

type EntryDiffable = {
  id: string;
  due_date: string;
  description?: string | null;
  observation?: string | null;
  notes?: string | null;
  amount: number | string;
  tx_type: "credit" | "debit";
  ledger_account?: string | null;
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

const ENTITY_TYPE_OPTIONS_BASE = [
  { id: 1, label: "entriesModal:entities.types.client", value: "client" },
  { id: 2, label: "entriesModal:entities.types.supplier", value: "supplier" },
  { id: 3, label: "entriesModal:entities.types.employee", value: "employee" },
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

// backend: KEEP=0, POSTPONE=1, ANTICIPATE=-1
function mapWeekendToNumber(raw: string): number | undefined {
  if (!raw) return undefined;
  if (raw === "postpone") return 1;
  if (raw === "antedate") return -1;
  return undefined;
}

function normalizeMajorAmount(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(2);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return "";
    const n = Number(s);
    return Number.isFinite(n) ? n.toFixed(2) : s;
  }
  return "";
}

function majorToNumber(v: unknown): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function toLocalISODate(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeDocTypes(raw: unknown): DocTypeItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DocTypeItem[] = [];

  for (const it of raw) {
    if (typeof it === "string") out.push({ id: it, label: it });
    else if (it && typeof it === "object" && "id" in it) {
      const anyIt = it as { id?: string; label?: string; code?: string; name?: string };
      const id = String(anyIt.id ?? anyIt.code ?? "");
      const label = String(anyIt.label ?? anyIt.name ?? anyIt.id ?? anyIt.code ?? "");
      if (id) out.push({ id, label });
    }
  }

  const seen = new Set<string>();
  return out.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
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
  const periodOptions = useMemo(
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

  const documentTypes = useMemo(() => normalizeDocTypes(documentTypesData), []);

  /* -------------------------------- State -------------------------------- */
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [formData, setFormData] = useState<FormData>(getEmptyFormData);

  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [warning, setWarning] = useState<{ title: string; message: string; focusId?: string } | null>(null);

  // sources
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  // selected objects (dropdowns use objects)
  const [selectedLedgerAccounts, setSelectedLedgerAccount] = useState<LedgerAccount[]>([]);
  const [selectedDocumentTypes, setSelectedDocumentType] = useState<DocTypeItem[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<{ id: number; label: string; value: string }[]>([]);

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

  const amountMajorNum = useMemo(() => majorToNumber(formData.details.amount), [formData.details.amount]);

  const percentageSum = useMemo(() => {
    const nums = formData.costCenters.department_percentage
      .map((p) => Number(String(p).replace(",", ".")))
      .filter((n) => Number.isFinite(n));
    const total = nums.reduce((acc, n) => acc + n, 0);
    return Math.round(total * 100) / 100;
  }, [formData.costCenters.department_percentage]);

  /* ---------------- Flag: meaningful data (ignore dueDate) ---------------- */
  const hasMeaningfulData = useMemo(() => {
    if (amountMajorNum > 0) return true;

    const d = formData.details;
    if (
      d.description.trim() ||
      d.observation.trim() ||
      d.notes.trim() ||
      d.ledgerAccount ||
      d.documentType
    ) return true;

    const cc = formData.costCenters;
    if (cc.departments.length > 0 || cc.projects) return true;

    const inv = formData.inventory;
    if (inv.product || (!!inv.quantity && Number(inv.quantity) > 0)) return true;

    const ent = formData.entities;
    if (ent.entityType || ent.entity) return true;

    const rec = formData.recurrence;
    if (rec.recurrence === 1 || !!rec.installments || !!rec.weekend || Number(rec.periods) !== 1) return true;

    return false;
  }, [formData, amountMajorNum]);

  /* ------------------------- Reset / close helpers ------------------------- */
  const resetInternalState = useCallback(() => {
    setFormData(getEmptyFormData());
    setActiveTab("details");

    setSelectedLedgerAccount([]);
    setSelectedDocumentType([]);
    setSelectedDepartments([]);
    setSelectedProject([]);
    setSelectedInventoryItem([]);
    setSelectedEntity([]);
    setSelectedEntityType([]);

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

  /* --------------------------- Load sources on open --------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      try {
        const [la, deps, prjs, invs, ents] = await Promise.all([
          fetchAllLedgerAccounts(),
          fetchAllDepartments(),
          fetchAllProjects(),
          fetchAllInventoryItems(),
          fetchAllEntities(),
        ]);

        if (!alive) return;
        setLedgerAccounts(la);
        setDepartments(deps);
        setProjects(prjs);
        setInventoryItems(invs);
        setEntities(ents);
      } catch (e) {
        console.error("Error loading modal sources:", e);
      }

      // default due date for new entry
      if (!alive) return;
      if (!initialEntry) {
        setFormData((prev) => ({
          ...prev,
          details: { ...prev.details, dueDate: toLocalISODate(new Date()) },
        }));
      }

      // focus amount first
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
        amount: normalizeMajorAmount(ie.amount),
        ledgerAccount: ie.ledger_account || "",
        documentType: "",
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
        weekend: weekendNum === 1 ? "postpone" : weekendNum === -1 ? "antedate" : "",
      },
    });
  }, [isOpen, initialEntry]);

  /* --------------------- Sync selected objects in edit --------------------- */
  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const ie = initialEntry as unknown as EntryDiffable;

    // ledger
    const ledger_account_id = ie.ledger_account || "";
    const la = ledgerAccounts.find((a) => a.id === ledger_account_id);
    setSelectedLedgerAccount(la ? [la] : []);

    // project
    const prjId = ie.project || "";
    const prj = projects.find((p) => p.id === prjId);
    setSelectedProject(prj ? [prj] : []);

    // entity
    const entId = ie.entity || "";
    const ent = entities.find((e) => e.id === entId);
    setSelectedEntity(ent ? [ent] : []);

    // entity type (if entity has entity_type)
    const entType = ent ? (ent as unknown as { entity_type?: string }).entity_type : undefined;
    if (entType) {
      const opt = ENTITY_TYPE_OPTIONS.find((o) => o.value === entType);
      setSelectedEntityType(opt ? [opt] : []);
      setFormData((p) => ({ ...p, entities: { ...p.entities, entityType: opt?.value || "" } }));
    } else {
      setSelectedEntityType([]);
    }

    // departments
    const rawDeps = (ie.departments ?? []) as Array<{ department_id: string; percent: string | number }>;
    const depIds = rawDeps.map((d) => String(d.department_id));
    const idToPercent = new Map(
      rawDeps.map((d) => [
        String(d.department_id),
        typeof d.percent === "number" ? d.percent.toFixed(2) : String(d.percent),
      ])
    );

    const selectedDeps = depIds
      .map((id) => departments.find((d) => d.id === id))
      .filter(Boolean) as Department[];

    setSelectedDepartments(selectedDeps);

    if (selectedDeps.length) {
      const percsInOrder = selectedDeps.map((d) => idToPercent.get(d.id) ?? "");
      const idsInOrder = selectedDeps.map((d) => String(d.id));
      setFormData((prev) => ({
        ...prev,
        costCenters: {
          ...prev.costCenters,
          departments: idsInOrder,
          department_percentage: percsInOrder,
        },
      }));
    }
  }, [isOpen, initialEntry, ledgerAccounts, projects, entities, departments, ENTITY_TYPE_OPTIONS]);

  /* ---------------------------- Validations ---------------------------- */
  type ValidationResult = { ok: boolean; tab?: Tab; focusId?: string; title?: string; message?: string };

  const validateAll = useCallback((): ValidationResult => {
    if (amountMajorNum <= 0) {
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
  }, [amountMajorNum, formData, isRecurrenceLocked, percentageSum, t]);

  /* ------------------------------ Handlers ------------------------------ */
  const handleLedgerAccountChange = useCallback(
    (updated: LedgerAccount[]) => {
      if (isFinancialLocked) return;
      setSelectedLedgerAccount(updated);
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, details: { ...p.details, ledgerAccount: id } }));
    },
    [isFinancialLocked]
  );

  const handleDocumentTypeChange = useCallback((updated: DocTypeItem[]) => {
    setSelectedDocumentType(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, details: { ...p.details, documentType: id } }));
  }, []);

  const handleDepartmentChange = useCallback(
    (updated: Department[]) => {
      if (isFinancialLocked) return;

      setSelectedDepartments(updated);

      const departmentIds = updated.map((d) => String(d.id));
      const count = departmentIds.length;

      // Even split with rounding, last item adjusted to guarantee total = 100.00
      const base = count > 0 ? Number((100 / count).toFixed(2)) : 0;
      const percentages = Array.from({ length: count }, () => base);

      const total = percentages.reduce((sum, v) => sum + v, 0);
      const diff = Number((100 - total).toFixed(2));

      if (count > 0) {
        percentages[count - 1] = Number((percentages[count - 1] + diff).toFixed(2));
      }

      setFormData((prev) => ({
        ...prev,
        costCenters: {
          ...prev.costCenters,
          departments: departmentIds,
          department_percentage: percentages.map((n) => n.toFixed(2)),
        },
      }));
    },
    [isFinancialLocked]
  );

  const handlePercentageChange = useCallback(
    (index: number, value: string) => {
      if (isFinancialLocked) return;
      setFormData((p) => {
        const percs = [...p.costCenters.department_percentage];
        percs[index] = value;
        return { ...p, costCenters: { ...p.costCenters, department_percentage: percs } };
      });
    },
    [isFinancialLocked]
  );

  const handleProjectChange = useCallback(
    (updated: Project[]) => {
      if (isFinancialLocked) return;
      setSelectedProject(updated);
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, costCenters: { ...p.costCenters, projects: id } }));
    },
    [isFinancialLocked]
  );

  const handleInventoryChange = useCallback(
    (updated: InventoryItem[]) => {
      if (isFinancialLocked) return;
      setSelectedInventoryItem(updated);
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, inventory: { ...p.inventory, product: id } }));
    },
    [isFinancialLocked]
  );

  const handleEntityChange = useCallback(
    (updated: Entity[]) => {
      if (isFinancialLocked) return;
      setSelectedEntity(updated);
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, entities: { ...p.entities, entity: id } }));
    },
    [isFinancialLocked]
  );

  const goTabRelative = useCallback(
    (delta: number) => {
      const idx = TAB_LIST.findIndex((x) => x.id === activeTab);
      if (idx === -1) return;
      const nextIdx = (idx + delta + TAB_LIST.length) % TAB_LIST.length;
      setActiveTab(TAB_LIST[nextIdx].id);
    },
    [activeTab, TAB_LIST]
  );

  /* ----------------------- Keyboard: ESC, Ctrl/⌘+S, Ctrl+Alt+←/→ ----------------------- */
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
            amount: normalizeMajorAmount(formData.details.amount),
            tx_type: type,

            ledger_account: formData.details.ledgerAccount,
            document_type: formData.details.documentType || "",

            ...(formData.costCenters.projects ? { project: formData.costCenters.projects } : {}),
            ...(formData.entities.entity ? { entity: formData.entities.entity } : {}),

            ...(deps ? { departments: deps } : {}),
            ...(items ? { items } : {}),

            ...(isRecurring && installmentCount > 1
              ? {
                  installment_count: installmentCount,
                  interval_months: formData.recurrence.periods as IntervalMonths,
                  ...(formData.recurrence.weekend
                    ? { weekend_action: mapWeekendToNumber(formData.recurrence.weekend) }
                    : {}),
                }
              : {}),
          };

          res = await api.addEntry(payload);
        } else {
          const ie = initialEntry as unknown as EntryDiffable;
          const changes: Partial<EditEntryRequest> = {};

          if (formData.details.dueDate !== ie.due_date) changes.due_date = formData.details.dueDate;
          if ((formData.details.description || "") !== (ie.description || "")) changes.description = formData.details.description || "";
          if ((formData.details.observation || "") !== (ie.observation || "")) changes.observation = formData.details.observation || "";
          if ((formData.details.notes || "") !== (ie.notes || "")) changes.notes = formData.details.notes || "";

          const initialAmountStr = normalizeMajorAmount(ie.amount);
          const newAmountStr = normalizeMajorAmount(formData.details.amount);

          if (!isFinancialLocked && newAmountStr !== initialAmountStr) {
            changes.amount = newAmountStr;
          }

          const initialGl = ie.ledger_account || "";
          if (!isFinancialLocked && formData.details.ledgerAccount && formData.details.ledgerAccount !== initialGl) {
            changes.ledger_account = formData.details.ledgerAccount;
          }

          if (formData.details.documentType) {
            changes.document_type = formData.details.documentType;
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

          // recurrence update only if originally not recurring
          const initialRecCount = ie.installment_count ?? 1;
          if (initialRecCount <= 1) {
            const wantRecurring = formData.recurrence.recurrence === 1;
            const count = wantRecurring ? Number(formData.recurrence.installments || 1) : 1;

            if (wantRecurring && count > 1) {
              changes.installment_count = count;
              changes.interval_months = formData.recurrence.periods as IntervalMonths;
              if (formData.recurrence.weekend) {
                changes.weekend_action = mapWeekendToNumber(formData.recurrence.weekend);
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
  const isAmountValid = amountMajorNum > 0;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              kind="date"
              label={t("entriesModal:details.dueDate")}
              value={formData.details.dueDate}
              onValueChange={(valueIso) =>
                setFormData((p) => ({ ...p, details: { ...p.details, dueDate: valueIso } }))
              }
            />

            <Input
              kind="amount"
              ref={amountRef}
              id="amount-input"
              label={t("entriesModal:details.amount")}
              value={formData.details.amount}
              onValueChange={(next) =>
                setFormData((p) => ({ ...p, details: { ...p.details, amount: next } }))
              }
              disabled={isFinancialLocked}
              zeroAsEmpty
            />

            <div id={IDS.ledgerWrap}>
              <SelectDropdown<LedgerAccount>
                label={t("entriesModal:details.ledgerAccount")}
                items={ledgerAccounts}
                selected={selectedLedgerAccounts}
                onChange={handleLedgerAccountChange}
                getItemKey={(i) => i.id}
                getItemLabel={(i) => (i.code ? `${i.code} — ${i.account}` : i.account)}
                buttonLabel={t("entriesModal:details.ledgerAccountBtn")}
                singleSelect
                customStyles={{ maxHeight: "200px" }}
                groupBy={(i) =>
                  i.subcategory ? `${i.category} / ${i.subcategory}` : i.category || t("entriesModal:misc.others")
                }
                virtualize
                virtualRowHeight={32}
                virtualThreshold={300}
                disabled={isFinancialLocked}
              />
            </div>

            <div className="md:col-span-3">
              <Input
                label={t("entriesModal:details.description")}
                ref={descriptionRef}
                type="text"
                placeholder={t("entriesModal:details.descriptionPlaceholder")}
                value={formData.details.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, details: { ...p.details, description: e.target.value } }))
                }
              />
            </div>

            <SelectDropdown<DocTypeItem>
              label={t("entriesModal:details.docType")}
              items={documentTypes}
              selected={selectedDocumentTypes}
              onChange={handleDocumentTypeChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.label}
              buttonLabel={t("entriesModal:details.docTypeBtn")}
              singleSelect
              customStyles={{ maxHeight: "180px" }}
            />

            <div className="md:col-span-2">
              <Input
                label={t("entriesModal:details.observation")}
                type="text"
                placeholder={t("entriesModal:details.optional")}
                value={formData.details.observation}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, details: { ...p.details, observation: e.target.value } }))
                }
              />
            </div>

            <div className="hidden md:block" />

            <div className="md:col-span-3">
              <Input
                label={t("entriesModal:details.notes")}
                placeholder={t("entriesModal:details.notesPlaceholder")}
                value={formData.details.notes}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, details: { ...p.details, notes: e.target.value } }))
                }
              />
            </div>
          </div>
        );

      case "costCenters":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SelectDropdown<Department>
                label={t("entriesModal:costCenters.departments")}
                items={departments}
                selected={selectedDepartments}
                onChange={handleDepartmentChange}
                getItemKey={(d) => d.id}
                getItemLabel={(d) => d.name || t("entriesModal:costCenters.unnamedDepartment")}
                clearOnClickOutside={false}
                buttonLabel={t("entriesModal:costCenters.departmentsBtn")}
                customStyles={{ maxHeight: "240px" }}
                virtualize
                virtualRowHeight={32}
                virtualThreshold={300}
                disabled={isFinancialLocked}
              />

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-700">{t("entriesModal:costCenters.distribution")}</span>
                  <span
                    className={`text-[11px] px-2 py-[2px] rounded-full border ${
                      Math.abs(percentageSum - 100) <= 0.001 && selectedDepartments.length > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {t("entriesModal:costCenters.total", { value: percentageSum || 0 })}
                  </span>
                </div>

                <div className="mt-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedDepartments.map((dept, index) => (
                    <div key={dept.id} className="mb-3">
                      <Input
                        id={`${IDS.deptPercPrefix}${index}`}
                        label={`${t("entriesModal:costCenters.percent")} - ${
                          dept.name || `${t("entriesModal:costCenters.department")} ${dept.id}`
                        }`}
                        type="number"
                        name={`department_percentage_${dept.id}`}
                        value={formData.costCenters.department_percentage[index] || ""}
                        onChange={(e) => handlePercentageChange(index, e.target.value)}
                        disabled={isFinancialLocked}
                      />
                    </div>
                  ))}

                  {selectedDepartments.length === 0 && (
                    <p className="text-[12px] text-gray-500">{t("entriesModal:costCenters.noneSelected")}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <SelectDropdown<Project>
                label={t("entriesModal:costCenters.projects")}
                items={projects}
                selected={selectedProject}
                onChange={handleProjectChange}
                getItemKey={(p) => p.id}
                getItemLabel={(p) => p.name || p.code || `${t("entriesModal:costCenters.project")} ${p.id}`}
                buttonLabel={t("entriesModal:costCenters.projectsBtn")}
                clearOnClickOutside={false}
                singleSelect
                customStyles={{ maxHeight: "200px" }}
                virtualize
                virtualRowHeight={32}
                virtualThreshold={300}
                disabled={isFinancialLocked}
              />
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<InventoryItem>
              label={t("entriesModal:inventory.product")}
              items={inventoryItems}
              selected={selectedInventoryItem}
              onChange={handleInventoryChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => (i.sku ? `${i.sku} — ${i.name}` : i.name)}
              buttonLabel={t("entriesModal:inventory.productBtn")}
              clearOnClickOutside={false}
              singleSelect
              customStyles={{ maxHeight: "180px" }}
              virtualize
              virtualRowHeight={32}
              virtualThreshold={300}
              disabled={isFinancialLocked}
            />

            {selectedInventoryItem.length > 0 && (
              <Input
                id={IDS.inventoryQty}
                label={t("entriesModal:inventory.quantity")}
                type="number"
                placeholder="0"
                value={formData.inventory.quantity}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, inventory: { ...p.inventory, quantity: e.target.value } }))
                }
                disabled={isFinancialLocked}
              />
            )}
          </div>
        );

      case "entities": {
        const filteredEntities = formData.entities.entityType
          ? entities.filter(
              (e) => (e as unknown as { entity_type?: string }).entity_type === formData.entities.entityType
            )
          : entities;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div id={IDS.entityTypeWrap}>
              <SelectDropdown<{ id: number; label: string; value: string }>
                label={t("entriesModal:entities.type")}
                items={ENTITY_TYPE_OPTIONS}
                selected={selectedEntityType}
                onChange={(v) => {
                  if (isFinancialLocked) return;

                  const nextType = v[0]?.value || "";

                  setSelectedEntityType(v);
                  setSelectedEntity([]);

                  setFormData((p) => ({
                    ...p,
                    entities: { ...p.entities, entityType: nextType, entity: "" },
                  }));
                }}
                getItemKey={(i) => i.id}
                getItemLabel={(i) => i.label}
                buttonLabel={t("entriesModal:entities.typeBtn")}
                singleSelect
                customStyles={{ maxHeight: "160px" }}
                hideFilter
                disabled={isFinancialLocked}
              />
            </div>

            <div id={IDS.entityWrap}>
              <SelectDropdown<Entity>
                label={t("entriesModal:entities.entity")}
                items={filteredEntities}
                selected={selectedEntity}
                onChange={handleEntityChange}
                getItemKey={(i) => i.id}
                getItemLabel={(i) => i.full_name || t("entriesModal:entities.unnamed")}
                buttonLabel={t("entriesModal:entities.entityBtn")}
                singleSelect
                customStyles={{ maxHeight: "200px" }}
                virtualize
                virtualRowHeight={32}
                virtualThreshold={300}
                disabled={isFinancialLocked}
              />
            </div>
          </div>
        );
      }

      case "recurrence":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<RecurrenceOption>
              label={t("entriesModal:recurrence.title")}
              items={[
                { id: 1, label: t("entriesModal:recurrence.yes"), value: 1 },
                { id: 2, label: t("entriesModal:recurrence.no"), value: 0 },
              ]}
              selected={
                formData.recurrence.recurrence === 1
                  ? [{ id: 1, label: t("entriesModal:recurrence.yes"), value: 1 }]
                  : [{ id: 2, label: t("entriesModal:recurrence.no"), value: 0 }]
              }
              onChange={(v) =>
                setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, recurrence: v[0]?.value ?? 0 } }))
              }
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.label}
              buttonLabel={t("entriesModal:misc.select")}
              singleSelect
              hideFilter
              customStyles={{ maxHeight: "140px" }}
              disabled={isRecurrenceLocked}
            />

            {formData.recurrence.recurrence === 1 && (
              <>
                <Input
                  id={IDS.installmentsInput}
                  label={t("entriesModal:recurrence.installments")}
                  type="number"
                  value={formData.recurrence.installments}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, installments: e.target.value } }))
                  }
                  disabled={isRecurrenceLocked}
                />

                <SelectDropdown<PeriodOption>
                  label={t("entriesModal:recurrence.periods")}
                  items={periodOptions}
                  selected={periodOptions.filter((opt) => opt.value === formData.recurrence.periods)}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, periods: v[0]?.value ?? 1 } }))
                  }
                  getItemKey={(i) => i.id}
                  getItemLabel={(i) => i.label}
                  buttonLabel={t("entriesModal:recurrence.periodsBtn")}
                  singleSelect
                  customStyles={{ maxHeight: "140px" }}
                  hideFilter
                  disabled={isRecurrenceLocked}
                />

                <SelectDropdown<{ id: number; label: string; value: string }>
                  label={t("entriesModal:recurrence.weekend")}
                  items={[
                    { id: 1, label: t("entriesModal:recurrence.postpone"), value: "postpone" },
                    { id: -1, label: t("entriesModal:recurrence.antedate"), value: "antedate" },
                  ]}
                  selected={
                    formData.recurrence.weekend
                      ? [
                          formData.recurrence.weekend === "postpone"
                            ? { id: 1, label: t("entriesModal:recurrence.postpone"), value: "postpone" }
                            : { id: -1, label: t("entriesModal:recurrence.antedate"), value: "antedate" },
                        ]
                      : []
                  }
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, weekend: v[0]?.value || "" } }))
                  }
                  getItemKey={(i) => i.id}
                  getItemLabel={(i) => i.label}
                  buttonLabel={t("entriesModal:misc.select")}
                  singleSelect
                  customStyles={{ maxHeight: "140px" }}
                  hideFilter
                  disabled={isRecurrenceLocked}
                />
              </>
            )}
          </div>
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
              {amountMajorNum > 0 ? (
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
