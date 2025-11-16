import { lazy } from "react";
import { RouteObject } from "react-router";
import { Navigate } from 'react-router-dom';

// Layouts
import { BaseLayout, SpifexLayout, SettingsLayout } from "@/layouts";

//import Loader from "@/components/Loaders/LazyLoader";

// Middlewares
import { PermissionMiddleware, SuccessRouteMiddleware, OwnerRoute, SubscriptionMiddleware } from "@/middlewares";

// Auth Pages
const SignUp = lazy(() => import("@/pages/Auth/SignUp"));
const SignIn = lazy(() => import("@/pages/Auth/SignIn"));
const EmailVerification = lazy(() => import("@/pages/Auth/EmailVerification"));
const ForgotPassword = lazy(() => import("@/pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/Auth/ResetPassword"));

// Main Pages
const HomeDashboard = lazy(() => import("src/pages/HomeDashboard"));
const CashFlow = lazy(() => import("src/pages/CashFlow"));
const SettledEntries = lazy(() => import("src/pages/SettledEntries"));
const Reports = lazy(() => import("@/pages/Reports"));

// Settings
const Personal = lazy(() => import("src/pages/PersonalSettings"));
const SubscriptionManagement = lazy(() => import("@/pages/SubscriptionManagement"));
const LimitsAndUsage = lazy(() => import("@/pages/LimitsAndUsage"));
const SecurityAndPrivacy = lazy(() => import("@/pages/SecurityAndPrivacy"));
const CompanySettings = lazy(() => import("@/pages/CompanySettings"));
const DepartmentSettings = lazy(() => import("@/pages/DepartmentSettings"));
const BankSettings = lazy(() => import("@/pages/BankSettings"));
const EntitySettings = lazy(() => import("@/pages/EntitySettings"));
const InventorySettings = lazy(() => import("@/pages/InventorySettings"));
const ProjectSettings = lazy(() => import("@/pages/ProjectSettings"));
const EmployeeSettings = lazy(() => import("@/pages/EmployeeSettings"));
const GroupSettings = lazy(() => import("@/pages/GroupSettings"));
const LedgerAccountsRouter = lazy(() => import("@/pages/LedgerAccountSettings/LedgerAccountsRouter"));
const Statements = lazy(() => import("@/pages/Statements"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));

// Status Pages
const PurchaseConfirmation = lazy(() => import("@/pages/Status/PurchaseConfirmation"));
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
                path: 'reset-password/:uidb64/:token/',
                element: <ResetPassword />
            },
            {
                path: '',
                element: <Navigate to="/cashflow" replace />
            }
        ]
    },
    {
        path: '/',
        element: <SpifexLayout />,
        children: [
            // Dashboard
            {
                path: 'home',
                element: (
                    <PermissionMiddleware codeName="view_cash_flow_button" redirectTo={'/settled'}>
                        <HomeDashboard />
                    </PermissionMiddleware>
                )
            },
            // Cash Flow
            {
                path: 'cashflow',
                element: (
                    <PermissionMiddleware codeName="view_cash_flow_button" redirectTo={'/settled'}>
                        <CashFlow />
                    </PermissionMiddleware>
                )
            },
            // Settled Entries
            {
                path: 'settled',
                element: (
                    <PermissionMiddleware codeName="view_settled_button" redirectTo={'/settings'}>
                        <SettledEntries />
                    </PermissionMiddleware>
                )
            },
            // Reports
            {
                path: 'reports',
                element: (
                    <SubscriptionMiddleware redirectTo="/settings">
                        <PermissionMiddleware codeName="view_report_button" redirectTo={'/settings'}>
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
                element: <Personal />
                },
                {
                path: 'company-settings',
                element: <CompanySettings />
                },
                {
                path: 'subscription-management',
                element: (
                    <OwnerRoute>
                        <SubscriptionManagement />
                    </OwnerRoute>
                )
                },
                {
                path: 'limits',
                element: <LimitsAndUsage />
                },
                {
                path: 'security',
                element: <SecurityAndPrivacy />
                },
                {
                path: 'banks',
                element: <BankSettings />
                },
                {
                path: 'departments',
                element: <DepartmentSettings />
                },
                {
                path: 'entities',
                element: <EntitySettings />
                },
                {
                path: 'inventory',
                element: <InventorySettings />
                },
                {
                path: 'projects',
                element: <ProjectSettings />
                },
                {
                path: 'employees',
                element: <EmployeeSettings />
                },
                {
                path: 'groups',
                element: <GroupSettings />
                },
                {
                path: 'ledger-accounts',
                element: <LedgerAccountsRouter />
                },
                {
                path: 'register/ledger-accounts',
                element: <LedgerAccountsRouter />
                },
                {
                path: 'bank-statements',
                element: <Statements />
                },
                {
                path: 'notifications',
                element: <NotificationSettings />
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
                        path: 'success',
                        element: (
                            <SuccessRouteMiddleware>
                                <PurchaseConfirmation />
                            </SuccessRouteMiddleware>
                        )
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
