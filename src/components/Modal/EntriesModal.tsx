// EntriesModalForm.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import { fetchAllCursor } from "src/lib/list";
import Spinner from "src/components/ui/Loaders/Spinner";

import {
  FormData,
  EntriesModalFormProps,
  PeriodOption,
  RecurrenceOption,
  Tab,
  IntervalMonths,
} from "./Modal.types";

import {
  decimalToCentsString,
  distributePercentages,
  formatCurrency,
  handleAmountKeyDown,
} from "src/lib";

import { api } from "src/api/requests";
import { ApiError } from "@/models/Api";
import { AddEntryRequest, EditEntryRequest } from "@/models/entries/dto";

import type {
  GLAccount,
  Department,
  Project,
  InventoryItem,
  Entity,
} from "@/models/enterprise_structure/domain";

import documentTypesData from "@/data/documentTypes.json";

/* ---------------------------------- Tipos --------------------------------- */
type DocTypeItem = { id: string; label: string };

type EntryDiffable = {
  id: string;
  due_date: string;
  description?: string | null;
  observation?: string | null;
  notes?: string | null;
  amount: number | string;
  tx_type: "credit" | "debit";
  gl_account?: string | null;
  project?: string | null;
  entity?: string | null;
  installment_count?: number | null;
  interval_months?: number | null;
  weekend_action?: number | null;
  last_settled_on?: string | null;
};

