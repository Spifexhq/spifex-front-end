// router.tsx
import { lazy } from "react";
import { RouteObject } from "react-router";
import { Navigate } from 'react-router-dom';

// Layouts
import { BaseLayout, SpifexLayout } from "@/app/layouts";

//import Loader from "@/components/Loaders/LazyLoader";

// Middlewares
import { GuestOnlyMiddleware } from "@/middlewares";

const AuthLayout = lazy(() => import("@/pages/Auth/AuthLayout"));

// Auth Pages
const LegalPage = lazy(() => import("@/pages/Legal"));
const SignUp = lazy(() => import("@/pages/Auth/SignUp"));
const SignIn = lazy(() => import("@/pages/Auth/SignIn"));
const EmailVerification = lazy(() => import("@/pages/Auth/EmailVerification"));
const ForgotPassword = lazy(() => import("@/pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/Auth/ResetPassword"));
const PasswordVerification = lazy(() => import("@/pages/Auth/PasswordVerification"));

import { businessRoutes } from "@/products/business/routes";
import { personalRoutes } from "@/products/personal/routes";

// Main Pages
const PersonalLocaleSetup = lazy(() => import("@/app/authentication/PersonalLocaleSetup"));

// Settings

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
            {
                index: true,
                element: <Navigate to="/overview" replace />,
            },
            { path: "legal/privacy", element: <LegalPage /> },
            { path: "legal/terms", element: <LegalPage /> },
            // Auth
            {
            path: 'signup',
            element: (
                    <GuestOnlyMiddleware redirectTo="/overview">
                        <SignUp />
                    </GuestOnlyMiddleware>
                ),
            },
            { element: <AuthLayout />, children: [
            {
            path: 'signin',
            element: (
                    <GuestOnlyMiddleware redirectTo="/overview">
                        <SignIn />
                    </GuestOnlyMiddleware>
                ),
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
            ] },
        ]
    },
    {
        path: '/',
        element: <SpifexLayout />,
        children: [
            ...personalRoutes,
            // Locale Setup
            {
                path: 'locale-setup',
                element: <PersonalLocaleSetup />
            },
            ...businessRoutes,
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
