import { lazy } from "react";
import { RouteObject } from "react-router";
import { Navigate } from 'react-router-dom';

import BaseLayout from "./layouts/BaseLayout";
import SpifexLayout from "./layouts/SpifexLayout";
import Loader from "@/utils/loader";

// Middlewares
import { PermissionMiddleware, SuccessRouteMiddleware, OwnerRoute, SubscriptionMiddleware } from "@/middlewares";
import CashFlow from "./pages/CashFlow/CashFlow";

// Auth Pages
const SignUp = Loader(lazy(() => import("@/pages/Auth/SignUp")));
const SignIn = Loader(lazy(() => import("@/pages/Auth/SignIn")));
const EmailVerification = Loader(lazy(() => import("@/pages/Auth/EmailVerification")));

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
                path: 'verify-email/:uidb64/:token/',
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
