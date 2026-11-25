import { lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router-dom";
import ProductPrefixGuard from "@/app/routing/ProductPrefixGuard";
const SettingsLayout = lazy(() => import("../layouts/SettingsLayout").then(module => ({ default: module.SettingsLayout })));
const AccountingLayout = lazy(() => import("../layouts/AccountingLayout").then(module => ({ default: module.AccountingLayout })));
const InventoryLayout = lazy(() => import("../layouts/InventoryLayout"));
import { PermissionMiddleware, FinancialModuleMiddleware } from "@/middlewares";
const Help = lazy(() => import("@/pages/Help"));
const Overview = lazy(() => import("@/products/business/pages/Overview"));
const CashFlow = lazy(() => import("@/products/business/pages/Finance/CashFlow"));
const SettledEntries = lazy(() => import("@/products/business/pages/Finance/SettledEntries"));
const OnboardingPage = lazy(() => import("@/products/business/pages/Onboarding"));
const Personal = lazy(() => import("@/features/account-settings/pages/PersonalSettings"));
const Billing = lazy(() => import("@/products/business/pages/Settings/Billing"));
const LimitsAndUsage = lazy(() => import("@/features/account-settings/pages/LimitsAndUsage"));
const SecurityAndPrivacy = lazy(() => import("@/features/account-settings/pages/SecurityAndPrivacy"));
const OrganizationSettings = lazy(() => import("@/products/business/pages/Settings/OrganizationSettings"));
const FinancialModulesSettings = lazy(() => import("@/products/business/pages/Settings/FinancialModules"));
const Workspaces = lazy(() => import("@/features/workspaces/pages/WorkspaceManagementPage"));
const DepartmentSettings = lazy(() => import("@/products/business/pages/Settings/DepartmentSettings"));
const BankSettings = lazy(() => import("@/products/business/pages/Settings/BankSettings"));
const EntitySettings = lazy(() => import("@/products/business/pages/Settings/EntitySettings"));
const ProjectSettings = lazy(() => import("@/products/business/pages/Settings/ProjectSettings"));
const MemberSettings = lazy(() => import("@/products/business/pages/Settings/MemberSettings"));
const GroupSettings = lazy(() => import("@/products/business/pages/Settings/GroupSettings"));
const CategorySettings = lazy(() => import("@/products/business/pages/Settings/CategorySettings"));
const Accounting = lazy(() => import("@/products/business/pages/Accounting"));
const ProfitLoss = lazy(() => import("@/products/business/pages/ProfitLoss"));
const ProfitLossConfiguration = lazy(() => import("@/products/business/pages/ProfitLoss/Configuration"));
const Inventory = lazy(() => import("@/products/business/pages/Inventory"));
const BankImports = lazy(() => import("@/products/business/pages/Finance/BankImports"));
const NotificationSettings = lazy(() => import("@/features/account-settings/pages/NotificationSettings"));
const FormatSettings = lazy(() => import("@/features/account-settings/pages/FormatSettings"));
const CurrencySettings = lazy(() => import("@/features/account-settings/pages/CurrencySettings"));
const SubscriptionCanceled = lazy(() => import("@/features/account-settings/pages/SubscriptionCanceled"));
const businessChildren: RouteObject[] = [
            { index: true, element: <Navigate to="overview" replace /> },
            // Onboarding
            {
            path: "onboarding",
            element: <OnboardingPage />
            },
            { path: "overview", element: <PermissionMiddleware codeName="view_overview_page" redirectTo="/b/cashflow"><Overview /></PermissionMiddleware> },
            { path: "help", element: <Help /> },
            // Overview
            {
                path: 'home',
                element: <Navigate to="/b/overview" replace />
            },
            // Cash Flow
            {
                path: 'cashflow',
                element: (
                    <PermissionMiddleware codeName="view_cash_flow_page" redirectTo={'/b/settled'}>
                        <CashFlow />
                    </PermissionMiddleware>
                )
            },
            // Settled Entries
            {
                path: 'settled',
                element: (
                    <PermissionMiddleware codeName="view_settlement_page" redirectTo={'/b/settings'}>
                        <SettledEntries />
                    </PermissionMiddleware>
                )
            },
                {
                path: 'accounting/*',
                element: <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo="/b/settings"><FinancialModuleMiddleware module="accounting"><AccountingLayout><Accounting /></AccountingLayout></FinancialModuleMiddleware></PermissionMiddleware>,
            },
            {
                path: 'pnl',
                element: <PermissionMiddleware codeName="view_profit_loss_page" behavior="redirect" redirectTo="/b/settings"><FinancialModuleMiddleware module="pnl"><ProfitLoss /></FinancialModuleMiddleware></PermissionMiddleware>,
            },
            {
                path: 'pnl/configuration',
                element: <PermissionMiddleware codeName="view_profit_loss_page" behavior="redirect" redirectTo="/b/settings"><FinancialModuleMiddleware module="pnl"><ProfitLossConfiguration /></FinancialModuleMiddleware></PermissionMiddleware>,
            },
            {
                path: 'inventory/*',
                element: <PermissionMiddleware codeName={["view_inventory", "view_inventory_settings_page"]} behavior="redirect" redirectTo="/b/settings"><InventoryLayout><Inventory /></InventoryLayout></PermissionMiddleware>,
            },
            {
                path: 'bank-imports',
                element: <PermissionMiddleware codeName="view_statements_page" redirectTo="/b/settings"><BankImports /></PermissionMiddleware>,
            },
            {
                path: 'bank-imports/:statementId',
                element: <PermissionMiddleware codeName="view_statements_page" redirectTo="/b/settings"><BankImports /></PermissionMiddleware>,
            },
            // Settings
            {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
                {
                    index: true,
                    element: <Navigate to="personal" replace />
                },
                {
                    path: 'personal',
                    element: (
                    <PermissionMiddleware codeName="view_personal_settings_page" behavior="lock">
                        <Personal />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'organization-settings',
                    element: (
                    <PermissionMiddleware codeName="view_organization_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <OrganizationSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'financial-modules',
                    element: (
                    <PermissionMiddleware codeName="manage_financial_modules" behavior="redirect" redirectTo={'/b/settings'}>
                        <FinancialModulesSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'workspaces',
                    element: (
                    <PermissionMiddleware codeName="view_organization_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <Workspaces />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'billing',
                    element: (
                    <PermissionMiddleware codeName="view_billing_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <Billing />
                    </PermissionMiddleware>
                    ),
                },
                { path: 'subscription-management', element: <Navigate to="/b/settings/billing" replace /> },
                {
                    path: "subscription",
                    element: (
                    <PermissionMiddleware codeName="view_billing_page" behavior="redirect" redirectTo={"/b/settings"}>
                        <SubscriptionCanceled />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'limits',
                    element: (
                    <PermissionMiddleware codeName="view_limits_and_usage_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <LimitsAndUsage />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'security',
                    element: (
                    <PermissionMiddleware codeName="view_security_and_privacy_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <SecurityAndPrivacy />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'banks',
                    element: (
                    <PermissionMiddleware codeName="view_bank_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <BankSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'departments',
                    element: (
                    <PermissionMiddleware codeName="view_department_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <DepartmentSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'entities',
                    element: (
                    <PermissionMiddleware codeName="view_entity_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <EntitySettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'inventory',
                    element: (
                    <PermissionMiddleware codeName={["view_inventory_settings_page", "view_inventory"]} behavior="redirect" redirectTo={'/b/settings'}>
                        <Navigate to="/b/inventory/items" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'projects',
                    element: (
                    <PermissionMiddleware codeName="view_project_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <ProjectSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'members',
                    element: (
                    <PermissionMiddleware codeName="business_view_member_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <MemberSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'groups',
                    element: (
                    <PermissionMiddleware codeName="view_group_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <GroupSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'categories',
                    element: (
                    <PermissionMiddleware codeName="view_cash_flow_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <CategorySettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'ledger-accounts',
                    element: (
                    <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <Navigate to="/b/accounting/chart-of-accounts" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'register/ledger-accounts',
                    element: (
                    <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <Navigate to="/b/accounting/chart-of-accounts" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'bank-statements',
                    element: (
                    <PermissionMiddleware codeName="view_statements_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <Navigate to="/b/bank-imports" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'notifications',
                    element: (
                    <PermissionMiddleware codeName="view_notification_settings_page" behavior="redirect" redirectTo={'/b/settings'}>
                        <NotificationSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'manage-formats',
                    element: <PermissionMiddleware codeName="view_format_settings_page" redirectTo="/b/settings"><FormatSettings /></PermissionMiddleware>
                },
                {
                    path: 'manage-currency',
                    element: <PermissionMiddleware codeName="view_currency_settings_page" redirectTo="/b/settings"><CurrencySettings /></PermissionMiddleware>
                },
            ]
            },
            { path: "*", element: <Navigate to="/b/overview" replace /> },
];

export const businessRoutes: RouteObject[] = [{
  path: ":userExternalId/b/:organizationExternalId",
  element: <ProductPrefixGuard product="b"><Outlet /></ProductPrefixGuard>,
  children: businessChildren,
}];
