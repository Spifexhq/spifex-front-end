// router.tsx
import { lazy } from "react";
import { RouteObject } from "react-router";
import { Navigate } from 'react-router-dom';

// Layouts
import { BaseLayout, SpifexLayout, SettingsLayout } from "@/layouts";

//import Loader from "@/components/Loaders/LazyLoader";

// Middlewares
import { AuthMiddleware, PermissionMiddleware, SubscriptionMiddleware } from "@/middlewares";

// Auth Pages
const SignUp = lazy(() => import("@/pages/Auth/SignUp"));
const SignIn = lazy(() => import("@/pages/Auth/SignIn"));
const EmailVerification = lazy(() => import("@/pages/Auth/EmailVerification"));
const ForgotPassword = lazy(() => import("@/pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/Auth/ResetPassword"));
const PasswordVerification = lazy(() => import("@/pages/Auth/PasswordVerification"));

// Main Pages
const HomeDashboard = lazy(() => import("@/pages/HomeDashboard"));
const CashFlow = lazy(() => import("@/pages/CashFlow"));
const SettledEntries = lazy(() => import("@/pages/SettledEntries"));
const Reports = lazy(() => import("@/pages/Reports"));
const PersonalLocaleSetup = lazy(() => import("@/pages/PersonalLocaleSetup"));

// Settings
const Personal = lazy(() => import("@/pages/PersonalSettings"));
const SubscriptionManagement = lazy(() => import("@/pages/SubscriptionManagement"));
const LimitsAndUsage = lazy(() => import("@/pages/LimitsAndUsage"));
const SecurityAndPrivacy = lazy(() => import("@/pages/SecurityAndPrivacy"));
const OrganizationSettings = lazy(() => import("@/pages/OrganizationSettings"));
const DepartmentSettings = lazy(() => import("@/pages/DepartmentSettings"));
const BankSettings = lazy(() => import("@/pages/BankSettings"));
const EntitySettings = lazy(() => import("@/pages/EntitySettings"));
const InventorySettings = lazy(() => import("@/pages/InventorySettings"));
const ProjectSettings = lazy(() => import("@/pages/ProjectSettings"));
const MemberSettings = lazy(() => import("@/pages/MemberSettings"));
const GroupSettings = lazy(() => import("@/pages/GroupSettings"));
const LedgerAccountsRouter = lazy(() => import("@/pages/LedgerAccountSettings/LedgerAccountsRouter"));
const Statements = lazy(() => import("@/pages/Statements"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const FormatSettings = lazy(() => import("@/pages/FormatSettings"));
const CurrencySettings = lazy(() => import("@/pages/CurrencySettings"));

// Status Pages
const Status404 = lazy(() => import("@/pages/Status/Status404"));
const Status500 = lazy(() => import("@/pages/Status/Status500"));
const StatusComingSoon = lazy(() => import("@/pages/Status/ComingSoon"));
const StatusMaintenance = lazy(() => import("@/pages/Status/Maintenance"));

const routes: RouteObject[] = [
    {
        path: '*',
        element: <BaseLayout />,
        children: [
            {
            path: '*',
            element: <Status404 />
            }
        ]
    },
    {
        path: '/',
        element: <BaseLayout />,
        children: [
            // Auth
            {
                path: 'signup',
                element: <SignUp />
            },
            {
                path: 'signin',
                element: <SignIn />
            },
            {
                path: 'verify-email/:uidb64/:token/',
                element: <EmailVerification />
            },
            {
                path: 'verify-pending-email/:uidb64/:token/',
                element: <EmailVerification />
            },
            {
                path: 'forgot-password',
                element: <ForgotPassword />
            },
            {
                path: "reset-password/:uidb64/:token/",
                element: <ResetPassword />,
            },
            {
                path: "verify-pending-password/:uidb64/:token/",
                element: <PasswordVerification />,
            },
            {
                path: '',
                element: <Navigate to="/cashflow" replace />
            },
            {
                path: 'locale-setup',
                element: (
                    <AuthMiddleware>
                    <PersonalLocaleSetup />
                    </AuthMiddleware>
                ),
            },
        ]
    },
    {
        path: '/',
        element: <SpifexLayout />,
        children: [
            // Dashboard
            {
                path: 'home',
                element: <HomeDashboard />
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
                        <PermissionMiddleware codeName="view_report_page" behavior="lock" redirectTo={'/settings'}>
                            <Reports />
                        </PermissionMiddleware>
                    </SubscriptionMiddleware>
                )
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
                    path: 'subscription-management',
                    element: (
                    <PermissionMiddleware codeName="view_subscription_management_page" behavior="redirect" redirectTo={'/settings'}>
                        <SubscriptionManagement />
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
                    path: 'ledger-accounts',
                    element: (
                    <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo={'/settings'}>
                        <LedgerAccountsRouter />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'register/ledger-accounts',
                    element: (
                    <PermissionMiddleware codeName="view_ledger_accounts_page" behavior="redirect" redirectTo={'/settings'}>
                        <LedgerAccountsRouter />
                    </PermissionMiddleware>
                    ),
                },
                {
                    path: 'bank-statements',
                    element: (
                    <PermissionMiddleware codeName="view_statements_page" behavior="redirect" redirectTo={'/settings'}>
                        <Statements />
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
            // Status
            {
                path: 'status',
                children: [
                    {
                        path: '',
                        element: <Navigate to="404" replace />
                    },
                    {
                        path: '500',
                        element: <Status500 />
                    },
                    {
                        path: 'maintenance',
                        element: <StatusMaintenance />
                    },
                    {
                        path: 'coming-soon',
                        element: <StatusComingSoon />
                    }
                ]
              }
        ]
    }
];

export default routes;
