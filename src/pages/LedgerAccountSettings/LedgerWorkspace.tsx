import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Snackbar from "@/shared/ui/Snackbar";
import { Select } from "src/shared/ui/Select";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import LedgerAccountModal from "./components/LedgerAccountModal";
import LedgerTreePanel from "./components/LedgerTreePanel";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";
import type {
  AddLedgerAccountRequest,
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

const sortAccounts = (a: LedgerAccount, b: LedgerAccount) => {
  const ac = String(a.code || "");
  const bc = String(b.code || "");

  if (ac && bc && ac !== bc) {
    return ac.localeCompare(bc, undefined, { numeric: true });
  }

  return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    numeric: true,
  });
};

const sectionLabel = (value: LedgerStatementSection) => {
  switch (value) {
    case "asset":
      return "Asset";
    case "liability":
      return "Liability";
    case "equity":
      return "Equity";
    case "income":
      return "Income";
    case "expense":
      return "Expense";
    case "off_balance":
      return "Off balance";
    case "statistical":
      return "Statistical";
    default:
      return "—";
  }
};

const SurfaceTab = ({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
      active
        ? "border-gray-900 text-gray-900"
        : "border-gray-200 text-gray-900 hover:bg-gray-50",
    ].join(" ")}
  >
    <div className="flex items-center gap-2">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold leading-5">{title}</div>
        <div className="mt-0.5 text-[11px] leading-4 text-gray-600">{description}</div>
      </div>
    </div>
  </button>
);

