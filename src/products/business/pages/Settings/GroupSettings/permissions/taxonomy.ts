/** Authoritative R2.5 Business permission taxonomy. One primary location per code. */

export type ActionKind = "page" | "view" | "create" | "edit" | "delete" | "configure" | "manage";

export type PresetId = "read" | "edit" | "full";

export type PermissionAction = { code: string; kind: ActionKind; sensitive?: boolean; administrative?: boolean };

export type PermissionFeature = { id: string; name: string; description: string; actions: PermissionAction[] };

export type PermissionModule = { id: string; name: string; description: string; features: PermissionFeature[] };


export const PERMISSION_TAXONOMY: PermissionModule[] = [
  {
    id: 'financial', name: 'Financial Management', description: 'Cash flow, settlements, banking, reconciliation and reporting.',
    features: [
      {
        id: 'cash-flow', name: 'Cash Flow', description: 'Record, filter and review cash-flow entries, amounts and KPIs.',
        actions: [
          { code: 'view_cash_flow_page', kind: 'page' },
          { code: 'view_cash_flow_entries', kind: 'view' },
          { code: 'view_cash_flow_amount', kind: 'view' },
          { code: 'view_cash_flow_kpis', kind: 'view' },
          { code: 'view_filters', kind: 'view' },
          { code: 'add_cash_flow_entries', kind: 'create' },
          { code: 'change_cash_flow_entries', kind: 'edit' },
          { code: 'delete_cash_flow_entries', kind: 'delete', sensitive: true },
          { code: 'add_transference', kind: 'create' },
        ],
      },
      {
        id: 'settlements', name: 'Settlements', description: 'Settlement lists, amounts, KPIs and settlement lifecycle.',
        actions: [
          { code: 'view_settlement_page', kind: 'page' },
          { code: 'view_settled_entries', kind: 'view' },
          { code: 'view_settlement_amount', kind: 'view' },
          { code: 'view_settlement_kpis', kind: 'view' },
          { code: 'add_settled_entries', kind: 'create' },
          { code: 'change_settled_entries', kind: 'edit' },
          { code: 'delete_settled_entries', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'saved-views', name: 'Saved Views', description: 'Reusable cash-flow and settlement view presets.',
        actions: [
          { code: 'view_cash_flow_entry_view', kind: 'view' },
          { code: 'view_settlement_entry_view', kind: 'view' },
          { code: 'add_entry_view', kind: 'create' },
          { code: 'change_entry_view', kind: 'edit' },
          { code: 'delete_entry_view', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'bank-accounts', name: 'Bank Accounts', description: 'Bank account records and bank settings.',
        actions: [
          { code: 'view_bank_settings_page', kind: 'page' },
          { code: 'view_bank', kind: 'view' },
          { code: 'add_bank', kind: 'create' },
          { code: 'change_bank', kind: 'edit' },
          { code: 'delete_bank', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'bank-reconciliation', name: 'Bank Reconciliation', description: 'Statements and reconciliation data.',
        actions: [
          { code: 'view_statements_page', kind: 'page' },
          { code: 'view_statement', kind: 'view' },
          { code: 'add_statement', kind: 'create' },
          { code: 'change_statement', kind: 'edit' },
          { code: 'delete_statement', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'overview-reporting', name: 'Overview & Reporting', description: 'Workspace overview, reports and consolidated balances.',
        actions: [
          { code: 'view_overview_page', kind: 'page' },
          { code: 'view_report_page', kind: 'page' },
          { code: 'view_consolidated_balance', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'accounting', name: 'Accounting', description: 'Ledger accounts, chart configuration and accounting preferences.',
    features: [
      {
        id: 'chart-of-accounts', name: 'Chart of Accounts', description: 'Chart page, ledger accounts and account lifecycle.',
        actions: [
          { code: 'view_ledger_accounts_page', kind: 'page' },
          { code: 'view_ledger_account', kind: 'view' },
          { code: 'add_ledger_account', kind: 'create' },
          { code: 'change_ledger_account', kind: 'edit' },
          { code: 'delete_ledger_account', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'accounting-preferences', name: 'Accounting Preferences', description: 'Organization accounting profile and default behavior.',
        actions: [
          { code: 'change_organization_ledger_profile', kind: 'configure', administrative: true },
        ],
      },
    ],
  },
  {
    id: 'profit-loss', name: 'Profit or Loss', description: 'Management Profit or Loss reporting, templates and category mapping.',
    features: [
      {
        id: 'profit-loss-report', name: 'Profit or Loss Report', description: 'Report page and read access.',
        actions: [
          { code: 'view_profit_loss_page', kind: 'page' },
          { code: 'view_profit_loss', kind: 'view' },
          { code: 'export_profit_loss', kind: 'view' },
        ],
      },
      {
        id: 'profit-loss-configuration', name: 'Profit or Loss Configuration', description: 'Templates, source selection and category classification.',
        actions: [
          { code: 'change_profit_loss_config', kind: 'configure', administrative: true },
        ],
      },
    ],
  },
  {
    id: 'team', name: 'Team & Access', description: 'Members, roles, groups, the permission catalog and effective access.',
    features: [
      {
        id: 'members', name: 'Members', description: 'Member list, member profiles and access to member settings.',
        actions: [
          { code: 'business_view_member_settings_page', kind: 'page' },
          { code: 'business_view_member', kind: 'view' },
          { code: 'manage_members', kind: 'manage', sensitive: true, administrative: true },
        ],
      },
      {
        id: 'roles', name: 'Roles', description: 'Non-owner membership role changes.',
        actions: [
          { code: 'manage_member_roles', kind: 'manage', sensitive: true, administrative: true },
        ],
      },
      {
        id: 'permission-groups', name: 'Permission Groups', description: 'Group list, group settings, assignments and group lifecycle.',
        actions: [
          { code: 'view_group_settings_page', kind: 'page' },
          { code: 'view_group', kind: 'view' },
          { code: 'manage_access', kind: 'manage', sensitive: true, administrative: true },
        ],
      },
      {
        id: 'permission-catalog', name: 'Permission Catalog', description: 'Read the global permission catalog.',
        actions: [
          { code: 'view_permission', kind: 'view' },
        ],
      },
      {
        id: 'effective-access', name: 'Effective Access', description: 'Inspect assigned and effective member access.',
        actions: [
          { code: 'view_effective_access', kind: 'page', sensitive: true, administrative: true },
        ],
      },
    ],
  },
  {
    id: 'settings', name: 'Organization & Settings', description: 'Organization profile, currency, departments and workspace preferences.',
    features: [
      {
        id: 'organization-profile', name: 'Organization Profile', description: 'Organization name, address, country and timezone.',
        actions: [
          { code: 'view_organization_settings_page', kind: 'page' },
          { code: 'change_organization_profile', kind: 'configure', administrative: true },
        ],
      },
      {
        id: 'currency', name: 'Currency', description: 'Workspace currency configuration.',
        actions: [
          { code: 'view_currency_settings_page', kind: 'page' },
          { code: 'change_organization_currency', kind: 'configure', administrative: true },
        ],
      },
      {
        id: 'financial-modules', name: 'Financial Modules', description: 'Enable or disable optional Accounting and Profit or Loss modules.',
        actions: [
          { code: 'manage_financial_modules', kind: 'configure', administrative: true },
        ],
      },
      {
        id: 'departments', name: 'Departments', description: 'Department settings and department records.',
        actions: [
          { code: 'view_department_settings_page', kind: 'page' },
          { code: 'view_department', kind: 'view' },
          { code: 'add_department', kind: 'create' },
          { code: 'change_department', kind: 'edit' },
          { code: 'delete_department', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'workspace-preferences', name: 'Workspace Preferences', description: 'Notification and format settings pages.',
        actions: [
          { code: 'view_notification_settings_page', kind: 'page' },
          { code: 'view_format_settings_page', kind: 'page' },
        ],
      },
      {
        id: 'security-privacy', name: 'Security & Privacy', description: 'Security and privacy settings page.',
        actions: [
          { code: 'view_security_and_privacy_page', kind: 'page', sensitive: true, administrative: true },
        ],
      },
      {
        id: 'personal-preferences', name: 'Personal Preferences', description: 'Personal settings page.',
        actions: [
          { code: 'view_personal_settings_page', kind: 'page' },
        ],
      },
      {
        id: 'usage-limits', name: 'Usage & Limits', description: 'Plan limits and usage data.',
        actions: [
          { code: 'view_limits_and_usage_page', kind: 'page' },
          { code: 'view_limits_and_usage', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'billing', name: 'Billing & Subscription', description: 'Plan, subscription and payment-method capabilities.',
    features: [
      {
        id: 'billing-overview', name: 'Billing Overview', description: 'View plan and billing information.',
        actions: [
          { code: 'view_billing_page', kind: 'page', sensitive: true },
        ],
      },
      {
        id: 'subscription-management', name: 'Subscription Management', description: 'Start, change or cancel the workspace subscription.',
        actions: [
          { code: 'manage_billing_subscription', kind: 'configure', sensitive: true, administrative: true },
        ],
      },
      {
        id: 'payment-methods', name: 'Payment Methods', description: 'Billing portal and payment-method actions.',
        actions: [
          { code: 'manage_billing_payment_methods', kind: 'configure', sensitive: true, administrative: true },
        ],
      },
    ],
  },
  {
    id: 'integrations', name: 'Integrations', description: 'Connected services and integration activity.',
    features: [
      {
        id: 'connected-services', name: 'Connected Services', description: 'AI connections and connected-service access.',
        actions: [
          { code: 'view_ai_connections', kind: 'page', sensitive: true },
        ],
      },
      {
        id: 'integration-activity', name: 'Integration Activity', description: 'View workspace connector activity.',
        actions: [
          { code: 'view_integrations', kind: 'page', sensitive: true },
        ],
      },
    ],
  },
  {
    id: 'operations', name: 'Business Operations', description: 'Inventory, CRM entities and projects.',
    features: [
      {
        id: 'inventory', name: 'Inventory', description: 'Inventory settings and item records.',
        actions: [
          { code: 'view_inventory_settings_page', kind: 'page' },
          { code: 'view_inventory', kind: 'view' },
          { code: 'add_inventory', kind: 'create' },
          { code: 'change_inventory', kind: 'edit' },
          { code: 'delete_inventory', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'crm-entities', name: 'CRM & Entities', description: 'Entity settings and entity records.',
        actions: [
          { code: 'view_entity_settings_page', kind: 'page' },
          { code: 'view_entity', kind: 'view' },
          { code: 'add_entity', kind: 'create' },
          { code: 'change_entity', kind: 'edit' },
          { code: 'delete_entity', kind: 'delete', sensitive: true },
        ],
      },
      {
        id: 'projects', name: 'Projects', description: 'Project settings and project records.',
        actions: [
          { code: 'view_project_settings_page', kind: 'page' },
          { code: 'view_project', kind: 'view' },
          { code: 'add_project', kind: 'create' },
          { code: 'change_project', kind: 'edit' },
          { code: 'delete_project', kind: 'delete', sensitive: true },
        ],
      },
    ],
  },
];

export const BUSINESS_PERMISSION_CODES = PERMISSION_TAXONOMY.flatMap((module) => module.features.flatMap((feature) => feature.actions.map((action) => action.code)));

export const PERMISSION_BY_CODE = new Map(BUSINESS_PERMISSION_CODES.map((code) => [code, PERMISSION_TAXONOMY.flatMap((m) => m.features).flatMap((f) => f.actions).find((a) => a.code === code)!]));

export const PERMISSION_DEPENDENCIES: Record<string, string[]> = {

  'manage_members': ['business_view_member', 'business_view_member_settings_page'],
  'manage_member_roles': ['business_view_member', 'business_view_member_settings_page'],
  'manage_access': ['view_group', 'view_permission', 'view_group_settings_page'],
  'view_effective_access': ['business_view_member', 'business_view_member_settings_page'],
  'change_organization_profile': ['view_organization_settings_page'],
  'change_organization_currency': ['view_currency_settings_page'],
  'change_organization_ledger_profile': ['view_organization_settings_page', 'view_ledger_accounts_page'],
  'manage_financial_modules': ['view_organization_settings_page'],
  'view_profit_loss': ['view_profit_loss_page'],
  'export_profit_loss': ['view_profit_loss_page'],
  'change_profit_loss_config': ['view_profit_loss_page'],
  'manage_billing_subscription': ['view_billing_page'],
  'manage_billing_payment_methods': ['view_billing_page'],
  'view_integrations': ['view_ai_connections'],
};

export const ACCESS_CAPABILITIES = new Set(["manage_members", "manage_member_roles", "manage_access", "view_effective_access"]);

export type ScopeResourceType = "bank_account" | "department" | "project";

export const SCOPED_PERMISSION_RESOURCES: Record<string, ScopeResourceType[]> = {
  view_bank: ["bank_account"],
  add_bank: ["bank_account"],
  change_bank: ["bank_account"],
  delete_bank: ["bank_account"],
  view_consolidated_balance: ["bank_account"],
  view_statement: ["bank_account"],
  add_statement: ["bank_account"],
  change_statement: ["bank_account"],
  delete_statement: ["bank_account"],
  view_settled_entries: ["bank_account", "department", "project"],
  add_settled_entries: ["bank_account", "department", "project"],
  change_settled_entries: ["bank_account", "department", "project"],
  delete_settled_entries: ["bank_account", "department", "project"],
  view_settlement_amount: ["bank_account", "department", "project"],
  view_settlement_kpis: ["bank_account", "department", "project"],
  view_cash_flow_entries: ["bank_account", "department", "project"],
  view_cash_flow_amount: ["bank_account", "department", "project"],
  view_cash_flow_kpis: ["bank_account", "department", "project"],
  add_cash_flow_entries: ["department", "project"],
  change_cash_flow_entries: ["bank_account", "department", "project"],
  delete_cash_flow_entries: ["bank_account", "department", "project"],
  view_report_page: ["bank_account", "department", "project"],
  view_overview_page: ["bank_account", "department", "project"],
  view_ledger_account: ["bank_account", "project"],
  change_ledger_account: ["bank_account", "project"],
  view_department: ["department"],
  add_department: ["department"],
  change_department: ["department"],
  delete_department: ["department"],
  view_project: ["project"],
  add_project: ["project"],
  change_project: ["project"],
  delete_project: ["project"],
};
