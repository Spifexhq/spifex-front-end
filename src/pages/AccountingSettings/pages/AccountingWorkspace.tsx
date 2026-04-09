// src/pages/AccountingSettings/components/AccountingWorkspace.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Snackbar from "@/shared/ui/Snackbar";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import AccountingSideModal from "../components/AccountingSideModal";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";
import type {
  AddLedgerAccountRequest,
  GetLedgerAccountsResponse,
  LedgerAccount,
  LedgerAccountType,
  LedgerNormalBalance,
  LedgerStatementSection,
} from "@/models/settings/ledgerAccounts";

type SnackbarState =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type Option<T extends string = string> = {
  label: string;
  value: T;
};

type PaginationMeta = {
  pagination?: { next?: string | null };
};

type WorkspaceMode = "chart" | "rules" | "reporting";
type TreeMode = "compact" | "detailed";

type TreeNode = LedgerAccount & { children: TreeNode[] };

type Props = {
  ledgerProfile: OrgLedgerProfileResponse;
};

const optionKey = <T extends string>(item: Option<T>) => item.value;
const optionLabel = <T extends string>(item: Option<T>) => item.label;

const sectionOptions: Option<LedgerStatementSection>[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "off_balance", label: "Off balance" },
  { value: "statistical", label: "Statistical" },
];

const balanceOptions: Option<LedgerNormalBalance>[] = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
];

const accountTypeOptions: Option<LedgerAccountType>[] = [
  { value: "header", label: "Header" },
  { value: "posting", label: "Posting" },
];

const binaryOptions: Option<"true" | "false">[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const sectionLabelMap: Record<LedgerStatementSection, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
  off_balance: "Off balance",
  statistical: "Statistical",
};

const workspaceModes: Array<{ id: WorkspaceMode; title: string; description: string }> = [
  {
    id: "chart",
    title: "Chart designer",
    description: "Tree-first workspace for structure, hierarchy, and account maintenance.",
  },
  {
    id: "rules",
    title: "Posting rules",
    description: "Focus on posting permissions, bank-control scope, and operational discipline.",
  },
  {
    id: "reporting",
    title: "Reporting map",
    description: "Validate report groups, subgroups, and statement alignment.",
  },
];

const DEFAULTS: AddLedgerAccountRequest = {
  code: "",
  name: "",
  description: "",
  parent_id: null,
  account_type: "posting",
  statement_section: "expense",
  normal_balance: "debit",
  is_active: true,
  is_bank_control: false,
  allows_manual_posting: true,
  report_group: "",
  report_subgroup: "",
  external_ref: "",
  currency_code: "",
  metadata: {},
};

const sortAccounts = (a: LedgerAccount, b: LedgerAccount) => {
  const aCode = String(a.code || "");
  const bCode = String(b.code || "");
  if (aCode && bCode && aCode !== bCode) {
    return aCode.localeCompare(bCode, undefined, { numeric: true });
  }
  return String(a.name || "").localeCompare(String(b.name || ""));
};

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-gray-900">{value}</div>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
    </article>
  );
}

