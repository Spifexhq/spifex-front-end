/* --------------------------------------------------------------------------
 * File: src/pages/GroupSettings/GroupPermissionsTable.tsx
 * -------------------------------------------------------------------------- */

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import Checkbox from "@/shared/ui/Checkbox";
import Button from "@/shared/ui/Button";

import { permissionIcons } from "@/pages/GroupSettings/permissionIcons";

type PermissionCategory = "visualization" | "actions" | "pages";
type PermissionTabId = PermissionCategory;

type PermissionRow = {
  code: string;
  category: PermissionCategory;
};

const TABS: { id: PermissionTabId }[] = [{ id: "visualization" }, { id: "actions" }, { id: "pages" }];

const PERMISSION_ROWS: PermissionRow[] = [
  // VISUALIZATION
  { code: "view_cash_flow_entries", category: "visualization" },
  { code: "view_settled_entries", category: "visualization" },
  { code: "view_filters", category: "visualization" },
  { code: "view_consolidated_balance", category: "visualization" },
  { code: "view_cash_flow_amount", category: "visualization" },
  { code: "view_settlement_amount", category: "visualization" },
  { code: "view_cash_flow_kpis", category: "visualization" },
  { code: "view_settlement_kpis", category: "visualization" },
  { code: "view_cash_flow_entry_view", category: "visualization" },
  { code: "view_settlement_entry_view", category: "visualization" },
  { code: "view_statement", category: "visualization" },
  { code: "view_limits_and_usage", category: "visualization" },
  { code: "view_permission", category: "visualization" },
  { code: "view_user", category: "visualization" },
  { code: "view_member", category: "visualization" },
  { code: "view_group", category: "visualization" },
  { code: "view_bank", category: "visualization" },
  { code: "view_ledger_account", category: "visualization" },
  { code: "view_department", category: "visualization" },
  { code: "view_project", category: "visualization" },
  { code: "view_inventory", category: "visualization" },
  { code: "view_entity", category: "visualization" },

  // ACTIONS
  { code: "add_cash_flow_entries", category: "actions" },
  { code: "change_cash_flow_entries", category: "actions" },
  { code: "delete_cash_flow_entries", category: "actions" },
  { code: "add_settled_entries", category: "actions" },
  { code: "change_settled_entries", category: "actions" },
  { code: "delete_settled_entries", category: "actions" },
  { code: "add_transference", category: "actions" },
  { code: "add_entry_view", category: "actions" },
  { code: "change_entry_view", category: "actions" },
  { code: "delete_entry_view", category: "actions" },
  { code: "add_statement", category: "actions" },
  { code: "change_statement", category: "actions" },
  { code: "delete_statement", category: "actions" },
  { code: "add_user", category: "actions" },
  { code: "change_user", category: "actions" },
  { code: "delete_user", category: "actions" },
  { code: "add_member", category: "actions" },
  { code: "change_member", category: "actions" },
  { code: "delete_member", category: "actions" },
  { code: "add_group", category: "actions" },
  { code: "change_group", category: "actions" },
  { code: "delete_group", category: "actions" },
  { code: "add_bank", category: "actions" },
  { code: "change_bank", category: "actions" },
  { code: "delete_bank", category: "actions" },
  { code: "add_ledger_account", category: "actions" },
  { code: "change_ledger_account", category: "actions" },
  { code: "delete_ledger_account", category: "actions" },
  { code: "add_department", category: "actions" },
  { code: "change_department", category: "actions" },
  { code: "delete_department", category: "actions" },
  { code: "add_project", category: "actions" },
  { code: "change_project", category: "actions" },
  { code: "delete_project", category: "actions" },
  { code: "add_inventory", category: "actions" },
  { code: "change_inventory", category: "actions" },
  { code: "delete_inventory", category: "actions" },
  { code: "add_entity", category: "actions" },
  { code: "change_entity", category: "actions" },
  { code: "delete_entity", category: "actions" },

  // PAGES
  { code: "view_home_dashboard_page", category: "pages" },
  { code: "view_cash_flow_page", category: "pages" },
  { code: "view_settlement_page", category: "pages" },
  { code: "view_report_page", category: "pages" },
  { code: "view_personal_settings_page", category: "pages" },
  { code: "view_subscription_management_page", category: "pages" },
  { code: "view_limits_and_usage_page", category: "pages" },
  { code: "view_security_and_privacy_page", category: "pages" },
  { code: "view_organization_settings_page", category: "pages" },
  { code: "view_department_settings_page", category: "pages" },
  { code: "view_bank_settings_page", category: "pages" },
  { code: "view_entity_settings_page", category: "pages" },
  { code: "view_inventory_settings_page", category: "pages" },
  { code: "view_project_settings_page", category: "pages" },
  { code: "view_member_settings_page", category: "pages" },
  { code: "view_group_settings_page", category: "pages" },
  { code: "view_ledger_accounts_page", category: "pages" },
  { code: "view_statements_page", category: "pages" },
  { code: "view_notification_settings_page", category: "pages" },
  { code: "view_format_settings_page", category: "pages" },
  { code: "view_currency_settings_page", category: "pages" },
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
  const [activeTab, setActiveTab] = useState<PermissionTabId>("visualization");

  const rowsForActiveTab = useMemo(
    () => PERMISSION_ROWS.filter((row) => row.category === activeTab),
    [activeTab],
  );

  return (
    <div className="border-t border-gray-200">
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-center gap-3">
        <nav className="flex gap-2" aria-label={t("aria.tabs", { defaultValue: "Permission tabs" })}>
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
      </div>

      <div className={`divide-y divide-gray-200 ${disabled ? "opacity-70 pointer-events-none" : ""}`}>
        {rowsForActiveTab.length === 0 && (
          <div className="px-4 py-3 text-[12px] text-gray-500">{t("noItems")}</div>
        )}

        {rowsForActiveTab.map((row) => {
          const checked = selectedCodes.has(row.code);
          const label = t(`perms.${row.code}.label`, { defaultValue: row.code });
          const description = t(`perms.${row.code}.description`, { defaultValue: "" });
          const Icon = permissionIcons(row.code);

          return (
            <div
              key={row.code}
              className="flex items-start justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (disabled) return;
                onToggle(row.code, !checked);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(row.code, !checked);
                }
              }}
              aria-label={label}
            >
              <div className="pr-3 flex gap-3">
                <div className="mt-0.5" aria-hidden="true">
                  <div
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center ${
                      checked ? "border-gray-300 bg-white" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-gray-900">{label}</p>
                  {description ? <p className="mt-1 text-[12px] text-gray-600">{description}</p> : null}
                  <p className="mt-1 text-[10px] text-gray-400">{row.code}</p>
                </div>
              </div>

              <div
                className="mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
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

      <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
        <Button variant="cancel" type="button" onClick={onUndo} disabled={!dirty || !!disabled}>
          {t("buttons.undo")}
        </Button>
        <Button type="button" onClick={onSave} disabled={!dirty || !!disabled}>
          {t("buttons.save")}
        </Button>
      </div>
    </div>
  );
};

export default GroupPermissionsTable;
