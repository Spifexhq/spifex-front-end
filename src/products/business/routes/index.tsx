import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
const SettingsLayout = lazy(() => import("../layouts/SettingsLayout").then(module => ({ default: module.SettingsLayout })));
const AccountingLayout = lazy(() => import("../layouts/AccountingLayout").then(module => ({ default: module.AccountingLayout })));
import { PermissionMiddleware, SubscriptionMiddleware } from "@/middlewares";
const Help = lazy(() => import("@/pages/Help"));
const Overview = lazy(() => import("@/products/business/pages/Overview"));
const CashFlow = lazy(() => import("@/products/business/pages/Finance/CashFlow"));
const SettledEntries = lazy(() => import("@/products/business/pages/Finance/SettledEntries"));
const Reports = lazy(() => import("@/products/business/pages/Reporting/Reports"));
const OnboardingPage = lazy(() => import("@/products/business/pages/Onboarding"));
const Personal = lazy(() => import("@/features/account-settings/pages/PersonalSettings"));
const SubscriptionManagement = lazy(() => import("@/features/account-settings/pages/SubscriptionManagement"));
const LimitsAndUsage = lazy(() => import("@/features/account-settings/pages/LimitsAndUsage"));
const SecurityAndPrivacy = lazy(() => import("@/features/account-settings/pages/SecurityAndPrivacy"));
const OrganizationSettings = lazy(() => import("@/products/business/pages/Settings/OrganizationSettings"));
const Workspaces = lazy(() => import("@/features/workspaces/pages/WorkspaceManagementPage"));
const DepartmentSettings = lazy(() => import("@/products/business/pages/Settings/DepartmentSettings"));
const BankSettings = lazy(() => import("@/products/business/pages/Settings/BankSettings"));
const EntitySettings = lazy(() => import("@/products/business/pages/Settings/EntitySettings"));
const InventorySettings = lazy(() => import("@/products/business/pages/Settings/InventorySettings"));
const ProjectSettings = lazy(() => import("@/products/business/pages/Settings/ProjectSettings"));
const MemberSettings = lazy(() => import("@/products/business/pages/Settings/MemberSettings"));
const GroupSettings = lazy(() => import("@/products/business/pages/Settings/GroupSettings"));
const CategorySettings = lazy(() => import("@/products/business/pages/Settings/CategorySettings"));
const Accounting = lazy(() => import("@/products/business/pages/Accounting"));
const BankImports = lazy(() => import("@/products/business/pages/Finance/BankImports"));
const NotificationSettings = lazy(() => import("@/features/account-settings/pages/NotificationSettings"));
const FormatSettings = lazy(() => import("@/features/account-settings/pages/FormatSettings"));
const CurrencySettings = lazy(() => import("@/features/account-settings/pages/CurrencySettings"));
const SubscriptionCanceled = lazy(() => import("@/features/account-settings/pages/SubscriptionCanceled"));
export const businessRoutes: RouteObject[] = [
            // Onboarding
            {
            path: "onboarding",
            element: <OnboardingPage />
            },
            { path: "overview", element: <PermissionMiddleware codeName="view_overview_page" redirectTo="/cashflow"><Overview /></PermissionMiddleware> },
            { path: "help", element: <Help /> },
            // Overview
            {
                path: 'home',
                element: <Navigate to="/overview" replace />
            },
            // Cash Flow
            {
                path: 'cashflow',
                element: (
                    <PermissionMiddleware codeName="view_cash_flow_page" redirectTo={'/settled'}>
                        <CashFlow />
                    </PermissionMiddleware>
                )
            },
            // Settled Entries
            {
                path: 'settled',
                element: (
                    <PermissionMiddleware codeName="view_settlement_page" redirectTo={'/settings'}>
                        <SettledEntries />
                    </PermissionMiddleware>
                )
            },
            // Reports
            {
                path: 'reports',
                element: (
                    <SubscriptionMiddleware redirectTo="/settings">
                        <PermissionMiddleware codeName="view_report_page" requireSubscription behavior="lock" redirectTo={'/settings'}>
                            <Reports />
                        </PermissionMiddleware>
                    </SubscriptionMiddleware>
                )
            },
            {
                path: 'accounting/*',
                element: <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo="/settings"><AccountingLayout><Accounting /></AccountingLayout></PermissionMiddleware>,
            },
            {
                path: 'bank-imports',
                element: <PermissionMiddleware codeName="view_statements_page" redirectTo="/settings"><BankImports /></PermissionMiddleware>,
            },
            {
                path: 'bank-imports/:statementId',
                element: <PermissionMiddleware codeName="view_statements_page" redirectTo="/settings"><BankImports /></PermissionMiddleware>,
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
                    <PermissionMiddleware codeName="view_organization_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <OrganizationSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'workspaces',
                    element: (
                    <PermissionMiddleware codeName="view_organization_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <Workspaces />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'subscription-management',
                    element: (
                    <PermissionMiddleware codeName="view_subscription_management_page" behavior="redirect" redirectTo={'/settings'}>
                        <SubscriptionManagement />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: "subscription",
                    element: (
                    <PermissionMiddleware codeName="view_subscription_management_page" behavior="redirect" redirectTo={"/settings"}>
                        <SubscriptionCanceled />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'limits',
                    element: (
                    <PermissionMiddleware codeName="view_limits_and_usage_page" behavior="redirect" redirectTo={'/settings'}>
                        <LimitsAndUsage />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'security',
                    element: (
                    <PermissionMiddleware codeName="view_security_and_privacy_page" behavior="redirect" redirectTo={'/settings'}>
                        <SecurityAndPrivacy />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'banks',
                    element: (
                    <PermissionMiddleware codeName="view_bank_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <BankSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'departments',
                    element: (
                    <PermissionMiddleware codeName="view_department_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <DepartmentSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'entities',
                    element: (
                    <PermissionMiddleware codeName="view_entity_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <EntitySettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'inventory',
                    element: (
                    <PermissionMiddleware codeName="view_inventory_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <InventorySettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'projects',
                    element: (
                    <PermissionMiddleware codeName="view_project_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <ProjectSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'members',
                    element: (
                    <PermissionMiddleware codeName="view_member_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <MemberSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'groups',
                    element: (
                    <PermissionMiddleware codeName="view_group_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <GroupSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'categories',
                    element: (
                    <PermissionMiddleware codeName="view_cash_flow_page" behavior="redirect" redirectTo={'/settings'}>
                        <CategorySettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'ledger-accounts',
                    element: (
                    <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo={'/settings'}>
                        <Navigate to="/accounting/chart" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'register/ledger-accounts',
                    element: (
                    <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo={'/settings'}>
                        <Navigate to="/accounting/setup/chart" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'bank-statements',
                    element: (
                    <PermissionMiddleware codeName="view_statements_page" behavior="redirect" redirectTo={'/settings'}>
                        <Navigate to="/bank-imports" replace />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'notifications',
                    element: (
                    <PermissionMiddleware codeName="view_notification_settings_page" behavior="redirect" redirectTo={'/settings'}>
                        <NotificationSettings />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'manage-formats',
                    element: <FormatSettings />
                },
                {
                    path: 'manage-currency',
                    element: <CurrencySettings />
                },
            ]
            },
];