/* --------------------------- Estado inicial --------------------------- */
const initialFormData: FormData = {
  details: {
    dueDate: "",
    description: "",
    observation: "",
    amount: "0",
    accountingAccount: "",
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

const periodOptionsBase: PeriodOption[] = [
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

// 🔹 Lista de abas (constante estável no módulo para satisfazer exhaustive-deps)
const TAB_LIST_BASE: { id: Tab; label: string }[] = [
  { id: "details", label: "entriesModal:tabs.details" },
  { id: "costCenters", label: "entriesModal:tabs.costCenters" },
  { id: "inventory", label: "entriesModal:tabs.inventory" },
  { id: "entities", label: "entriesModal:tabs.entities" },
  { id: "recurrence", label: "entriesModal:tabs.recurrence" },
];

// KEEP=0, POSTPONE=1, ANTICIPATE=-1 (no backend)
const mapWeekendToNumber = (raw: string): number | undefined => {
  if (!raw) return undefined;
  if (raw === "postpone") return 1;
  if (raw === "antedate") return -1;
  return undefined;
};

const normalizeAmountStr = (v: unknown): string => {
  if (typeof v === "number" && isFinite(v)) return v.toFixed(2);
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n.toFixed(2);
    return v;
  }
  return "";
};

const normalizeDocTypes = (raw: unknown): DocTypeItem[] => {
  if (Array.isArray(raw)) {
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
  return [];
};

const EntriesModalForm: React.FC<EntriesModalFormProps> = ({
  isOpen,
  onClose,
  type,
  onSave,
  initialEntry,
  isLoadingEntry,
}) => {
  const { t } = useTranslation(["entriesModal"]);

  const periodOptions = useMemo(
    () => periodOptionsBase.map((p) => ({ ...p, label: t(p.label) })),
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

  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const IDS = {
    ledgerWrap: "ledger-select-wrap",
    installmentsInput: "installments-input",
    inventoryQty: "inventory-qty-input",
    entityTypeWrap: "entity-type-wrap",
    entityWrap: "entity-wrap",
    deptPercPrefix: "dept-perc-",
  } as const;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [warning, setWarning] = useState<{ title: string; message: string; focusId?: string } | null>(null);

  // fontes
  const [ledgerAccounts, setLedgerAccounts] = useState<GLAccount[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocTypeItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  // selecionados
  const [selectedLedgerAccounts, setSelectedLedgerAccount] = useState<GLAccount[]>([]);
  const [selectedDocumentTypes, setSelectedDocumentType] = useState<DocTypeItem[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<
    { id: number; label: string; value: string }[]
  >([]);

  // 🔒 Has this entry been (at least partially) settled?
  const lastSettledOnStr = useMemo(() => {
    if (!initialEntry) return null;
    const ie = initialEntry as unknown as { last_settled_on?: string | null };
    return ie.last_settled_on ?? null;
  }, [initialEntry]);

  const isFinancialLocked = !!lastSettledOnStr;

  const formattedLastSettledOn = useMemo(() => {
    if (!lastSettledOnStr) return "";
    const d = new Date(lastSettledOnStr);
    if (Number.isNaN(d.getTime())) return lastSettledOnStr;
    return d.toLocaleDateString();
  }, [lastSettledOnStr]);

  const isRecurrenceLocked = useMemo(() => {
    if (!initialEntry) return false;
    const count = (initialEntry as unknown as { installment_count?: number }).installment_count ?? 1;
    return count > 1;
  }, [initialEntry]);

  const handleClose = useCallback(() => {
    setFormData(initialFormData);
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
    onClose();
  }, [onClose]);

  const cleanCurrency = (raw: string) =>
    (parseFloat(raw.replace(/[^\d]/g, "")) / 100).toFixed(2);

  const amountCents = useMemo(
    () => parseInt(formData.details.amount.replace(/\D/g, ""), 10) || 0,
    [formData.details.amount]
  );

  const percentageSum = useMemo(() => {
    const nums = formData.costCenters.department_percentage
      .map((p) => parseFloat(String(p).replace(",", ".")))
      .filter((n) => !Number.isNaN(n));
    const total = nums.reduce((acc, n) => acc + n, 0);
    return Math.round(total * 100) / 100;
  }, [formData.costCenters.department_percentage]);

  const toLocalISODate = (d: Date) => {
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 10); // YYYY-MM-DD
  };

  /* ---------------- Flag de dados preenchidos (ignora dueDate) --------------- */
  const hasMeaningfulData = useMemo(() => {
    if (amountCents > 0) return true;

    const d = formData.details;
    if (
      d.description.trim() ||
      d.observation.trim() ||
      d.notes.trim() ||
      d.accountingAccount ||
      d.documentType
    ) return true;

    const cc = formData.costCenters;
    if (cc.departments.length > 0 || cc.projects) return true;

    const inv = formData.inventory;
    if (inv.product || (!!inv.quantity && Number(inv.quantity) > 0)) return true;

    const ent = formData.entities;
    if (ent.entityType || ent.entity) return true;

    const rec = formData.recurrence;
    if (rec.recurrence === 1 || !!rec.installments || !!rec.weekend || Number(rec.periods) !== 1)
      return true;

    return false;
  }, [formData, amountCents]);

  /* ---------------------------- VALIDATIONS ---------------------------- */
  const focusFirstInteractive = (wrapId?: string) => {
    if (!wrapId) return;
    if (wrapId === "amount-input") {
      amountRef.current?.focus();
      return;
    }
    const scope =
      document.getElementById(wrapId) || document.querySelector<HTMLElement>(`#${wrapId}`);
    const el =
      scope?.querySelector<HTMLElement>("input,button,select,[tabindex]") || scope || null;
    el?.focus();
  };

  type ValidationResult = { ok: boolean; tab?: Tab; focusId?: string; title?: string; message?: string };

  const validateAll = (): ValidationResult => {
    if (amountCents <= 0) {
      return {
        ok: false,
        tab: "details",
        focusId: "amount-input",
        title: t("entriesModal:errors.amount.title"),
        message: t("entriesModal:errors.amount.message"),
      };
    }

    if (!formData.details.accountingAccount) {
      return {
        ok: false,
        tab: "details",
        focusId: IDS.ledgerWrap,
        title: t("entriesModal:errors.gl.title"),
        message: t("entriesModal:errors.gl.message"),
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
  };

  /* ------------------------ Submit --------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
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

    const cleanAmountNow = cleanCurrency(formData.details.amount);
    const makeDepartments = () =>
      formData.costCenters.departments.length
        ? formData.costCenters.departments.map((id, idx) => ({
            department_id: id,
            percent: String(
              parseFloat(
                (formData.costCenters.department_percentage[idx] || "0").replace(",", ".")
              ).toFixed(2)
            ),
          }))
        : undefined;

    const makeItems = () =>
      formData.inventory.product && formData.inventory.quantity
        ? [
            {
              item_id: formData.inventory.product,
              quantity: String(parseFloat(formData.inventory.quantity)),
            },
          ]
        : undefined;

    try {
      let res;

      if (!initialEntry) {
        const isRecurring = formData.recurrence.recurrence === 1;
        const installmentCount = isRecurring
          ? Number(formData.recurrence.installments || 1)
          : 1;

        const payload = {
          due_date: formData.details.dueDate,
          description: formData.details.description || "",
          observation: formData.details.observation || "",
          notes: formData.details.notes || "",
          amount: cleanAmountNow,
          tx_type: type,

          ...(isRecurring && installmentCount > 1
            ? {
                installment_count: installmentCount,
                interval_months: formData.recurrence.periods as IntervalMonths,
                ...(formData.recurrence.weekend
                  ? { weekend_action: mapWeekendToNumber(formData.recurrence.weekend) }
                  : {}),
              }
            : {}),

          gl_account: formData.details.accountingAccount,
          document_type: formData.details.documentType || "",
          ...(formData.costCenters.projects
            ? { project: formData.costCenters.projects }
            : {}),
          ...(formData.entities.entity ? { entity: formData.entities.entity } : {}),

          ...(makeDepartments() ? { departments: makeDepartments() } : {}),
          ...(makeItems() ? { items: makeItems() } : {}),
        } as AddEntryRequest;

        res = await api.addEntry(payload);
      } else {
        const ie = initialEntry as EntryDiffable;
        const changes: Partial<EditEntryRequest> = {};

        if (formData.details.dueDate !== ie.due_date) changes.due_date = formData.details.dueDate;
        if ((formData.details.description || "") !== (ie.description || "")) changes.description = formData.details.description || "";
        if ((formData.details.observation || "") !== (ie.observation || "")) changes.observation = formData.details.observation || "";
        if ((formData.details.notes || "") !== (ie.notes || "")) changes.notes = formData.details.notes || "";

        const initialAmountStr = normalizeAmountStr(ie.amount);
        if (!isFinancialLocked && cleanAmountNow !== initialAmountStr) {
          changes.amount = cleanAmountNow;
        }

        const initialGl = ie.gl_account || "";
        if (!isFinancialLocked && formData.details.accountingAccount && formData.details.accountingAccount !== initialGl) {
          changes.gl_account = formData.details.accountingAccount;
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

        const deps = makeDepartments();
        if (!isFinancialLocked && deps) changes.departments = deps;

        const items = makeItems();
        if (!isFinancialLocked && items) changes.items = items;

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
        console.error("Erro API:", apiError?.error?.message, apiError?.error?.details);
        setWarning({
          title: t("entriesModal:saveError.title"),
          message: apiError?.error?.message || t("entriesModal:saveError.generic"),
        });
        return;
      }

      handleClose();
      onSave();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      const message =
        axios.isAxiosError(err) && err.response?.data?.error?.message
          ? err.response.data.error.message
          : t("entriesModal:saveError.unexpected");
      setWarning({ title: t("entriesModal:saveError.title"), message });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------- Fetch helpers --------------------------- */
  const fetchAllLedgerAccounts = useCallback(async () => {
    const all = await fetchAllCursor<GLAccount>(api.getLedgerAccounts, 500);
    const wanted = type === "credit" ? "credit" : "debit";
    return all.filter(a => (a?.default_tx || "").toLowerCase() === wanted);
  }, [type]);

  const fetchAllDepartments = useCallback(
    () => fetchAllCursor<Department>(api.getDepartments, 500),
    []
  );

  const fetchAllProjects = useCallback(
    () => fetchAllCursor<Project>(api.getProjects, 500),
    []
  );

  const fetchAllInventoryItems = useCallback(
    () => fetchAllCursor<InventoryItem>(api.getInventoryOptions, 500),
    []
  );

  const fetchAllEntities = useCallback(
    () => fetchAllCursor<Entity>(api.getEntitiesOptions, 500),
    []
  );

  /* --------------------------- Carregar dados --------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const [la, deps, prjs, invs, ents] = await Promise.all([
          fetchAllLedgerAccounts(),
          fetchAllDepartments(),
          fetchAllProjects(),
          fetchAllInventoryItems(),
          fetchAllEntities(),
        ]);
        setLedgerAccounts(la);
        setDepartments(deps);
        setProjects(prjs);
        setInventoryItems(invs);
        setEntities(ents);
      } catch (e) {
        console.error("Erro carregando fontes do modal:", e);
      }
      setDocumentTypes(normalizeDocTypes(documentTypesData));
    })();

    if (!initialEntry) {
      setFormData((prev) => ({
        ...prev,
        details: { ...prev.details, dueDate: toLocalISODate(new Date()) },
      }));
    }
    setTimeout(() => amountRef.current?.focus(), 50);
  }, [
    isOpen,
    initialEntry,
    fetchAllLedgerAccounts,
    fetchAllDepartments,
    fetchAllProjects,
    fetchAllInventoryItems,
    fetchAllEntities,
  ]);

  /* ------------------------ Preencher em edição ------------------------- */
  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const recCount = (initialEntry as EntryDiffable).installment_count ?? 1;
    const interval = (initialEntry as EntryDiffable).interval_months ?? 1;
    const weekendNum = (initialEntry as EntryDiffable).weekend_action ?? 0;

    const rawDeps =
      (initialEntry.departments ?? []) as Array<{
        department_id: string;
        percent: string | number;
      }>;

    const depIds = rawDeps.map((d) => String(d.department_id));
    const depPercs = rawDeps.map((d) =>
      typeof d.percent === "number" ? d.percent.toFixed(2) : String(d.percent)
    );

    setFormData({
      details: {
        dueDate: initialEntry.due_date,
        description: initialEntry.description ?? "",
        observation: initialEntry.observation ?? "",
        amount: decimalToCentsString(initialEntry.amount),
        accountingAccount: initialEntry.gl_account || "",
        documentType: "",
        notes: initialEntry.notes ?? "",
      },
      costCenters: {
        departments: depIds,
        department_percentage: depPercs,
        projects: initialEntry.project || "",
      },
      inventory: { product: "", quantity: "" },
      entities: {
        entityType: "",
        entity: initialEntry.entity || "",
      },
      recurrence: {
        recurrence: recCount > 1 ? 1 : 0,
        installments: recCount > 1 ? String(recCount) : "",
        periods: Number(interval),
        weekend: weekendNum === 1 ? "postpone" : weekendNum === -1 ? "antedate" : "",
      },
    });
  }, [isOpen, initialEntry]);

  // Selecionados em edição
  useEffect(() => {
    if (!isOpen || !initialEntry) return;

    const glaId = initialEntry.gl_account || "";
    const la = ledgerAccounts.find((a) => a.id === glaId);
    setSelectedLedgerAccount(la ? [la] : []);

    const prjId = initialEntry.project || "";
    const prj = projects.find((p) => p.id === prjId);
    setSelectedProject(prj ? [prj] : []);

    const entId = initialEntry.entity || "";
    const ent = entities.find((e) => e.id === entId);
    setSelectedEntity(ent ? [ent] : []);
    if (ent && (ent as unknown as { entity_type?: string }).entity_type) {
      const et = (ent as unknown as { entity_type?: string }).entity_type as string;
      const opt = ENTITY_TYPE_OPTIONS.find((o) => o.value === et);
      setSelectedEntityType(opt ? [opt] : []);
    } else {
      setSelectedEntityType([]);
    }

    const rawDeps =
      (initialEntry.departments ?? []) as Array<{
        department_id: string;
        percent: string | number;
      }>;
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

  /* ------------------------------ Handlers ------------------------------ */
  const handleLedgerAccountChange = (updated: GLAccount[]) => {
    if (isFinancialLocked) return;
    setSelectedLedgerAccount(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, details: { ...p.details, accountingAccount: id } }));
  };

  const handleDocumentTypeChange = (updated: DocTypeItem[]) => {
    setSelectedDocumentType(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, details: { ...p.details, documentType: id } }));
  };

  const handleDepartmentChange = (updated: Department[]) => {
    if (isFinancialLocked) return;
    setSelectedDepartments(updated);
    const ids = updated.map((d) => String(d.id));
    const percs = distributePercentages(ids);
    setFormData((prev) => ({
      ...prev,
      costCenters: { ...prev.costCenters, departments: ids, department_percentage: percs },
    }));
  };

  const handlePercentageChange = (index: number, value: string) => {
    if (isFinancialLocked) return;
    const percs = [...formData.costCenters.department_percentage];
    percs[index] = value;
    setFormData((p) => ({
      ...p,
      costCenters: { ...p.costCenters, department_percentage: percs },
    }));
  };

  const handleProjectChange = (updated: Project[]) => {
    if (isFinancialLocked) return;
    setSelectedProject(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, costCenters: { ...p.costCenters, projects: id } }));
  };

  const handleInventoryChange = (updated: InventoryItem[]) => {
    if (isFinancialLocked) return;
    setSelectedInventoryItem(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, inventory: { ...p.inventory, product: id } }));
  };

  const handleEntityChange = (updated: Entity[]) => {
    if (isFinancialLocked) return;
    setSelectedEntity(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, entities: { ...p.entities, entity: id } }));
  };

  const goTabRelative = useCallback(
    (delta: number) => {
      const idx = TAB_LIST.findIndex((t) => t.id === activeTab);
      if (idx === -1) return;
      const nextIdx = (idx + delta + TAB_LIST.length) % TAB_LIST.length;
      setActiveTab(TAB_LIST[nextIdx].id);
    },
    [activeTab, TAB_LIST]
  );

  /* ---------------------- Fechamento com confirmação interna ----------------- */
  const attemptClose = useCallback(() => {
    const dropdownOpen = document.querySelector('[data-select-open="true"]');
    if (dropdownOpen) return;

    if (hasMeaningfulData) {
      setShowCloseConfirm(true);
      return;
    }
    handleClose();
  }, [hasMeaningfulData, handleClose]);

  /* ----------------------- Teclado: ESC, Ctrl/⌘+S, Ctrl/⌘+←/→ ----------- */
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
        const dropdownOpen = document.querySelector('[data-select-open="true"]');
        if (dropdownOpen) return;
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
        const dropdownOpen = document.querySelector('[data-select-open="true"]');
        if (dropdownOpen) return;
        e.preventDefault();
        goTabRelative(e.key === "ArrowRight" ? 1 : -1);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && /^[0-9]$/.test(e.key)) {
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose, showCloseConfirm, goTabRelative, warning]);

  /* ---------------------------- Conteúdo ------------------------- */
  const Tabs = () => (
    <nav className="flex gap-3 overflow-x-auto">
      {TAB_LIST.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 text-[13px] border-b-2 ${
              isActive
                ? "border-[color:var(--accentPrimary)] text-[color:var(--accentPrimary)]"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );

  const isAmountValid = amountCents > 0;
  const isLedgerValid = !!formData.details.accountingAccount;
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
    }) && Math.abs(percentageSum - 100) <= 0.001);

  const isSaveDisabled =
    isSubmitting ||
    !isAmountValid ||
    !isLedgerValid ||
    !isRecurrenceValid ||
    !isInventoryValid ||
    !areDepartmentsValid;

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label={t("entriesModal:details.dueDate")}
              type="date"
              value={formData.details.dueDate}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: { ...p.details, dueDate: e.target.value } }))
              }
            />
            <Input
              id="amount-input"
              label={t("entriesModal:details.amount")}
              type="text"
              ref={amountRef}
              placeholder={t("entriesModal:details.amountPlaceholder")}
              value={formatCurrency(formData.details.amount)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: { ...p.details, amount: e.target.value } }))
              }
              onKeyDown={(e) => handleAmountKeyDown(e, formData.details.amount, setFormData)}
              disabled={isFinancialLocked}
            />
            <div id={IDS.ledgerWrap}>
              <SelectDropdown<GLAccount>
                label={t("entriesModal:details.glAccount")}
                items={ledgerAccounts}
                selected={selectedLedgerAccounts}
                onChange={handleLedgerAccountChange}
                getItemKey={(i) => i.id}
                getItemLabel={(i) => (i.code ? `${i.code} — ${i.account}` : i.account)}
                buttonLabel={t("entriesModal:details.glAccountBtn")}
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
                  setFormData((p) => ({
                    ...p,
                    details: { ...p.details, description: e.target.value },
                  }))
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
                  setFormData((p) => ({
                    ...p,
                    details: { ...p.details, observation: e.target.value },
                  }))
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
                        label={`${t("entriesModal:costCenters.percent")} - ${dept.name || `${t("entriesModal:costCenters.department")} ${dept.id}`}`}
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
                  setFormData((p) => ({
                    ...p,
                    inventory: { ...p.inventory, quantity: e.target.value },
                  }))
                }
                disabled={isFinancialLocked}
              />
            )}
          </div>
        );

      case "entities": {
        const filteredEntities = formData.entities.entityType
          ? entities.filter(
              (e) =>
                (e as unknown as { entity_type?: string }).entity_type ===
                formData.entities.entityType
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
                  setSelectedEntityType(v);
                  setFormData((p) => ({
                    ...p,
                    entities: { ...p.entities, entityType: v[0]?.value || "" },
                  }));
                  setSelectedEntity([]);
                  setFormData((p) => ({ ...p, entities: { ...p.entities, entity: "" } }));
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
                setFormData((p) => ({
                  ...p,
                  recurrence: { ...p.recurrence, recurrence: v[0]?.value ?? 0 },
                }))
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
                    setFormData((p) => ({
                      ...p,
                      recurrence: { ...p.recurrence, installments: e.target.value },
                    }))
                  }
                  disabled={isRecurrenceLocked}
                />

                <SelectDropdown<PeriodOption>
                  label={t("entriesModal:recurrence.periods")}
                  items={periodOptions}
                  selected={periodOptions.filter((opt) => opt.value === formData.recurrence.periods)}
                  onChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      recurrence: { ...p.recurrence, periods: v[0]?.value ?? 1 },
                    }))
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
                    setFormData((p) => ({
                      ...p,
                      recurrence: { ...p.recurrence, weekend: v[0]?.value || "" },
                    }))
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
      {/* Modal container */}
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
              {amountCents > 0 ? (
                <>
                  {t("entriesModal:footer.value")} <b>{formatCurrency(formData.details.amount)}</b>
                </>
              ) : (
                <>{t("entriesModal:footer.enterValue")}</>
              )}
              <span className="ml-3 text-gray-400">
                {t("entriesModal:footer.shortcuts")}
              </span>
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

        {/* Overlay de confirmação interna */}
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
                <Button
                  variant="danger"
                  className="!bg-red-500 hover:!bg-red-600"
                  onClick={handleClose}
                >
                  {t("entriesModal:actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 🔔 Overlay de avisos/validações */}
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
                    setTimeout(() => focusFirstInteractive(fId), 0);
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

export default EntriesModalForm;