const SectionMetric = ({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) => {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900 select-text">{value}</span>
      </div>

      <div className="h-2 rounded-full border border-gray-200 bg-white">
        <div className="h-full rounded-full bg-gray-900" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const DataTable = ({
  title,
  description,
  columns,
  rows,
  emptyLabel,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyLabel: string;
}) => (
  <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <h2 className="text-[14px] font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-[12px] text-gray-600">{description}</p>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-600">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-gray-100">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-[13px] text-gray-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-gray-500">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const LedgerWorkspace: React.FC<Props> = ({ ledgerProfile, title, description }) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation("ledgerAccounts");
  const t = React.useCallback(
    (key: string, defaultValue: string) =>
      String(
        i18n.t(key, {
          ns: "ledgerAccounts",
          lng: ledgerProfile.language_code || i18n.resolvedLanguage || i18n.language,
          defaultValue,
        })
      ),
    [i18n, ledgerProfile.language_code]
  );

  const { isOwner, permissions } = useAuthContext();
  const canView = isOwner || permissions.includes("view_ledger_account");
  const canManage = isOwner || permissions.includes("add_ledger_account");

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
  const [treeViewMode, setTreeViewMode] = useState<"tree" | "list">("tree");
  const [snack, setSnack] = useState<Snack>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);

  const loadAccounts = useCallback(async () => {
    if (!canView) {
      setAccounts([]);
      return;
    }

    try {
      setLoading(true);

      const response = await api.getLedgerAccounts({
        q: appliedSearch || undefined,
        active: appliedActive,
        ...(appliedSection ? { statement_section: appliedSection } : {}),
        ...(appliedAccountType ? { account_type: appliedAccountType } : {}),
        ...(appliedBankControl ? { is_bank_control: appliedBankControl } : {}),
        ...(appliedManualPosting ? { allows_manual_posting: appliedManualPosting } : {}),
      });

      const payload = response?.data;
      const items = Array.isArray(payload?.results)
        ? (payload.results as LedgerAccount[])
        : Array.isArray(payload)
          ? (payload as LedgerAccount[])
          : [];

      setAccounts(items);
    } catch (error) {
      setSnack({
        message:
          (error as Error)?.message ||
          t("workspace.requestError", "Something went wrong. Please try again."),
        severity: "error",
      });
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    appliedSearch,
    appliedActive,
    appliedSection,
    appliedAccountType,
    appliedBankControl,
    appliedManualPosting,
    t,
  ]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts, refreshKey]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const sectionOptions = useMemo<Option<LedgerStatementSection>[]>(
    () => [
      { label: sectionLabel("asset"), value: "asset" },
      { label: sectionLabel("liability"), value: "liability" },
      { label: sectionLabel("equity"), value: "equity" },
      { label: sectionLabel("income"), value: "income" },
      { label: sectionLabel("expense"), value: "expense" },
      { label: sectionLabel("off_balance"), value: "off_balance" },
      { label: sectionLabel("statistical"), value: "statistical" },
    ],
    []
  );

  const accountTypeOptions = useMemo<Option<LedgerAccountType>[]>(
    () => [
      { label: t("workspace.header", "Header"), value: "header" },
      { label: t("workspace.posting", "Posting"), value: "posting" },
    ],
    [t]
  );

  const yesNoOptions = useMemo<Option<"true" | "false">[]>(
    () => [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
    []
  );

  const parentOptions = useMemo<Option[]>(
    () =>
      accounts
        .filter((item) => item.id !== editing?.id && item.account_type === "header")
        .sort(sortAccounts)
        .map((item) => ({
          label: `${item.code || "—"} — ${item.name || item.id}`,
          value: item.id,
        })),
    [editing?.id, accounts]
  );

  const counters = useMemo(() => {
    const items = accounts;
    const postingCount = items.filter((item) => item.account_type === "posting").length;
    const headerCount = items.filter((item) => item.account_type === "header").length;
    const activeCount = items.filter((item) => item.is_active).length;
    const bankControlCount = items.filter((item) => item.is_bank_control).length;
    const manualCount = items.filter((item) => item.allows_manual_posting).length;

    return {
      total: items.length,
      postingCount,
      headerCount,
      activeCount,
      bankControlCount,
      manualCount,
      maxDepth: items.reduce((max, item) => Math.max(max, Number(item.depth || 0)), 0),
      rootCount: items.filter((item) => !item.parent_id).length,
      bySection: {
        asset: items.filter((item) => item.statement_section === "asset").length,
        liability: items.filter((item) => item.statement_section === "liability").length,
        equity: items.filter((item) => item.statement_section === "equity").length,
        income: items.filter((item) => item.statement_section === "income").length,
        expense: items.filter((item) => item.statement_section === "expense").length,
        off_balance: items.filter((item) => item.statement_section === "off_balance").length,
        statistical: items.filter((item) => item.statement_section === "statistical").length,
      },
    };
  }, [accounts]);

  const managementViews = useMemo(
    () => [
      {
        id: "overview" as const,
        title: t("workspace.managementOverviewTitle", "Overview"),
        description: t(
          "workspace.managementOverviewDescription",
          "High-level account health and chart coverage."
        ),
      },
      {
        id: "structure" as const,
        title: t("workspace.managementStructureTitle", "Structure"),
        description: t(
          "workspace.managementStructureDescription",
          "Hierarchy, depth, and parent-child organization."
        ),
      },
      {
        id: "posting-controls" as const,
        title: t("workspace.managementPostingControlsTitle", "Posting controls"),
        description: t(
          "workspace.managementPostingControlsDescription",
          "Posting scope, manual posting policy, and operating discipline."
        ),
      },
      {
        id: "bank-control" as const,
        title: t("workspace.managementBankControlTitle", "Bank control"),
        description: t(
          "workspace.managementBankControlDescription",
          "Accounts dedicated to bank balance control and settlement logic."
        ),
      },
      {
        id: "reporting" as const,
        title: t("workspace.managementReportingTitle", "Reporting"),
        description: t(
          "workspace.managementReportingDescription",
          "Report groups, subgroups, and reporting coverage."
        ),
      },
    ],
    [t]
  );

  const reportingGroups = useMemo(() => {
    const grouped = accounts.reduce<Record<string, number>>((acc, item) => {
      const key = item.report_group || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [accounts]);

  const overviewRows = useMemo(
    () =>
      [...accounts]
        .sort(sortAccounts)
        .slice(0, 8)
        .map((item) => [
          <span className="font-medium text-gray-900" key="code">
            {item.code || "—"}
          </span>,
          item.name || "—",
          item.account_type,
          sectionLabel(item.statement_section),
          [item.report_group, item.report_subgroup].filter(Boolean).join(" / ") || "—",
        ]),
    [accounts]
  );

  const postingRows = useMemo(
    () =>
      accounts
        .filter((item) => item.account_type === "posting")
        .sort(sortAccounts)
        .map((item) => [
          <span className="font-medium text-gray-900" key="code">
            {item.code || "—"}
          </span>,
          item.name || "—",
          item.allows_manual_posting
            ? t("workspace.manualAllowed", "Manual posting")
            : t("workspace.manualBlocked", "No manual posting"),
          item.is_bank_control
            ? t("workspace.bankControlYes", "Bank control")
            : t("workspace.bankControlNo", "Not bank control"),
          item.is_active ? t("modal.active", "Active") : t("workspace.inactive", "Inactive"),
        ]),
    [accounts, t]
  );

  const bankRows = useMemo(
    () =>
      accounts
        .filter((item) => item.is_bank_control)
        .sort(sortAccounts)
        .map((item) => [
          <span className="font-medium text-gray-900" key="code">
            {item.code || "—"}
          </span>,
          item.name || "—",
          item.account_type,
          item.allows_manual_posting
            ? t("workspace.manualAllowed", "Manual posting")
            : t("workspace.manualBlocked", "No manual posting"),
          item.is_active ? t("modal.active", "Active") : t("workspace.inactive", "Inactive"),
        ]),
    [accounts, t]
  );

  const reportingRows = useMemo(
    () =>
      reportingGroups.map(([group, count]) => [
        <span className="font-medium text-gray-900" key="group">
          {group}
        </span>,
        <span className="select-text" key="count">
          {count}
        </span>,
      ]),
    [reportingGroups]
  );

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

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const refreshAccounts = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const submit = async (payload: AddLedgerAccountRequest) => {
    try {
      setSaving(true);

      if (editing) {
        await api.editLedgerAccount(editing.id, payload);
        setSnack({
          message: t("workspace.updatedSuccess", "Account updated."),
          severity: "success",
        });
      } else {
        await api.addLedgerAccount(payload);
        setSnack({
          message: t("workspace.createdSuccess", "Account created."),
          severity: "success",
        });
      }

      setModalOpen(false);
      setEditing(null);
      refreshAccounts();
    } catch (error) {
      setSnack({
        message:
          (error as Error)?.message ||
          t("workspace.requestError", "Something went wrong. Please try again."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = async (account: LedgerAccount) => {
    const confirmed = window.confirm(
      `${t("workspace.delete", "Delete")} ${account.code || account.name || "account"}?`
    );
    if (!confirmed) return;

    try {
      await api.deleteLedgerAccount(account.id);
      setSnack({
        message: t("workspace.deletedSuccess", "Account deleted."),
        severity: "success",
      });
      refreshAccounts();
    } catch (error) {
      setSnack({
        message:
          (error as Error)?.message ||
          t("workspace.requestError", "Something went wrong. Please try again."),
        severity: "error",
      });
    }
  };

  const requestDeleteAll = async () => {
    const confirmed = window.confirm(
      t("workspace.deleteAllConfirm", "Delete all ledger accounts?")
    );
    if (!confirmed) return;

    try {
      setDeletingAll(true);
      await api.deleteAllLedgerAccounts();
      setSnack({
        message: t("workspace.deleteAllSuccess", "All ledger accounts deleted."),
        severity: "success",
      });
      navigate("/settings/register/ledger-accounts", { replace: true });
    } catch (error) {
      setSnack({
        message:
          (error as Error)?.message ||
          t("workspace.deleteAllError", "Could not delete all ledger accounts."),
        severity: "error",
      });
    } finally {
      setDeletingAll(false);
      setMenuOpen(false);
    }
  };

  if (!canView) return <PageSkeleton rows={8} />;

  const showSyncBadge = loading && accounts.length > 0;

  return (
    <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      {loading && accounts.length === 0 ? <TopProgress active variant="top" topOffset={64} /> : null}

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700">
                LA
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">
                      {t("workspace.pageLabel", "Settings")}
                    </div>
                    <h1 className="text-[16px] font-semibold leading-snug text-gray-900">
                      {title || t("workspace.titleOverview", "Chart of accounts workspace")}
                    </h1>
                  </div>

                  {showSyncBadge ? (
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px]">
                      {t("workspace.syncing", "Syncing")}
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 max-w-3xl text-[13px] leading-6 text-gray-600">
                  {description ||
                    t(
                      "workspace.descriptionOverview",
                      "Manage the chart of accounts used by your organization, keeping the structure clean, auditable, and ready for reporting."
                    )}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row" ref={menuRef}>
              <Button type="button" onClick={openCreate} disabled={!canManage}>
                {t("workspace.addAccount", "Add account")}
              </Button>

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  disabled={!canManage}
                >
                  {t("workspace.moreActions", "More actions")}
                </Button>

                {menuOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => void requestDeleteAll()}
                      disabled={deletingAll}
                      className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      {t("workspace.deleteAll", "Delete all accounts")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-2 lg:grid-cols-5">
          {managementViews.map((item) => (
            <SurfaceTab
              key={item.id}
              active={managementView === item.id}
              title={item.title}
              description={item.description}
              onClick={() => setManagementView(item.id)}
            />
          ))}
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">
              {t("workspace.filtersTitle", "Filters")}
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <p className="text-[12px] text-gray-600">
              {t(
                "workspace.filtersSubtitle",
                "Refine the chart before reviewing structure, posting controls, or reporting coverage."
              )}
            </p>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <Input
                kind="text"
                label={t("workspace.searchLabel", "Search")}
                placeholder={t(
                  "workspace.searchPlaceholder",
                  "Search by code, name, description or external reference"
                )}
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
              />

              <Select<Option<LedgerStatementSection>>
                label={t("workspace.sectionLabel", "Statement section")}
                items={sectionOptions}
                selected={draftSection ? sectionOptions.filter((item) => item.value === draftSection) : []}
                onChange={(items) => setDraftSection(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel={t("modal.selectSection", "Select section")}
              />

              <Select<Option<LedgerAccountType>>
                label={t("workspace.accountTypeLabel", "Account type")}
                items={accountTypeOptions}
                selected={
                  draftAccountType
                    ? accountTypeOptions.filter((item) => item.value === draftAccountType)
                    : []
                }
                onChange={(items) => setDraftAccountType(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel={t("modal.selectAccountType", "Select account type")}
              />

              <Select<Option<"true" | "false">>
                label={t("workspace.bankControlLabel", "Bank control")}
                items={yesNoOptions}
                selected={
                  draftBankControl ? yesNoOptions.filter((item) => item.value === draftBankControl) : []
                }
                onChange={(items) => setDraftBankControl(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel={t("workspace.bankControlLabel", "Bank control")}
              />

              <Select<Option<"true" | "false">>
                label={t("workspace.manualPostingLabel", "Manual posting")}
                items={yesNoOptions}
                selected={
                  draftManualPosting
                    ? yesNoOptions.filter((item) => item.value === draftManualPosting)
                    : []
                }
                onChange={(items) => setDraftManualPosting(items[0]?.value ?? "")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel={t("workspace.manualPostingLabel", "Manual posting")}
              />

              <Select<Option<"true" | "false">>
                label={t("workspace.activeLabel", "Active")}
                items={yesNoOptions}
                selected={yesNoOptions.filter((item) => item.value === draftActive)}
                onChange={(items) => setDraftActive(items[0]?.value ?? "true")}
                getItemKey={optionKey}
                getItemLabel={optionLabel}
                singleSelect
                hideCheckboxes
                buttonLabel={t("workspace.activeLabel", "Active")}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={clearFilters}>
                {t("workspace.clearFilters", "Clear")}
              </Button>
              <Button type="button" onClick={applyFilters}>
                {t("workspace.applyFilters", "Apply filters")}
              </Button>
            </div>
          </div>
        </section>

        {managementView === "overview" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <LedgerTreePanel
              items={accounts}
              languageCode={ledgerProfile.language_code}
              editable={canManage}
              viewMode={treeViewMode}
              onViewModeChange={setTreeViewMode}
              onEdit={(account) => {
                setEditing(account);
                setModalOpen(true);
              }}
              onDelete={(account) => void requestDelete(account)}
            />

            <aside className="space-y-4">
              <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-gray-900">
                    {t("workspace.sectionDistributionTitle", "Section distribution")}
                  </h2>
                  <p className="mt-1 text-[12px] text-gray-600">
                    {t(
                      "workspace.sectionDistributionDescription",
                      "Current allocation of visible accounts by statement section."
                    )}
                  </p>
                </div>

                <div className="space-y-4 p-4">
                  <SectionMetric label={sectionLabel("asset")} value={counters.bySection.asset} total={counters.total} />
                  <SectionMetric label={sectionLabel("liability")} value={counters.bySection.liability} total={counters.total} />
                  <SectionMetric label={sectionLabel("equity")} value={counters.bySection.equity} total={counters.total} />
                  <SectionMetric label={sectionLabel("income")} value={counters.bySection.income} total={counters.total} />
                  <SectionMetric label={sectionLabel("expense")} value={counters.bySection.expense} total={counters.total} />
                  <SectionMetric label={sectionLabel("off_balance")} value={counters.bySection.off_balance} total={counters.total} />
                  <SectionMetric label={sectionLabel("statistical")} value={counters.bySection.statistical} total={counters.total} />
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {managementView === "structure" ? (
          <section className="space-y-4">
            <LedgerTreePanel
              items={accounts}
              languageCode={ledgerProfile.language_code}
              editable={canManage}
              viewMode={treeViewMode}
              onViewModeChange={setTreeViewMode}
              onEdit={(account) => {
                setEditing(account);
                setModalOpen(true);
              }}
              onDelete={(account) => void requestDelete(account)}
            />
          </section>
        ) : null}

        {managementView === "posting-controls" ? (
          <section className="space-y-4">
            <DataTable
              title={t("workspace.managementPostingControlsTitle", "Posting controls")}
              description={t(
                "workspace.managementPostingControlsDescription",
                "Posting scope, manual posting policy, and operating discipline."
              )}
              columns={[
                t("modal.code", "Code"),
                t("modal.name", "Name"),
                t("workspace.manualPostingLabel", "Manual posting"),
                t("workspace.bankControlLabel", "Bank control"),
                t("workspace.activeLabel", "Active"),
              ]}
              rows={postingRows}
              emptyLabel={t("workspace.emptyTitle", "No accounts found")}
            />
          </section>
        ) : null}

        {managementView === "bank-control" ? (
          <section className="space-y-4">
            <DataTable
              title={t("workspace.managementBankControlTitle", "Bank control")}
              description={t(
                "workspace.managementBankControlDescription",
                "Accounts dedicated to bank balance control and settlement logic."
              )}
              columns={[
                t("modal.code", "Code"),
                t("modal.name", "Name"),
                t("modal.accountType", "Account type"),
                t("workspace.manualPostingLabel", "Manual posting"),
                t("workspace.activeLabel", "Active"),
              ]}
              rows={bankRows}
              emptyLabel={t("workspace.emptyTitle", "No accounts found")}
            />
          </section>
        ) : null}

        {managementView === "reporting" ? (
          <section className="space-y-4">
            <DataTable
              title={t("workspace.managementReportingTitle", "Reporting")}
              description={t(
                "workspace.managementReportingDescription",
                "Report groups, subgroups, and reporting coverage."
              )}
              columns={[
                t("modal.reportGroup", "Report group"),
                t("workspace.summaryTotal", "Total accounts"),
              ]}
              rows={reportingRows}
              emptyLabel={t("workspace.emptyTitle", "No accounts found")}
            />

            <DataTable
              title={t("workspace.reportingSampleTitle", "Mapped accounts sample")}
              description={t(
                "workspace.reportingSampleDescription",
                "Quick sample of currently visible accounts and their reporting assignment."
              )}
              columns={[
                t("modal.code", "Code"),
                t("modal.name", "Name"),
                t("modal.accountType", "Account type"),
                t("modal.statementSection", "Statement section"),
                t("modal.reportGroup", "Report group"),
              ]}
              rows={overviewRows}
              emptyLabel={t("workspace.emptyTitle", "No accounts found")}
            />
          </section>
        ) : null}
      </div>

      <LedgerAccountModal
        isOpen={modalOpen}
        mode={editing ? "edit" : "create"}
        initial={editing}
        parentOptions={parentOptions}
        languageCode={ledgerProfile.language_code}
        busy={saving}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
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