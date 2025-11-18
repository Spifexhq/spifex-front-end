/* --------------------------------------------------------------------------
 * File: src/pages/GroupSettings/GroupPermissionsTable.tsx
 * Purpose: Hard-coded permissions table with tabs in header
 * Tabs: navbar, sidebar, page components, entries, settings
 * Link with group permissions by code (selectedCodes)
 * i18n namespace: groupPermissionsTable
 * -------------------------------------------------------------------------- */

import React, { useMemo, useState } from "react";
import Checkbox from "src/components/ui/Checkbox";
import Button from "src/components/ui/Button";
import { useTranslation } from "react-i18next";

type PermissionCategory =
  | "navbar"
  | "sidebar"
  | "page_components"
  | "entries"
  | "users"
  | "banks"
  | "employees"
  | "groups"
  | "ledger_accounts"
  | "departments"
  | "projects"
  | "inventory"
  | "entities";

type PermissionTabId = "navbar" | "sidebar" | "page_components" | "entries" | "settings";

type PermissionRow = {
  code: string;
  category: PermissionCategory;
};

type PermissionTab = {
  id: PermissionTabId;
  categories: PermissionCategory[];
};

const TABS: PermissionTab[] = [
  {
    id: "navbar",
    categories: ["navbar"],
  },
  {
    id: "sidebar",
    categories: ["sidebar"],
  },
  {
    id: "page_components",
    categories: ["page_components"],
  },
  {
    id: "entries",
    categories: ["entries"],
  },
  {
    id: "settings",
    categories: [
      "users",
      "banks",
      "employees",
      "groups",
      "ledger_accounts",
      "departments",
      "projects",
      "inventory",
      "entities",
    ],
  },
];

const PERMISSION_ROWS: PermissionRow[] = [
  /* ------------------------------ NAVBAR ---------------------------------- */
  { code: "view_cash_flow_button", category: "navbar" },
  { code: "view_settled_button", category: "navbar" },
  { code: "view_report_button", category: "navbar" },

  /* ------------------------------ SIDEBAR --------------------------------- */
  { code: "view_credit_modal_button", category: "sidebar" },
  { code: "view_debit_modal_button", category: "sidebar" },

  /* -------------------------- PAGE COMPONENTS ----------------------------- */
  { code: "view_cash_flow_entries", category: "page_components" },
  { code: "view_settled_entries", category: "page_components" },
  { code: "view_banks_table", category: "page_components" },
  { code: "view_filters", category: "page_components" },

  /* ------------------------------- ENTRIES -------------------------------- */
  { code: "add_cash_flow_entries", category: "entries" },
  { code: "change_cash_flow_entries", category: "entries" },
  { code: "delete_cash_flow_entries", category: "entries" },
  { code: "change_settled_entries", category: "entries" },
  { code: "delete_settled_entries", category: "entries" },
  { code: "add_transference", category: "entries" },

  /* -------------------------------- USERS --------------------------------- */
  { code: "add_user", category: "users" },
  { code: "change_user", category: "users" },
  { code: "delete_user", category: "users" },
  { code: "view_user", category: "users" },

  /* -------------------------------- BANKS --------------------------------- */
  { code: "add_bank", category: "banks" },
  { code: "change_bank", category: "banks" },
  { code: "delete_bank", category: "banks" },
  { code: "view_bank", category: "banks" },

  /* ------------------------------ EMPLOYEES ------------------------------- */
  { code: "add_employee", category: "employees" },
  { code: "change_employee", category: "employees" },
  { code: "delete_employee", category: "employees" },
  { code: "view_employee", category: "employees" },

  /* -------------------------------- GROUPS -------------------------------- */
  { code: "add_group", category: "groups" },
  { code: "change_group", category: "groups" },
  { code: "delete_group", category: "groups" },
  { code: "view_group", category: "groups" },

  /* -------------------------- LEDGER ACCOUNTS ----------------------------- */
  { code: "add_ledger_account", category: "ledger_accounts" },
  { code: "change_ledger_account", category: "ledger_accounts" },
  { code: "delete_ledger_account", category: "ledger_accounts" },
  { code: "view_ledger_account", category: "ledger_accounts" },

  /* ----------------------------- DEPARTMENTS ------------------------------ */
  { code: "add_department", category: "departments" },
  { code: "change_department", category: "departments" },
  { code: "delete_department", category: "departments" },
  { code: "view_department", category: "departments" },

  /* ------------------------------- PROJECTS ------------------------------- */
  { code: "add_project", category: "projects" },
  { code: "change_project", category: "projects" },
  { code: "delete_project", category: "projects" },
  { code: "view_project", category: "projects" },

  /* ------------------------------ INVENTORY ------------------------------- */
  { code: "add_inventory", category: "inventory" },
  { code: "change_inventory", category: "inventory" },
  { code: "delete_inventory", category: "inventory" },
  { code: "view_inventory", category: "inventory" },

  /* ------------------------------- ENTITIES ------------------------------- */
  { code: "add_entity", category: "entities" },
  { code: "change_entity", category: "entities" },
  { code: "delete_entity", category: "entities" },
  { code: "view_entity", category: "entities" },
];

