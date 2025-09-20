import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";

import Button from "../Button";
import Input from "../Input";
import { SelectDropdown } from "@/components/SelectDropdown";
import { getCursorFromUrl } from "src/lib/list";

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

// 🔹 Document Types vindos de JSON local (sem requests)
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

// Novos valores compatíveis com IntervalMonths (0|1|2|3|6|12)
const periodOptions: PeriodOption[] = [
  { id: 0, label: "Semanal", value: 0 },
  { id: 1, label: "Mensal", value: 1 },
  { id: 2, label: "Bimestral", value: 2 },
  { id: 3, label: "Trimestral", value: 3 },
  { id: 6, label: "Semestral", value: 6 },
  { id: 12, label: "Anual", value: 12 },
];

const ENTITY_TYPE_OPTIONS = [
  { id: 1, label: "Cliente", value: "client" },
  { id: 2, label: "Fornecedor", value: "supplier" },
  { id: 3, label: "Funcionário", value: "employee" },
];

// 🔹 Lista de abas (constante estável no módulo para satisfazer exhaustive-deps)
const TAB_LIST: { id: Tab; label: string }[] = [
  { id: "details", label: "Detalhes" },
  { id: "costCenters", label: "Centro de Custos" },
  { id: "inventory", label: "Inventário" },
  { id: "entities", label: "Envolvidos" },
  { id: "recurrence", label: "Recorrência" },
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
    return v; // fallback, caso já venha "3000.00"
  }
  return "";
};