function Pill({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        dark ? "border-white/20 bg-white/10 text-white" : "border-gray-200 bg-white text-gray-700",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function WorkspaceTab({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-3xl border p-4 text-left transition-colors",
        active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className={["mt-2 text-sm leading-6", active ? "text-gray-100" : "text-gray-600"].join(" ")}>
        {description}
      </div>
    </button>
  );
}

function TreeRow({
  node,
  depth,
  openIds,
  onToggle,
  onSelect,
  onQuickEdit,
  selectedId,
  treeMode,
}: {
  node: TreeNode;
  depth: number;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: LedgerAccount) => void;
  onQuickEdit: (node: LedgerAccount) => void;
  selectedId?: string | null;
  treeMode: TreeMode;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = openIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={[
          "group flex items-start justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors",
          isSelected
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-transparent bg-white hover:border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex items-center gap-2 pt-0.5" style={{ paddingLeft: `${depth * 16}px` }}>
            {hasChildren ? (
              <button
                type="button"
                className={[
                  "inline-flex h-5 w-5 items-center justify-center rounded border text-[11px]",
                  isSelected ? "border-white/30 text-white" : "border-gray-200 text-gray-700",
                ].join(" ")}
                onClick={() => onToggle(node.id)}
                aria-label={isOpen ? "Collapse group" : "Expand group"}
              >
                {isOpen ? "−" : "+"}
              </button>
            ) : (
              <span
                className={[
                  "inline-flex h-5 w-5 items-center justify-center text-xs",
                  isSelected ? "text-white/80" : "text-gray-300",
                ].join(" ")}
              >
                •
              </span>
            )}
          </div>

          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(node)}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{node.code || "—"}</span>
                <span className="text-sm">{node.name}</span>
                {node.is_system ? <Pill dark={isSelected}>system</Pill> : null}
                {!node.is_active ? <Pill dark={isSelected}>inactive</Pill> : null}
              </div>

              <div className={["mt-1 flex flex-wrap items-center gap-2 text-xs", isSelected ? "text-white/80" : "text-gray-600"].join(" ")}>
                <span>{sectionLabelMap[node.statement_section]}</span>
                <span>•</span>
                <span>{node.account_type}</span>
                <span>•</span>
                <span>{node.normal_balance}</span>
                {treeMode === "detailed" ? (
                  <>
                    <span>•</span>
                    <span>{node.is_bank_control ? "bank control" : "regular account"}</span>
                    <span>•</span>
                    <span>{node.allows_manual_posting ? "manual allowed" : "manual blocked"}</span>
                  </>
                ) : null}
              </div>
            </div>
          </button>
        </div>

        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onQuickEdit(node)}
            className={[
              "rounded-xl border px-3 py-1.5 text-xs font-medium",
              isSelected ? "border-white/30 text-white hover:bg-white/10" : "border-gray-200 text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            Edit
          </button>
        </div>
      </div>

      {hasChildren && isOpen ? (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              openIds={openIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onQuickEdit={onQuickEdit}
              selectedId={selectedId}
              treeMode={treeMode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const AccountingWorkspace: React.FC<Props> = ({ ledgerProfile }) => {
  const { isOwner, permissions } = useAuthContext();
  const canView = isOwner || permissions.includes("view_ledger_account");
  const canManage = isOwner || permissions.includes("add_ledger_account");

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("chart");
  const [treeMode, setTreeMode] = useState<TreeMode>("compact");

  const [draftSearch, setDraftSearch] = useState("");
  const [draftSection, setDraftSection] = useState<"" | LedgerStatementSection>("");
  const [draftAccountType, setDraftAccountType] = useState<"" | LedgerAccountType>("");
  const [draftBankControl, setDraftBankControl] = useState<"" | "true" | "false">("");
  const [draftManualPosting, setDraftManualPosting] = useState<"" | "true" | "false">("");
  const [draftActive, setDraftActive] = useState<"true" | "false">("true");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedSection, setAppliedSection] = useState<"" | LedgerStatementSection>("");
  const [appliedAccountType, setAppliedAccountType] = useState<"" | LedgerAccountType>("");
  const [appliedBankControl, setAppliedBankControl] = useState<"" | "true" | "false">("");
  const [appliedManualPosting, setAppliedManualPosting] = useState<"" | "true" | "false">("");
  const [appliedActive, setAppliedActive] = useState<"true" | "false">("true");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Partial<LedgerAccount> | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const [form, setForm] = useState<AddLedgerAccountRequest>(DEFAULTS);
  const [metadataText, setMetadataText] = useState("{}");
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      if (!canView) {
        return { items: [] as LedgerAccount[], nextCursor: undefined as string | undefined };
      }

      const response = (await api.getLedgerAccounts({
        cursor,
        q: appliedSearch || undefined,
        active: appliedActive,
        ...(appliedSection ? { statement_section: appliedSection } : {}),
        ...(appliedAccountType ? { account_type: appliedAccountType } : {}),
        ...(appliedBankControl ? { is_bank_control: appliedBankControl } : {}),
        ...(appliedManualPosting ? { allows_manual_posting: appliedManualPosting } : {}),
      })) as { data: GetLedgerAccountsResponse; meta?: PaginationMeta };

      const data = response.data;
      const nextUrl = response.meta?.pagination?.next ?? data?.next ?? null;
      const nextCursor = nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined;

      return {
        items: (data?.results ?? []) as LedgerAccount[],
        nextCursor,
      };
    },
    [canView, appliedSearch, appliedActive, appliedSection, appliedAccountType, appliedBankControl, appliedManualPosting]
  );

  const pager = useCursorPager<LedgerAccount>(fetchPage, {
    autoLoadFirst: canView,
    deps: [canView, appliedSearch, appliedActive, appliedSection, appliedAccountType, appliedBankControl, appliedManualPosting],
  });

  const tree = useMemo<TreeNode[]>(() => {
    const sorted = [...pager.items].sort(sortAccounts);
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    sorted.forEach((item) => map.set(item.id, { ...item, children: [] }));

    sorted.forEach((item) => {
      const node = map.get(item.id);
      if (!node) return;
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortRecursive = (nodes: TreeNode[]) => {
      nodes.sort(sortAccounts);
      nodes.forEach((node) => sortRecursive(node.children));
    };

    sortRecursive(roots);
    return roots;
  }, [pager.items]);

  useEffect(() => {
    const next = new Set<string>();
    tree.forEach((root) => next.add(root.id));
    setOpenIds(next);
  }, [tree]);

  useEffect(() => {
    if (!pager.items.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !pager.items.some((item) => item.id === selectedId)) {
      setSelectedId(pager.items[0].id);
    }
  }, [pager.items, selectedId]);

  const parentOptions = useMemo(
    () =>
      pager.items
        .filter((item) => item.id !== editing?.id && item.account_type === "header")
        .sort(sortAccounts)
        .map((item) => ({
          label: `${item.code || "—"} — ${item.name || item.id}`,
          value: item.id,
        })),
    [editing?.id, pager.items]
  );

  const selectedAccount = useMemo(
    () => pager.items.find((item) => item.id === selectedId) ?? null,
    [pager.items, selectedId]
  );

  const counters = useMemo(() => {
    const items = pager.items;
    return {
      total: items.length,
      posting: items.filter((item) => item.account_type === "posting").length,
      headers: items.filter((item) => item.account_type === "header").length,
      bankControl: items.filter((item) => item.is_bank_control).length,
      manualAllowed: items.filter((item) => item.allows_manual_posting).length,
      active: items.filter((item) => item.is_active).length,
      maxDepth: items.reduce((max, item) => Math.max(max, Number(item.depth || 0)), 0),
      reportingMapped: items.filter((item) => !!item.report_group || !!item.report_subgroup).length,
    };
  }, [pager.items]);

  const reportingGroups = useMemo(() => {
    const grouped = pager.items.reduce<Record<string, number>>((acc, item) => {
      const key = item.report_group || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [pager.items]);

  const selectedParent = useMemo(
    () => (form.parent_id ? parentOptions.filter((item) => item.value === form.parent_id) : []),
    [form.parent_id, parentOptions]
  );

  const selectedFormAccountType = useMemo(
    () => accountTypeOptions.filter((item) => item.value === form.account_type),
    [form.account_type]
  );

  const selectedFormSection = useMemo(
    () => sectionOptions.filter((item) => item.value === form.statement_section),
    [form.statement_section]
  );

  const selectedFormBalance = useMemo(
    () => balanceOptions.filter((item) => item.value === form.normal_balance),
    [form.normal_balance]
  );

  useEffect(() => {
    if (!modalOpen) return;

    const next: AddLedgerAccountRequest = {
      ...DEFAULTS,
      ...(editing ?? {}),
      code: editing?.code ?? "",
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      parent_id: editing?.parent_id ?? null,
      account_type: editing?.account_type ?? DEFAULTS.account_type,
      statement_section: editing?.statement_section ?? DEFAULTS.statement_section,
      normal_balance: editing?.normal_balance ?? DEFAULTS.normal_balance,
      is_active: editing?.is_active ?? DEFAULTS.is_active,
      is_bank_control: editing?.is_bank_control ?? DEFAULTS.is_bank_control,
      allows_manual_posting: editing?.allows_manual_posting ?? DEFAULTS.allows_manual_posting,
      report_group: editing?.report_group ?? "",
      report_subgroup: editing?.report_subgroup ?? "",
      external_ref: editing?.external_ref ?? "",
      currency_code: editing?.currency_code ?? "",
      metadata:
        editing?.metadata && typeof editing.metadata === "object" && !Array.isArray(editing.metadata)
          ? (editing.metadata as Record<string, unknown>)
          : {},
    };

    setForm(next);
    setMetadataText(JSON.stringify(next.metadata ?? {}, null, 2));
    setModalError(null);
  }, [modalOpen, editing]);

  const applyFilters = () => {
    setAppliedSearch(draftSearch.trim());
    setAppliedSection(draftSection);
    setAppliedAccountType(draftAccountType);
    setAppliedBankControl(draftBankControl);
    setAppliedManualPosting(draftManualPosting);
    setAppliedActive(draftActive);
  };

  const clearFilters = () => {
    setDraftSearch("");
    setDraftSection("");
    setDraftAccountType("");
    setDraftBankControl("");
    setDraftManualPosting("");
    setDraftActive("true");

    setAppliedSearch("");
    setAppliedSection("");
    setAppliedAccountType("");
    setAppliedBankControl("");
    setAppliedManualPosting("");
    setAppliedActive("true");
  };

  const openCreateModal = () => {
    setEditing(
      selectedAccount
        ? {
            parent_id: selectedAccount.id,
            statement_section: selectedAccount.statement_section,
            normal_balance: selectedAccount.normal_balance,
            account_type: "posting",
            is_active: true,
            is_bank_control: false,
            allows_manual_posting: true,
            report_group: selectedAccount.report_group,
            report_subgroup: selectedAccount.report_subgroup,
            currency_code: selectedAccount.currency_code,
          }
        : null
    );
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (account: LedgerAccount) => {
    setEditing(account);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setModalError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setModalError(null);

    if (!form.code.trim()) {
      setModalError("Code is required.");
      return;
    }

    if (!form.name.trim()) {
      setModalError("Name is required.");
      return;
    }

    let parsedMetadata: Record<string, unknown> = {};
    try {
      parsedMetadata = metadataText.trim() ? JSON.parse(metadataText) : {};
    } catch {
      setModalError("Metadata must be valid JSON.");
      return;
    }

    const payload: AddLedgerAccountRequest = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || "",
      report_group: form.report_group?.trim() || "",
      report_subgroup: form.report_subgroup?.trim() || "",
      external_ref: form.external_ref?.trim() || "",
      currency_code: form.currency_code?.trim().toUpperCase() || "",
      parent_id: form.parent_id || null,
      metadata: parsedMetadata,
      is_bank_control: form.account_type === "posting" ? !!form.is_bank_control : false,
      allows_manual_posting: form.account_type === "posting" ? !!form.allows_manual_posting : false,
    };

    try {
      setSaving(true);
      if (modalMode === "edit" && editing?.id) {
        await api.editLedgerAccount(editing.id, payload);
        setSnackbar({ message: "Account updated successfully.", severity: "success" });
      } else {
        await api.addLedgerAccount(payload);
        setSnackbar({ message: "Account created successfully.", severity: "success" });
      }
      closeModal();
      await pager.refresh();
    } catch (error) {
      setSnackbar({ message: (error as Error)?.message || "Unable to save the account.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: LedgerAccount) => {
    const confirmed = window.confirm(`Delete ${account.code || account.name}?`);
    if (!confirmed) return;

    try {
      await api.deleteLedgerAccount(account.id);
      setSnackbar({ message: "Account deleted successfully.", severity: "success" });
      await pager.refresh();
    } catch (error) {
      setSnackbar({ message: (error as Error)?.message || "Unable to delete the account.", severity: "error" });
    }
  };

  const toggleNode = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!canView) return <PageSkeleton rows={8} />;

  return (
    <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      {pager.loading && pager.items.length === 0 ? <TopProgress active variant="top" topOffset={64} /> : null}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Accounting settings</div>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-[30px]">Accounting control center</h1>
              <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
                Move all accounting logic into one clean workspace with a synthetic tree, focused edit modal, and dedicated views for structure,
                posting rules, and reporting consistency.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>{ledgerProfile.mode === "personal" ? "personal profile" : "organizational profile"}</Pill>
                <Pill>{ledgerProfile.use_compact_cashflow_view ? "compact cashflow view" : "full cashflow view"}</Pill>
              </div>
            </div>

            {canManage ? (
              <div className="flex shrink-0 items-center gap-3">
                <Button variant="outline" type="button" onClick={() => setTreeMode((prev) => (prev === "compact" ? "detailed" : "compact"))}>
                  {treeMode === "compact" ? "Detailed tree" : "Compact tree"}
                </Button>
                <Button type="button" className="border border-gray-900 bg-gray-900 text-white hover:bg-black" onClick={openCreateModal}>
                  New account
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Filters</div>
              <div className="mt-1 text-sm text-gray-600">Refine the accounting structure before navigating the tree.</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Input kind="text" label="Search" value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} />

              <SelectDropdown<Option<LedgerStatementSection>>
                label="Section"
                items={sectionOptions}
                selected={sectionOptions.filter((item) => item.value === draftSection)}
                onChange={(items: Option<LedgerStatementSection>[]) => setDraftSection(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel="All sections"
              />

              <SelectDropdown<Option<LedgerAccountType>>
                label="Account type"
                items={accountTypeOptions}
                selected={accountTypeOptions.filter((item) => item.value === draftAccountType)}
                onChange={(items: Option<LedgerAccountType>[]) => setDraftAccountType(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel="All types"
              />

              <SelectDropdown<Option<"true" | "false">>
                label="Bank control"
                items={binaryOptions}
                selected={binaryOptions.filter((item) => item.value === draftBankControl)}
                onChange={(items: Option<"true" | "false">[]) => setDraftBankControl(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel="Any"
              />

              <SelectDropdown<Option<"true" | "false">>
                label="Manual posting"
                items={binaryOptions}
                selected={binaryOptions.filter((item) => item.value === draftManualPosting)}
                onChange={(items: Option<"true" | "false">[]) => setDraftManualPosting(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel="Any"
              />

              <SelectDropdown<Option<"true" | "false">>
                label="Active"
                items={binaryOptions}
                selected={binaryOptions.filter((item) => item.value === draftActive)}
                onChange={(items: Option<"true" | "false">[]) =>
                  setDraftActive((items[0]?.value ?? "true") as "true" | "false")
                }
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel="Active only"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" className="border border-gray-900 bg-gray-900 text-white hover:bg-black" onClick={applyFilters}>
                Apply
              </Button>
              <Button variant="outline" type="button" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          <MetricCard label="Total accounts" value={counters.total} description="Accounts visible under the current filter set." />
          <MetricCard label="Posting accounts" value={counters.posting} description="Accounts able to receive journal lines." />
          <MetricCard label="Headers" value={counters.headers} description="Structural nodes used to organize the chart." />
          <MetricCard label="Max depth" value={counters.maxDepth} description="Deepest hierarchy level in the current view." />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {workspaceModes.map((item) => (
            <WorkspaceTab
              key={item.id}
              active={workspaceMode === item.id}
              title={item.title}
              description={item.description}
              onClick={() => setWorkspaceMode(item.id)}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[28px] border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chart tree</h2>
                <p className="mt-1 text-sm text-gray-600">Synthetic hierarchy view with fast node scanning and direct editing.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{pager.items.length} visible</span>
                {pager.loading ? <span>• refreshing</span> : null}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {tree.length ? (
                tree.map((node) => (
                  <TreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    openIds={openIds}
                    onToggle={toggleNode}
                    onSelect={(item) => setSelectedId(item.id)}
                    onQuickEdit={openEditModal}
                    selectedId={selectedId}
                    treeMode={treeMode}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center text-sm text-gray-500">
                  No accounts found for the current filter set.
                </div>
              )}
            </div>

            {pager.canNext ? (
              <div className="mt-5 flex justify-center">
                <Button variant="outline" type="button" disabled={pager.loading} onClick={pager.next}>
                  {pager.loading ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Inspector</div>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">{selectedAccount?.name || "No account selected"}</h2>
                </div>
                {selectedAccount && canManage ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" type="button" onClick={() => openEditModal(selectedAccount)}>
                      Edit
                    </Button>
                    {!selectedAccount.is_system ? (
                      <Button variant="outline" type="button" onClick={() => handleDelete(selectedAccount)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {selectedAccount ? (
                <div className="mt-5 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{selectedAccount.code || "—"}</Pill>
                    <Pill>{sectionLabelMap[selectedAccount.statement_section]}</Pill>
                    <Pill>{selectedAccount.account_type}</Pill>
                    <Pill>{selectedAccount.normal_balance}</Pill>
                    {selectedAccount.is_bank_control ? <Pill>bank control</Pill> : null}
                    {selectedAccount.allows_manual_posting ? <Pill>manual posting</Pill> : null}
                    {!selectedAccount.is_active ? <Pill>inactive</Pill> : null}
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                      <dt className="text-gray-500">Description</dt>
                      <dd className="text-gray-900">{selectedAccount.description || "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                      <dt className="text-gray-500">Path</dt>
                      <dd className="break-words text-gray-900">{selectedAccount.path || "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                      <dt className="text-gray-500">Group</dt>
                      <dd className="text-gray-900">{selectedAccount.report_group || "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                      <dt className="text-gray-500">Subgroup</dt>
                      <dd className="text-gray-900">{selectedAccount.report_subgroup || "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                      <dt className="text-gray-500">External ref</dt>
                      <dd className="text-gray-900">{selectedAccount.external_ref || "—"}</dd>
                    </div>
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                      <dt className="text-gray-500">Currency</dt>
                      <dd className="text-gray-900">{selectedAccount.currency_code || "—"}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                  Select an account in the tree to inspect its accounting properties.
                </div>
              )}
            </div>

            {workspaceMode === "rules" ? (
              <div className="rounded-[28px] border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900">Posting controls summary</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <MetricCard label="Manual allowed" value={counters.manualAllowed} description="Accounts still open for direct manual posting." />
                  <MetricCard label="Bank control" value={counters.bankControl} description="Accounts dedicated to bank control and settlement logic." />
                  <MetricCard label="Active" value={counters.active} description="Active accounts currently available in the chart." />
                </div>
              </div>
            ) : null}

            {workspaceMode === "reporting" ? (
              <div className="rounded-[28px] border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900">Reporting coverage</h3>
                <p className="mt-1 text-sm text-gray-600">Mapped accounts and dominant reporting groups in the current slice.</p>

                <div className="mt-4 grid gap-4">
                  <MetricCard label="Mapped accounts" value={counters.reportingMapped} description="Accounts with report group or subgroup assigned." />
                </div>

                <div className="mt-5 space-y-3">
                  {reportingGroups.length ? (
                    reportingGroups.slice(0, 6).map(([group, count]) => (
                      <div key={group} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 px-3 py-2.5">
                        <span className="truncate text-sm text-gray-700">{group}</span>
                        <span className="shrink-0 text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                      No reporting groups found.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </div>

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalMode === "create" ? "New account" : "Edit account"}
        subtitle="Maintain structure, posting rules, and reporting classification from a dedicated side modal."
        contentClassName="pb-4 md:pb-6"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-5">
            <section className="rounded-3xl border border-gray-200 bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-gray-900">Identity</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input kind="text" label="Code" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
                <Input kind="text" label="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="mt-4">
                <Input
                  kind="text"
                  label="Description"
                  value={form.description || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-gray-900">Structure</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectDropdown<Option<LedgerAccountType>>
                  label="Account type"
                  items={accountTypeOptions}
                  selected={selectedFormAccountType}
                  onChange={(items: Option<LedgerAccountType>[]) =>
                    setForm((prev) => ({ ...prev, account_type: items[0]?.value ?? "posting" }))
                  }
                  getItemKey={optionKey}
                  getItemLabel={optionLabel}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Select type"
                />
                <SelectDropdown<Option<LedgerStatementSection>>
                  label="Statement section"
                  items={sectionOptions}
                  selected={selectedFormSection}
                  onChange={(items: Option<LedgerStatementSection>[]) =>
                    setForm((prev) => ({ ...prev, statement_section: items[0]?.value ?? "expense" }))
                  }
                  getItemKey={optionKey}
                  getItemLabel={optionLabel}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Select section"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectDropdown<Option<LedgerNormalBalance>>
                  label="Normal balance"
                  items={balanceOptions}
                  selected={selectedFormBalance}
                  onChange={(items: Option<LedgerNormalBalance>[]) =>
                    setForm((prev) => ({ ...prev, normal_balance: items[0]?.value ?? "debit" }))
                  }
                  getItemKey={optionKey}
                  getItemLabel={optionLabel}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Select balance"
                />
                <SelectDropdown<{ label: string; value: string }>
                  label="Parent account"
                  items={parentOptions}
                  selected={selectedParent}
                  onChange={(items: Array<{ label: string; value: string }>) =>
                    setForm((prev) => ({ ...prev, parent_id: items[0]?.value ?? null }))
                  }
                  getItemKey={(item: { label: string; value: string }) => item.value}
                  getItemLabel={(item: { label: string; value: string }) => item.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Optional parent"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-gray-900">Posting and controls</div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800">
                  <Checkbox
                    checked={!!form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    size="small"
                  />
                  <span className="font-medium">Active</span>
                </label>

                <label
                  className={[
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm",
                    form.account_type !== "posting"
                      ? "border-gray-100 bg-gray-50 text-gray-400"
                      : "border-gray-200 bg-white text-gray-800",
                  ].join(" ")}
                >
                  <Checkbox
                    checked={!!form.is_bank_control}
                    disabled={form.account_type !== "posting"}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_bank_control: e.target.checked }))}
                    size="small"
                  />
                  <span className="font-medium">Bank control</span>
                </label>

                <label
                  className={[
                    "flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm",
                    form.account_type !== "posting"
                      ? "border-gray-100 bg-gray-50 text-gray-400"
                      : "border-gray-200 bg-white text-gray-800",
                  ].join(" ")}
                >
                  <Checkbox
                    checked={!!form.allows_manual_posting}
                    disabled={form.account_type !== "posting"}
                    onChange={(e) => setForm((prev) => ({ ...prev, allows_manual_posting: e.target.checked }))}
                    size="small"
                  />
                  <span className="font-medium">Manual posting allowed</span>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-gray-900">Reporting and integrations</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  kind="text"
                  label="Report group"
                  value={form.report_group || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, report_group: e.target.value }))}
                />
                <Input
                  kind="text"
                  label="Report subgroup"
                  value={form.report_subgroup || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, report_subgroup: e.target.value }))}
                />
                <Input
                  kind="text"
                  label="External reference"
                  value={form.external_ref || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, external_ref: e.target.value }))}
                />
                <Input
                  kind="text"
                  label="Currency"
                  value={form.currency_code || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency_code: e.target.value }))}
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Metadata JSON</label>
                <textarea
                  value={metadataText}
                  onChange={(e) => setMetadataText(e.target.value)}
                  className="min-h-[180px] w-full rounded-2xl border border-gray-300 bg-white px-3 py-3 font-mono text-sm text-gray-900 outline-none focus:border-gray-500"
                />
              </div>
            </section>

            <div>
              {modalError ? (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {modalError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button disabled={saving} type="submit" className="border border-gray-900 bg-gray-900 text-white hover:bg-black">
                  {saving ? "Saving..." : modalMode === "create" ? "Create account" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </AccountingSideModal>

      {snackbar ? (
        <Snackbar
          open={!!snackbar}
          onClose={() => setSnackbar(null)}
          autoHideDuration={6000}
          message={snackbar?.message}
          severity={snackbar?.severity}
          anchor={{ vertical: "bottom", horizontal: "center" }}
          pauseOnHover
          showCloseButton
        />
      ) : null}
    </main>
  );
};

export default AccountingWorkspace;