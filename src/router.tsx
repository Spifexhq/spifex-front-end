import { lazy } from "react";
import { RouteObject } from "react-router";
import { Navigate } from 'react-router-dom';

// Layouts
import { BaseLayout, SpifexLayout, SettingsLayout } from "@/layouts";

import Loader from "@/components/Loaders/LazyLoader";

// Middlewares
import { PermissionMiddleware, SuccessRouteMiddleware, OwnerRoute, SubscriptionMiddleware } from "@/middlewares";

// Auth Pages
const SignUp = Loader(lazy(() => import("@/pages/Auth/SignUp")));
const SignIn = Loader(lazy(() => import("@/pages/Auth/SignIn")));
const SignUpRedirect = Loader(lazy(() => import("@/pages/Auth/SignUpRedirect")));
const EmailVerification = Loader(lazy(() => import("@/pages/Auth/EmailVerification")));

// Main Pages
const CashFlow = Loader(lazy(() => import("src/pages/CashFlow")));
const SettledEntries = Loader(lazy(() => import("src/pages/SettledEntries")));
const Reports = Loader(lazy(() => import("@/pages/Reports")));

// Settings
const Personal = Loader(lazy(() => import("src/pages/PersonalSettings")));
const SubscriptionManagement = Loader(lazy(() => import("@/pages/SubscriptionManagement")));
const SecurityAndPrivacy = Loader(lazy(() => import("@/pages/SecurityAndPrivacy")));
const CompanySettings = Loader(lazy(() => import("@/pages/CompanySettings")));
const DepartmentSettings = Loader(lazy(() => import("@/pages/DepartmentSettings")));
const BankSettings = Loader(lazy(() => import("@/pages/BankSettings")));
const EntitySettings = Loader(lazy(() => import("@/pages/EntitySettings")));
const InventorySettings = Loader(lazy(() => import("@/pages/InventorySettings")));
const ProjectSettings = Loader(lazy(() => import("@/pages/ProjectSettings")));
const EmployeeSettings = Loader(lazy(() => import("@/pages/EmployeeSettings")));
const GroupSettings = Loader(lazy(() => import("@/pages/GroupSettings")));

// Status Pages
const PurchaseConfirmation = Loader(lazy(() => import("@/pages/Status/PurchaseConfirmation")));
const Status404 = Loader(lazy(() => import("@/pages/Status/Status404")));
const Status500 = Loader(lazy(() => import("@/pages/Status/Status500")));
const StatusComingSoon = Loader(lazy(() => import("@/pages/Status/ComingSoon")));
const StatusMaintenance = Loader(lazy(() => import("@/pages/Status/Maintenance")));

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
                path: 'signup/redirect',
                element: <SignUpRedirect />
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
                path: '',
                element: <Navigate to="/cashflow" replace />
            }
        ]
    },
    {
        path: '/',
        element: <SpifexLayout />,
        children: [
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