const normalizeDocTypes = (raw: unknown): DocTypeItem[] => {
  // Esperado: [{id,label}], mas deixamos resiliente a array de strings
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
    // dedup por id
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
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // controle de confirmação interna
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

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

  // se o entry for parcelado, bloqueia mudança de recorrência
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
    setShowCloseConfirm(false);
    onClose();
  }, [onClose]);

  const cleanCurrency = (raw: string) =>
    (parseFloat(raw.replace(/[^\d]/g, "")) / 100).toFixed(2);

  const amountCents = useMemo(
    () => parseInt(formData.details.amount.replace(/\D/g, ""), 10) || 0,
    [formData.details.amount]
  );
  const isSaveDisabled = isSubmitting || amountCents <= 0;

  const percentageSum = useMemo(() => {
    const nums = formData.costCenters.department_percentage
      .map((p) => parseFloat(String(p).replace(",", ".")))
      .filter((n) => !Number.isNaN(n));
    const total = nums.reduce((acc, n) => acc + n, 0);
    return Math.round(total * 100) / 100;
  }, [formData.costCenters.department_percentage]);

  /* ---------------- Flag de dados preenchidos (ignora dueDate) --------------- */
  const hasMeaningfulData = useMemo(() => {
    // 1) amount > 0
    if (amountCents > 0) return true;

    // 2) details (ignorando dueDate)
    const d = formData.details;
    if (
      d.description.trim() ||
      d.observation.trim() ||
      d.notes.trim() ||
      d.accountingAccount ||
      d.documentType
    )
      return true;

    // 3) cost centers
    const cc = formData.costCenters;
    if (cc.departments.length > 0 || cc.projects) return true;

    // 4) inventory
    const inv = formData.inventory;
    if (inv.product || (!!inv.quantity && Number(inv.quantity) > 0)) return true;

    // 5) entities
    const ent = formData.entities;
    if (ent.entityType || ent.entity) return true;

    // 6) recurrence
    const rec = formData.recurrence;
    if (rec.recurrence === 1 || !!rec.installments || !!rec.weekend || Number(rec.periods) !== 1)
      return true;

    return false;
  }, [formData, amountCents]);

  /* ------------------------ Submit --------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    // manter essa validação simples
    if (!formData.details.accountingAccount) {
      alert("Selecione uma conta contábil.");
      return;
    }
    if (formData.costCenters.departments.length > 0 && percentageSum !== 100) {
      alert("A soma das porcentagens dos departamentos deve ser exatamente 100%.");
      return;
    }

    setIsSubmitting(true);

    // Helpers
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
        // ---------- CREATE (POST): payload completo ----------
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
          tx_type: type, // "credit" | "debit" (apenas no POST)

          ...(isRecurring && installmentCount > 1
            ? {
                installment_count: installmentCount,
                interval_months: formData.recurrence.periods as IntervalMonths,
                ...(formData.recurrence.weekend
                  ? { weekend_action: mapWeekendToNumber(formData.recurrence.weekend) }
                  : {}),
              }
            : {}),

          gl_account: formData.details.accountingAccount, // obrigatório
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
        // ---------- EDIT (PATCH): somente o que mudou ----------
        const ie = initialEntry as EntryDiffable;
        const changes: Partial<EditEntryRequest> = {};

        // campos simples
        if (formData.details.dueDate !== ie.due_date) {
          changes.due_date = formData.details.dueDate;
        }
        if ((formData.details.description || "") !== (ie.description || "")) {
          changes.description = formData.details.description || "";
        }
        if ((formData.details.observation || "") !== (ie.observation || "")) {
          changes.observation = formData.details.observation || "";
        }
        if ((formData.details.notes || "") !== (ie.notes || "")) {
          changes.notes = formData.details.notes || "";
        }

        // amount (comparação por string decimal normalizada)
        const initialAmountStr = normalizeAmountStr(ie.amount);
        if (cleanAmountNow !== initialAmountStr) {
          changes.amount = cleanAmountNow;
        }

        // gl_account (external_id)
        const initialGl = ie.gl_account || "";
        if (formData.details.accountingAccount && formData.details.accountingAccount !== initialGl) {
          changes.gl_account = formData.details.accountingAccount;
        }

        // document_type (read não traz; só envia se o usuário escolheu algo)
        if (formData.details.documentType) {
          changes.document_type = formData.details.documentType;
        }

        // project (permite limpar: envia null quando o usuário zera)
        const initialProject = ie.project || "";
        const newProject = formData.costCenters.projects || "";
        if (newProject !== initialProject) {
          changes.project = newProject || null;
        }

        // entity (idem project)
        const initialEntity = ie.entity || "";
        const newEntity = formData.entities.entity || "";
        if (newEntity !== initialEntity) {
          changes.entity = newEntity || null;
        }

        // departamentos / itens (só se o usuário preencheu algo agora)
        const deps = makeDepartments();
        if (deps) changes.departments = deps;

        const items = makeItems();
        if (items) changes.items = items;

        // recorrência: NUNCA mandar se já é parcelado
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

        // Se nada mudou, evita request
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
        alert(apiError?.error?.message || "Erro ao salvar lançamento.");
        return;
      }

      handleClose();
      onSave();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        alert(err.response.data.error.message);
      } else {
        alert("Erro inesperado ao salvar lançamento.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------- Fetch helpers --------------------------- */
  // Ledger Accounts
  const fetchAllLedgerAccounts = useCallback(async () => {
    const all: GLAccount[] = [];
    let cursor: string | undefined;
    do {
      const { data } = await api.getLedgerAccounts({ page_size: 200, cursor });
      const page = (data?.results ?? []) as GLAccount[];
      all.push(...page);
      cursor = getCursorFromUrl(data?.next as string | undefined) || undefined;
    } while (cursor);
    const wanted = type === "credit" ? "credit" : "debit";
    return all.filter((a) => (a?.default_tx || "").toLowerCase() === wanted);
  }, [type]);

  // Departments
  const fetchAllDepartments = useCallback(async () => {
    const all: Department[] = [];
    let cursor: string | undefined;
    do {
      const { data } = await api.getDepartments({ page_size: 200, cursor });
      const page = (data?.results ?? []) as Department[];
      all.push(...page);
      cursor = getCursorFromUrl(data?.next as string | undefined) || undefined;
    } while (cursor);
    return all;
  }, []);

  // Projects
  const fetchAllProjects = useCallback(async () => {
    const all: Project[] = [];
    let cursor: string | undefined;
    do {
      const { data } = await api.getProjects({ page_size: 200, cursor });
      const page = (data?.results ?? []) as Project[];
      all.push(...page);
      cursor = getCursorFromUrl(data?.next as string | undefined) || undefined;
    } while (cursor);
    return all;
  }, []);

  // Inventory Items
  const fetchAllInventoryItems = useCallback(async () => {
    const all: InventoryItem[] = [];
    let cursor: string | undefined;
    do {
      const { data } = await api.getInventoryItems({ page_size: 200, cursor });
      const page = (data?.results ?? []) as InventoryItem[];
      all.push(...page);
      cursor = getCursorFromUrl(data?.next as string | undefined) || undefined;
    } while (cursor);
    return all;
  }, []);

  // Entities (CRM)
  const fetchAllEntities = useCallback(async () => {
    const all: Entity[] = [];
    let cursor: string | undefined;
    do {
      const { data } = await api.getEntities({ page_size: 200, cursor });
      const page = (data?.results ?? []) as Entity[];
      all.push(...page);
      cursor = getCursorFromUrl(data?.next as string | undefined) || undefined;
    } while (cursor);
    return all;
  }, []);


  /* --------------------------- Carregar dados --------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        // carrega fontes que vêm de API (sem document types)
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

      // carrega document types do JSON local
      setDocumentTypes(normalizeDocTypes(documentTypesData));
    })();

    if (!initialEntry) {
      setFormData((prev) => ({
        ...prev,
        details: { ...prev.details, dueDate: new Date().toISOString().slice(0, 10) },
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

    const recCount = initialEntry.installment_count ?? 1;
    const interval = initialEntry.interval_months ?? 1;
    const weekendNum = initialEntry.weekend_action ?? 0;

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

    // GL Account
    const glaId = initialEntry.gl_account || "";
    const la = ledgerAccounts.find((a) => a.id === glaId);
    setSelectedLedgerAccount(la ? [la] : []);

    // Project
    const prjId = initialEntry.project || "";
    const prj = projects.find((p) => p.id === prjId);
    setSelectedProject(prj ? [prj] : []);

    // Entity + tipo
    const entId = initialEntry.entity || "";
    const ent = entities.find((e) => e.id === entId);
    setSelectedEntity(ent ? [ent] : []);
    if (ent && ent.entity_type) {
      const et = ent.entity_type as string;
      const opt = ENTITY_TYPE_OPTIONS.find((o) => o.value === et);
      setSelectedEntityType(opt ? [opt] : []);
    } else {
      setSelectedEntityType([]);
    }

    // Department
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
  }, [isOpen, initialEntry, ledgerAccounts, projects, entities, departments]);

  /* ------------------------------ Handlers ------------------------------ */
  const handleLedgerAccountChange = (updated: GLAccount[]) => {
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
    setSelectedDepartments(updated);
    const ids = updated.map((d) => String(d.id));
    const percs = distributePercentages(ids);
    setFormData((prev) => ({
      ...prev,
      costCenters: { ...prev.costCenters, departments: ids, department_percentage: percs },
    }));
  };

  const handlePercentageChange = (index: number, value: string) => {
    const percs = [...formData.costCenters.department_percentage];
    percs[index] = value;
    setFormData((p) => ({
      ...p,
      costCenters: { ...p.costCenters, department_percentage: percs },
    }));
  };

  const handleProjectChange = (updated: Project[]) => {
    setSelectedProject(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, costCenters: { ...p.costCenters, projects: id } }));
  };

  const handleInventoryChange = (updated: InventoryItem[]) => {
    setSelectedInventoryItem(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, inventory: { ...p.inventory, product: id } }));
  };

  const handleEntityChange = (updated: Entity[]) => {
    setSelectedEntity(updated);
    const id = updated.length ? String(updated[0].id) : "";
    setFormData((p) => ({ ...p, entities: { ...p.entities, entity: id } }));
  };

  // 🔹 Navegação por abas: Ctrl/Cmd + ← / →
  const goTabRelative = useCallback(
    (delta: number) => {
      const idx = TAB_LIST.findIndex((t) => t.id === activeTab);
      if (idx === -1) return;
      const nextIdx = (idx + delta + TAB_LIST.length) % TAB_LIST.length;
      setActiveTab(TAB_LIST[nextIdx].id);
    },
    [activeTab]
  );

  /* ---------------------- Fechamento com confirmação interna ----------------- */
  const attemptClose = useCallback(() => {
    // Se houver dropdown aberto, deixa o ESC atuar no dropdown
    const dropdownOpen = document.querySelector('[data-select-open="true"]');
    if (dropdownOpen) return;

    if (hasMeaningfulData) {
      setShowCloseConfirm(true);
      return;
    }
    handleClose();
  }, [hasMeaningfulData, handleClose]);

  /* ----------------------- Teclado: ESC, Ctrl/Cmd+S, Ctrl/Cmd+←/→ ----------- */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // ESC
      if (e.key === "Escape") {
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

      // Ctrl/Cmd + S → submit
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("modalForm") as HTMLFormElement | null)?.requestSubmit();
        return;
      }

      // Ctrl/Cmd + ArrowLeft/ArrowRight → trocar abas (AGORA MESMO COM FOCO EM INPUT)
      if ((e.ctrlKey || e.metaKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (showCloseConfirm) return;

        // opcional: ainda evita se um SelectDropdown estiver aberto
        const dropdownOpen = document.querySelector('[data-select-open="true"]');
        if (dropdownOpen) return;

        // ⚠️ sem o guard de "isTyping": sempre troca a aba
        e.preventDefault();
        goTabRelative(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose, showCloseConfirm, goTabRelative]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "details":
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Vencimento"
              type="date"
              value={formData.details.dueDate}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: { ...p.details, dueDate: e.target.value } }))
              }
            />
            <Input
              label="Valor"
              type="text"
              ref={amountRef}
              placeholder="0,00"
              value={formatCurrency(formData.details.amount)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, details: { ...p.details, amount: e.target.value } }))
              }
              onKeyDown={(e) => handleAmountKeyDown(e, formData.details.amount, setFormData)}
            />
            <SelectDropdown<GLAccount>
              label="Conta contábil"
              items={ledgerAccounts}
              selected={selectedLedgerAccounts}
              onChange={handleLedgerAccountChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => (i.code ? `${i.code} — ${i.name}` : i.name)}
              buttonLabel="Selecione a conta"
              singleSelect
              customStyles={{ maxHeight: "200px" }}
              groupBy={(i) =>
                i.subcategory ? `${i.category} / ${i.subcategory}` : i.category || "Outros"
              }
            />

            <div className="md:col-span-3">
              <Input
                label="Descrição"
                ref={descriptionRef}
                type="text"
                placeholder="Descreva o lançamento"
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
              label="Tipo de documento"
              items={documentTypes}
              selected={selectedDocumentTypes}
              onChange={handleDocumentTypeChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.label}
              buttonLabel="Selecione o tipo"
              singleSelect
              customStyles={{ maxHeight: "180px" }}
            />

            <div className="md:col-span-2">
              <Input
                label="Observação"
                type="text"
                placeholder="(opcional)"
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
                label="Notas"
                placeholder="Notas internas (não aparecem em documentos)"
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
                label="Departamentos"
                items={departments}
                selected={selectedDepartments}
                onChange={handleDepartmentChange}
                getItemKey={(d) => d.id}
                getItemLabel={(d) => d.name || "Departamento sem nome"}
                clearOnClickOutside={false}
                buttonLabel="Selecione departamentos"
                customStyles={{ maxHeight: "240px" }}
              />

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-700">Distribuição (%)</span>
                  <span
                    className={`text-[11px] px-2 py-[2px] rounded-full border ${
                      percentageSum === 100
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    Total: {percentageSum || 0}%
                  </span>
                </div>
                <div className="mt-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedDepartments.map((dept, index) => (
                    <div key={dept.id} className="mb-3">
                      <Input
                        label={`% - ${dept.name || `Departamento ${dept.id}`}`}
                        type="number"
                        name={`department_percentage_${dept.id}`}
                        value={formData.costCenters.department_percentage[index] || ""}
                        onChange={(e) => handlePercentageChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                  {selectedDepartments.length === 0 && (
                    <p className="text-[12px] text-gray-500">Nenhum departamento selecionado.</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <SelectDropdown<Project>
                label="Projetos"
                items={projects}
                selected={selectedProject}
                onChange={handleProjectChange}
                getItemKey={(p) => p.id}
                getItemLabel={(p) => p.name || p.code || `Projeto ${p.id}`}
                buttonLabel="Selecione um projeto"
                clearOnClickOutside={false}
                singleSelect
                customStyles={{ maxHeight: "200px" }}
              />
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<InventoryItem>
              label="Produto"
              items={inventoryItems}
              selected={selectedInventoryItem}
              onChange={handleInventoryChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) => (i.sku ? `${i.sku} — ${i.name}` : i.name)}
              buttonLabel="Selecione um produto"
              clearOnClickOutside={false}
              singleSelect
              customStyles={{ maxHeight: "180px" }}
            />
            {selectedInventoryItem.length > 0 && (
              <Input
                label="Quantidade"
                type="number"
                placeholder="0"
                value={formData.inventory.quantity}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    inventory: { ...p.inventory, quantity: e.target.value },
                  }))
                }
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
            <SelectDropdown<{ id: number; label: string; value: string }>
              label="Tipo de entidade"
              items={ENTITY_TYPE_OPTIONS}
              selected={selectedEntityType}
              onChange={(v) => {
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
              buttonLabel="Selecione o tipo"
              singleSelect
              customStyles={{ maxHeight: "160px" }}
              hideFilter
            />

            <SelectDropdown<Entity>
              label="Entidade"
              items={filteredEntities}
              selected={selectedEntity}
              onChange={handleEntityChange}
              getItemKey={(i) => i.id}
              getItemLabel={(i) =>
                i.full_name ||
                (i as unknown as { alias_name?: string }).alias_name ||
                "Entidade sem nome"
              }
              buttonLabel="Selecione a entidade"
              singleSelect
              customStyles={{ maxHeight: "200px" }}
            />
          </div>
        );
      }

      case "recurrence":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectDropdown<RecurrenceOption>
              label="Recorrência"
              items={[
                { id: 1, label: "Sim", value: 1 },
                { id: 2, label: "Não", value: 0 },
              ]}
              selected={
                formData.recurrence.recurrence === 1
                  ? [{ id: 1, label: "Sim", value: 1 }]
                  : [{ id: 2, label: "Não", value: 0 }]
              }
              onChange={(v) =>
                setFormData((p) => ({
                  ...p,
                  recurrence: { ...p.recurrence, recurrence: v[0]?.value ?? 0 },
                }))
              }
              getItemKey={(i) => i.id}
              getItemLabel={(i) => i.label}
              buttonLabel="Selecione"
              singleSelect
              hideFilter
              customStyles={{ maxHeight: "140px" }}
              disabled={isRecurrenceLocked}
            />

            {formData.recurrence.recurrence === 1 && (
              <>
                <Input
                  label="Parcelas"
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
                  label="Períodos"
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
                  buttonLabel="Selecione um período"
                  singleSelect
                  customStyles={{ maxHeight: "140px" }}
                  hideFilter
                  disabled={isRecurrenceLocked}
                />

                <SelectDropdown<{ id: number; label: string; value: string }>
                  label="Fim de semana"
                  items={[
                    { id: 1, label: "Postergar", value: "postpone" },
                    { id: -1, label: "Antecipar", value: "antedate" },
                  ]}
                  selected={
                    formData.recurrence.weekend
                      ? [
                          formData.recurrence.weekend === "postpone"
                            ? { id: 1, label: "Postergar", value: "postpone" }
                            : { id: -1, label: "Antecipar", value: "antedate" },
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
                  buttonLabel="Selecione"
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
                {type === "credit" ? "RC" : "PG"}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Lançamento</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {type === "credit" ? "Recebimentos" : "Pagamentos"}
                </h1>
              </div>
            </div>
            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={attemptClose}
              aria-label="Fechar"
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
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">{renderTabContent()}</div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {amountCents > 0 ? (
                <>
                  Valor: <b>{formatCurrency(formData.details.amount)}</b>
                </>
              ) : (
                <>Informe um valor para salvar.</>
              )}
              <span className="ml-3 text-gray-400">
                Atalhos: Esc (fechar), Ctrl/Cmd+S (salvar), Ctrl/Cmd+←/→ (abas)
              </span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {isSubmitting ? "Salvando…" : "Salvar"}
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
                  Descartar informações preenchidas?
                </h2>
                <p id="close-confirm-desc" className="mt-1 text-[12px] text-gray-600">
                  Você inseriu dados neste lançamento. Se sair agora, as informações serão perdidas.
                </p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="!bg-red-500 hover:!bg-red-600"
                  onClick={handleClose}
                >
                  Descartar
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
