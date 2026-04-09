// src\pages\LedgerAccountSettings\components\LedgerTreePanel.tsx
import React, { useMemo, useState } from 'react';
import type { LedgerAccount } from '@/models/settings/ledgerAccounts';

type ViewMode = 'tree' | 'list';

type Messages = {
  treeTitle: string;
  treeSubtitle: string;
  viewTree: string;
  viewList: string;
  edit: string;
  delete: string;
  inactive: string;
  system: string;
  header: string;
  posting: string;
  bankControlYes: string;
  bankControlNo: string;
  manualAllowed: string;
  manualBlocked: string;
  emptyTitle: string;
  emptySubtitle: string;
};

type Props = {
  items: LedgerAccount[];
  messages: Messages;
  onEdit?: (acc: LedgerAccount) => void;
  onDelete?: (acc: LedgerAccount) => void;
  editable?: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

type TreeNode = LedgerAccount & { children: TreeNode[] };

const sortAccounts = (a: LedgerAccount, b: LedgerAccount) => {
  const ca = (a.code || '').toString();
  const cb = (b.code || '').toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, 'en', { numeric: true });
  return `${a.name || ''}`.localeCompare(`${b.name || ''}`, 'en');
};

const sectionLabel = (value: LedgerAccount['statement_section']) =>
  value.replace(/_/g, ' ');

const toneBadge = (label: string) => (
  <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
    {label}
  </span>
);

const LedgerTreePanel: React.FC<Props> = ({
  items,
  messages,
  onEdit,
  onDelete,
  editable = true,
  viewMode,
  onViewModeChange,
}) => {
  const sorted = useMemo(() => [...items].sort(sortAccounts), [items]);

  const tree = useMemo<TreeNode[]>(() => {
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
  }, [sorted]);

  const initialOpen = useMemo(() => {
    const next = new Set<string>();
    tree.forEach((root) => next.add(root.id));
    return next;
  }, [tree]);

  const [openIds, setOpenIds] = useState<Set<string>>(initialOpen);

  React.useEffect(() => {
    setOpenIds(initialOpen);
  }, [initialOpen]);

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
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => onEdit?.(acc)}
        >
          {messages.edit}
        </button>
        {!acc.is_system && (
          <button
            type="button"
            className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            onClick={() => onDelete?.(acc)}
          >
            {messages.delete}
          </button>
        )}
      </div>
    );
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const isOpen = openIds.has(node.id);
    const typeLabel = node.account_type === 'header' ? messages.header : messages.posting;

    return (
      <div key={node.id}>
        <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 18}px` }}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-50"
                    aria-label={isOpen ? 'Collapse group' : 'Expand group'}
                  >
                    {isOpen ? '−' : '+'}
                  </button>
                ) : (
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-transparent text-[11px] text-gray-300">
                    •
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-medium text-gray-900 break-words">{node.name || '—'}</p>
                    {node.code ? toneBadge(node.code) : null}
                    {node.is_active === false ? toneBadge(messages.inactive) : null}
                    {toneBadge(typeLabel)}
                    {node.is_system ? toneBadge(messages.system) : null}
                    {toneBadge(node.is_bank_control ? messages.bankControlYes : messages.bankControlNo)}
                    {toneBadge(node.allows_manual_posting ? messages.manualAllowed : messages.manualBlocked)}
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
                  {(node.report_subgroup || node.path || node.external_ref) && (
                    <p className="mt-1 text-[12px] text-gray-500">
                      {[node.report_subgroup, node.path, node.external_ref].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {renderActions(node)}
        </div>

        {hasChildren && isOpen ? (
          <div className="border-l border-gray-100 ml-7">{node.children.map((child) => renderTreeNode(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  const listRows = sorted.map((acc) => (
    <tr key={acc.id} className="border-t border-gray-100">
      <td className="px-4 py-3 text-sm text-gray-900">{acc.code}</td>
      <td className="px-4 py-3 text-sm text-gray-900">{acc.name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{acc.account_type}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{acc.statement_section}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{acc.normal_balance}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{acc.is_bank_control ? messages.bankControlYes : messages.bankControlNo}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{acc.allows_manual_posting ? messages.manualAllowed : messages.manualBlocked}</td>
      <td className="px-4 py-3 text-right">{renderActions(acc)}</td>
    </tr>
  ));

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{messages.treeTitle}</h2>
            <p className="mt-1 text-sm text-gray-600">{messages.treeSubtitle}</p>
          </div>
          <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1">
            {(['tree', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  viewMode === mode ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                {mode === 'tree' ? messages.viewTree : messages.viewList}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <h3 className="text-sm font-semibold text-gray-900">{messages.emptyTitle}</h3>
          <p className="mt-2 text-sm text-gray-600">{messages.emptySubtitle}</p>
        </div>
      ) : viewMode === 'tree' ? (
        <div>{tree.map((node) => renderTreeNode(node))}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Manual</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>{listRows}</tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default LedgerTreePanel;
