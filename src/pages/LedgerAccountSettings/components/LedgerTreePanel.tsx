import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { LedgerAccount } from "@/models/settings/ledgerAccounts";

type ViewMode = "tree" | "list";

type Props = {
  items: LedgerAccount[];
  languageCode?: string | null;
  onEdit?: (acc: LedgerAccount) => void;
  onDelete?: (acc: LedgerAccount) => void;
  editable?: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

type TreeNode = LedgerAccount & { children: TreeNode[] };

const sortAccounts = (a: LedgerAccount, b: LedgerAccount) => {
  const ca = String(a.code || "");
  const cb = String(b.code || "");

  if (ca && cb && ca !== cb) {
    return ca.localeCompare(cb, undefined, { numeric: true });
  }

  return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    numeric: true,
  });
};

const sectionLabel = (value: LedgerAccount["statement_section"]) => {
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

const ToneBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
    {children}
  </span>
);

const CountCard = ({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) => {
  const interactive = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={[
        "rounded-lg border border-gray-200 bg-white px-4 py-3 text-left",
        interactive ? "transition-colors hover:border-gray-300 hover:bg-gray-50" : "cursor-default",
        "disabled:opacity-100",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-2 select-text text-[18px] font-semibold text-gray-900">{value}</div>
    </button>
  );
};

const LedgerTreePanel: React.FC<Props> = ({
  items,
  languageCode,
  onEdit,
  onDelete,
  editable = true,
  viewMode,
  onViewModeChange,
}) => {
  const { i18n } = useTranslation("ledgerAccounts");
  const t = React.useCallback(
    (key: string, defaultValue: string) =>
      String(
        i18n.t(key, {
          ns: "ledgerAccounts",
          lng: languageCode || i18n.resolvedLanguage || i18n.language,
          defaultValue,
        })
      ),
    [i18n, languageCode]
  );

  const sorted = useMemo(() => [...items].sort(sortAccounts), [items]);

  const tree = useMemo<TreeNode[]>(() => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    sorted.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

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
  }, [sorted]);

  const initialOpen = useMemo(() => {
    const next = new Set<string>();
    tree.forEach((root) => next.add(root.id));
    return next;
  }, [tree]);

  const [openIds, setOpenIds] = useState<Set<string>>(initialOpen);

  useEffect(() => {
    setOpenIds(initialOpen);
  }, [initialOpen]);

  const counters = useMemo(() => {
    return {
      total: items.length,
      posting: items.filter((item) => item.account_type === "posting").length,
      headers: items.filter((item) => item.account_type === "header").length,
      bankControl: items.filter((item) => item.is_bank_control).length,
      manualAllowed: items.filter((item) => item.allows_manual_posting).length,
      active: items.filter((item) => item.is_active).length,
    };
  }, [items]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderActions = (acc: LedgerAccount) => {
    if (!editable) return null;

    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          onClick={() => onEdit?.(acc)}
        >
          {t("workspace.edit", "Edit")}
        </button>

        {!acc.is_system ? (
          <button
            type="button"
            className="rounded-md border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
            onClick={() => onDelete?.(acc)}
          >
            {t("workspace.delete", "Delete")}
          </button>
        ) : null}
      </div>
    );
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const isOpen = openIds.has(node.id);
    const typeLabel =
      node.account_type === "header"
        ? t("workspace.header", "Header")
        : t("workspace.posting", "Posting");

    return (
      <div key={node.id} className="border-b border-gray-100 last:border-b-0">
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3" style={{ paddingLeft: `${depth * 18}px` }}>
              <div className="pt-0.5">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 text-[11px] text-gray-700 transition-colors hover:bg-gray-50"
                    aria-label={isOpen ? "Collapse group" : "Expand group"}
                  >
                    {isOpen ? "−" : "+"}
                  </button>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center text-[11px] text-gray-300">
                    •
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {node.code ? (
                    <span className="text-[13px] font-medium text-gray-900">{node.code}</span>
                  ) : null}
                  <p className="min-w-0 text-[13px] font-medium text-gray-900">{node.name || "—"}</p>
                  <ToneBadge>{typeLabel}</ToneBadge>
                  {node.is_system ? (
                    <ToneBadge>{t("workspace.system", "System")}</ToneBadge>
                  ) : null}
                  {node.is_active === false ? (
                    <ToneBadge>{t("workspace.inactive", "Inactive")}</ToneBadge>
                  ) : null}
                  {node.is_bank_control ? (
                    <ToneBadge>{t("workspace.bankControlYes", "Bank control")}</ToneBadge>
                  ) : null}
                  {!node.allows_manual_posting ? (
                    <ToneBadge>{t("workspace.manualBlocked", "No manual posting")}</ToneBadge>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
                  <span>{sectionLabel(node.statement_section)}</span>
                  <span>•</span>
                  <span>{node.normal_balance}</span>
                  {node.report_group ? (
                    <>
                      <span>•</span>
                      <span>{node.report_group}</span>
                    </>
                  ) : null}
                </div>

                {node.report_subgroup || node.path || node.external_ref ? (
                  <p className="mt-1 text-[12px] text-gray-500">
                    {[node.report_subgroup, node.path, node.external_ref].filter(Boolean).join(" • ")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {renderActions(node)}
        </div>

        {hasChildren && isOpen ? (
          <div>{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-gray-900">
                {t("workspace.treeTitle", "Chart of accounts")}
              </h2>
              <p className="mt-1 text-[12px] text-gray-600">
                {t("workspace.treeSubtitle", "A unified view of your accounting structure.")}
              </p>
            </div>

            <div className="inline-flex rounded-md border border-gray-300 bg-white p-1">
              <button
                type="button"
                onClick={() => onViewModeChange("tree")}
                className={[
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  viewMode === "tree"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {t("workspace.viewTree", "Tree")}
              </button>

              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={[
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {t("workspace.viewList", "List")}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <CountCard label={t("workspace.summaryTotal", "Total")} value={counters.total} />
            <CountCard label={t("workspace.summaryPosting", "Posting")} value={counters.posting} />
            <CountCard label={t("workspace.summaryHeaders", "Headers")} value={counters.headers} />
            <CountCard label={t("workspace.summaryBank", "Bank control")} value={counters.bankControl} />
            <CountCard label={t("workspace.manualAllowed", "Manual allowed")} value={counters.manualAllowed} />
            <CountCard label={t("workspace.activeLabel", "Active")} value={counters.active} />
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <h3 className="text-[14px] font-semibold text-gray-900">
            {t("workspace.emptyTitle", "No accounts found")}
          </h3>
          <p className="mt-2 text-[12px] text-gray-600">
            {t("workspace.emptySubtitle", "Try adjusting filters or create the first account.")}
          </p>
        </div>
      ) : viewMode === "tree" ? (
        <div>{tree.map((node) => renderTreeNode(node))}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">{t("modal.code", "Code")}</th>
                <th className="px-4 py-3">{t("modal.name", "Name")}</th>
                <th className="px-4 py-3">{t("modal.accountType", "Account type")}</th>
                <th className="px-4 py-3">{t("modal.statementSection", "Statement section")}</th>
                <th className="px-4 py-3">{t("modal.normalBalance", "Normal balance")}</th>
                <th className="px-4 py-3">{t("workspace.bankControlLabel", "Bank control")}</th>
                <th className="px-4 py-3">{t("workspace.manualPostingLabel", "Manual posting")}</th>
                <th className="px-4 py-3 text-right">{t("workspace.moreActions", "More actions")}</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((acc) => (
                <tr key={acc.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-[13px] font-medium text-gray-900">
                    {acc.code || "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-900">{acc.name || "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-700">{acc.account_type}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-700">
                    {sectionLabel(acc.statement_section)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-700">{acc.normal_balance}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-700">
                    {acc.is_bank_control
                      ? t("workspace.bankControlYes", "Bank control")
                      : t("workspace.bankControlNo", "Not bank control")}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-700">
                    {acc.allows_manual_posting
                      ? t("workspace.manualAllowed", "Manual posting")
                      : t("workspace.manualBlocked", "No manual posting")}
                  </td>
                  <td className="px-4 py-3 text-right">{renderActions(acc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default LedgerTreePanel;