type GroupPermissionsTableProps = {
  selectedCodes: Set<string>;
  disabled?: boolean;
  dirty: boolean;
  onToggle: (code: string, enabled: boolean) => void;
  onUndo: () => void;
  onSave: () => void;
};

const GroupPermissionsTable: React.FC<GroupPermissionsTableProps> = ({
  selectedCodes,
  disabled,
  dirty,
  onToggle,
  onUndo,
  onSave,
}) => {
  const { t } = useTranslation("groupPermissionsTable");
  const [activeTab, setActiveTab] = useState<PermissionTabId>("navbar");

  const rowsForActiveTab = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
    return PERMISSION_ROWS.filter((row) => tab.categories.includes(row.category));
  }, [activeTab]);

  return (
    <div className="border-t border-gray-200">
      {/* Header with tabs */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <nav className="flex gap-2" aria-label="Permission tabs">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => !disabled && setActiveTab(tab.id)}
                className={`relative px-3 py-1.5 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px ${
                  isActive
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {t(`tabs.${tab.id}`)}
              </button>
            );
          })}
        </nav>
        <span className="text-[11px] text-gray-500">
          {t("table.hint")}
        </span>
      </div>

      {/* Rows */}
      <div
        className={`divide-y divide-gray-200 ${
          disabled ? "opacity-70 pointer-events-none" : ""
        }`}
      >
        {rowsForActiveTab.length === 0 && (
          <div className="px-4 py-3 text-[12px] text-gray-500">
            {t("noItems")}
          </div>
        )}

        {rowsForActiveTab.map((row) => {
          const checked = selectedCodes.has(row.code);
          const label = t(`perms.${row.code}.label`);
          const description = t(`perms.${row.code}.description`);

          return (
            <div
              key={row.code}
              className="flex items-start justify-between px-4 py-3"
            >
              <div className="pr-3">
                <p className="text-[13px] font-medium text-gray-900">
                  {label}
                </p>
                <p className="mt-1 text-[12px] text-gray-600">
                  {description}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {row.code}
                </p>
              </div>
              <div className="mt-1">
                <Checkbox
                  checked={checked}
                  onChange={(e) => onToggle(row.code, e.target.checked)}
                  disabled={disabled}
                  size="sm"
                  aria-label={label}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer actions (Undo / Save) */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
        <Button
          variant="cancel"
          type="button"
          onClick={onUndo}
          disabled={!dirty || !!disabled}
        >
          {t("buttons.undo")}
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={!dirty || !!disabled}
        >
          {t("buttons.save")}
        </Button>
      </div>
    </div>
  );
};

export default GroupPermissionsTable;
