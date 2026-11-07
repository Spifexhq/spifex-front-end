import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
const Layout = lazy(() => import("../layouts/PersonalLayout"));
const SettingsLayout = lazy(() => import("../layouts/PersonalSettingsLayout"));
const Overview = lazy(() => import("../pages/PersonalOverview"));
const Collection = lazy(() => import("../pages/PersonalCollectionPage"));
const SettingsIndex = lazy(() => import("../pages/PersonalSettings"));
const PersonalSettings = lazy(() => import("@/features/account-settings/pages/PersonalSettings"));
const Security = lazy(() => import("@/features/account-settings/pages/SecurityAndPrivacy"));
const Notifications = lazy(() => import("@/features/account-settings/pages/NotificationSettings"));
const Formats = lazy(() => import("@/features/account-settings/pages/FormatSettings"));
const Currency = lazy(() => import("@/features/account-settings/pages/CurrencySettings"));
const Billing = lazy(() => import("@/features/workspaces/components/WorkspaceBillingSettings"));
const Workspaces = lazy(() => import("@/features/workspaces/pages/WorkspaceManagementPage"));
const Help = lazy(() => import("@/pages/Help"));

export const personalRoutes: RouteObject[] = [{ path: "personal", element: <Layout/>, children: [
  { index: true, element: <Navigate to="overview" replace/> },
  { path: "overview", element: <Overview/> },
  { path: "reports", element: <Overview reports/> },
  ...(["transactions", "accounts", "categories", "budgets", "goals"] as const).map(collection => ({ path: collection, element: <Collection key={collection} collection={collection}/> })),
  { path: "transfers", element: <Navigate to="/personal/transactions?kind=transfer" replace/> },
  { path: "settings", element: <SettingsLayout/>, children: [
    { index: true, element: <SettingsIndex/> },
    { path: "personal", element: <PersonalSettings product="personal"/> },
    { path: "profile", element: <Navigate to="/personal/settings/personal" replace/> },
    { path: "address", element: <Navigate to="/personal/settings/personal" replace/> },
    { path: "personal-data", element: <Navigate to="/personal/settings/personal" replace/> },
    { path: "security", element: <Security/> },
    { path: "notifications", element: <Notifications/> },
    { path: "formats", element: <Formats/> },
    { path: "currency", element: <Currency/> },
    { path: "billing", element: <Billing/> },
    { path: "workspaces", element: <Workspaces/> },
    { path: "*", element: <Navigate to="/personal/settings/personal" replace/> },
  ] },
  { path: "help", element: <Help/> },
  { path: "*", element: <Navigate to="/personal/overview" replace/> },
] }];
