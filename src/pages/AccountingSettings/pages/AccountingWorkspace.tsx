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
    description: "Tree-first workspace for hierarchy and account maintenance.",
  },
  {
    id: "rules",
    title: "Posting rules",
    description: "Focus on controls, bank scope, and posting permissions.",
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
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-2 text-[20px] font-semibold text-gray-900">{value}</div>
      <p className="mt-1 text-[12px] leading-5 text-gray-600">{description}</p>
    </article>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-[12px] text-gray-700">
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
        "rounded-lg border px-4 py-3 text-left transition-colors",
        active
          ? "border-gray-900 bg-white text-gray-900"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="mt-1 text-[12px] leading-5 text-gray-600">{description}</div>
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

  const handleSelect = () => onSelect(node);

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(node);
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleRowKeyDown}
        aria-pressed={isSelected}
        className={[
          "group flex cursor-pointer items-start justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
          isSelected
            ? "border-gray-300 bg-gray-50"
            : "border-transparent bg-white hover:border-gray-200 hover:bg-gray-50",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="flex items-center gap-2 pt-0.5"
            style={{ paddingLeft: `${depth * 14}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-[11px] text-gray-700"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(node.id);
                }}
                aria-label={isOpen ? "Collapse group" : "Expand group"}
              >
                {isOpen ? "−" : "+"}
              </button>
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center text-xs text-gray-300">
                •
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-900">{node.code || "—"}</span>
              <span className="text-[13px] text-gray-900">{node.name}</span>
              {node.is_system ? <StatusPill>System</StatusPill> : null}
              {!node.is_active ? <StatusPill>Inactive</StatusPill> : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
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
        </div>

        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onQuickEdit(node);
            }}
          >
            Edit
          </Button>
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
    [
      canView,
      appliedSearch,
      appliedActive,
      appliedSection,
      appliedAccountType,
      appliedBankControl,
      appliedManualPosting,
    ]
  );

  const pager = useCursorPager<LedgerAccount>(fetchPage, {
    autoLoadFirst: canView,
    deps: [
      canView,
      appliedSearch,
      appliedActive,
      appliedSection,
      appliedAccountType,
      appliedBankControl,
      appliedManualPosting,
    ],
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
      setSnackbar({
        message: (error as Error)?.message || "Unable to save the account.",
        severity: "error",
      });
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
      setSnackbar({
        message: (error as Error)?.message || "Unable to delete the account.",
        severity: "error",
      });
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
    <>
      {pager.loading && pager.items.length === 0 ? <TopProgress active variant="top" topOffset={64} /> : null}

      <section className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Ledger workspace</div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-[16px] font-semibold text-gray-900">Chart of accounts</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  Maintain structure, posting controls, and reporting mapping in one compact workspace.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill>
                    {ledgerProfile.mode === "personal" ? "Personal profile" : "Organizational profile"}
                  </StatusPill>
                  <StatusPill>
                    {ledgerProfile.use_compact_cashflow_view ? "Compact cashflow view" : "Full cashflow view"}
                  </StatusPill>
                </div>
              </div>

              {canManage ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setTreeMode((prev) => (prev === "compact" ? "detailed" : "compact"))
                    }
                  >
                    {treeMode === "compact" ? "Detailed tree" : "Compact tree"}
                  </Button>
                  <Button type="button" onClick={openCreateModal}>
                    New account
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total accounts"
                value={counters.total}
                description="Accounts visible under the current filter set."
              />
              <MetricCard
                label="Posting accounts"
                value={counters.posting}
                description="Accounts able to receive journal lines."
              />
              <MetricCard
                label="Headers"
                value={counters.headers}
                description="Structural nodes used to organize the chart."
              />
              <MetricCard
                label="Max depth"
                value={counters.maxDepth}
                description="Deepest hierarchy level in the current view."
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Filters</div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Input
                kind="text"
                label="Search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
              />

              <SelectDropdown<Option<LedgerStatementSection>>
                label="Section"
                items={sectionOptions}
                selected={sectionOptions.filter((item) => item.value === draftSection)}
                onChange={(items: Option<LedgerStatementSection>[]) =>
                  setDraftSection(items[0]?.value ?? "")
                }
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
                onChange={(items: Option<LedgerAccountType>[]) =>
                  setDraftAccountType(items[0]?.value ?? "")
                }
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
                onChange={(items: Option<"true" | "false">[]) =>
                  setDraftBankControl(items[0]?.value ?? "")
                }
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
                onChange={(items: Option<"true" | "false">[]) =>
                  setDraftManualPosting(items[0]?.value ?? "")
                }
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
              <Button type="button" onClick={applyFilters}>
                Apply
              </Button>
              <Button variant="outline" type="button" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
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

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900">Tree</h3>
                <p className="mt-1 text-[12px] text-gray-600">
                  Hierarchy view with direct selection and quick editing.
                </p>
              </div>

              <div className="text-[12px] text-gray-600">
                {pager.items.length} visible {pager.loading ? "• refreshing" : ""}
              </div>
            </div>

            <div className="space-y-2 px-4 py-4">
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
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-[13px] text-gray-500">
                  No accounts found for the current filter set.
                </div>
              )}

              {pager.canNext ? (
                <div className="flex justify-center pt-3">
                  <Button variant="outline" type="button" disabled={pager.loading} onClick={pager.next}>
                    {pager.loading ? "Loading..." : "Load more"}
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Inspector</div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900">
                      {selectedAccount?.name || "No account selected"}
                    </h3>
                    <p className="mt-1 text-[12px] text-gray-600">
                      {selectedAccount?.code || "Select an account in the tree to inspect it."}
                    </p>
                  </div>

                  {selectedAccount && canManage ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" type="button" size="sm" onClick={() => openEditModal(selectedAccount)}>
                        Edit
                      </Button>
                      {!selectedAccount.is_system ? (
                        <Button variant="outline" type="button" size="sm" onClick={() => handleDelete(selectedAccount)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {selectedAccount ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill>{selectedAccount.code || "—"}</StatusPill>
                      <StatusPill>{sectionLabelMap[selectedAccount.statement_section]}</StatusPill>
                      <StatusPill>{selectedAccount.account_type}</StatusPill>
                      <StatusPill>{selectedAccount.normal_balance}</StatusPill>
                      {selectedAccount.is_bank_control ? <StatusPill>Bank control</StatusPill> : null}
                      {selectedAccount.allows_manual_posting ? <StatusPill>Manual posting</StatusPill> : null}
                      {!selectedAccount.is_active ? <StatusPill>Inactive</StatusPill> : null}
                    </div>

                    <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      {[
                        ["Description", selectedAccount.description || "—"],
                        ["Path", selectedAccount.path || "—"],
                        ["Group", selectedAccount.report_group || "—"],
                        ["Subgroup", selectedAccount.report_subgroup || "—"],
                        ["External ref", selectedAccount.external_ref || "—"],
                        ["Currency", selectedAccount.currency_code || "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-start justify-between gap-3 px-4 py-3">
                          <dt className="text-[10px] uppercase tracking-wide text-gray-600">{label}</dt>
                          <dd className="max-w-[65%] break-words text-right text-[13px] font-medium text-gray-900">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-[13px] text-gray-500">
                    Select an account in the tree to inspect its accounting properties.
                  </div>
                )}
              </div>
            </section>

            {workspaceMode === "rules" ? (
              <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Posting controls</div>
                </div>

                <div className="grid gap-3 px-4 py-4">
                  <MetricCard
                    label="Manual allowed"
                    value={counters.manualAllowed}
                    description="Accounts still open for direct manual posting."
                  />
                  <MetricCard
                    label="Bank control"
                    value={counters.bankControl}
                    description="Accounts dedicated to settlement and bank control."
                  />
                  <MetricCard
                    label="Active"
                    value={counters.active}
                    description="Accounts currently available in the chart."
                  />
                </div>
              </section>
            ) : null}

            {workspaceMode === "reporting" ? (
              <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Reporting coverage</div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <MetricCard
                    label="Mapped accounts"
                    value={counters.reportingMapped}
                    description="Accounts with report group or subgroup assigned."
                  />

                  <div className="space-y-2">
                    {reportingGroups.length ? (
                      reportingGroups.slice(0, 6).map(([group, count]) => (
                        <div
                          key={group}
                          className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2.5"
                        >
                          <span className="truncate text-[13px] text-gray-700">{group}</span>
                          <span className="shrink-0 text-[13px] font-semibold text-gray-900">{count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-[13px] text-gray-500">
                        No reporting groups found.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </section>

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalMode === "create" ? "New account" : "Edit account"}
        subtitle="Maintain structure, posting rules, and reporting classification from a dedicated side modal."
        contentClassName="pb-4 md:pb-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">Identity</div>
            </div>

            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <Input
                kind="text"
                label="Code"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              />
              <Input
                kind="text"
                label="Name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <div className="sm:col-span-2">
                <Input
                  kind="text"
                  label="Description"
                  value={form.description || ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">Structure</div>
            </div>

            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
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
                  setForm((prev) => ({
                    ...prev,
                    statement_section: items[0]?.value ?? "expense",
                  }))
                }
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel="Select section"
              />

              <SelectDropdown<Option<LedgerNormalBalance>>
                label="Normal balance"
                items={balanceOptions}
                selected={selectedFormBalance}
                onChange={(items: Option<LedgerNormalBalance>[]) =>
                  setForm((prev) => ({
                    ...prev,
                    normal_balance: items[0]?.value ?? "debit",
                  }))
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

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">Posting controls</div>
            </div>

            <div className="space-y-3 px-4 py-4">
              <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-[13px] text-gray-800">
                <Checkbox
                  checked={!!form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                  size="small"
                />
                <span className="font-medium text-gray-900">Active</span>
              </label>

              <label
                className={[
                  "flex items-center gap-3 rounded-md border px-3 py-3 text-[13px]",
                  form.account_type !== "posting"
                    ? "border-gray-100 bg-gray-50 text-gray-400"
                    : "border-gray-200 bg-white text-gray-800",
                ].join(" ")}
              >
                <Checkbox
                  checked={!!form.is_bank_control}
                  disabled={form.account_type !== "posting"}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_bank_control: event.target.checked }))
                  }
                  size="small"
                />
                <span className="font-medium">Bank control</span>
              </label>

              <label
                className={[
                  "flex items-center gap-3 rounded-md border px-3 py-3 text-[13px]",
                  form.account_type !== "posting"
                    ? "border-gray-100 bg-gray-50 text-gray-400"
                    : "border-gray-200 bg-white text-gray-800",
                ].join(" ")}
              >
                <Checkbox
                  checked={!!form.allows_manual_posting}
                  disabled={form.account_type !== "posting"}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      allows_manual_posting: event.target.checked,
                    }))
                  }
                  size="small"
                />
                <span className="font-medium">Manual posting allowed</span>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">Reporting and integrations</div>
            </div>

            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <Input
                kind="text"
                label="Report group"
                value={form.report_group || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, report_group: event.target.value }))
                }
              />
              <Input
                kind="text"
                label="Report subgroup"
                value={form.report_subgroup || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, report_subgroup: event.target.value }))
                }
              />
              <Input
                kind="text"
                label="External reference"
                value={form.external_ref || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, external_ref: event.target.value }))
                }
              />
              <Input
                kind="text"
                label="Currency"
                value={form.currency_code || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currency_code: event.target.value }))
                }
              />

              <div className="sm:col-span-2">
                <label className="mb-2 block text-[12px] font-semibold text-gray-700">
                  Metadata JSON
                </label>
                <textarea
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                  className="min-h-[180px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 font-mono text-sm text-gray-900 outline-none focus:border-gray-500"
                />
              </div>
            </div>
          </section>

          <div>
            {modalError ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {modalError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? "Saving..." : modalMode === "create" ? "Create account" : "Save changes"}
              </Button>
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
    </>
  );
};

export default AccountingWorkspace;
