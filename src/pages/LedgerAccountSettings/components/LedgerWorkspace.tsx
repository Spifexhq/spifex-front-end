// src\pages\LedgerAccountSettings\components\LedgerWorkspace.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Snackbar from "@/shared/ui/Snackbar";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import LedgerAccountModal from "../LedgerAccountModal";
import { getLedgerMessages } from "../messages";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";
import type {
  AddLedgerAccountRequest,
  GetLedgerAccountsResponse,
  LedgerAccount,
  LedgerAccountType,
  LedgerStatementSection,
} from "@/models/settings/ledgerAccounts";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type PaginationMeta = {
  pagination?: { next?: string | null };
};

type Option<T extends string = string> = {
  label: string;
  value: T;
};

type ManagementView =
  | "overview"
  | "structure"
  | "posting-controls"
  | "bank-control"
  | "reporting";

type Props = {
  ledgerProfile: OrgLedgerProfileResponse;
  title?: string;
  description?: string;
};

const optionKey = <T extends string>(item: Option<T>) => item.value;
const optionLabel = <T extends string>(item: Option<T>) => item.label;

const sectionLabelMap: Record<LedgerStatementSection, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
  off_balance: "Off balance",
  statistical: "Statistical",
};

const managementViewItems: Array<{
  id: ManagementView;
  title: string;
  description: string;
}> = [
  {
    id: "overview",
    title: "Overview",
    description: "High-level account health and accounting structure coverage.",
  },
  {
    id: "structure",
    title: "Structure",
    description: "Parent-child hierarchy, depth, section distribution, and posting coverage.",
  },
  {
    id: "posting-controls",
    title: "Posting controls",
    description: "Posting accounts, manual-posting policy, and operational selection discipline.",
  },
  {
    id: "bank-control",
    title: "Bank control",
    description: "Accounts dedicated to bank balance control and settlement integration.",
  },
  {
    id: "reporting",
    title: "Reporting",
    description: "Report groups, subgroups, and statement alignment for financial reporting.",
  },
];

function MetricBox({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-2.5">
        <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      </div>
      <div className="px-4 py-4">
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
      {label}: {value}
    </span>
  );
}

function SectionBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2 rounded-full border border-gray-200 bg-white">
        <div className="h-full rounded-full bg-gray-900" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ViewTab({
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
        "rounded-2xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className={["mt-1 text-sm", active ? "text-gray-100" : "text-gray-600"].join(" ")}>
        {description}
      </div>
    </button>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 text-emerald-700"
      : tone === "warning"
      ? "border-amber-200 text-amber-700"
      : "border-gray-200 text-gray-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function AccountTable({
  items,
  onEdit,
  onDelete,
  canManage,
}: {
  items: LedgerAccount[];
  onEdit: (acc: LedgerAccount) => void;
  onDelete: (acc: LedgerAccount) => void;
  canManage: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead className="bg-white">
          <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Balance</th>
            <th className="px-4 py-3">Flags</th>
            <th className="px-4 py-3">Report group</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((acc) => (
            <tr key={acc.id} className="border-b border-gray-100 last:border-b-0">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{acc.code || "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-900">
                <div className="flex flex-col gap-1">
                  <span>{acc.name}</span>
                  {acc.description ? (
                    <span className="text-xs text-gray-500">{acc.description}</span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{acc.account_type}</td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {sectionLabelMap[acc.statement_section] || acc.statement_section}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">{acc.normal_balance}</td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <div className="flex flex-wrap gap-1.5">
                  {acc.is_bank_control ? <Badge tone="warning">bank control</Badge> : null}
                  {acc.allows_manual_posting ? <Badge tone="success">manual posting</Badge> : null}
                  {!acc.is_active ? <Badge>inactive</Badge> : null}
                  {acc.is_system ? <Badge>system</Badge> : null}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {[acc.report_group, acc.report_subgroup].filter(Boolean).join(" / ") || "—"}
              </td>
              <td className="px-4 py-3">
                {canManage ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(acc)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    {!acc.is_system ? (
                      <button
                        type="button"
                        onClick={() => onDelete(acc)}
                        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}

          {items.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                No accounts found for this view.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function StructurePanel({ items }: { items: LedgerAccount[] }) {
  const roots = useMemo(() => items.filter((x) => !x.parent_id), [items]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Structure view</h3>
        <p className="mt-1 text-sm text-gray-600">
          Hierarchy-focused view for parent-child organization and posting coverage.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricBox
            label="Root accounts"
            value={roots.length}
            description="Top-level nodes of the chart of accounts."
          />
          <MetricBox
            label="Max depth"
            value={items.reduce((max, x) => Math.max(max, Number(x.depth || 0)), 0)}
            description="Deepest level currently used in the hierarchy."
          />
          <MetricBox
            label="Headers vs posting"
            value={`${items.filter((x) => x.account_type === "header").length} / ${
              items.filter((x) => x.account_type === "posting").length
            }`}
            description="Distribution between structural and posting accounts."
          />
        </div>

        <AccountTable items={items} onEdit={() => {}} onDelete={() => {}} canManage={false} />
      </div>
    </div>
  );
}

function PostingControlsPanel({ items }: { items: LedgerAccount[] }) {
  const posting = items.filter((x) => x.account_type === "posting");
  const manual = posting.filter((x) => x.allows_manual_posting);
  const blocked = posting.filter((x) => !x.allows_manual_posting);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Posting controls</h3>
        <p className="mt-1 text-sm text-gray-600">
          Technical view for accounts that can receive journal lines and how manual posting is governed.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricBox
            label="Posting accounts"
            value={posting.length}
            description="Accounts that can receive entries or journal lines."
          />
          <MetricBox
            label="Manual enabled"
            value={manual.length}
            description="Posting accounts available for direct manual accounting operations."
          />
          <MetricBox
            label="Manual blocked"
            value={blocked.length}
            description="Posting accounts that should be fed only through controlled flows."
          />
        </div>

        <AccountTable items={posting} onEdit={() => {}} onDelete={() => {}} canManage={false} />
      </div>
    </div>
  );
}

function BankControlPanel({ items }: { items: LedgerAccount[] }) {
  const bankControl = items.filter((x) => x.is_bank_control);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Bank control</h3>
        <p className="mt-1 text-sm text-gray-600">
          Accounts dedicated to bank-balance control and settlement/transfer accounting flows.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricBox
            label="Bank-control accounts"
            value={bankControl.length}
            description="Accounts reserved for bank control and reconciled cash."
          />
          <MetricBox
            label="Manual enabled"
            value={bankControl.filter((x) => x.allows_manual_posting).length}
            description="Bank-control accounts that still allow direct manual posting."
          />
          <MetricBox
            label="Active"
            value={bankControl.filter((x) => x.is_active).length}
            description="Bank-control accounts currently active."
          />
        </div>

        <AccountTable items={bankControl} onEdit={() => {}} onDelete={() => {}} canManage={false} />
      </div>
    </div>
  );
}

function ReportingPanel({ items }: { items: LedgerAccount[] }) {
  const grouped = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.report_group || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Reporting view</h3>
        <p className="mt-1 text-sm text-gray-600">
          Technical classification view for statement layout, report groups, and subgroup coverage.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricBox
            label="Report groups"
            value={rows.length}
            description="Number of distinct report groups configured."
          />
          <MetricBox
            label="Assigned subgroup rows"
            value={items.filter((x) => !!x.report_subgroup).length}
            description="Accounts that already have subgroup detail."
          />
          <MetricBox
            label="Unassigned"
            value={items.filter((x) => !x.report_group).length}
            description="Accounts still missing top-level reporting classification."
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Report group</th>
                <th className="px-4 py-3">Accounts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([group, count]) => (
                <tr key={group} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-900">{group}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{count}</td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-sm text-gray-500">
                    No reporting groups found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const LedgerWorkspace: React.FC<Props> = ({ ledgerProfile, title, description }) => {
  const navigate = useNavigate();
  const { isOwner, permissions } = useAuthContext();
  const messages = getLedgerMessages(ledgerProfile.language_code);

  const canView = isOwner || permissions.includes("view_ledger_account");
  const canAdd = isOwner || permissions.includes("add_ledger_account");

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

  const [managementView, setManagementView] = useState<ManagementView>("overview");
  const [snack, setSnack] = useState<Snack>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerAccount | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      })) as {
        data: GetLedgerAccountsResponse;
        meta?: PaginationMeta;
      };

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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const parentOptions = useMemo<Option[]>(
    () =>
      pager.items
        .filter((x) => x.id !== editing?.id && x.account_type === "header")
        .sort((a, b) => {
          const ac = String(a.code || "");
          const bc = String(b.code || "");
          if (ac && bc && ac !== bc) return ac.localeCompare(bc, undefined, { numeric: true });
          return String(a.name || "").localeCompare(String(b.name || ""));
        })
        .map((x) => ({
          label: `${x.code || "—"} — ${x.name || x.code || x.id}`,
          value: x.id,
        })),
    [pager.items, editing?.id]
  );

  const sectionOptions = useMemo<Option<LedgerStatementSection>[]>(
    () => [
      { label: "Asset", value: "asset" },
      { label: "Liability", value: "liability" },
      { label: "Equity", value: "equity" },
      { label: "Income", value: "income" },
      { label: "Expense", value: "expense" },
      { label: "Off balance", value: "off_balance" },
      { label: "Statistical", value: "statistical" },
    ],
    []
  );

  const accountTypeOptions = useMemo<Option<LedgerAccountType>[]>(
    () => [
      { label: messages.modal.header, value: "header" },
      { label: messages.modal.posting, value: "posting" },
    ],
    [messages]
  );

  const yesNoOptions = useMemo<Option<"true" | "false">[]>(
    () => [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
    []
  );

  const counters = useMemo(() => {
    const items = pager.items;
    const postingCount = items.filter((x) => x.account_type === "posting").length;
    const activeCount = items.filter((x) => x.is_active).length;
    const bankControlCount = items.filter((x) => x.is_bank_control).length;
    const manualCount = items.filter((x) => x.allows_manual_posting).length;

    return {
      total: items.length,
      activeCount,
      postingCount,
      bankControlCount,
      manualCount,
      headerCount: items.filter((x) => x.account_type === "header").length,
      maxDepth: items.reduce((max, x) => Math.max(max, Number(x.depth || 0)), 0),
      rootCount: items.filter((x) => !x.parent_id).length,
      bySection: {
        asset: items.filter((x) => x.statement_section === "asset").length,
        liability: items.filter((x) => x.statement_section === "liability").length,
        equity: items.filter((x) => x.statement_section === "equity").length,
        income: items.filter((x) => x.statement_section === "income").length,
        expense: items.filter((x) => x.statement_section === "expense").length,
        off_balance: items.filter((x) => x.statement_section === "off_balance").length,
        statistical: items.filter((x) => x.statement_section === "statistical").length,
      },
    };
  }, [pager.items]);

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

  const submit = async (payload: AddLedgerAccountRequest) => {
    try {
      if (editing) {
        await api.editLedgerAccount(editing.id, payload);
        setSnack({ message: messages.workspace.updatedSuccess, severity: "success" });
      } else {
        await api.addLedgerAccount(payload);
        setSnack({ message: messages.workspace.createdSuccess, severity: "success" });
      }

      setModalOpen(false);
      setEditing(null);
      await pager.refresh();
    } catch (e) {
      setSnack({
        message: (e as Error)?.message || messages.workspace.requestError,
        severity: "error",
      });
    }
  };

  const requestDelete = async (acc: LedgerAccount) => {
    const ok = window.confirm(`${messages.workspace.delete} ${acc.code || acc.name}?`);
    if (!ok) return;

    try {
      await api.deleteLedgerAccount(acc.id);
      setSnack({ message: messages.workspace.deletedSuccess, severity: "success" });
      await pager.refresh();
    } catch (e) {
      setSnack({
        message: (e as Error)?.message || messages.workspace.requestError,
        severity: "error",
      });
    }
  };

  const requestDeleteAll = async () => {
    const ok = window.confirm(messages.workspace.deleteAllConfirm);
    if (!ok) return;

    try {
      setDeletingAll(true);
      await api.deleteAllLedgerAccounts();
      setSnack({ message: messages.workspace.deleteAllSuccess, severity: "success" });
      navigate("/settings/register/ledger-accounts", { replace: true });
    } catch (e) {
      setSnack({
        message: (e as Error)?.message || messages.workspace.deleteAllError,
        severity: "error",
      });
    } finally {
      setDeletingAll(false);
      setMenuOpen(false);
    }
  };

  const viewFilteredItems = useMemo(() => {
    switch (managementView) {
      case "posting-controls":
        return pager.items.filter((x) => x.account_type === "posting");
      case "bank-control":
        return pager.items.filter((x) => x.is_bank_control);
      case "reporting":
        return pager.items.filter((x) => !!x.report_group || !!x.report_subgroup);
      case "structure":
      case "overview":
      default:
        return pager.items;
    }
  }, [managementView, pager.items]);

  if (!canView) return <PageSkeleton rows={8} />;

  return (
    <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      {pager.loading && pager.items.length === 0 ? (
        <TopProgress active variant="top" topOffset={64} />
      ) : null}

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[1.45fr_0.9fr]">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-600">
                {ledgerProfile.mode === "personal"
                  ? messages.workspace.personalLedger
                  : messages.workspace.organizationalLedger}
              </div>
              <h1 className="mt-1 text-[16px] font-semibold text-gray-900 sm:text-[18px]">
                {title || messages.workspace.titleOverview}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                {description || messages.workspace.descriptionOverview}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <FilterChip
                  label={messages.workspace.profileMode}
                  value={
                    ledgerProfile.mode === "personal"
                      ? messages.setup.personal
                      : messages.setup.organizational
                  }
                />
                <FilterChip
                  label={messages.workspace.profileTemplate}
                  value={ledgerProfile.default_template || "default"}
                />
                <FilterChip
                  label={messages.workspace.profileView}
                  value={
                    ledgerProfile.use_compact_cashflow_view
                      ? messages.workspace.profileCompact
                      : messages.workspace.profileFull
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-700">
                {messages.workspace.controlCenter}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {messages.workspace.controlCenterText}
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  className="border border-gray-900 bg-gray-900 text-white hover:bg-black"
                  onClick={() => setModalOpen(true)}
                  disabled={!canAdd}
                >
                  {messages.workspace.addAccount}
                </Button>

                <div className="relative" ref={menuRef}>
                  <Button variant="outline" onClick={() => setMenuOpen((x) => !x)} className="w-full">
                    {messages.workspace.moreActions}
                  </Button>

                  {menuOpen ? (
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2">
                      <button
                        type="button"
                        onClick={() => void requestDeleteAll()}
                        disabled={deletingAll}
                        className="w-full rounded-xl border border-transparent px-3 py-2 text-left text-sm font-medium text-red-600 hover:border-red-200 hover:bg-red-50"
                      >
                        {messages.workspace.deleteAll}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-5">
          {managementViewItems.map((item) => (
            <ViewTab
              key={item.id}
              active={managementView === item.id}
              title={item.title}
              description={item.description}
              onClick={() => setManagementView(item.id)}
            />
          ))}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]">
            <Input
              kind="text"
              label={messages.workspace.searchLabel}
              placeholder={messages.workspace.searchPlaceholder}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />

            <SelectDropdown<Option<LedgerStatementSection>>
              label={messages.workspace.sectionLabel}
              items={sectionOptions}
              selected={draftSection ? sectionOptions.filter((x) => x.value === draftSection) : []}
              onChange={(items) => setDraftSection(items[0]?.value ?? "")}
              getItemKey={optionKey}
              getItemLabel={optionLabel}
              singleSelect
              hideCheckboxes
              buttonLabel={messages.modal.selectSection}
            />

            <SelectDropdown<Option<LedgerAccountType>>
              label={messages.workspace.accountTypeLabel}
              items={accountTypeOptions}
              selected={
                draftAccountType ? accountTypeOptions.filter((x) => x.value === draftAccountType) : []
              }
              onChange={(items) => setDraftAccountType(items[0]?.value ?? "")}
              getItemKey={optionKey}
              getItemLabel={optionLabel}
              singleSelect
              hideCheckboxes
              buttonLabel={messages.modal.selectAccountType}
            />

            <SelectDropdown<Option<"true" | "false">>
              label={messages.workspace.bankControlLabel}
              items={yesNoOptions}
              selected={draftBankControl ? yesNoOptions.filter((x) => x.value === draftBankControl) : []}
              onChange={(items) => setDraftBankControl(items[0]?.value ?? "")}
              getItemKey={optionKey}
              getItemLabel={optionLabel}
              singleSelect
              hideCheckboxes
              buttonLabel={messages.workspace.bankControlLabel}
            />

            <SelectDropdown<Option<"true" | "false">>
              label={messages.workspace.manualPostingLabel}
              items={yesNoOptions}
              selected={
                draftManualPosting ? yesNoOptions.filter((x) => x.value === draftManualPosting) : []
              }
              onChange={(items) => setDraftManualPosting(items[0]?.value ?? "")}
              getItemKey={optionKey}
              getItemLabel={optionLabel}
              singleSelect
              hideCheckboxes
              buttonLabel={messages.workspace.manualPostingLabel}
            />

            <SelectDropdown<Option<"true" | "false">>
              label={messages.workspace.activeLabel}
              items={yesNoOptions}
              selected={yesNoOptions.filter((x) => x.value === draftActive)}
              onChange={(items) => setDraftActive(items[0]?.value ?? "true")}
              getItemKey={optionKey}
              getItemLabel={optionLabel}
              singleSelect
              hideCheckboxes
              buttonLabel={messages.workspace.activeLabel}
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={clearFilters}>
              {messages.workspace.clearFilters}
            </Button>
            <Button onClick={applyFilters}>{messages.workspace.applyFilters}</Button>
          </div>
        </section>

        {managementView === "overview" ? (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricBox
                label={messages.workspace.summaryActive}
                value={counters.activeCount}
                description={messages.workspace.summaryActiveSubtitle}
              />
              <MetricBox
                label={messages.workspace.summaryPosting}
                value={counters.postingCount}
                description={messages.workspace.summaryPostingSubtitle}
              />
              <MetricBox
                label={messages.workspace.summaryBank}
                value={counters.bankControlCount}
                description={messages.workspace.summaryBankSubtitle}
              />
              <MetricBox
                label={messages.workspace.summaryManual}
                value={counters.manualCount}
                description={messages.workspace.summaryManualSubtitle}
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
              <div className="rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">Section distribution</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Technical allocation of accounts by financial statement section.
                  </p>
                </div>
                <div className="space-y-4 p-4">
                  <SectionBar label="Asset" value={counters.bySection.asset} total={counters.total} />
                  <SectionBar label="Liability" value={counters.bySection.liability} total={counters.total} />
                  <SectionBar label="Equity" value={counters.bySection.equity} total={counters.total} />
                  <SectionBar label="Income" value={counters.bySection.income} total={counters.total} />
                  <SectionBar label="Expense" value={counters.bySection.expense} total={counters.total} />
                  <SectionBar
                    label="Off balance"
                    value={counters.bySection.off_balance}
                    total={counters.total}
                  />
                  <SectionBar
                    label="Statistical"
                    value={counters.bySection.statistical}
                    total={counters.total}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">Structure health</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Quick technical indicators for hierarchy quality and reporting readiness.
                  </p>
                </div>
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  <MetricBox label="Total accounts" value={counters.total} description="All accounts loaded in the current filter." />
                  <MetricBox label="Headers" value={counters.headerCount} description="Structure nodes used for grouping." />
                  <MetricBox label="Root accounts" value={counters.rootCount} description="Top-level accounts without parent nodes." />
                  <MetricBox label="Max depth" value={counters.maxDepth} description="Deepest hierarchy level currently used." />
                </div>
              </div>
            </section>

            <AccountTable
              items={viewFilteredItems}
              onEdit={(acc) => {
                setEditing(acc);
                setModalOpen(true);
              }}
              onDelete={requestDelete}
              canManage={canAdd}
            />
          </div>
        ) : null}

        {managementView === "structure" ? <StructurePanel items={viewFilteredItems} /> : null}
        {managementView === "posting-controls" ? <PostingControlsPanel items={viewFilteredItems} /> : null}
        {managementView === "bank-control" ? <BankControlPanel items={viewFilteredItems} /> : null}
        {managementView === "reporting" ? <ReportingPanel items={pager.items} /> : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={pager.prev} disabled={!pager.canPrev}>
            {messages.workspace.prev}
          </Button>
          <Button variant="outline" onClick={pager.next} disabled={!pager.canNext}>
            {messages.workspace.next}
          </Button>
        </div>
      </div>

      <LedgerAccountModal
        isOpen={modalOpen}
        mode={editing ? "edit" : "create"}
        initial={editing}
        parentOptions={parentOptions}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
        messages={messages.modal}
      />

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </main>
  );
};

export default LedgerWorkspace;